'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { 
  Zap, 
  Wifi, 
  WifiOff, 
  LogIn, 
  LogOut 
} from 'lucide-react';

export const Navbar = ({ socketStatus }) => {
  const { authenticated, user, logout, loading } = useAuth();
  const router = useRouter();

  // Socket Connection badge helper
  const renderSocketBadge = () => {
    switch (socketStatus) {
      case 'connected':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-semibold tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <Wifi className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">PUBLISHER CONNECTED</span>
          </div>
        );
      case 'disconnected':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[11px] font-semibold tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
            <WifiOff className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">OFFLINE</span>
          </div>
        );
      case 'reconnecting':
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-semibold tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <Wifi className="w-3.5 h-3.5 animate-bounce" />
            <span className="hidden sm:inline">RECONNECTING...</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-500/10 text-zinc-400 border border-zinc-500/20 text-[11px] font-semibold tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse shrink-0" />
            <span className="hidden sm:inline">GATEWAY CONNECTING</span>
          </div>
        );
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full glass-panel border-b border-white/5 px-4 md:px-8 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        
        {/* Logo Branding */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center shadow-lg shadow-purple-600/30 group-hover:bg-purple-500 transition-colors duration-250">
            <Zap className="w-5 h-5 text-white fill-white/10 group-hover:scale-110 transition-transform duration-250" />
          </div>
          <span className="font-extrabold text-lg md:text-xl text-white tracking-tight">
            Sync<span className="text-purple-400 font-bold">Up</span>
            <span className="text-[9px] block text-purple-400/80 font-bold tracking-widest leading-none uppercase">Coach Panel</span>
          </span>
        </Link>

        {/* Actions (Socket & Keycloak Status) */}
        <div className="flex items-center gap-3">
          
          {/* Socket.IO status */}
          {renderSocketBadge()}

          {/* Keycloak Auth Buttons */}
          {!loading && (
            <>
              {authenticated ? (
                <div className="flex items-center gap-3">
                  {/* Profile info */}
                  <div className="hidden sm:flex items-center gap-2 text-right">
                    <div>
                      <div className="text-xs font-bold text-zinc-100 leading-none">
                        {user?.name || user?.username}
                      </div>
                      <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded border leading-none inline-block mt-1 bg-amber-500/10 text-amber-400 border-amber-500/20">
                        Coach
                      </span>
                    </div>
                  </div>

                  {/* Sign Out */}
                  <button
                    onClick={() => {
                      logout();
                      router.push('/login');
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/8 hover:text-rose-400 text-xs font-semibold text-zinc-300 transition-all duration-150 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                </div>
              ) : (
                /* Login */
                <button
                  onClick={() => router.push('/login')}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/20 transition-all duration-150 active:scale-97 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Coach Sign In</span>
                </button>
              )}
            </>
          )}

        </div>

      </div>
    </header>
  );
};
