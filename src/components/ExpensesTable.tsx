"use client";
import React, { useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const PAGE_SIZE = 10;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Expense {
  id: string;
  user_id: string;
  category_id: string | null;
  description: string;
  amount: number;
  expense_date: string;
  created_at?: string;
  categories?: { id: string; name: string } | null;
}

interface Category {
  id: string;
  name: string;
  color: string;
}

// ─── Category badge styles ─────────────────────────────────────────────────────

const getCategoryStyles = (name: string) => {
  switch (name.toLowerCase()) {
    case 'food':        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'transport':   return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case 'subscription':
    case 'subs':        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    case 'health':      return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    case 'utilities':   return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    default:            return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
  }
};

// ─── Edit Modal ───────────────────────────────────────────────────────────────

interface EditModalProps {
  expense: Expense;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}

function EditModal({ expense, categories, onClose, onSaved }: EditModalProps) {
  const [description, setDescription] = useState(expense.description ?? '');
  const [amount, setAmount]           = useState(String(expense.amount));
  const [categoryId, setCategoryId]   = useState(expense.category_id ?? '');
  const [expenseDate, setExpenseDate] = useState(expense.expense_date);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);

  const handleSave = async () => {
    if (!amount || isNaN(Number(amount))) return setError('Please enter a valid amount.');
    setLoading(true);
    setError(null);

    const { error: updateError } = await supabase
      .from('expenses')
      .update({
        description:  description || null,
        amount:       Number(amount),
        category_id:  categoryId || null,
        expense_date: expenseDate,
      })
      .eq('id', expense.id);

    setLoading(false);
    if (updateError) { setError(updateError.message); return; }
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-md bg-[#10121a] border border-[#1e2230] rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Edit Expense</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors text-2xl leading-none">×</button>
        </div>

        {error && (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">{error}</div>
        )}

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</label>
            <input
              type="text"
              placeholder="e.g. Jollibee lunch"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#07080d] border border-[#1f2332] rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Amount (₱)</label>
            <input
              type="number"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-[#07080d] border border-[#1f2332] rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-[#07080d] border border-[#1f2332] rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-all"
            >
              <option value="">— None —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Date</label>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full bg-[#07080d] border border-[#1f2332] rounded-xl px-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 bg-[#1a1d2a] border border-[#1e2230] text-slate-300 font-semibold py-2.5 rounded-xl text-sm hover:bg-[#222635] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold py-2.5 rounded-xl text-sm shadow-lg shadow-blue-500/20 hover:opacity-95 transition-all disabled:opacity-50"
          >
            {loading ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Delete Confirm Dialog ─────────────────────────────────────────────────────

interface DeleteConfirmProps {
  expense: Expense;
  onCancel: () => void;
  onConfirmed: () => void;
}

function DeleteConfirm({ expense, onCancel, onConfirmed }: DeleteConfirmProps) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    await supabase.from('expenses').delete().eq('id', expense.id);
    setLoading(false);
    onConfirmed();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm bg-[#10121a] border border-rose-950/50 rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Delete Expense</h2>
            <p className="text-sm text-slate-400 mt-1">
              Are you sure you want to delete{' '}
              <span className="text-white font-semibold">"{expense.description || 'this expense'}"</span>?
              This action cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-[#1a1d2a] border border-[#1e2230] text-slate-300 font-semibold py-2.5 rounded-xl text-sm hover:bg-[#222635] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 rounded-xl text-sm transition-all disabled:opacity-50"
          >
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ExpensesTable ───────────────────────────────────────────────────────

export default function ExpensesTable() {
  const [expenses, setExpenses]       = useState<Expense[]>([]);
  const [categories, setCategories]   = useState<Category[]>([]);
  const [totalCount, setTotalCount]   = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading]         = useState(true);

  const [editTarget, setEditTarget]     = useState<Expense | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  // ── Fetch categories once ──
  useEffect(() => {
    const fetchCategories = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('categories')
        .select('id, name, color')
        .eq('user_id', user.id)
        .order('name');
      setCategories((data as Category[]) ?? []);
    };
    fetchCategories();
  }, []);

  // ── Fetch paginated expenses ──
  const fetchExpenses = useCallback(async (page: number) => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const from = (page - 1) * PAGE_SIZE;
    const to   = from + PAGE_SIZE - 1;

    const { data, count, error } = await supabase
      .from('expenses')
      .select('id, user_id, category_id, description, amount, expense_date, created_at, categories(id, name)', { count: 'exact' })
      .eq('user_id', user.id)
      .order('expense_date', { ascending: false })
      .order('created_at',   { ascending: false })
      .range(from, to);

    if (!error) {
      const normalized: Expense[] = ((data as any[]) ?? []).map((e: any) => ({
        ...e,
        categories: Array.isArray(e.categories)
          ? (e.categories[0] ?? null)
          : e.categories,
      }));
      setExpenses(normalized);      
      setTotalCount(count ?? 0);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchExpenses(currentPage); }, [currentPage, fetchExpenses]);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const handleEditSaved  = () => fetchExpenses(currentPage);
  const handleDeleteDone = () => {
    // If last item on page >1, go back a page
    if (expenses.length === 1 && currentPage > 1) setCurrentPage((p) => p - 1);
    else fetchExpenses(currentPage);
  };

  // ── Pagination page numbers ──
  const pageNumbers = (() => {
    const pages: (number | '…')[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('…');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('…');
      pages.push(totalPages);
    }
    return pages;
  })();

  return (
    <>
      {editTarget && (
        <EditModal
          expense={editTarget}
          categories={categories}
          onClose={() => setEditTarget(null)}
          onSaved={handleEditSaved}
        />
      )}
      {deleteTarget && (
        <DeleteConfirm
          expense={deleteTarget}
          onCancel={() => setDeleteTarget(null)}
          onConfirmed={() => { setDeleteTarget(null); handleDeleteDone(); }}
        />
      )}

      <div className="w-full bg-[#10121a]/80 border border-[#1e2230] rounded-2xl overflow-hidden backdrop-blur-md">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1e2230] text-[11px] font-bold tracking-wider text-slate-400 uppercase bg-[#0c0e14]/50">
                <th className="py-4 px-6">Description</th>
                <th className="py-4 px-6">Category</th>
                <th className="py-4 px-6">Date</th>
                <th className="py-4 px-6 text-right">Amount</th>
                <th className="py-4 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e2230]/60 text-sm text-slate-200">
              {loading ? (
                // Skeleton rows
                Array.from({ length: PAGE_SIZE }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-6"><div className="h-3.5 bg-slate-800 rounded w-40" /></td>
                    <td className="py-4 px-6"><div className="h-5 bg-slate-800 rounded-md w-20" /></td>
                    <td className="py-4 px-6"><div className="h-3.5 bg-slate-800 rounded w-16" /></td>
                    <td className="py-4 px-6 text-right"><div className="h-3.5 bg-slate-800 rounded w-20 ml-auto" /></td>
                    <td className="py-4 px-6"><div className="h-7 bg-slate-800 rounded-lg w-16 mx-auto" /></td>
                  </tr>
                ))
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-500 font-medium">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-8 h-8 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 2.5 2 2.5-2 3.5 2z" />
                      </svg>
                      <span>No expenses recorded yet.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => {
                  const categoryName = expense.categories?.name || 'Uncategorized';
                  const formattedDate = new Date(expense.expense_date).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', timeZone: 'UTC',
                  });

                  return (
                    <tr key={expense.id} className="hover:bg-white/[0.015] transition-colors group">
                      <td className="py-4 px-6 font-semibold text-white">
                        {expense.description || <span className="text-slate-500 font-normal italic">No description</span>}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center text-xs font-medium px-2.5 py-0.5 rounded-md border ${getCategoryStyles(categoryName)}`}>
                          {categoryName}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-400">{formattedDate}</td>
                      <td className="py-4 px-6 text-right font-bold text-white text-base">
                        ₱{Number(expense.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setEditTarget(expense)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 border border-transparent hover:border-cyan-500/20 transition-all"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteTarget(expense)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="border-t border-[#1e2230] px-6 py-4 flex items-center justify-between bg-[#0c0e14]/30">
          <span className="text-xs text-slate-500 font-medium">
            {loading ? (
              <span className="animate-pulse">Loading…</span>
            ) : (
              <>
                Showing{' '}
                <strong className="text-slate-300">
                  {Math.min((currentPage - 1) * PAGE_SIZE + 1, totalCount)}–{Math.min(currentPage * PAGE_SIZE, totalCount)}
                </strong>{' '}
                of <strong className="text-slate-300">{totalCount}</strong> expenses
              </>
            )}
          </span>
          <div className="flex items-center gap-1">
            {/* Prev */}
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || loading}
              className="p-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-white/[0.03] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            {/* Page numbers */}
            {pageNumbers.map((p, i) =>
              p === '…' ? (
                <span key={`ellipsis-${i}`} className="px-2 text-slate-600 text-xs select-none">…</span>
              ) : (
                <button
                  key={p}
                  onClick={() => handlePageChange(p as number)}
                  disabled={loading}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all disabled:cursor-not-allowed ${
                    currentPage === p
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-md shadow-blue-500/10'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.03]'
                  }`}
                >
                  {p}
                </button>
              )
            )}

            {/* Next */}
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages || loading}
              className="p-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-white/[0.03] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}