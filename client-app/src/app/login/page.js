'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { KeyRound, ShieldAlert, Sparkles, User, Dumbbell, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login, authenticated, loading, user } = useAuth();
  const router = useRouter();

  // Redirect if already logged in and has appropriate role
  useEffect(() => {
    if (!loading && authenticated) {
      if (user?.isClient) {
        router.push('/');
      } else {
        setError('Access Denied: Your account is authorized as a Coach, not a Client. Please use the Coach portal.');
      }
    }
  }, [authenticated, loading, user, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please provide both username and password.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const res = await login(username, password);
      // Confirm roles
      const roles = res.user?.realm_access?.roles || [];
      if (!roles.includes('client')) {
        setError('Access Denied: This credential set does not possess the Client role. Please log in on the Coach portal.');
        setIsSubmitting(false);
        return;
      }
      
      router.push('/');
    } catch (err) {
      setError(err.message || 'Authentication failed. Please verify credentials.');
      setIsSubmitting(false);
    }
  };

  const handleQuickFill = () => {
    setUsername('client');
    setPassword('client123');
    setError('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-zinc-100">
        <div className="relative w-16 h-16 flex items-center justify-center mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 border-r-indigo-500/30 border-b-indigo-500/10 border-l-indigo-500/50 animate-spin"></div>
          <Dumbbell className="w-6 h-6 text-indigo-400" />
        </div>
        <p className="text-zinc-400 text-sm tracking-widest uppercase">Connecting to Keycloak OIDC...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 relative flex flex-col items-center justify-center p-4 overflow-hidden">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Brand Header */}
      <div className="flex items-center gap-2 mb-8 select-none z-10">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <Dumbbell className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="text-2xl font-black tracking-tight text-white">Sync<span className="text-indigo-400 font-medium">Up</span></span>
          <span className="text-[10px] block font-semibold tracking-wider text-indigo-500/80 uppercase">Client Portal</span>
        </div>
      </div>

      <div className="w-full max-w-md z-10">
        {/* Glassmorphic Auth Panel */}
        <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/80 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent"></div>
          
          <div className="mb-6">
            <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" /> Sign In
            </h2>
            <p className="text-zinc-400 text-xs mt-1">Authenticate natively against Keycloak to access your training feed.</p>
          </div>

          {error && (
            <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3 text-red-400 text-xs leading-relaxed animate-shake">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">Username</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 transition-all placeholder-zinc-600"
                  placeholder="Enter your username"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div>
              <label className="block text-zinc-400 text-xs font-semibold uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-zinc-500">
                  <KeyRound className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-zinc-100 text-sm focus:outline-none focus:border-indigo-500/80 focus:ring-1 focus:ring-indigo-500/30 transition-all placeholder-zinc-600"
                  placeholder="••••••••••••"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm tracking-wide shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-t-white border-white/20 rounded-full animate-spin"></div>
                  <span>Verifying Client Access...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Fill Card */}
          <div className="mt-8 pt-6 border-t border-zinc-800/80">
            <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h4 className="text-zinc-200 font-bold text-xs flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" /> Evaluating the App?
                </h4>
                <p className="text-zinc-400 text-[10px] mt-1 leading-relaxed">Click below to auto-fill the preset OIDC Client tester credentials.</p>
              </div>
              <button
                type="button"
                onClick={handleQuickFill}
                className="px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 text-indigo-300 font-bold text-[11px] transition-all cursor-pointer whitespace-nowrap self-start sm:self-center"
              >
                Quick Fill Client Credentials
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-zinc-500 text-[10px] text-center mt-6 tracking-wide">
          SyncUp Coaching Platform • Direct-Grant authentication gated via Keycloak
        </p>
      </div>
    </div>
  );
}
