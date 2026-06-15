"use client";

import { Activity, Github, Menu, Search, X } from "lucide-react";
import Link from "next/link";

interface DocsHeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  onSearchOpen: () => void;
  hideMobileMenuTrigger?: boolean;
}

export default function DocsHeader({
  sidebarOpen,
  setSidebarOpen,
  onSearchOpen,
  hideMobileMenuTrigger = false,
}: DocsHeaderProps) {
  return (
    <header className="sticky top-0 z-50 h-16 w-full border-b border-slate-900/80 bg-slate-950/75 backdrop-blur-md">
      <div className="mx-auto flex h-full max-w-360 items-center justify-between gap-4 px-4 sm:px-6">
        {/* Left Side: Brand Logo */}
        <div className="flex items-center gap-4">
          {/* Mobile menu trigger */}
          {!hideMobileMenuTrigger && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800 md:hidden text-slate-400 hover:text-white cursor-pointer"
              aria-label="Toggle navigation menu"
            >
              {sidebarOpen ? (
                <X className="w-4 h-4" />
              ) : (
                <Menu className="w-4 h-4" />
              )}
            </button>
          )}

          <Link
            href="/"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-indigo-400/20 bg-indigo-500/15 shrink-0">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-semibold tracking-tight text-slate-100">
              <span className="inline sm:hidden">ObsOS</span>
              <span className="hidden sm:inline">ObservabilityOS</span>
              <span className="ml-1.5 border-l border-slate-700 pl-2 text-xs font-medium text-slate-400">
                Docs
              </span>
            </span>
          </Link>
        </div>

        {/* Center: Search Trigger */}
        <div className="flex-1 max-w-sm hidden sm:block">
          <button
            onClick={onSearchOpen}
            className="flex h-9 w-full cursor-pointer select-none items-center justify-between rounded-lg border border-slate-800 bg-slate-900/45 px-3 text-xs text-slate-500 transition-all hover:border-slate-700 hover:text-slate-300"
          >
            <span className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-slate-500" />
              Search documentation...
            </span>
            <kbd className="font-mono text-[10px] bg-slate-950 border border-slate-900 px-1.5 py-0.5 rounded text-slate-600 uppercase tracking-widest">
              Ctrl K
            </kbd>
          </button>
        </div>

        {/* Right Side: Navigation & GitHub */}
        <div className="flex items-center gap-4">
          <button
            onClick={onSearchOpen}
            className="p-2 rounded-lg hover:bg-slate-900 text-slate-400 hover:text-white sm:hidden cursor-pointer"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          <a
            href="https://github.com/Vaibhav-Singh2/ObservabilityOS"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex cursor-pointer items-center gap-2 rounded-lg border border-slate-800 px-3 py-1.5 text-xs font-medium text-slate-400 transition-all hover:border-slate-700 hover:bg-slate-900 hover:text-white"
          >
            <Github className="w-4 h-4 text-slate-500" />
            <span>GitHub</span>
          </a>

          <a
            href={process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}
            target="_blank"
            rel="noopener noreferrer"
            className="flex cursor-pointer items-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 shrink-0"
          >
            <span className="hidden sm:inline">Launch Console</span>
            <span className="sm:hidden">Console</span>
          </a>
        </div>
      </div>
    </header>
  );
}
