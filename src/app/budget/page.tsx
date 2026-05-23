"use block"
"use client";
import React, { useEffect, useState, useCallback, useRef } from 'react';
import MainLayout from '@/components/MainLayout';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

interface Category { id: string; name: string; color: string; }
interface BudgetRow { category_id: string; name: string; color: string; limit: number; spent: number; }

function formatPHP(n: number) {
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function getCurrentMonthLabel() {
  return new Date().toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
}

function getMonthRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const mStr = String(m).padStart(2, '0');
  const lastDay = new Date(y, m, 0).getDate();
  return {
    start: `${y}-${mStr}-01`,
    end: `${y}-${mStr}-${String(lastDay).padStart(2, '0')}`,
    month: m,
    year: y,
  };
}

const AVAILABLE_COLORS = [
  '#10b981', '#14b8a6', '#06b6d4', '#3b82f6', '#22c55e',
  '#eab308', '#f97316', '#f43f5e', '#ec4899', '#a855f7'
];

type Status = 'safe' | 'warning' | 'over';

function getStatus(pct: number): Status {
  if (pct >= 100) return 'over';
  if (pct >= 75)  return 'warning';
  return 'safe';
}

const STATUS_CONFIG: Record<Status, { bar: string; badge: string; text: string; label: string }> = {
  safe:    { bar: 'from-emerald-500 to-teal-400',  badge: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', text: 'text-emerald-400', label: 'On track'      },
  warning: { bar: 'from-amber-500 to-orange-400',  badge: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',       text: 'text-amber-400',   label: 'Nearing limit' },
  over:    { bar: 'from-rose-600 to-rose-400',     badge: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',          text: 'text-rose-400',    label: 'Over budget'   },
};

// ─── Summary Stat ─────────────────────────────────────────────────────────────

function SummaryStat({ label, value, sub, warning = false }: {
  label: string; value: string; sub?: string; warning?: boolean;
}) {
  return (
    <div className="bg-[#0c0d12] border border-[#1f2330] rounded-xl p-4 hover:border-slate-700/80 transition-all min-w-0">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 truncate">{label}</p>
      <p className={`text-xl sm:text-2xl font-black tracking-tight truncate ${warning ? 'text-rose-400' : 'text-white'}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-400 mt-1 font-medium truncate">{sub}</p>}
    </div>
  );
}

// ─── Budget Card ──────────────────────────────────────────────────────────────

function BudgetCard({
  row, limitInput, onLimitChange, onEdit, onDelete,
}: {
  row: BudgetRow;
  limitInput: string;
  onLimitChange: (val: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const limitVal  = Number(limitInput) || 0;
  const remaining = limitVal - row.spent;
  const pct       = limitVal > 0 ? Math.min(Math.round((row.spent / limitVal) * 100), 100) : 0;
  const status    = getStatus(pct);
  const cfg       = STATUS_CONFIG[status];

  return (
    <div className="bg-[#0c0d12] border border-[#1f2330] rounded-2xl overflow-hidden hover:border-slate-700/80 transition-all duration-200 hover:shadow-xl hover:shadow-black/20 group flex flex-col justify-between">
      <div>
        {/* Card header: name + badge + actions */}
        <div className="flex items-center justify-between px-4 sm:px-5 pt-4 pb-3 gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: row.color }} />
            <span className="text-sm font-bold text-slate-200 truncate">{row.name}</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${cfg.badge}`}>{cfg.label}</span>
            <button onClick={onEdit} title="Edit" className="text-slate-600 hover:text-slate-300 transition-colors p-1.5 rounded-lg hover:bg-[#1f2330] cursor-pointer">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 11l6.586-6.586a2 2 0 012.828 2.828L11.828 13.828A2 2 0 0110 14.414H8v-2a2 2 0 01.586-1.414z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18" />
              </svg>
            </button>
            <button onClick={onDelete} title="Delete" className="text-slate-600 hover:text-rose-400 transition-colors p-1.5 rounded-lg hover:bg-rose-500/10 cursor-pointer">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-10 0h14" />
              </svg>
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-4 sm:px-5 pb-4">
          <div className="h-1.5 w-full bg-[#1f2330] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full bg-gradient-to-r ${cfg.bar} transition-all duration-500 ease-out`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      <div>
        {/* Stats row */}
        <div className="grid grid-cols-3 divide-x divide-[#1f2330] border-t border-[#1f2330] text-xs">
          <div className="px-3 sm:px-4 py-3 min-w-0">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Spent</span>
            <span className="font-semibold text-slate-300 block truncate">{formatPHP(row.spent)}</span>
          </div>
          <div className="px-3 sm:px-4 py-3 min-w-0">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Left</span>
            <span className={`font-bold block truncate ${remaining < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {remaining < 0 ? `-${formatPHP(Math.abs(remaining))}` : formatPHP(remaining)}
            </span>
          </div>
          <div className="px-3 sm:px-4 py-3 min-w-0">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Used</span>
            <span className={`font-bold block truncate ${cfg.text}`}>{pct}%</span>
          </div>
        </div>

        {/* Monthly limit input */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-t border-[#1f2330]">
          <label className="text-xs text-slate-400 font-medium shrink-0">Monthly target</label>
          <div className="relative w-32 shrink-0">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs font-bold pointer-events-none">₱</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              value={limitInput}
              onChange={e => onLimitChange(e.target.value)}
              className="w-full bg-[#07080d] border border-[#1f2330] rounded-xl pl-7 pr-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/20 text-right font-bold transition-all"
              placeholder="0"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Color Picker ─────────────────────────────────────────────────────────────

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="grid grid-cols-5 gap-2.5 bg-[#07080d] border border-[#1f2330] p-3 rounded-xl justify-items-center">
      {AVAILABLE_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className="h-8 w-8 rounded-full relative flex items-center justify-center cursor-pointer transition-transform active:scale-90 hover:scale-105"
          style={{ backgroundColor: color }}
        >
          {value === color && <div className="w-2 h-2 bg-white rounded-full shadow-md animate-ping absolute" />}
          {value === color && <div className="w-1.5 h-1.5 bg-white rounded-full shadow-md z-10" />}
        </button>
      ))}
    </div>
  );
}

// ─── Bottom-sheet Modal wrapper ───────────────────────────────────────────────
// Slides up from bottom on mobile, centered on sm+

function SheetModal({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full sm:max-w-md bg-[#0f111a] border border-[#1f2435] sm:rounded-2xl shadow-2xl overflow-hidden rounded-t-2xl max-h-[92dvh] flex flex-col">
        {/* Drag handle — mobile only */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-700" />
        </div>
        <div className="overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirm Modal ─────────────────────────────────────────────────────

function DeleteConfirmModal({ name, onConfirm, onCancel, loading }: {
  name: string; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-sm bg-[#0f111a] border border-[#1f2330] rounded-2xl shadow-2xl p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-10 0h14" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-black text-white">Delete category?</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed break-words">
              <span className="text-white font-bold">"{name}"</span> will be permanently deleted. Expenses in this category will become uncategorized.
            </p>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 px-4 py-3 rounded-xl border border-[#1f2330] text-xs font-bold text-slate-400 hover:text-white hover:bg-[#1f2330] transition-all cursor-pointer disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 px-4 py-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-black text-white transition-all cursor-pointer disabled:opacity-50">
            {loading ? 'Deleting…' : 'Yes, delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Set Budget Sheet ─────────────────────────────────────────────────────────
// Full bottom sheet on mobile instead of a dropdown that overflows

function SetBudgetSheet({ budgetInput, onChange, onSave, onClose }: {
  budgetInput: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full sm:max-w-sm bg-[#0f111a] border border-[#1f2435] sm:rounded-2xl shadow-2xl rounded-t-2xl overflow-hidden">
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-700" />
        </div>
        <div className="px-5 py-4 bg-[#131622] border-b border-[#1f2435] flex items-center justify-between">
          <div>
            <h4 className="text-sm font-black text-white">Set Total Budget</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Total allocated allowance for this month.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors cursor-pointer">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">₱</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              value={budgetInput}
              onChange={e => onChange(e.target.value)}
              className="w-full bg-[#07080d] border border-[#1f2330] rounded-xl pl-8 pr-4 py-3 text-sm font-bold text-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20"
              placeholder="0"
            />
          </div>
          <div className="flex gap-2.5">
            <button onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl border border-[#1f2330] text-xs font-bold text-slate-400 hover:text-white transition-all cursor-pointer">
              Cancel
            </button>
            <button onClick={onSave}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl text-xs transition-all cursor-pointer active:scale-95">
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Budget() {
  const [rows, setRows]       = useState<BudgetRow[]>([]);
  const [limits, setLimits]   = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const [allocatedBudget, setAllocatedBudget] = useState<number>(0);
  const [budgetInput, setBudgetInput]         = useState<string>('');
  const [isBudgetSheetOpen, setIsBudgetSheetOpen] = useState(false);

  const [isCreateOpen, setIsCreateOpen]   = useState(false);
  const [newName, setNewName]             = useState('');
  const [newLimit, setNewLimit]           = useState('5000');
  const [newColor, setNewColor]           = useState(AVAILABLE_COLORS[0]);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError]     = useState<string | null>(null);

  const [editTarget, setEditTarget]   = useState<BudgetRow | null>(null);
  const [editName, setEditName]       = useState('');
  const [editColor, setEditColor]     = useState(AVAILABLE_COLORS[0]);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError]     = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget]   = useState<BudgetRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Core helpers ──

  const getCurrentUserId = useCallback(async (): Promise<string | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  }, []);

  const getCurrentPeriod = () => {
    const now = new Date();
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  };

  const fetchMonthlyBudgetAmount = useCallback(async (userId: string): Promise<number> => {
    const { month, year } = getCurrentPeriod();
    const { data, error: err } = await supabase
      .from('user_monthly_budget')
      .select('amount')
      .eq('user_id', userId)
      .eq('month', month)
      .eq('year', year)
      .maybeSingle();
    if (err) console.error('fetchMonthlyBudgetAmount:', err.message);
    return Number(data?.amount ?? 0);
  }, []);

  const saveMonthlyBudgetAmount = useCallback(async (userId: string, amount: number) => {
    const { month, year } = getCurrentPeriod();
    const { error: err } = await supabase
      .from('user_monthly_budget')
      .upsert({ user_id: userId, month, year, amount }, { onConflict: 'user_id,month,year' });
    if (err) throw new Error(err.message);
  }, []);

  const fetchCategoryLimits = useCallback(async (userId: string): Promise<Record<string, number>> => {
    const { month, year } = getCurrentPeriod();
    const { data, error: err } = await supabase
      .from('category_budget_limits')
      .select('category_id, limit_amount')
      .eq('user_id', userId)
      .eq('month', month)
      .eq('year', year);
    if (err) console.error('fetchCategoryLimits:', err.message);
    const map: Record<string, number> = {};
    (data ?? []).forEach((row: any) => { map[row.category_id] = Number(row.limit_amount); });
    return map;
  }, []);

  const saveSingleCategoryLimit = useCallback(async (userId: string, categoryId: string, limitAmount: number) => {
    const { month, year } = getCurrentPeriod();
    const { error: err } = await supabase
      .from('category_budget_limits')
      .upsert(
        { user_id: userId, category_id: categoryId, month, year, limit_amount: limitAmount },
        { onConflict: 'user_id,category_id,month,year' }
      );
    if (err) throw new Error(err.message);
  }, []);

  const saveAllCategoryLimits = useCallback(async (userId: string, limitsMap: Record<string, number>) => {
    const { month, year } = getCurrentPeriod();
    const rows = Object.entries(limitsMap).map(([category_id, limit_amount]) => ({
      user_id: userId, category_id, month, year, limit_amount,
    }));
    if (rows.length === 0) return;
    const { error: err } = await supabase
      .from('category_budget_limits')
      .upsert(rows, { onConflict: 'user_id,category_id,month,year' });
    if (err) throw new Error(err.message);
  }, []);

  const deleteCategoryLimit = useCallback(async (userId: string, categoryId: string) => {
    const { month, year } = getCurrentPeriod();
    const { error: err } = await supabase
      .from('category_budget_limits')
      .delete()
      .eq('user_id', userId)
      .eq('category_id', categoryId)
      .eq('month', month)
      .eq('year', year);
    if (err) throw new Error(err.message);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const userId = await getCurrentUserId();
      if (!userId) return;

      const { start, end } = getMonthRange();
      const [
        { data: cats, error: catsErr },
        { data: exps, error: expsErr },
        budgetAmount,
        savedLimits,
      ] = await Promise.all([
        supabase.from('categories').select('id, name, color').eq('user_id', userId).order('name'),
        supabase.from('expenses').select('amount, category_id').eq('user_id', userId).gte('expense_date', start).lte('expense_date', end),
        fetchMonthlyBudgetAmount(userId),
        fetchCategoryLimits(userId),
      ]);

      if (catsErr) throw new Error(catsErr.message);
      if (expsErr) throw new Error(expsErr.message);

      setAllocatedBudget(budgetAmount);
      setBudgetInput(String(budgetAmount));

      const spendMap: Record<string, number> = {};
      (exps ?? []).forEach((e: any) => {
        if (e.category_id) spendMap[e.category_id] = (spendMap[e.category_id] ?? 0) + Number(e.amount);
      });

      const built: BudgetRow[] = (cats as Category[] ?? []).map(c => ({
        category_id: c.id,
        name:        c.name,
        color:       c.color,
        limit:       savedLimits[c.id] ?? 5000,
        spent:       spendMap[c.id] ?? 0,
      }));

      setRows(built);
      const initLimits: Record<string, string> = {};
      built.forEach(r => { initLimits[r.category_id] = String(r.limit); });
      setLimits(initLimits);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getCurrentUserId, fetchMonthlyBudgetAmount, fetchCategoryLimits]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error('Not authenticated.');
      const budgetLimits: Record<string, number> = {};
      Object.entries(limits).forEach(([id, val]) => { budgetLimits[id] = Number(val) || 0; });
      await saveAllCategoryLimits(userId, budgetLimits);
      setRows(prev => prev.map(r => ({ ...r, limit: budgetLimits[r.category_id] ?? r.limit })));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAllocatedBudget = async () => {
    const targetNum = Number(budgetInput);
    if (Number.isNaN(targetNum) || targetNum < 0) { setError('Please enter a valid budget amount.'); return; }
    setIsBudgetSheetOpen(false);
    try {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error('Not authenticated.');
      await saveMonthlyBudgetAmount(userId, targetNum);
      setAllocatedBudget(targetNum);
    } catch (err: any) {
      setError(`Budget save failed: ${err.message}`);
      fetchData();
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreateLoading(true);
    setCreateError(null);
    try {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error('Not authenticated.');
      const { data: inserted, error: insertErr } = await supabase
        .from('categories')
        .insert([{ user_id: userId, name: newName.trim(), color: newColor }])
        .select()
        .single();
      if (insertErr) throw new Error(insertErr.message);
      await saveSingleCategoryLimit(userId, inserted.id, Number(newLimit) || 0);
      setNewName(''); setNewLimit('5000'); setNewColor(AVAILABLE_COLORS[0]);
      setIsCreateOpen(false);
      await fetchData();
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreateLoading(false);
    }
  };

  const openEdit = (row: BudgetRow) => {
    setEditTarget(row); setEditName(row.name); setEditColor(row.color); setEditError(null);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget || !editName.trim()) return;
    setEditLoading(true); setEditError(null);
    try {
      const { error: updateErr } = await supabase
        .from('categories')
        .update({ name: editName.trim(), color: editColor })
        .eq('id', editTarget.category_id);
      if (updateErr) throw new Error(updateErr.message);
      setRows(prev => prev.map(r =>
        r.category_id === editTarget.category_id ? { ...r, name: editName.trim(), color: editColor } : r
      ));
      setEditTarget(null);
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error('Not authenticated.');
      await deleteCategoryLimit(userId, deleteTarget.category_id);
      const { error: deleteErr } = await supabase.from('categories').delete().eq('id', deleteTarget.category_id);
      if (deleteErr) throw new Error(deleteErr.message);
      setRows(prev => prev.filter(r => r.category_id !== deleteTarget.category_id));
      setLimits(prev => { const next = { ...prev }; delete next[deleteTarget.category_id]; return next; });
      setDeleteTarget(null);
    } catch (err: any) {
      setError(`Delete failed: ${err.message}`);
      setDeleteTarget(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const totalSpent         = rows.reduce((s, r) => s + r.spent, 0);
  const remainingAllocated = allocatedBudget - totalSpent;
  const overallPct         = allocatedBudget > 0 ? Math.min(Math.round((totalSpent / allocatedBudget) * 100), 100) : 0;
  const overCount          = rows.filter(r => { const lv = Number(limits[r.category_id]) || 0; return lv > 0 && r.spent >= lv; }).length;

  return (
    <MainLayout>

      {/* ── Set Budget Sheet ── */}
      {isBudgetSheetOpen && (
        <SetBudgetSheet
          budgetInput={budgetInput}
          onChange={setBudgetInput}
          onSave={handleSaveAllocatedBudget}
          onClose={() => setIsBudgetSheetOpen(false)}
        />
      )}

      {/* ── Delete Modal ── */}
      {deleteTarget && (
        <DeleteConfirmModal
          name={deleteTarget.name}
          loading={deleteLoading}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}

      {/* ── Create Modal ── */}
      {isCreateOpen && (
        <SheetModal onClose={() => setIsCreateOpen(false)}>
          <div className="px-5 py-4 bg-[#131622] border-b border-[#1f2435] flex items-center justify-between flex-shrink-0">
            <h3 className="text-sm font-black text-white">Add Budget Category</h3>
            <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors cursor-pointer">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <form onSubmit={handleCreate} className="p-5 space-y-4">
            {createError && <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 break-words">{createError}</div>}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category Name</label>
              <input type="text" required placeholder="e.g., Subscriptions, Coffee, Gas" value={newName} onChange={e => setNewName(e.target.value)}
                className="w-full bg-[#07080d] border border-[#1f2330] rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Initial Monthly Limit (₱)</label>
              <input type="number" inputMode="decimal" min="0" required value={newLimit} onChange={e => setNewLimit(e.target.value)}
                className="w-full bg-[#07080d] border border-[#1f2330] rounded-xl px-4 py-3 text-sm font-bold text-slate-200 focus:outline-none focus:border-emerald-500 transition-all" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Theme Color</label>
              <ColorPicker value={newColor} onChange={setNewColor} />
            </div>
            <div className="flex gap-2.5 pt-4 border-t border-[#1f2435]">
              <button type="button" onClick={() => setIsCreateOpen(false)}
                className="flex-1 px-4 py-3 rounded-xl border border-[#1f2330] text-xs font-bold text-slate-400 hover:text-white transition-all cursor-pointer">
                Cancel
              </button>
              <button type="submit" disabled={createLoading}
                className="flex-1 bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs font-black py-3 rounded-xl transition-all disabled:opacity-50 cursor-pointer">
                {createLoading ? 'Creating…' : 'Create Category'}
              </button>
            </div>
          </form>
        </SheetModal>
      )}

      {/* ── Edit Modal ── */}
      {editTarget && (
        <SheetModal onClose={() => setEditTarget(null)}>
          <div className="px-5 py-4 bg-[#131622] border-b border-[#1f2435] flex items-center justify-between flex-shrink-0">
            <h3 className="text-sm font-black text-white">Edit Category</h3>
            <button onClick={() => setEditTarget(null)} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors cursor-pointer">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          <form onSubmit={handleEdit} className="p-5 space-y-4">
            {editError && <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 break-words">{editError}</div>}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category Name</label>
              <input type="text" required value={editName} onChange={e => setEditName(e.target.value)}
                className="w-full bg-[#07080d] border border-[#1f2330] rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-all" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Theme Color</label>
              <ColorPicker value={editColor} onChange={setEditColor} />
            </div>
            <div className="flex gap-2.5 pt-4 border-t border-[#1f2435]">
              <button type="button" onClick={() => setEditTarget(null)}
                className="flex-1 px-4 py-3 rounded-xl border border-[#1f2330] text-xs font-bold text-slate-400 hover:text-white transition-all cursor-pointer">
                Cancel
              </button>
              <button type="submit" disabled={editLoading}
                className="flex-1 bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-xs font-black py-3 rounded-xl transition-all disabled:opacity-50 cursor-pointer">
                {editLoading ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </SheetModal>
      )}

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-[#1f2330] mb-5">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-white tracking-tight">Budget Planner</h1>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {getCurrentMonthLabel()}
          </p>
        </div>

        {/* Action buttons — horizontal scroll on very small screens */}
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 sm:pb-0 sm:flex-wrap sm:justify-end flex-shrink-0 -mx-1 px-1">
          <button
            onClick={() => setIsBudgetSheetOpen(true)}
            className="inline-flex items-center gap-1.5 font-bold bg-[#0c0d12] hover:bg-[#12141c] text-slate-300 border border-[#1f2330] hover:border-slate-700 px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer active:scale-95 whitespace-nowrap flex-shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            Set Budget
          </button>

          <button
            onClick={() => { setIsCreateOpen(true); setCreateError(null); }}
            className="inline-flex items-center gap-1.5 font-bold bg-[#0c0d12] hover:bg-[#12141c] text-slate-300 border border-[#1f2330] hover:border-slate-700 px-4 py-2.5 rounded-xl text-xs transition-all cursor-pointer active:scale-95 whitespace-nowrap flex-shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Category
          </button>

          <button
            onClick={handleSave}
            disabled={saving}
            className={`inline-flex items-center gap-1.5 font-black px-4 py-2.5 rounded-xl text-xs transition-all disabled:opacity-50 cursor-pointer active:scale-95 shadow-lg whitespace-nowrap flex-shrink-0 ${
              saved
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-500/10 hover:brightness-110'
            }`}
          >
            {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Limits'}
          </button>
        </div>
      </div>

      {/* Global error banner */}
      {error && (
        <div className="mb-4 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center justify-between gap-2">
          <span className="break-words min-w-0 flex-1">{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-white leading-none p-1 shrink-0">✕</button>
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className="py-24 text-center">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Synchronizing ledger...</p>
        </div>
      ) : rows.length === 0 ? (
        <div className="p-8 sm:p-20 text-center border-2 border-dashed border-[#1f2330] rounded-2xl">
          <p className="text-slate-300 font-bold text-sm mb-1">No budget categories yet</p>
          <p className="text-xs text-slate-500 mb-6 max-w-xs mx-auto leading-relaxed">Create a category to start tracking your spending limits.</p>
          <button onClick={() => setIsCreateOpen(true)}
            className="w-full sm:w-auto bg-gradient-to-br from-emerald-500 to-teal-600 hover:brightness-110 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer active:scale-95">
            Create Your First Category
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Stats — 2-col on mobile, 4-col on lg */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SummaryStat label="Month Budget"      value={formatPHP(allocatedBudget)}   sub="Total allowance" />
            <SummaryStat label="Total Spent"       value={formatPHP(totalSpent)}         sub={`${overallPct}% of budget`} />
            <SummaryStat label="Remaining"         value={formatPHP(remainingAllocated)} warning={remainingAllocated < 0} sub={remainingAllocated < 0 ? 'Over pool' : 'Available'} />
            <SummaryStat label="Warnings"          value={String(overCount)}             warning={overCount > 0} sub={`${overCount} limit${overCount !== 1 ? 's' : ''} reached`} />
          </div>

          {/* Budget cards grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rows.map(row => (
              <BudgetCard
                key={row.category_id}
                row={row}
                limitInput={limits[row.category_id] ?? ''}
                onLimitChange={val => setLimits(prev => ({ ...prev, [row.category_id]: val }))}
                onEdit={() => openEdit(row)}
                onDelete={() => setDeleteTarget(row)}
              />
            ))}
          </div>
        </div>
      )}
    </MainLayout>
  );
}