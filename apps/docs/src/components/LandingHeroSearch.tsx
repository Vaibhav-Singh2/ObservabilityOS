"use client";

import { Search } from "lucide-react";

export default function LandingHeroSearch() {
  const handleClick = () => {
    window.dispatchEvent(new CustomEvent("open-docs-search"));
  };

  return (
    <div className="max-w-md mx-auto pt-3">
      <button
        onClick={handleClick}
        className="w-full flex items-center justify-between px-4 h-12 rounded-xl border border-slate-900 bg-slate-950/80 backdrop-blur-md text-sm text-slate-500 hover:text-slate-350 hover:border-slate-800 hover:bg-slate-900/40 transition-all shadow-xl cursor-pointer select-none"
      >
        <span className="flex items-center gap-3">
          <Search className="w-4 h-4 text-indigo-400" />
          Search the documentation...
        </span>
        <kbd className="font-mono text-xs bg-slate-900 border border-slate-800 px-2 py-1 rounded text-slate-650 uppercase tracking-widest">
          Ctrl K
        </kbd>
      </button>
    </div>
  );
}
