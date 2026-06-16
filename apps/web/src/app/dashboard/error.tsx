"use client";

import { useEffect } from "react";
import { AlertOctagon, RefreshCw, Home, Terminal } from "lucide-react";
import Link from "next/link";
import * as Sentry from "@sentry/nextjs";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    Sentry.captureException(error);
    console.error("[DashboardErrorBoundary] Unhandled UI crash:", error);
  }, [error]);

  return (
    <div className="relative min-h-[70vh] flex items-center justify-center p-6">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-rose-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-lg bg-slate-900/60 border border-slate-800 backdrop-blur-xl rounded-2xl p-8 shadow-2xl text-center">
        {/* Error icon container */}
        <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-6 shadow-lg shadow-rose-500/5 animate-pulse">
          <AlertOctagon className="w-8 h-8 text-rose-500" />
        </div>

        <h2 className="text-2xl font-bold text-white mb-3 tracking-tight bg-linear-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
          Dashboard Component Crash
        </h2>

        <p className="text-sm text-slate-400 mb-6 max-w-md mx-auto leading-relaxed">
          An unexpected runtime exception occurred in this dashboard view.
          Don&apos;t worry—the rest of the SRE platform is operating normally.
        </p>

        {/* Technical Error details drawer */}
        <div className="mb-8 text-left">
          <details className="group border border-slate-800/80 bg-slate-950/60 rounded-xl overflow-hidden">
            <summary className="flex items-center justify-between px-4 py-3 text-xs font-semibold text-slate-400 hover:text-white cursor-pointer select-none transition-colors">
              <span className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                Technical Diagnostics
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-sm">
                View Trace
              </span>
            </summary>
            <div className="p-4 border-t border-slate-900 bg-slate-950/90 font-mono text-[11px] text-rose-400 overflow-x-auto max-h-40 whitespace-pre-wrap leading-5">
              {error.message || "Unknown error details"}
              {error.digest && (
                <div className="mt-2 text-slate-500 border-t border-slate-900/50 pt-2">
                  Digest ID: {error.digest}
                </div>
              )}
            </div>
          </details>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => reset()}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-600/20 hover:shadow-indigo-500/30 transition-all transform active:scale-98 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Reload Component
          </button>

          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white font-semibold text-sm rounded-xl transition-all cursor-pointer"
          >
            <Home className="w-4 h-4" />
            Overview Home
          </Link>
        </div>
      </div>
    </div>
  );
}
