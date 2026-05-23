"use client";
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import MainLayout from '@/components/MainLayout';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

// ─── Types ────────────────────────────────────────────────────────────────────

interface CategoryTotal {
  id: string;
  name: string;
  color: string;
  total: number;
  percent: number;
}

interface MonthlyBar {
  label: string;
  total: number;
  heightPct: number;
}

type TabType = 'monthly' | 'category' | 'trends';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPHP(amount: number) {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function getMonthRange(year: number, month: number) {
  const m = String(month).padStart(2, '0');
  const lastDay = new Date(year, month, 0).getDate();
  return {
    start: `${year}-${m}-01`,
    end:   `${year}-${m}-${String(lastDay).padStart(2, '0')}`,
  };
}

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('monthly');

  const [now] = useState(() => new Date());
  const [viewYear, setViewYear] = useState(() => now.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => now.getMonth() + 1);

  const [categoryTotals, setCategoryTotals] = useState<CategoryTotal[]>([]);
  const [monthlyBars,    setMonthlyBars]    = useState<MonthlyBar[]>([]);
  const [thisMonthTotal, setThisMonthTotal] = useState(0);
  const [avgMonthly,     setAvgMonthly]     = useState(0);
  const [loading,        setLoading]        = useState(true);

  const getRelativeMonthInfo = useCallback((offsetMonths: number) => {
    const targetDate = new Date(viewYear, viewMonth - 1 + offsetMonths, 1);
    return {
      year:  targetDate.getFullYear(),
      month: targetDate.getMonth() + 1,
      label: MONTH_LABELS[targetDate.getMonth()],
      key:   `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`,
    };
  }, [viewYear, viewMonth]);

  const handlePrevMonth = () => {
    const info = getRelativeMonthInfo(-1);
    setViewYear(info.year);
    setViewMonth(info.month);
  };

  const handleNextMonth = () => {
    const info = getRelativeMonthInfo(1);
    setViewYear(info.year);
    setViewMonth(info.month);
  };

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const sixMonthsAgo = new Date(viewYear, viewMonth - 6, 1);
    const sixMonthsAgoStr = sixMonthsAgo.toISOString().split('T')[0];
    const { end: thisMonthEnd } = getMonthRange(viewYear, viewMonth);

    const { data: allExpenses } = await supabase
      .from('expenses')
      .select('amount, expense_date, category_id, categories(id, name, color)')
      .eq('user_id', user.id)
      .gte('expense_date', sixMonthsAgoStr)
      .lte('expense_date', thisMonthEnd)
      .order('expense_date', { ascending: true });

    const expenses = (allExpenses ?? []).map((e: any) => ({
      ...e,
      categories: Array.isArray(e.categories) ? (e.categories[0] ?? null) : e.categories,
    }));

    const monthBuckets: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(viewYear, viewMonth - 1 - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthBuckets[key] = 0;
    }

    expenses.forEach((e: any) => {
      const key = e.expense_date.slice(0, 7);
      if (key in monthBuckets) monthBuckets[key] += Number(e.amount);
    });

    const bucketValues = Object.values(monthBuckets);
    const maxVal = Math.max(...bucketValues, 1);

    const bars: MonthlyBar[] = Object.entries(monthBuckets).map(([key, total]) => {
      const monthIdx = parseInt(key.split('-')[1]) - 1;
      return {
        label:     MONTH_LABELS[monthIdx],
        total,
        heightPct: Math.round((total / maxVal) * 100),
      };
    });
    setMonthlyBars(bars);

    const { start, end } = getMonthRange(viewYear, viewMonth);
    const thisMonth = expenses.filter((e: any) =>
      e.expense_date >= start && e.expense_date <= end
    );
    const thisTotal = thisMonth.reduce((s: number, e: any) => s + Number(e.amount), 0);
    setThisMonthTotal(thisTotal);

    const grandTotal = bucketValues.reduce((s, v) => s + v, 0);
    setAvgMonthly(Math.round(grandTotal / 6));

    const catMap: Record<string, { name: string; color: string; total: number }> = {};
    thisMonth.forEach((e: any) => {
      if (!e.categories) return;
      const { id, name, color } = e.categories;
      if (!catMap[id]) catMap[id] = { name, color, total: 0 };
      catMap[id].total += Number(e.amount);
    });

    const cats: CategoryTotal[] = Object.entries(catMap)
      .map(([id, v]) => ({
        id,
        ...v,
        percent: thisTotal > 0 ? Math.round((v.total / thisTotal) * 100) : 0,
      }))
      .sort((a, b) => b.total - a.total);

    setCategoryTotals(cats);
    setLoading(false);
  }, [viewYear, viewMonth]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const topCategory = categoryTotals[0] ?? null;
  const currentMonthLabel = `${MONTH_LABELS[viewMonth - 1]} ${viewYear}`;

  const momChange = useMemo(() => {
    const prevMonthInfo = getRelativeMonthInfo(-1);
    const prevMonthBar  = monthlyBars.find((b) => b.label === prevMonthInfo.label);
    const prevTotal     = prevMonthBar ? prevMonthBar.total : 0;
    if (prevTotal <= 0) return null;
    return Math.round(((thisMonthTotal - prevTotal) / prevTotal) * 100);
  }, [thisMonthTotal, monthlyBars, getRelativeMonthInfo]);

  return (
    <MainLayout>
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Analytics</h1>
          <p className="text-sm text-slate-400 mt-1">Deep dive insights into your spending behaviors over time.</p>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-xl bg-[#0c0d12] border border-[#1f2330] text-slate-400 hover:text-white hover:bg-[#12141c] transition-all"
            title="Previous Month"
          >
            ←
          </button>
          <div className="flex items-center gap-2 bg-[#0c0d12] border border-[#1f2330] text-slate-200 px-4 py-2 rounded-xl text-sm font-medium min-w-[130px] justify-center">
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>{currentMonthLabel}</span>
          </div>
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-xl bg-[#0c0d12] border border-[#1f2330] text-slate-400 hover:text-white hover:bg-[#12141c] transition-all"
            title="Next Month"
          >
            →
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="w-full bg-[#0c0d12] border border-[#1f2330] p-1.5 rounded-xl flex gap-1 mb-6">
        {(['monthly', 'category', 'trends'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg capitalize transition-all ${
              activeTab === tab
                ? 'bg-gradient-to-r from-emerald-600/15 to-transparent border border-[#1f2330] border-l-2 border-l-emerald-500 text-white'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03]'
            }`}
          >
            {tab === 'monthly' ? 'Monthly' : tab === 'category' ? 'By Category' : 'Trends'}
          </button>
        ))}
      </div>

      {/* ── Loading ── */}
      {loading ? (
        <div className="text-center text-sm text-slate-500 py-20 animate-pulse">Loading analytics…</div>
      ) : (
        <>
          {/* ────────────────────────────────────────────────
              MONTHLY TAB
          ──────────────────────────────────────────────── */}
          {activeTab === 'monthly' && (
            <div className="space-y-6">

              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

                <div className="bg-[#0c0d12] border border-[#1f2330] p-6 rounded-2xl">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">This Month</p>
                  <h3 className="text-3xl font-bold text-white mt-2">{formatPHP(thisMonthTotal)}</h3>
                  {momChange !== null ? (
                    <span className={`inline-flex items-center text-xs font-medium mt-2 px-2 py-0.5 rounded-full ${
                      momChange > 0
                        ? 'text-rose-400 bg-rose-500/10'
                        : 'text-emerald-400 bg-emerald-500/10'
                    }`}>
                      {momChange > 0 ? '↑' : '↓'} {Math.abs(momChange)}% vs last month
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-xs font-medium text-slate-500 mt-2">No prior month data</span>
                  )}
                </div>

                <div className="bg-[#0c0d12] border border-[#1f2330] p-6 rounded-2xl">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">6-Month Avg</p>
                  <h3 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent mt-2">
                    {formatPHP(avgMonthly)}
                  </h3>
                  <p className="text-xs text-slate-500 mt-2.5">Based on last 6 months</p>
                </div>

                <div className="bg-[#0c0d12] border border-[#1f2330] p-6 rounded-2xl">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Biggest Category</p>
                  {topCategory ? (
                    <>
                      <h3 className="text-3xl font-bold mt-2 truncate" style={{ color: topCategory.color || '#34d399' }}>
                        {topCategory.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-2.5">
                        {formatPHP(topCategory.total)}{' '}
                        <span className="text-slate-500">· {topCategory.percent}% of spend</span>
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-slate-500 mt-3">No data yet</p>
                  )}
                </div>
              </div>

              {/* Bar Chart + Top Categories */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Bar Chart */}
                <div className="lg:col-span-2 bg-[#0c0d12] border border-[#1f2330] p-6 rounded-2xl flex flex-col">
                  <div>
                    <h3 className="text-base font-bold text-white">Monthly Spending</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Last 6 months comparison.</p>
                  </div>

                  <div className="h-64 w-full flex items-end gap-4 md:gap-6 px-4 mt-8 relative">
                    {/* Grid lines */}
                    <div className="absolute inset-x-0 bottom-0 border-b border-[#1f2330] w-full" />
                    <div className="absolute inset-x-0 bottom-[25%] border-b border-[#1f2330]/50 w-full" />
                    <div className="absolute inset-x-0 bottom-[50%] border-b border-[#1f2330]/50 w-full" />
                    <div className="absolute inset-x-0 bottom-[75%] border-b border-[#1f2330]/50 w-full" />

                    {monthlyBars.map((bar, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-3 h-full justify-end group z-10">
                        <div
                          style={{ height: `${Math.max(bar.heightPct, 4)}%` }}
                          className="w-full bg-gradient-to-t from-emerald-700/50 to-teal-400/80 rounded-t group-hover:from-emerald-600 group-hover:to-teal-300 transition-all duration-300 relative"
                        >
                          {/* Hover tooltip */}
                          <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-[#0c0d12] border border-[#1f2330] text-white text-[11px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap shadow-lg">
                            {formatPHP(bar.total)}
                          </div>
                        </div>
                        <span className="text-xs font-medium text-slate-400 group-hover:text-emerald-400 transition-colors">
                          {bar.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Categories */}
                <div className="bg-[#0c0d12] border border-[#1f2330] p-6 rounded-2xl flex flex-col">
                  <div>
                    <h3 className="text-base font-bold text-white">Top Categories</h3>
                    <p className="text-xs text-slate-400 mt-0.5">This month's breakdown.</p>
                  </div>

                  {categoryTotals.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-10 my-auto">No categorized expenses this month.</p>
                  ) : (
                    <div className="space-y-4 mt-5 flex-1 flex flex-col justify-center">
                      {categoryTotals.slice(0, 5).map((cat) => (
                        <div key={cat.id} className="space-y-1.5">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-slate-300 flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: cat.color || '#34d399' }} />
                              {cat.name}
                            </span>
                            <span className="text-slate-400">
                              {formatPHP(cat.total)}{' '}
                              <span className="text-slate-500 font-normal">({cat.percent}%)</span>
                            </span>
                          </div>
                          <div className="h-1.5 w-full bg-[#1f2330] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${cat.percent}%`, backgroundColor: cat.color || '#34d399' }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ────────────────────────────────────────────────
              CATEGORY TAB
          ──────────────────────────────────────────────── */}
          {activeTab === 'category' && (
            <div className="space-y-4">
              {categoryTotals.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-[#1f2330] rounded-2xl text-slate-500 font-medium">
                  No categorized expenses this month.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {categoryTotals.map((cat) => (
                    <div key={cat.id} className="bg-[#0c0d12] border border-[#1f2330] p-6 rounded-2xl space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color || '#34d399' }} />
                        <h4 className="text-sm font-bold text-white truncate">{cat.name}</h4>
                      </div>
                      <p className="text-2xl font-bold text-white">{formatPHP(cat.total)}</p>
                      <div className="h-1.5 w-full bg-[#1f2330] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${cat.percent}%`, backgroundColor: cat.color || '#34d399' }}
                        />
                      </div>
                      <p className="text-xs text-slate-500">{cat.percent}% of this month's spend</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ────────────────────────────────────────────────
              TRENDS TAB
          ──────────────────────────────────────────────── */}
          {activeTab === 'trends' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Month-over-Month table */}
                <div className="bg-[#0c0d12] border border-[#1f2330] p-6 rounded-2xl">
                  <h3 className="text-base font-bold text-white mb-4">Month-over-Month</h3>
                  <div className="divide-y divide-[#1f2330]">
                    {monthlyBars.map((bar, idx) => {
                      const prev   = idx > 0 ? monthlyBars[idx - 1].total : null;
                      const change = prev !== null && prev > 0
                        ? Math.round(((bar.total - prev) / prev) * 100)
                        : null;
                      return (
                        <div key={idx} className="flex items-center justify-between py-3">
                          <span className="text-sm font-semibold text-slate-300">{bar.label}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-white">{formatPHP(bar.total)}</span>
                            {change !== null && (
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                change > 0
                                  ? 'text-rose-400 bg-rose-500/10'
                                  : change < 0
                                  ? 'text-emerald-400 bg-emerald-500/10'
                                  : 'text-slate-400 bg-[#1f2330]'
                              }`}>
                                {change > 0 ? '+' : ''}{change}%
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Spend Velocity */}
                <div className="bg-[#0c0d12] border border-[#1f2330] p-6 rounded-2xl space-y-4">
                  <h3 className="text-base font-bold text-white">Spend Velocity</h3>
                  <p className="text-xs text-slate-400">Average daily spend this month vs last month.</p>

                  {(() => {
                    const daysThisMonth  = now.getMonth() + 1 === viewMonth && now.getFullYear() === viewYear
                      ? now.getDate()
                      : new Date(viewYear, viewMonth, 0).getDate();
                    const dailyThis      = daysThisMonth > 0 ? Math.round(thisMonthTotal / daysThisMonth) : 0;

                    const prevMonthInfo      = getRelativeMonthInfo(-1);
                    const prevMonthBar       = monthlyBars.find((b) => b.label === prevMonthInfo.label);
                    const prevMonthTotalAmt  = prevMonthBar ? prevMonthBar.total : 0;
                    const daysLastMonth      = new Date(prevMonthInfo.year, prevMonthInfo.month, 0).getDate();
                    const dailyLast          = daysLastMonth > 0 ? Math.round(prevMonthTotalAmt / daysLastMonth) : 0;

                    const rows = [
                      {
                        label: `${MONTH_LABELS[viewMonth - 1]}${now.getMonth() + 1 === viewMonth ? ' (so far)' : ''}`,
                        daily: dailyThis,
                        // Current month: emerald/teal to match sidebar brand
                        gradient: 'from-emerald-700/50 to-teal-400/80',
                      },
                      {
                        label: prevMonthInfo.label,
                        daily: dailyLast,
                        // Previous month: muted slate
                        gradient: 'from-slate-700 to-slate-600',
                      },
                    ];
                    const maxDaily = Math.max(dailyThis, dailyLast, 1);

                    return (
                      <div className="space-y-5 mt-2">
                        {rows.map((row) => (
                          <div key={row.label} className="space-y-1.5">
                            <div className="flex justify-between text-xs font-medium">
                              <span className="text-slate-300">{row.label}</span>
                              <span className="text-white font-bold">{formatPHP(row.daily)}/day</span>
                            </div>
                            <div className="h-2 w-full bg-[#1f2330] rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full bg-gradient-to-r ${row.gradient}`}
                                style={{ width: `${Math.min(Math.round((row.daily / maxDaily) * 100), 100)}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

              </div>
            </div>
          )}
        </>
      )}
    </MainLayout>
  );
}