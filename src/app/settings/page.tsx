"use client";
import React, { useEffect, useState } from 'react';
import MainLayout from '@/components/MainLayout';
import { createClient } from '@/utils/supabase/client';

const supabase = createClient();

// ─── Toast ────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error';
interface Toast { message: string; type: ToastType; id: number }

function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-xl text-sm font-semibold shadow-xl border backdrop-blur-sm transition-all animate-fade-in pointer-events-auto
            ${t.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
            }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  title: string;
  description: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

function ConfirmDialog({ title, description, confirmLabel, onCancel, onConfirm, loading }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm bg-[#10121a] border border-rose-950/50 rounded-2xl p-6 shadow-2xl space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-white">{title}</h2>
            <p className="text-sm text-slate-400 mt-1">{description}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 bg-[#0c0d12] border border-[#1f2330] text-slate-300 font-semibold py-2.5 rounded-xl text-sm hover:bg-[#12141c] transition-all disabled:opacity-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-bold py-2.5 rounded-xl text-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            {loading ? 'Processing…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Section Header ────────────────────────────────────────────────────────────

function SectionHeader({ icon, label, color = 'text-emerald-400' }: { icon: React.ReactNode; label: string; color?: string }) {
  return (
    <div className={`flex items-center space-x-2 font-bold text-xs uppercase tracking-wider ${color}`}>
      {icon}
      <span>{label}</span>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [fullName, setFullName]   = useState('');
  const [email, setEmail]         = useState('');
  const [currency, setCurrency]   = useState('PHP');
  const [profileLoading, setProfileLoading] = useState(false);

  const [newPassword, setNewPassword]         = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [confirmDialog, setConfirmDialog] = useState<null | 'expenses'>(null);
  const [dangerLoading, setDangerLoading] = useState(false);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const pushToast = (message: string, type: ToastType) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { message, type, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  };

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setEmail(user.email ?? '');
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, currency, notification_enabled')
        .eq('id', user.id)
        .single();
      if (profile) {
        setFullName(profile.name ?? '');
        setCurrency(profile.currency ?? 'PHP');
      }
    };
    load();
  }, []);

  const handleSaveProfile = async () => {
    setProfileLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { pushToast('Not authenticated.', 'error'); setProfileLoading(false); return; }
    if (email !== user.email) {
      const { error: emailErr } = await supabase.auth.updateUser({ email });
      if (emailErr) { pushToast(emailErr.message, 'error'); setProfileLoading(false); return; }
    }
    const { error: profileErr } = await supabase
      .from('profiles')
      .upsert({ id: user.id, name: fullName, email, currency });
    setProfileLoading(false);
    if (profileErr) { pushToast(profileErr.message, 'error'); return; }
    pushToast('Profile updated successfully.', 'success');
    window.dispatchEvent(new Event('profile-updated'));
  };

  const handleChangePassword = async () => {
    if (!newPassword) return pushToast('Enter a new password.', 'error');
    if (newPassword !== confirmPassword) return pushToast('Passwords do not match.', 'error');
    if (newPassword.length < 8) return pushToast('Password must be at least 8 characters.', 'error');
    setPasswordLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordLoading(false);
    if (error) { pushToast(error.message, 'error'); return; }
    setNewPassword('');
    setConfirmPassword('');
    pushToast('Password changed successfully.', 'success');
  };

  const handleDeleteExpenses = async () => {
    setDangerLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { pushToast('Not authenticated.', 'error'); setDangerLoading(false); return; }
    const { error } = await supabase.from('expenses').delete().eq('user_id', user.id);
    setDangerLoading(false);
    setConfirmDialog(null);
    if (error) { pushToast(error.message, 'error'); return; }
    pushToast('All expenses deleted.', 'success');
  };

  const inputCls = "w-full bg-[#0c0d12] border border-[#1f2330] rounded-lg px-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500/60 transition-colors";

  return (
    <MainLayout>
      <ToastStack toasts={toasts} />

      {confirmDialog === 'expenses' && (
        <ConfirmDialog
          title="Delete all expenses"
          description="This will permanently erase every transaction in your account. This action cannot be undone."
          confirmLabel="Delete all"
          loading={dangerLoading}
          onCancel={() => setConfirmDialog(null)}
          onConfirm={handleDeleteExpenses}
        />
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1f2330] pb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-xs text-slate-400 mt-1">Manage your account profile, preferences, and security.</p>
        </div>
      </div>

      <div className="space-y-6 mt-6">

        {/* ── Profile Card — full width ── */}
        <div className="bg-[#0c0d12] border border-[#1f2330] rounded-xl shadow-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-[#1f2330]">
            <SectionHeader
              label="Profile Information"
              icon={
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
            />
          </div>
          <div className="px-6 py-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Full Name</label>
                <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Email Address</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
                <p className="text-[10px] text-slate-600">If changed, you'll receive a confirmation email.</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Default Currency</label>
                <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={`${inputCls} cursor-pointer`}>
                  <option value="PHP">PHP — Philippine Peso (₱)</option>
                  <option value="USD">USD — United States Dollar ($)</option>
                  <option value="EUR">EUR — Euro (€)</option>
                  <option value="JPY">JPY — Japanese Yen (¥)</option>
                  <option value="GBP">GBP — British Pound (£)</option>
                </select>
              </div>
            </div>
            <div className="mt-5 pt-4 border-t border-[#1f2330]">
              <button
                onClick={handleSaveProfile}
                disabled={profileLoading}
                className="inline-flex items-center gap-2 bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 font-bold px-4 py-2 rounded-lg text-xs transition-colors disabled:opacity-50 cursor-pointer"
              >
                {profileLoading ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Security + Danger Zone — side by side ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

          {/* Security Card */}
          <div className="bg-[#0c0d12] border border-[#1f2330] rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-[#1f2330]">
              <SectionHeader
                label="Security"
                icon={
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                }
              />
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">New Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Confirm New Password</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="pt-1 border-t border-[#1f2330]">
                <button
                  onClick={handleChangePassword}
                  disabled={passwordLoading}
                  className="inline-flex items-center gap-2 bg-[#0c0d12] hover:bg-[#12141c] border border-[#1f2330] text-slate-300 font-bold px-4 py-2 rounded-lg text-xs transition-colors disabled:opacity-50 cursor-pointer mt-3"
                >
                  {passwordLoading ? 'Updating…' : 'Change password'}
                </button>
              </div>
            </div>
          </div>

          {/* Danger Zone Card */}
          <div className="bg-[#0c0d12] border border-[#1f2330] rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-rose-950/40">
              <SectionHeader
                label="Danger Zone"
                color="text-rose-400"
                icon={
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                }
              />
            </div>
            <div className="px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-xs font-semibold text-rose-200">Delete all expenses</h4>
                  <p className="text-[10px] text-rose-300/50 mt-1 leading-relaxed max-w-xs">
                    Permanently flush your entire transaction ledger. This action cannot be undone.
                  </p>
                </div>
                <button
                  onClick={() => setConfirmDialog('expenses')}
                  className="shrink-0 bg-rose-500/10 border border-rose-500/20 text-rose-400 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-rose-500 hover:text-white transition-colors cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </MainLayout>
  );
}