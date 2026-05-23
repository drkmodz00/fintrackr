"use client";
import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';
import Chart from 'chart.js/auto';

const supabase = createClient();

// ─── Types ────────────────────────────────────────────────────────────────────

interface Category {
  id: string;
  name: string;
  color: string;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  expense_date: string;
  category_id: string | null;
  categories: Category | null;
}

interface BudgetTarget {
  id: string;
  label: string;
  spent: number;
  limit: number;
  color: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPHP(amount: number) {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function getMonthRange(date: Date) {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const mStr = String(m).padStart(2, '0');
  const lastDay = new Date(y, m, 0).getDate();
  return {
    start: `${y}-${mStr}-01`,
    end: `${y}-${mStr}-${String(lastDay).padStart(2, '0')}`,
    label: date.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' }),
  };
}

function buildDailyBars(expenses: Expense[], start: string, end: string): number[] {
  const startD = new Date(start);
  const endD = new Date(end);
  const totalDays = Math.ceil((endD.getTime() - startD.getTime()) / 86400000) + 1;
  const bucketSize = Math.ceil(totalDays / 7);

  const buckets = Array(7).fill(0);
  expenses.forEach((e) => {
    const day = Math.floor(
      (new Date(e.expense_date).getTime() - startD.getTime()) / 86400000
    );
    const idx = Math.min(Math.floor(day / bucketSize), 6);
    if (idx >= 0) buckets[idx] += Number(e.amount);
  });

  const max = Math.max(...buckets, 1);
  return buckets.map((v) => Math.round((v / max) * 100));
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const [allocatedBudget, setAllocatedBudget] = useState<number>(0);
  const [now] = useState(() => new Date());
  const { start, end, label: monthLabel } = getMonthRange(now);

  const [expenses, setExpenses]             = useState<Expense[]>([]);
  const [categoryLimits, setCategoryLimits] = useState<Record<string, number>>({});
  const [categories, setCategories]         = useState<Category[]>([]);
  const [loading, setLoading]               = useState(true);

  const radioChartRef      = useRef<HTMLCanvasElement>(null);
  const radioChartInstance = useRef<any>(null);

  // ── Fetch ──
  const fetchData = useCallback(async () => {
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const currentMonth = now.getMonth() + 1;
    const currentYear  = now.getFullYear();

    const [catsResponse, expsResponse, budgetResponse, limitsResponse] = await Promise.all([
      supabase
        .from('categories')
        .select('id, name, color')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true }),

      supabase
        .from('expenses')
        .select('id, description, amount, expense_date, category_id, categories(id, name, color)')
        .eq('user_id', user.id)
        .gte('expense_date', start)
        .lte('expense_date', end)
        .order('expense_date', { ascending: false }),

      supabase
        .from('user_monthly_budget')
        .select('amount')
        .eq('user_id', user.id)
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .maybeSingle(),

      supabase
        .from('category_budget_limits')
        .select('category_id, limit_amount')
        .eq('user_id', user.id)
        .eq('month', currentMonth)
        .eq('year', currentYear),
    ]);

    setAllocatedBudget(Number(budgetResponse.data?.amount ?? 0));
    setCategories((catsResponse.data as Category[]) ?? []);

    const limitsMap: Record<string, number> = {};
    (limitsResponse.data ?? []).forEach((row: any) => {
      limitsMap[row.category_id] = Number(row.limit_amount);
    });
    setCategoryLimits(limitsMap);

    const normalized: Expense[] = (expsResponse.data ?? []).map((e: any) => ({
      ...e,
      categories: Array.isArray(e.categories) ? (e.categories[0] ?? null) : e.categories,
    }));

    setExpenses(normalized);
    setLoading(false);
  }, [start, end, now]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Derived values ──
  const totalSpent = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const remaining  = allocatedBudget - totalSpent;
  const txCount    = expenses.length;

  const categoryTotals = categories
    .map((cat) => {
      const spent = expenses
        .filter((e) => e.category_id === cat.id)
        .reduce((sum, e) => sum + Number(e.amount), 0);
      return { ...cat, spent };
    })
    .filter((c) => c.spent > 0)
    .sort((a, b) => b.spent - a.spent);

  const topCatPct = totalSpent > 0 && categoryTotals[0]
    ? Math.round((categoryTotals[0].spent / totalSpent) * 100)
    : 0;

  const budgetTargets: BudgetTarget[] = categories
    .map((c) => {
      const spent = expenses
        .filter((e) => e.category_id === c.id)
        .reduce((sum, e) => sum + Number(e.amount), 0);
      const limit = categoryLimits[c.id] ?? 0;
      return { id: c.id, label: c.name, spent, limit, color: c.color };
    })
    .filter((b) => b.limit > 0)
    .sort((a, b) => b.spent - a.spent);

  const overBudget = budgetTargets.filter((b) => b.spent / b.limit >= 0.9).length;

  const dailyBars      = buildDailyBars(expenses, start, end);
  const recentExpenses = expenses.slice(0, 5);

  // ── Chart ──
  useEffect(() => {
    if (!radioChartRef.current || loading) return;

    if (radioChartInstance.current) {
      radioChartInstance.current.destroy();
      radioChartInstance.current = null;
    }

    const ctx = radioChartRef.current.getContext('2d');
    if (!ctx) return;

    const gradient = ctx.createLinearGradient(0, 0, 0, 128);
    gradient.addColorStop(0, 'rgba(16,185,129,0.25)');
    gradient.addColorStop(1, 'rgba(16,185,129,0.02)');

    radioChartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: dailyBars.map((_, i) => `Wk ${i + 1}`),
        datasets: [{
          data: dailyBars,
          borderColor: '#10b981',
          borderWidth: 2.5,
          pointRadius: 4,
          pointBackgroundColor: '#10b981',
          pointBorderColor: '#0c0d12',
          pointBorderWidth: 2,
          fill: true,
          backgroundColor: gradient,
          tension: 0.45,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#0f111a',
            borderColor: '#1f2330',
            borderWidth: 1,
            titleColor: '#94a3b8',
            bodyColor: '#fff',
            bodyFont: { weight: 700 },
            callbacks: {
              label: (c: any) => ` ₱${Number(c.raw).toLocaleString('en-PH')}`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: '#1f2330', drawTicks: false },
            ticks: { color: '#475569', font: { size: 11, weight: 700 } },
            border: { color: '#1f2330' },
          },
          y: { display: false, min: 0, max: 120 },
        },
      },
    });

