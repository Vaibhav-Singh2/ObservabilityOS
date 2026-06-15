"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function RootError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("[RootErrorBoundary] Fatal system crash:", error);
  }, [error]);

  return (
    <html lang="en" className="h-full bg-slate-950 text-slate-100">
      <body className="h-full flex items-center justify-center p-6 font-sans antialiased">
        {/* Background glow effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-120 h-120 bg-indigo-600/5 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-rose-600/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative w-full max-w-lg bg-slate-900/40 border border-slate-800/80 backdrop-blur-2xl rounded-3xl p-10 shadow-2xl text-center">
          {/* SRE warning icon container */}
          <div className="mx-auto w-20 h-20 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-8 shadow-xl shadow-amber-500/5 animate-pulse">
            <AlertTriangle className="w-10 h-10 text-amber-500" />
          </div>

          <h1 className="text-3xl font-extrabold text-white mb-4 tracking-tight bg-linear-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Fatal System Exception
          </h1>

          <p className="text-sm text-slate-400 mb-8 max-w-sm mx-auto leading-relaxed">
            The application encountered a critical runtime exception. The SRE
            dashboard failed to initialize correctly.
          </p>

          {/* Technical Diagnostics */}
          <div className="mb-8 text-left bg-slate-950/70 border border-slate-900 rounded-2xl p-5 overflow-hidden">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2">
              Exception Payload Details
            </div>
            <div className="font-mono text-[11px] text-rose-400/90 overflow-x-auto max-h-36 whitespace-pre-wrap leading-relaxed">
              {error.message || "No error message provided"}
              {error.digest && (
                <div className="mt-3 text-slate-500 border-t border-slate-900 pt-2 text-[10px]">
                  System digest tag: {error.digest}
                </div>
              )}
            </div>
          </div>

          {/* SRE Remediations Actions */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => reset()}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-sm rounded-xl shadow-lg shadow-indigo-600/15 hover:shadow-indigo-500/25 transition-all transform active:scale-98 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Reset App State
            </button>

            <Link
              href="/"
              className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-950 border border-slate-800/80 hover:border-slate-700/80 text-slate-300 hover:text-white font-semibold text-sm rounded-xl transition-all cursor-pointer"
            >
              <Home className="w-4 h-4" />
              Return Home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
