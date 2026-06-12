'use client';

import React from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface ErrorBoundaryCardProps {
  error: Error & { digest?: string };
  reset: () => void;
  title?: string;
  subtitle?: string;
}

export function ErrorBoundaryCard({
  error,
  reset,
  title = 'Application Exception',
  subtitle = 'The application encountered an unexpected runtime error. Our diagnostic telemetry has recorded this event.'
}: ErrorBoundaryCardProps) {
  React.useEffect(() => {
    // Log the error to telemetry
    console.error('ErrorBoundary caught exception:', error);
  }, [error]);

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Background Orbits */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-red-500/10 blur-[120px] pointer-events-none animate-pulse duration-4000" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none animate-pulse duration-3000" />

      {/* Main Glass Panel */}
      <div className="glass-modal max-w-md w-full p-8 rounded-3xl border border-red-500/20 shadow-2xl relative z-10 flex flex-col items-center text-center space-y-6 animate-fade-in">
        {/* Warning Icon Orb */}
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shadow-lg shadow-red-500/5">
          <AlertTriangle className="w-8 h-8" />
        </div>

        {/* Text Details */}
        <div className="space-y-2.5">
          <h2 className="text-xl font-bold tracking-tight text-white">{title}</h2>
          <p className="text-slate-400 text-xs leading-relaxed">{subtitle}</p>
        </div>

        {/* Error Message Details */}
        {error.message && (
          <div className="w-full bg-slate-950/70 border border-slate-900 rounded-2xl p-4 text-left font-mono text-[10px] text-rose-400 leading-normal select-all max-h-36 overflow-y-auto scrollbar-thin break-all">
            <span className="text-slate-650 font-bold block mb-1">Diagnostic Log:</span>
            {error.message}
            {error.digest && (
              <span className="text-slate-650 font-bold block mt-2">
                Digest: <span className="text-slate-500">{error.digest}</span>
              </span>
            )}
          </div>
        )}

        {/* Action Triggers */}
        <div className="flex flex-col sm:flex-row gap-3 w-full pt-2">
          <button
            type="button"
            onClick={reset}
            className="flex-grow flex items-center justify-center gap-2 px-5 py-3 text-xs font-bold text-white bg-red-600 hover:bg-red-500 rounded-2xl transition-all shadow-md shadow-red-600/10 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="flex-grow flex items-center justify-center gap-2 px-5 py-3 text-xs font-bold text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-800 rounded-2xl transition-all cursor-pointer"
          >
            <Home className="w-4 h-4" />
            Go Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
