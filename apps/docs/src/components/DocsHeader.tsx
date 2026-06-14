"use client";

import Link from "next/link";
import { Activity, Github, Menu, Search, X } from "lucide-react";


interface DocsHeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  onSearchOpen: () => void;
}

export default function DocsHeader({ sidebarOpen, setSidebarOpen, onSearchOpen }: DocsHeaderProps) {
  return (
    <header className="sticky top-0 z-50 h-16 w-full border-b border-slate-900/80 bg-slate-950/75 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between gap-4">
        
        {/* Left Side: Brand Logo */}
        <div className="flex items-center gap-4">
          {/* Mobile menu trigger */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg hover:bg-slate-900 border border-transparent hover:border-slate-800 md:hidden text-slate-400 hover:text-white cursor-pointer"
            aria-label="Toggle navigation menu"
          >
            {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          <Link href="/docs" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-600/10">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-base tracking-tight bg-linear-to-r from-white to-slate-400 bg-clip-text text-transparent">
              ObservabilityOS <span className="text-xs text-indigo-400 font-mono font-bold ml-1.5 uppercase tracking-widest bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/15">Docs</span>
            </span>
          </Link>
        </div>

        {/* Center: Search Trigger */}
        <div className="flex-1 max-w-sm hidden sm:block">
          <button
            onClick={onSearchOpen}
            className="w-full flex items-center justify-between px-3 h-9 rounded-lg border border-slate-850 bg-slate-900/30 text-xs text-slate-500 hover:text-slate-350 hover:border-slate-700 transition-all cursor-pointer select-none"
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
            className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-850 bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <Github className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">GitHub Repository</span>
          </a>
        </div>

      </div>
    </header>
  );
}
