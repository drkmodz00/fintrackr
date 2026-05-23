"use client";
import React, { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

const supabase = createClient();

export default function AuthPage() {
  const router = useRouter();

  const [isRegisterMode, setIsRegisterMode] = useState(false);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleModeSwitch = (registerMode: boolean) => {
    setIsRegisterMode(registerMode);
    setError(null);
    setSuccessMessage(null);
    setPassword('');
    setShowPassword(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (isRegisterMode) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
          },
        });

        if (signUpError) throw signUpError;

        if (data.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: data.user.id,
              name: fullName,
              email: email,
              currency: 'PHP',
              notification_enabled: true,
            });

          if (profileError) throw profileError;
        }

        setSuccessMessage('Account created! Check your email to confirm your address.');
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        setSuccessMessage('Signed in successfully. Redirecting…');
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    /* ── ROOT: full viewport, flex row on lg+, column on mobile ── */
    <div className="min-h-screen w-full bg-[#0c0d12] text-slate-100 flex flex-col lg:flex-row overflow-x-hidden font-sans antialiased selection:bg-emerald-500/30">

      {/* ── LEFT PANEL ── visible on lg+; collapses to a compact header strip on mobile ── */}
      <div className="
        /* Mobile: slim horizontal header bar */
        flex lg:hidden
        items-center justify-between
        px-5 py-4
        border-b border-[#1f2330]
        bg-[#0c0d12]
        relative overflow-hidden
        shrink-0
      ">
        {/* Ambient glow (mobile) */}
        <div className="absolute inset-0 -z-0 pointer-events-none">
          <div className="absolute top-[-60%] left-[-10%] w-[50%] h-[200%] rounded-full bg-emerald-600/10 blur-[80px]" />
        </div>

        {/* Brand logo */}
        <div className="flex items-center space-x-2.5 z-10 select-none">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-emerald-400/20">
            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <span className="text-lg font-black tracking-tight text-white">
            fin<span className="text-emerald-400">trackr</span>
          </span>
        </div>

        {/* Tagline — hidden on very small screens */}
        <p className="hidden sm:block text-xs text-slate-500 font-medium z-10 max-w-[55%] text-right leading-snug">
          Take control of your structural capital.
        </p>
      </div>

      {/* ── LEFT PANEL — desktop only ── */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#0c0d12] border-r border-[#1f2330] flex-col justify-between p-12 overflow-hidden shrink-0">
        {/* Ambient glow: emerald/teal */}
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[60%] rounded-full bg-emerald-600/10 blur-[140px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-500/5 blur-[120px] pointer-events-none" />

        {/* Brand logo */}
        <div className="flex items-center space-x-2.5 z-10 select-none">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-emerald-400/20 transition-transform duration-300 hover:scale-105">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <span className="text-xl font-black tracking-tight text-white">
            fin<span className="text-emerald-400">trackr</span>
          </span>
        </div>

        <div className="space-y-4 max-w-md my-auto z-10">
          <h2 className="text-4xl font-extrabold tracking-tight text-white leading-[1.15] bg-gradient-to-r from-white via-white to-slate-400 bg-clip-text text-transparent">
            Take control of your structural capital.
          </h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            Log itemized expenses, run real-time velocity projections, track active categories, and scale down waste with clean, localized asset telemetry.
          </p>
        </div>

        <div className="text-xs text-slate-600 z-10 font-medium tracking-wide">
          © 2026 fintrackr. All rights reserved.
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="
        w-full lg:w-1/2
        flex flex-col justify-center items-center
        /* Tighter padding on small screens, generous on md+ */
        px-5 py-8
        sm:px-8 sm:py-10
        md:px-12 md:py-12
        relative bg-[#0c0d12]
        /* Fill remaining vertical space on mobile so it doesn't look clipped */
        flex-1
      ">
        <div className="lg:hidden absolute top-[-10%] right-[-10%] w-[60%] h-[50%] rounded-full bg-emerald-600/10 blur-[120px] pointer-events-none" />

        {/* Card wrapper: full-width on xs, capped at sm on larger screens */}
        <div className="w-full max-w-sm space-y-7 z-10">

          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white transition-all duration-300">
              {isRegisterMode ? 'Create an account' : 'Welcome back'}
            </h1>
            <p className="text-sm text-slate-400 min-h-[40px] transition-all duration-300">
              {isRegisterMode
                ? 'Get started by setting up your localized profile parameters.'
                : 'Enter your verified account coordinates to resume tracking.'}
            </p>
          </div>

          {/* Error / Success banners */}
          <div className="space-y-3 empty:hidden min-h-[48px] empty:min-h-0">
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400 flex items-center gap-2.5 transition-all duration-200 animate-in fade-in zoom-in-95">
                <svg className="w-4 h-4 shrink-0 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="font-medium leading-none">{error}</span>
              </div>
            )}
            {successMessage && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-400 flex items-center gap-2.5 transition-all duration-200 animate-in fade-in zoom-in-95">
                <svg className="w-4 h-4 shrink-0 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-medium leading-none">{successMessage}</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4.5">

            {/* Full Name — animated open/close */}
            <div className={`space-y-1.5 transition-all duration-300 origin-top overflow-hidden ${isRegisterMode ? 'max-h-24 opacity-100 mb-4.5' : 'max-h-0 opacity-0 pointer-events-none'}`}>
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Full Name</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 0118 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                <input
                  type="text"
                  required={isRegisterMode}
                  autoComplete="name"
                  placeholder="Juan Dela Cruz"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-[#07080d] border border-[#1f2330] rounded-xl pl-11 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all duration-200"
                />
              </div>
            </div>

            <div className="space-y-1.5 mb-4.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                </span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="juan@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#07080d] border border-[#1f2330] rounded-xl pl-11 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all duration-200"
                />
              </div>
            </div>

            <div className="space-y-1.5 mb-4.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Password</label>
                {!isRegisterMode && (
                  <a href="#" className="text-xs font-medium text-emerald-400 hover:text-emerald-300 transition-colors focus:outline-none focus:underline">
                    Forgot password?
                  </a>
                )}
              </div>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete={isRegisterMode ? "new-password" : "current-password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#07080d] border border-[#1f2330] rounded-xl pl-11 pr-11 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Terms Checkbox */}
            <div className={`transition-all duration-300 origin-top overflow-hidden ${isRegisterMode ? 'max-h-16 opacity-100 pt-1 mb-2' : 'max-h-0 opacity-0 pointer-events-none'}`}>
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="terms"
                  required={isRegisterMode}
                  checked={agreeToTerms}
                  onChange={(e) => setAgreeToTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded bg-[#07080d] border-[#1f2330] text-emerald-500 focus:ring-0 focus:ring-offset-0 cursor-pointer transition-all duration-200 checked:bg-emerald-500 checked:border-emerald-500"
                />
                <label htmlFor="terms" className="text-xs text-slate-400 leading-normal cursor-pointer select-none">
                  I agree to the{' '}
                  <span className="text-slate-200 underline font-medium hover:text-white transition-colors">Terms of Service</span>{' '}
                  and{' '}
                  <span className="text-slate-200 underline font-medium hover:text-white transition-colors">Privacy Policy</span>.
                </label>
              </div>
            </div>

            {/* CTA Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold py-2.5 px-4 rounded-xl text-sm shadow-lg shadow-emerald-500/10 active:scale-[0.98] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading && (
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              <span>
                {loading
                  ? isRegisterMode ? 'Creating account…' : 'Signing in…'
                  : isRegisterMode ? 'Sign Up' : 'Sign In'}
              </span>
            </button>
          </form>

          <div className="relative flex py-2 items-center text-xs text-slate-600 uppercase font-bold tracking-widest select-none">
            <div className="flex-grow border-t border-[#1f2330]"></div>
            <span className="flex-shrink mx-4">or</span>
            <div className="flex-grow border-t border-[#1f2330]"></div>
          </div>

          <div className="text-center text-sm text-slate-400">
            {isRegisterMode ? (
              <span>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => handleModeSwitch(false)}
                  className="font-bold text-emerald-400 hover:text-emerald-300 underline transition-colors focus:outline-none"
                >
                  Sign In
                </button>
              </span>
            ) : (
              <span>
                Don't have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => handleModeSwitch(true)}
                  className="font-bold text-emerald-400 hover:text-emerald-300 underline transition-colors focus:outline-none"
                >
                  Create one here
                </button>
              </span>
            )}
          </div>

          {/* Footer copyright — mobile only, since desktop has it on the left panel */}
          <p className="lg:hidden text-center text-xs text-slate-700 font-medium tracking-wide pt-2">
            © 2026 fintrackr. All rights reserved.
          </p>

        </div>
      </div>

    </div>
  );
}