    return () => {
      radioChartInstance.current?.destroy();
      radioChartInstance.current = null;
    };
  }, [loading, dailyBars]);

  return (
    <>
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4">
        <div className="min-w-0">
          {/* Slightly smaller heading on mobile so it never wraps awkwardly */}
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white truncate">{monthLabel} Overview</h1>
          <p className="text-sm text-slate-400 mt-1">Here is a detailed breakdown of your business and personal capital.</p>
        </div>
        {/* Date badge — full-width pill on xs, auto-width on sm+ */}
        <div className="flex items-center gap-2 bg-[#0c0d12] border border-[#1f2330] text-slate-200 px-4 py-2 rounded-xl text-sm font-medium self-start sm:self-auto whitespace-nowrap">
          <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>{monthLabel}</span>
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div className="text-center text-sm text-slate-500 py-20 animate-pulse">Loading your data…</div>
      )}

      {/* ── Dashboard Content ── */}
      {!loading && (
        <div className="space-y-5 sm:space-y-6">

          {/* ── KPI Cards: 1 col → 2 col (sm) → 4 col (lg) ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">

            <div className="bg-[#0c0d12] border border-[#1f2330] p-5 sm:p-6 rounded-2xl">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Spent</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-white mt-2 truncate">{formatPHP(totalSpent)}</h3>
              <span className="inline-flex items-center text-xs font-medium text-emerald-400 mt-2 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                This month
              </span>
            </div>

            <div className="bg-[#0c0d12] border border-[#1f2330] p-5 sm:p-6 rounded-2xl">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Remaining Budget</p>
              <h3 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent mt-2 truncate">
                {formatPHP(Math.max(remaining, 0))}
              </h3>
              <p className="text-xs text-slate-500 mt-2.5 truncate">Out of {formatPHP(allocatedBudget)} allocation</p>
            </div>

            <div className="bg-[#0c0d12] border border-[#1f2330] p-5 sm:p-6 rounded-2xl">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Transactions</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-white mt-2">{txCount}</h3>
              <p className="text-xs text-slate-500 mt-2.5">Processed this cycle</p>
            </div>

            <div className="bg-gradient-to-br from-[#1c1214] to-[#120a0c] border border-rose-950/40 p-5 sm:p-6 rounded-2xl">
              <p className="text-xs font-semibold text-rose-400 uppercase tracking-wider">Budget Alerts</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-rose-500 mt-2">{overBudget}</h3>
              <p className="text-xs text-rose-400/60 mt-2.5">Categories exceeding 90% limit</p>
            </div>
          </div>

          {/* ── Analytics Row: stacks on mobile, 3-col on lg ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">

            {/* Spending by Category */}
            <div className="lg:col-span-2 bg-[#0c0d12] border border-[#1f2330] p-5 sm:p-6 rounded-2xl flex flex-col gap-5">
              <div>
                <h3 className="text-base font-bold text-white">Spending by Category</h3>
                <p className="text-xs text-slate-400 mt-0.5">Where your funds went this month.</p>
              </div>

              {categoryTotals.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-12">No categorized expenses yet.</p>
              ) : (
                /*
                 * Layout:
                 *  - xs/sm: donut centred on top, legend grid below (single column)
                 *  - md+:   donut left, legend grid right (two columns)
                 */
                <div className="flex flex-col md:flex-row items-center gap-6">
                  {/* Donut */}
                  <div className="relative w-36 h-36 sm:w-40 sm:h-40 flex items-center justify-center flex-shrink-0">
                    <div className="w-full h-full rounded-full border-[14px] border-[#1f2330] absolute" />
                    <div className="w-full h-full rounded-full border-[14px] border-transparent border-t-emerald-500 border-r-teal-400 absolute rotate-45" />
                    <div className="flex flex-col items-center max-w-[96px] px-1">
                      <span className="text-2xl font-bold text-white">{topCatPct}%</span>
                      <span className="text-[10px] text-teal-400 uppercase tracking-wider font-bold truncate w-full text-center">
                        {categoryTotals[0]?.name ?? '—'}
                      </span>
                    </div>
                  </div>

                  {/* Legend: 1 col on xs, 2 cols on sm+ */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 w-full">
                    {categoryTotals.slice(0, 6).map((c) => {
                      const pct = totalSpent > 0 ? Math.round((c.spent / totalSpent) * 100) : 0;
                      return (
                        <div key={c.id} className="flex items-center gap-2.5 min-w-0">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: c.color || '#34d399' }} />
                          <span className="text-xs font-medium text-slate-300 truncate">{c.name}</span>
                          <span className="text-xs text-slate-500 ml-auto font-bold shrink-0">{pct}%</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Daily Spending Trend */}
            <div className="bg-[#0c0d12] border border-[#1f2330] p-5 sm:p-6 rounded-2xl flex flex-col gap-4">
              <div>
                <h3 className="text-base font-bold text-white">Daily Spending Trend</h3>
                <p className="text-xs text-slate-400 mt-0.5">Timeline distribution for this cycle.</p>
              </div>

              {/* Chart grows taller on mobile since it's full-width */}
              <div className="relative w-full" style={{ height: '140px' }}>
                <canvas
                  ref={radioChartRef}
                  role="img"
                  aria-label="Radiowave area chart of daily spending trend across 7 periods this month"
                />
              </div>

              <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase px-1">
                <span>Day 1</span>
                <span>Day 15</span>
                <span>Day {new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()}</span>
              </div>
            </div>
          </div>

          {/* ── Lower Row: stacks on mobile, 2-col on lg ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">

            {/* Recent Expenses */}
            <div className="bg-[#0c0d12] border border-[#1f2330] p-5 sm:p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-white">Recent Expenses</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Latest account movements</p>
                </div>
                <Link href="/expenses" className="text-xs font-bold text-emerald-400 hover:text-teal-400 transition-colors shrink-0 ml-2">
                  View all →
                </Link>
              </div>

              {recentExpenses.length === 0 ? (
                <p className="text-sm text-slate-500 py-8 text-center">No expenses recorded this month.</p>
              ) : (
                <div className="divide-y divide-[#1f2330]">
                  {recentExpenses.map((exp) => (
                    <div key={exp.id} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0 gap-2">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-xl bg-[#1f2330] flex items-center justify-center text-sm font-bold text-slate-300 flex-shrink-0">
                          {(exp.description ?? exp.categories?.name ?? '?')[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          {/* On mobile, stack description and badge vertically */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h4 className="text-sm font-semibold text-white truncate max-w-[120px] sm:max-w-[160px]">
                              {exp.description || '—'}
                            </h4>
                            {exp.categories && (
                              <span className="text-[10px] bg-emerald-950/40 text-emerald-400 px-1.5 py-0.5 rounded font-bold border border-emerald-900/30 whitespace-nowrap">
                                {exp.categories.name}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {new Date(exp.expense_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-white shrink-0">{formatPHP(Number(exp.amount))}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Budget Tracker */}
            <div className="bg-[#0c0d12] border border-[#1f2330] p-5 sm:p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-base font-bold text-white">Budget Tracker</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Threshold limits per category</p>
                </div>
                <Link href="/budget" className="text-xs font-bold text-emerald-400 hover:text-teal-400 transition-colors shrink-0 ml-2">
                  Edit targets →
                </Link>
              </div>

              {budgetTargets.length === 0 ? (
                <p className="text-sm text-slate-500 py-8 text-center">
                  No limits set yet.{' '}
                  <Link href="/budget" className="text-emerald-400 hover:text-teal-400 font-bold transition-colors">
                    Set them in Budget →
                  </Link>
                </p>
              ) : (
                <div className="space-y-4">
                  {budgetTargets.map((b) => {
                    const pct    = Math.min(Math.round((b.spent / b.limit) * 100), 100);
                    const isOver = pct >= 90;
                    return (
                      <div key={b.id}>
                        <div className="flex justify-between text-xs font-medium mb-1.5 gap-2">
                          {/* Label: truncate if narrow */}
                          <span className="text-slate-300 flex items-center gap-2 min-w-0 truncate">
                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: b.color || '#34d399' }} />
                            <span className="truncate">{b.label}</span>
                          </span>
                          {/* Amounts: always visible, never truncated */}
                          <span className="text-slate-400 shrink-0">
                            <strong className="text-white">{formatPHP(b.spent)}</strong>
                            <span className="hidden xs:inline"> / {formatPHP(b.limit)}</span>
                          </span>
                        </div>
                        <div className="h-2 w-full bg-[#1f2330] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isOver ? 'bg-rose-500' : 'bg-gradient-to-r from-emerald-600 to-teal-400'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
}