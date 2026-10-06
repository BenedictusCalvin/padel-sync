import React, { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { translations, type Language } from '../utils/translations';
import {
  isSupabaseConfigured,
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  signOutUser
} from '../lib/supabase';
import {
  X,
  Database,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  ShieldCheck,
  Mail,
  Lock,
  User as UserIcon,
  ArrowRight,
  Loader2
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  lang: Language;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  user,
  lang
}) => {
  const t = translations[lang];
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Close modal on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleGoogleAuth = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      await signInWithGoogle();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to connect with Google');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage(lang === 'id' ? 'Silakan isi email dan password' : 'Please fill in both email and password');
      return;
    }

    if (password.length < 6) {
      setErrorMessage(lang === 'id' ? 'Password minimal 6 karakter' : 'Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      if (authMode === 'signup') {
        const data = await signUpWithEmail(email, password, fullName);
        if (data?.user && !data.session) {
          // Email confirmation is required by Supabase project settings
          setSuccessMessage(t.signUpSuccessNotice);
        } else {
          // Direct login
          setSuccessMessage(lang === 'id' ? 'Pendaftaran berhasil dan Anda telah masuk!' : 'Registration successful and you are signed in!');
          setTimeout(() => {
            onClose();
          }, 1200);
        }
      } else {
        await signInWithEmail(email, password);
        onClose();
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      await signOutUser();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to sign out');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-start justify-center p-4 sm:p-6 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="bg-slate-900 border border-slate-700/80 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl my-6 sm:my-auto relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative Neon Blurs */}
        <div className="absolute -top-24 right-0 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 left-0 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button - high z-index and explicit stopPropagation */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
          aria-label="Close modal"
          className="absolute top-4 right-4 sm:top-6 sm:right-6 text-slate-400 hover:text-white p-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 active:scale-95 border border-slate-700/80 transition-all z-50 cursor-pointer shadow-lg hover:shadow-slate-700/50"
        >
          <X className="w-5 h-5 stroke-[2.5]" />
        </button>

        <div className="relative z-10 space-y-5">
          {/* Header */}
          <div className="flex items-center gap-3 pr-14">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20 font-black text-xl shrink-0">
              <Database className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight truncate">
                {t.authModalTitle}
              </h2>
              <p className="text-slate-400 text-xs mt-0.5 truncate">
                {lang === 'id' ? 'Akses Cepat Google & Akun Email' : 'Quick Access with Google & Email Account'}
              </p>
            </div>
          </div>

          {/* Connection Status Badge */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isSupabaseConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="font-bold text-slate-200">
                {isSupabaseConfigured ? t.supabaseConnected : (lang === 'id' ? 'Penyimpanan Lokal (Offline)' : 'Local Storage (Offline)')}
              </span>
            </div>
            <span className="text-[11px] font-medium text-emerald-400/90 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              {isSupabaseConfigured ? (lang === 'id' ? 'Terenkripsi Cloud' : 'Cloud Encrypted') : 'Local Only'}
            </span>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5 animate-shake">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>{errorMessage}</div>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>{successMessage}</div>
            </div>
          )}

          {/* User Already Signed In State */}
          {user ? (
            <div className="p-5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-4">
              <div className="flex items-center gap-3.5">
                {user.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt={user.email || 'User'}
                    className="w-12 h-12 rounded-full border-2 border-emerald-400 object-cover shadow-md"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold text-lg">
                    {user.email?.[0].toUpperCase() || 'U'}
                  </div>
                )}
                <div className="overflow-hidden">
                  <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{t.loggedInAs}</span>
                  </div>
                  <div className="text-sm font-extrabold text-white truncate">
                    {user.user_metadata?.full_name || user.email}
                  </div>
                  <div className="text-xs font-mono text-slate-400 truncate">
                    {user.email}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>{lang === 'id' ? 'Penyimpanan Privat Terproteksi' : 'Private Secure Storage'}</span>
                </span>

                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={loading}
                  className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{t.signOut}</span>
                </button>
              </div>
            </div>
          ) : (
            /* Authentication Form (Sign In / Sign Up) */
            <div className="space-y-4">
              {/* Tab Selector: Sign In vs Sign Up */}
              <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-2xl border border-slate-800 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signin');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className={`py-2 rounded-xl transition-all ${
                    authMode === 'signin'
                      ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t.signIn}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signup');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className={`py-2 rounded-xl transition-all ${
                    authMode === 'signup'
                      ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {t.signUp}
                </button>
              </div>

              {/* 1. Google OAuth Option (Works for both Sign In & Sign Up) */}
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={loading || !isSupabaseConfigured}
                className={`w-full py-3 px-5 rounded-2xl font-bold text-sm flex items-center justify-center gap-3 transition-all shadow-md ${
                  isSupabaseConfigured
                    ? 'bg-white hover:bg-slate-100 text-slate-900 active:scale-[0.98]'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                }`}
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>{authMode === 'signup' ? t.signUpWithGoogle : t.signInWithGoogle}</span>
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 text-slate-600">
                <div className="h-px bg-slate-800 flex-1" />
                <span className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                  {t.orContinueWith}
                </span>
                <div className="h-px bg-slate-800 flex-1" />
              </div>

              {/* 2. Email & Password Form */}
              <form onSubmit={handleEmailAuth} className="space-y-3">
                {/* Full Name (Sign Up only) */}
                {authMode === 'signup' && (
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      {t.fullNameLabel}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        value={fullName}
                        onChange={e => setFullName(e.target.value)}
                        placeholder={t.fullNamePlaceholder}
                        required={authMode === 'signup'}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                      />
                    </div>
                  </div>
                )}

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    {t.emailLabel}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder={t.emailPlaceholder}
                      required
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    {t.passwordLabel}
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type="password"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder={t.passwordPlaceholder}
                      required
                      minLength={6}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || !isSupabaseConfigured}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>{authMode === 'signup' ? t.createAccount : t.signIn}</span>
                      <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    </>
                  )}
                </button>
              </form>

              {/* Bottom Toggle Link */}
              <div className="text-center text-xs text-slate-400 pt-1">
                {authMode === 'signin' ? (
                  <span>
                    {t.dontHaveAccount}{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('signup');
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors ml-1"
                    >
                      {t.signUp}
                    </button>
                  </span>
                ) : (
                  <span>
                    {t.alreadyHaveAccount}{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('signin');
                        setErrorMessage(null);
                        setSuccessMessage(null);
                      }}
                      className="text-emerald-400 hover:text-emerald-300 font-bold transition-colors ml-1"
                    >
                      {t.signIn}
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Cloud Security & Sync Info */}
          <div className="p-3.5 rounded-2xl bg-slate-950/40 border border-slate-800/80 text-[11px] text-slate-400 space-y-1.5">
            <div className="font-bold text-slate-300 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>{lang === 'id' ? 'Keamanan Akun & Sinkronisasi Realtime' : 'Account Security & Realtime Cloud Sync'}</span>
            </div>
            <p className="text-slate-400 leading-relaxed">
              {lang === 'id'
                ? 'Data turnamen, pemain, dan riwayat pertandingan tersimpan aman di cloud. Anda dapat melanjutkan turnamen dari perangkat atau browser apa pun secara otomatis.'
                : 'Tournament fixtures, player rosters, and match results are securely synchronized in real time. Access and resume your tournaments seamlessly from any device.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
