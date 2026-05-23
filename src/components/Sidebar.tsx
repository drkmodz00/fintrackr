"use block"
"use client";
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';

// ─── Icons ────────────────────────────────────────────────────────────────────

const Icons = {
  Dashboard: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
    </svg>
  ),
  Expenses: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Budget: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  Analytics: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  Settings: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Logout: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
  ChevronRight: () => (
    <svg className="w-3.5 h-3.5 text-slate-600 shrink-0 select-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  ),
};

const MAIN_NAV = [
  { label: 'Dashboard', href: '/dashboard', icon: Icons.Dashboard },
  { label: 'Expenses',  href: '/expenses',  icon: Icons.Expenses  },
  { label: 'Budget',    href: '/budget',    icon: Icons.Budget    },
  { label: 'Analytics', href: '/analytics', icon: Icons.Analytics },
];

const ACCOUNT_NAV = [
  { label: 'Settings', href: '/settings', icon: Icons.Settings },
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

function NavItem({
  href,
  icon: Icon,
  label,
  active,
}: {
  href: string;
  icon: () => JSX.Element;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl font-medium transition-all
        ${active
          ? 'text-white bg-gradient-to-r from-emerald-600/15 to-transparent border-l-2 border-emerald-500'
          : 'text-slate-400 hover:text-white hover:bg-white/[0.03] border-l-2 border-transparent'
        }`}
    >
      <Icon />
      <span>{label}</span>
    </Link>
  );
}

export default function Sidebar() {
  const router   = useRouter();
  const pathname = usePathname();

  const [displayName, setDisplayName] = useState('');
  const [initials, setInitials]       = useState('');
  const [plan]                        = useState('Free plan');
  const [loggingOut, setLoggingOut]   = useState(false);
  const [showMobileMeta, setShowMobileMeta] = useState(false);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single();

      const name = profile?.name || user.email?.split('@')[0] || 'User';

      const parts = name.trim().split(' ');
      const short = parts.length > 1
        ? `${parts[0]} ${parts[parts.length - 1][0]}.`
        : parts[0];

      setDisplayName(short);
      setInitials(getInitials(name));
    };

    load();
    window.addEventListener('profile-updated', load);
    return () => window.removeEventListener('profile-updated', load);
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth');
  };

  const activeSegment = [...MAIN_NAV, ...ACCOUNT_NAV].find(
    item => pathname === item.href || pathname.startsWith(item.href + '/')
  )?.label || 'App';

  return (
    <>
      {/* ─── MOBILE VIEW (TOP HEADER WITH COMPLETE LOGO STYLE & BOTTOM BAR) ─── */}
      <div className="lg:hidden contents">
        
        {/* Mobile Top Fixed Header containing Full Identity Branding & Breadcrumbs */}
        <header className="fixed top-0 left-0 right-0 h-14 bg-[#0c0d12]/95 backdrop-blur border-b border-[#1f2330] flex items-center px-4 justify-between z-45 select-none">
          <div className="flex items-center space-x-2.5">
            {/* Exactly Match Desktop Gradient Logo Block Container */}
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center border border-emerald-400/20 shadow-md shadow-emerald-500/10 shrink-0">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            
            {/* Exactly Match Desktop Identity Typography Architecture paired with Contextual Step */}
            <div className="flex items-center space-x-2">
              <span className="text-base font-black tracking-tight text-white leading-none">
                fin<span className="text-emerald-400">trackr</span>
              </span>
              <Icons.ChevronRight />
              <span className="text-slate-400 font-semibold text-xs tracking-wide">
                {activeSegment}
              </span>
            </div>
          </div>

          {/* Clean Plan Metadata */}
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider bg-[#11131a] px-2.5 py-1 rounded-md border border-[#1f2330]">
            {plan}
          </div>
        </header>

        {/* Mobile Dynamic Slide-up Drawer Overlay */}
        <div className={`fixed inset-x-0 bottom-16 bg-[#0c0d12] border-t border-[#1f2330] p-4 z-40 space-y-3 rounded-t-2xl transition-all duration-300 transform shadow-2xl ${showMobileMeta ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'}`}>
          <div className="flex items-center space-x-3 pb-2 border-b border-[#1f2330]">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold shadow-inner">
              {initials || <span className="w-3 h-3 rounded-full bg-white/20 animate-pulse block" />}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-white truncate">{displayName || 'User'}</h4>
              <p className="text-[10px] text-emerald-400 font-medium leading-none mt-0.5">{plan}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Link 
              href="/settings" 
              onClick={() => setShowMobileMeta(false)}
              className="flex items-center justify-center space-x-2 bg-[#11131a] hover:bg-[#161922] text-slate-300 font-medium text-xs p-2.5 rounded-xl border border-[#1f2330]"
            >
              <Icons.Settings />
              <span>Settings</span>
            </Link>
            <button
              onClick={() => { setShowMobileMeta(false); handleLogout(); }}
              disabled={loggingOut}
              className="flex items-center justify-center space-x-2 bg-rose-500/5 border border-rose-500/10 text-rose-400 font-medium text-xs p-2.5 rounded-xl disabled:opacity-40"
            >
              <Icons.Logout />
              <span>{loggingOut ? 'Signing out...' : 'Sign Out'}</span>
            </button>
          </div>
        </div>

        {/* Tactile Mobile Bottom Bar Navigation Grid */}
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#0c0d12]/95 backdrop-blur border-t border-[#1f2330] grid grid-cols-5 items-center px-2 z-40 shadow-xl select-none">
          {MAIN_NAV.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setShowMobileMeta(false)}
                className={`flex flex-col items-center justify-center space-y-1 h-full transition-all rounded-xl ${
                  isActive ? 'text-emerald-400 font-bold' : 'text-slate-500 font-medium'
                }`}
              >
                <div className={`p-1.5 rounded-lg transition-colors ${isActive ? 'bg-emerald-500/10' : 'bg-transparent'}`}>
                  <Icon />
                </div>
                <span className="text-[10px] tracking-tight">{item.label}</span>
              </Link>
            );
          })}
          
          {/* Active Account Profile Tab Trigger */}
          <button
            onClick={() => setShowMobileMeta(!showMobileMeta)}
            className={`flex flex-col items-center justify-center h-full space-y-1 active:scale-95 transition-transform ${showMobileMeta ? 'text-emerald-400' : 'text-slate-500'}`}
          >
            <div className={`w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-[10px] font-bold border transition-all ${showMobileMeta ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-[#1f2330]'}`}>
              <div className="w-full h-full bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white font-black">
                {initials || 'U'}
              </div>
            </div>
            <span className="text-[10px] font-medium tracking-tight">Account</span>
          </button>
        </nav>
      </div>

      {/* ─── DESKTOP SIDEBAR VIEW (UNCHANGED CORE STRUCTURAL DESIGN) ─────────── */}
      <aside className="hidden lg:flex w-64 bg-[#0c0d12] border-r border-[#1f2330] flex-col justify-between p-6 shrink-0">
        <div className="space-y-8">

          {/* Brand Logo */}
          <div className="flex items-center space-x-2.5 px-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/10 border border-emerald-400/20">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <span className="text-xl font-black tracking-tight text-white">
              fin<span className="text-emerald-400">trackr</span>
            </span>
          </div>

          {/* Menu Tree Sections */}
          <nav className="space-y-1">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-2 mb-2">
              Main Menu
            </p>

            {MAIN_NAV.map(({ label, href, icon }) => (
              <NavItem
                key={href}
                href={href}
                icon={icon}
                label={label}
                active={pathname === href || pathname.startsWith(href + '/')}
              />
            ))}

            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-2 pt-4">
              Accounts
            </p>

            {ACCOUNT_NAV.map(({ label, href, icon }) => (
              <NavItem
                key={href}
                href={href}
                icon={icon}
                label={label}
                active={pathname === href}
              />
            ))}
          </nav>
        </div>

        {/* User Footer Panel */}
        <div className="border-t border-[#1f2330] pt-4 flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white text-sm font-bold shadow-inner shrink-0">
              {initials || (
                <span className="w-4 h-4 rounded-full bg-white/20 animate-pulse block" />
              )}
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-semibold text-white leading-tight truncate">
                {displayName || <span className="inline-block w-20 h-3 bg-slate-700 rounded animate-pulse" />}
              </h4>
              <span className="text-xs text-emerald-400 font-medium">{plan}</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            disabled={loggingOut}
            title="Sign out"
            className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-white/[0.02] transition-colors disabled:opacity-40 shrink-0 cursor-pointer"
          >
            <Icons.Logout />
          </button>
        </div>
      </aside>
    </>
  );
}