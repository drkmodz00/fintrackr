"use block"
"use client";
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import MainLayout from '@/components/MainLayout';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

interface Category { id: string; name: string; color: string; }
interface Expense {
  id: string;
  description: string;
  amount: number;
  expense_date: string;
  category_id: string | null;
  categories: Category | null;
}

function formatPHP(amount: number) {
  return `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

// ─── Add Expense Modal ────────────────────────────────────────────────────────

function AddExpenseModal({
  categories, onClose, onSaved,
}: { categories: Category[]; onClose: () => void; onSaved: () => void }) {
  const [description, setDescription] = useState('');
  const [amount, setAmount]           = useState('');
  const [categoryId, setCategoryId]   = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const selectedCategory = useMemo(() => categories.find(c => c.id === categoryId), [categoryId, categories]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return setError('Enter a valid amount greater than 0.');
    }
    setLoading(true);
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('User session expired. Please log in again.');
      setLoading(false);
      return;
    }
    const { error: err } = await supabase
      .from('expenses')
      .insert([{
        user_id: user.id,
        description: description.trim() || 'Untitled Expense',
        amount: Number(amount),
        expense_date: expenseDate,
        category_id: categoryId || null,
      }]);
    setLoading(false);
    if (err) { setError(err.message); return; }
    onSaved(); onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
      {/* Sheet slides up from bottom on mobile, centered modal on desktop */}
      <div className="w-full sm:max-w-md bg-[#0f111a] border border-[#1f2435] sm:rounded-2xl shadow-2xl overflow-hidden transform transition-all rounded-t-2xl max-h-[92dvh] flex flex-col">
        
        {/* Drag handle - mobile only */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-700" />
        </div>

        <div className="px-5 py-4 bg-[#131622] border-b border-[#1f2435] flex items-center justify-between flex-shrink-0">
          <div className="pr-4">
            <h2 className="text-base font-bold text-white">Add New Expense</h2>
            <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">Log a brand new transaction into your profile ledger.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors cursor-pointer flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1">
          {error && <div className="mx-5 mt-4 text-xs font-medium text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2.5">{error}</div>}

          <form onSubmit={handleCreate} className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</label>
              <input type="text" required value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Starbucks Coffee, Grocery Run"
                className="w-full bg-[#07080d] border border-[#1f2332] rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all" />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Amount (PHP)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-4 flex items-center pointer-events-none font-bold text-slate-500 text-sm">₱</span>
                <input type="number" inputMode="decimal" min="1" step="any" required value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"
                  className="w-full bg-[#07080d] border border-[#1f2332] rounded-xl pl-8 pr-4 py-3 text-sm font-semibold text-slate-200 focus:outline-none focus:border-emerald-500 transition-all" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Category</label>
              <div className="relative flex items-center">
                <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
                  className="w-full bg-[#07080d] border border-[#1f2332] rounded-xl pl-4 pr-10 py-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-all appearance-none cursor-pointer">
                  <option value="">— Uncategorized / None —</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {selectedCategory && (
                  <span className="absolute right-10 w-2.5 h-2.5 rounded-full ring-2 ring-offset-2 ring-offset-[#07080d]"
                    style={{ backgroundColor: selectedCategory.color, '--tw-ring-color': selectedCategory.color } as React.CSSProperties} />
                )}
                <div className="absolute right-4 pointer-events-none text-slate-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</label>
              <input type="date" required value={expenseDate} onChange={e => setExpenseDate(e.target.value)}
                className="w-full bg-[#07080d] border border-[#1f2332] rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-all cursor-pointer" />
            </div>

            {/* Sticky footer buttons */}
            <div className="flex gap-3 pt-4 border-t border-[#1f2435]">
              <button type="button" onClick={onClose}
                className="flex-1 bg-[#1a1d2a] border border-[#1e2230] text-slate-300 font-semibold py-3 rounded-xl text-sm hover:bg-[#222635] transition-all cursor-pointer">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold py-3 rounded-xl text-sm shadow-lg shadow-emerald-500/20 hover:opacity-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer">
                {loading && <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>}
                {loading ? 'Creating…' : 'Add Expense'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Edit Expense Modal ───────────────────────────────────────────────────────

function EditExpenseModal({
  expense, categories, onClose, onSaved,
}: { expense: Expense; categories: Category[]; onClose: () => void; onSaved: () => void }) {
  const [description, setDescription] = useState(expense.description ?? '');
  const [amount, setAmount]           = useState(String(expense.amount));
  const [categoryId, setCategoryId]   = useState(expense.category_id ?? '');
  const [expenseDate, setExpenseDate] = useState(expense.expense_date);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const selectedCategory = useMemo(() => categories.find(c => c.id === categoryId), [categoryId, categories]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return setError('Enter a valid amount.');
    setLoading(true);
    const { error: err } = await supabase
      .from('expenses')
      .update({
        description: description.trim() || 'Untitled Expense',
        amount: Number(amount),
        expense_date: expenseDate,
        category_id: categoryId || null,
      })
      .eq('id', expense.id);
    setLoading(false);
    if (err) { setError(err.message); return; }
    onSaved(); onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full sm:max-w-md bg-[#0f111a] border border-[#1f2435] sm:rounded-2xl shadow-2xl overflow-hidden transform transition-all rounded-t-2xl max-h-[92dvh] flex flex-col">

        <div className="sm:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-slate-700" />
        </div>

        <div className="px-5 py-4 bg-[#131622] border-b border-[#1f2435] flex items-center justify-between flex-shrink-0">
          <div className="pr-4">
            <h2 className="text-base font-bold text-white">Edit Expense</h2>
            <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">Modify parameters or update account record tracks.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors cursor-pointer flex-shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {error && <div className="mx-5 mt-4 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2.5">{error}</div>}

          <form onSubmit={handleSave} className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</label>
              <input type="text" value={description} onChange={e => setDescription(e.target.value)} required
                className="w-full bg-[#07080d] border border-[#1f2332] rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-all" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Amount (₱)</label>
              <input type="number" inputMode="decimal" min="1" step="any" required value={amount} onChange={e => setAmount(e.target.value)}
                className="w-full bg-[#07080d] border border-[#1f2332] rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-all" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Category</label>
              <div className="relative flex items-center">
                <select value={categoryId} onChange={e => setCategoryId(e.target.value)}
                  className="w-full bg-[#07080d] border border-[#1f2332] rounded-xl pl-4 pr-10 py-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-all appearance-none cursor-pointer">
                  <option value="">— Uncategorized / None —</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {selectedCategory && (
                  <span className="absolute right-10 w-2.5 h-2.5 rounded-full ring-2 ring-offset-2 ring-offset-[#07080d]"
                    style={{ backgroundColor: selectedCategory.color, '--tw-ring-color': selectedCategory.color } as React.CSSProperties} />
                )}
                <div className="absolute right-4 pointer-events-none text-slate-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</label>
              <input type="date" value={expenseDate} onChange={e => setExpenseDate(e.target.value)}
                className="w-full bg-[#07080d] border border-[#1f2332] rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-all cursor-pointer" />
            </div>

            <div className="flex gap-3 pt-4 border-t border-[#1f2435]">
              <button type="button" onClick={onClose}
                className="flex-1 bg-[#1a1d2a] border border-[#1e2230] text-slate-300 font-semibold py-3 rounded-xl text-sm hover:bg-[#222635] transition-all cursor-pointer">
                Cancel
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold py-3 rounded-xl text-sm shadow-lg shadow-emerald-500/20 hover:opacity-95 transition-all disabled:opacity-50 cursor-pointer">
                {loading ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ExpensesPage() {
  const [expenses, setExpenses]         = useState<Expense[]>([]);
  const [categories, setCategories]     = useState<Category[]>([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [filterCat, setFilterCat]       = useState('');
  const [isAddOpen, setIsAddOpen]       = useState(false);
  const [editTarget, setEditTarget]     = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [deleting, setDeleting]         = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const [{ data: cats }, { data: exps }] = await Promise.all([
      supabase.from('categories').select('id, name, color').eq('user_id', user.id).order('name'),
      supabase.from('expenses')
        .select('id, description, amount, expense_date, category_id, categories(id, name, color)')
        .eq('user_id', user.id)
        .order('expense_date', { ascending: false })
    ]);

    setCategories((cats as Category[]) ?? []);
    setExpenses((exps ?? []).map((e) => ({
      ...e,
      categories: Array.isArray(e.categories) ? (e.categories[0] ?? null) : e.categories,
    })));
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    await supabase.from('expenses').delete().eq('id', deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    fetchData();
  };

  const filtered = useMemo(() => expenses.filter(e => {
    const matchSearch = !search || (e.description ?? '').toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCat || e.category_id === filterCat;
    return matchSearch && matchCat;
  }), [expenses, search, filterCat]);

  const totalFiltered = useMemo(() => filtered.reduce((s, e) => s + Number(e.amount), 0), [filtered]);
  const grossTotal    = useMemo(() => expenses.reduce((s, e) => s + Number(e.amount), 0), [expenses]);

  return (
    <MainLayout>
      {isAddOpen && <AddExpenseModal categories={categories} onClose={() => setIsAddOpen(false)} onSaved={fetchData} />}
      {editTarget && <EditExpenseModal expense={editTarget} categories={categories} onClose={() => setEditTarget(null)} onSaved={fetchData} />}

      {/* ── Delete Confirmation ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4 pb-4 sm:pb-0">
          <div className="w-full max-w-sm bg-[#10121a] border border-rose-950/40 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-white">Delete Transaction?</h2>
                <p className="text-xs text-slate-400 mt-1 break-words leading-relaxed">
                  "<span className="text-slate-200">{deleteTarget.description || 'Untitled'}</span>" ({formatPHP(Number(deleteTarget.amount))}) will be permanently deleted.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} disabled={deleting}
                className="flex-1 bg-[#1a1d2a] border border-[#1e2230] text-slate-300 font-semibold py-3 rounded-xl text-sm hover:bg-[#222635] transition-all disabled:opacity-50 cursor-pointer">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 rounded-xl text-sm transition-all disabled:opacity-50 cursor-pointer">
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div>

          {/* ── Header ── */}
          <div className="flex items-center justify-between gap-3 pb-5 border-b border-[#1e2230] mb-5">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white leading-tight">All Expenses</h1>
              <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">Browse, filter, and track your financial metrics.</p>
            </div>
            <button
              onClick={() => setIsAddOpen(true)}
              className="inline-flex items-center justify-center gap-2 font-bold px-4 sm:px-5 py-2.5 rounded-xl text-sm shadow-lg bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-emerald-500/20 hover:opacity-95 transition-all active:scale-95 flex-shrink-0 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              <span className="hidden xs:inline">Add Expense</span>
              <span className="xs:hidden">Add</span>
            </button>
          </div>

          {/* ── Stats Cards — 3-col on lg, 3-col on sm, stacked on xs ── */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-[#10121a]/80 border border-[#1e2230] p-3 sm:p-4 rounded-2xl relative overflow-hidden col-span-3 sm:col-span-1">
              <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 leading-tight">Filtered Total</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-black text-white tracking-tight break-all">{formatPHP(totalFiltered)}</p>
              <div className="absolute right-2 bottom-1 text-slate-800/40 pointer-events-none font-bold text-3xl select-none">₱</div>
            </div>
            <div className="bg-[#10121a]/80 border border-[#1e2230] p-3 sm:p-4 rounded-2xl col-span-3 sm:col-span-1">
              <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 leading-tight">Transactions</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-black text-emerald-400 tracking-tight">
                {filtered.length}<span className="text-[10px] sm:text-xs font-normal text-slate-500 ml-1">records</span>
              </p>
            </div>
            <div className="bg-[#10121a]/80 border border-[#1e2230] p-3 sm:p-4 rounded-2xl col-span-3 sm:col-span-1">
              <p className="text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 leading-tight">Total Expenses</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-black text-slate-400 tracking-tight break-all">{formatPHP(grossTotal)}</p>
            </div>
          </div>

          {/* ── Search & Filter ── */}
          <div className="flex flex-col sm:flex-row gap-2.5 mb-5">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-600 pointer-events-none">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder="Search expenses..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-[#10121a] border border-[#1e2230] rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 transition-all"
              />
            </div>
            <select
              value={filterCat}
              onChange={e => setFilterCat(e.target.value)}
              className="bg-[#10121a] border border-[#1e2230] rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500 transition-all sm:min-w-[180px] cursor-pointer"
            >
              <option value="">All Categories</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* ── Data Output ── */}
          {loading ? (
            <div className="space-y-2.5">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-[72px] bg-[#10121a]/50 border border-[#1e2230] rounded-xl animate-pulse w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 sm:p-16 text-center border border-dashed border-[#222635] rounded-2xl">
              <div className="w-12 h-12 rounded-2xl bg-[#1a1e2e] flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-slate-400 font-semibold mb-1 text-sm">No expenses found</p>
              <p className="text-xs text-slate-600 mb-5 max-w-xs mx-auto">Try adjusting your search or filters, or add your first expense.</p>
              <button onClick={() => setIsAddOpen(true)}
                className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer">
                Add First Expense
              </button>
            </div>
          ) : (
            <div className="bg-[#10121a]/80 border border-[#1e2230] rounded-2xl overflow-hidden shadow-xl">
              
              {/* Desktop table header */}
              <div className="hidden sm:grid grid-cols-[1fr_150px_110px_100px] gap-4 px-5 py-3 bg-[#141722]/60 border-b border-[#1e2230] text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <span>Description</span>
                <span className="text-right">Category</span>
                <span className="text-right">Date</span>
                <span className="text-right">Amount</span>
              </div>

              <div className="divide-y divide-[#1e2230]">
                {filtered.map(exp => (
                  <div key={exp.id} className="group">

                    {/* ── MOBILE CARD VIEW (hidden on sm+) ── */}
                    <div className="sm:hidden p-4 space-y-3">
                      {/* Row 1: avatar + description + actions */}
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-800/60 border border-slate-700/30 flex items-center justify-center text-xs font-bold text-slate-300 flex-shrink-0">
                          {(exp.description ?? exp.categories?.name ?? '?')[0].toUpperCase()}
                        </div>
                        <span className="text-sm font-semibold text-white truncate flex-1 min-w-0">{exp.description || '—'}</span>
                        {/* Always-visible action buttons on mobile */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => setEditTarget(exp)}
                            className="p-2 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all cursor-pointer active:scale-95">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button onClick={() => setDeleteTarget(exp)}
                            className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer active:scale-95">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Row 2: category badge + date + amount */}
                      <div className="flex items-center justify-between gap-2 pl-12">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {exp.categories ? (
                            <span
                              className="text-[10px] px-2 py-0.5 rounded-md font-bold border inline-block max-w-full truncate tracking-wide"
                              style={{
                                backgroundColor: `${exp.categories.color}15`,
                                color: exp.categories.color,
                                borderColor: `${exp.categories.color}35`,
                              }}
                            >
                              {exp.categories.name}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-600 font-medium">Uncategorized</span>
                          )}
                          <span className="text-[10px] text-slate-500 whitespace-nowrap flex-shrink-0">
                            {new Date(exp.expense_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        </div>
                        <span className="text-sm font-bold text-white tabular-nums tracking-tight flex-shrink-0">
                          {formatPHP(Number(exp.amount))}
                        </span>
                      </div>
                    </div>

                    {/* ── DESKTOP TABLE ROW (hidden on mobile) ── */}
                    <div className="hidden sm:grid grid-cols-[1fr_150px_110px_100px] gap-4 px-5 py-4 items-center hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-800/60 border border-slate-700/30 flex items-center justify-center text-xs font-bold text-slate-300 flex-shrink-0">
                          {(exp.description ?? exp.categories?.name ?? '?')[0].toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-white truncate">{exp.description || '—'}</span>
                        {/* Hover actions */}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-auto flex-shrink-0">
                          <button onClick={() => setEditTarget(exp)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all cursor-pointer">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button onClick={() => setDeleteTarget(exp)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className="text-right">
                        {exp.categories ? (
                          <span
                            className="text-[10px] px-2.5 py-0.5 rounded-md font-bold border inline-block max-w-full truncate tracking-wide"
                            style={{
                              backgroundColor: `${exp.categories.color}15`,
                              color: exp.categories.color,
                              borderColor: `${exp.categories.color}35`,
                            }}
                          >
                            {exp.categories.name}
                          </span>
                        ) : (
                          <span className="text-slate-600 font-medium text-sm">—</span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500 font-medium text-right whitespace-nowrap">
                        {new Date(exp.expense_date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className="text-sm font-bold text-white text-right tabular-nums tracking-tight">
                        {formatPHP(Number(exp.amount))}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
      </div>
    </MainLayout>
  );
}