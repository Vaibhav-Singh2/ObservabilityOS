"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, X, FileText, CornerDownLeft, ArrowUp, ArrowDown } from "lucide-react";
import type { SearchDoc } from "@/lib/navigation";
import { cn } from "@/lib/utils";

interface DocsSearchProps {
  isOpen: boolean;
  onClose: () => void;
  searchIndex: SearchDoc[];
}

export default function DocsSearch({ isOpen, onClose, searchIndex }: DocsSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Derive search results synchronously during render using useMemo
  const results = useMemo(() => {
    if (!query.trim()) return [];
    return searchIndex.filter((doc) => {
      const lowerQuery = query.toLowerCase();
      return (
        doc.title.toLowerCase().includes(lowerQuery) ||
        doc.category.toLowerCase().includes(lowerQuery) ||
        doc.description.toLowerCase().includes(lowerQuery)
      );
    }).slice(0, 8);
  }, [query, searchIndex]);

  // Keyboard navigation overrides
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setQuery("");
        setSelectedIndex(0);
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (results[selectedIndex]) {
          router.push(`/docs/${results[selectedIndex].slug}`);
          setQuery("");
          setSelectedIndex(0);
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, results, selectedIndex, router, onClose]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <div 
        onClick={() => {
          setQuery("");
          setSelectedIndex(0);
          onClose();
        }}
        className="fixed inset-0 bg-slate-950/85 backdrop-blur-md transition-opacity" 
      />

      {/* Search Container */}
      <div 
        ref={containerRef}
        className="w-full max-w-xl rounded-2xl border border-slate-900/60 bg-slate-950/80 backdrop-blur-xl p-5 shadow-[0_0_50px_-12px_rgba(79,70,229,0.25)] relative z-10 flex flex-col gap-4 max-h-[440px]"
      >
        {/* Input area */}
        <div className="flex items-center gap-3 border-b border-slate-900 pb-3">
          <Search className="w-5 h-5 text-slate-500 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type to search documentation..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
          />
          <button
            onClick={() => {
              setQuery("");
              setSelectedIndex(0);
              onClose();
            }}
            className="p-1 rounded-md hover:bg-slate-900 text-slate-500 hover:text-white cursor-pointer"
            aria-label="Close search"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results area */}
        <div className="flex-1 overflow-y-auto scrollbar-none space-y-1.5 min-h-[50px]">
          {results.length > 0 ? (
            results.map((doc, index) => {
              const isSelected = selectedIndex === index;
              
              // Helper to highlight query matches
              const highlightMatch = (text: string) => {
                if (!query.trim()) return text;
                const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                const parts = text.split(new RegExp(`(${escapedQuery})`, "gi"));
                return (
                  <>
                    {parts.map((part, i) => 
                      part.toLowerCase() === query.toLowerCase() ? (
                        <mark key={i} className="bg-indigo-500/25 text-indigo-300 rounded-xs px-0.5 no-underline font-bold">
                          {part}
                        </mark>
                      ) : (
                        part
                      )
                    )}
                  </>
                );
              };

              return (
                <button
                  key={doc.slug}
                  onClick={() => {
                    router.push(`/docs/${doc.slug}`);
                    setQuery("");
                    setSelectedIndex(0);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    "w-full text-left flex items-start gap-3.5 p-3 rounded-xl border transition-all cursor-pointer",
                    isSelected
                      ? "bg-indigo-650/10 border-indigo-500/20 text-white shadow-sm"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  )}
                >
                  <FileText className={cn("w-4 h-4 shrink-0 mt-0.5", isSelected ? "text-indigo-400" : "text-slate-500")} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wider">{doc.category}</span>
                      <ChevronRight className="w-2.5 h-2.5 text-slate-700" />
                      <span className="font-bold text-xs text-slate-200">{highlightMatch(doc.title)}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 truncate">{highlightMatch(doc.description)}</p>
                  </div>
                  {isSelected && (
                    <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                      <CornerDownLeft className="w-3 h-3 text-slate-600" /> Enter
                    </span>
                  )}
                </button>
              );
            })
          ) : query.trim() ? (
            <div className="text-center py-6 text-xs text-slate-500 font-mono">
              No matching documentation pages found.
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-slate-500 font-mono select-none">
              Start typing to search guides, references, and APIs.
            </div>
          )}
        </div>

        {/* Shortcuts footer */}
        <div className="flex items-center justify-between border-t border-slate-900/60 pt-3 text-[10px] text-slate-600 font-mono">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <ArrowUp className="w-3 h-3" />
              <ArrowDown className="w-3 h-3" /> Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="bg-slate-900 border border-slate-850 px-1 py-0.5 rounded text-[8px]">Esc</kbd> Close
            </span>
          </div>
          <span>ObservabilityOS Search</span>
        </div>

      </div>
    </div>
  );
}

// ChevronRight element helper
function ChevronRight(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}
