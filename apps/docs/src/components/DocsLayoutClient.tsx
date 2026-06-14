"use client";

import { useState, useEffect } from "react";
import DocsHeader from "./DocsHeader";
import DocsSidebar from "./DocsSidebar";
import DocsSearch from "./DocsSearch";
import type { SearchDoc } from "@/lib/navigation";

interface DocsLayoutClientProps {
  children: React.ReactNode;
  searchIndex: SearchDoc[];
}

export default function DocsLayoutClient({ children, searchIndex }: DocsLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  // Bind Ctrl+K shortcut to search dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Glow effect on docs layout */}
      <div className="absolute top-0 right-[25%] w-[450px] h-[250px] bg-indigo-650/5 blur-[100px] rounded-full pointer-events-none z-0" />

      {/* Sticky Header */}
      <DocsHeader
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onSearchOpen={() => setSearchOpen(true)}
      />

      <div className="max-w-7xl w-full mx-auto px-6 flex flex-1 relative z-10">
        {/* Navigation Sidebar */}
        <DocsSidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
        />

        {/* Page Content Panel */}
        <main className="flex-1 min-w-0 py-10 md:px-8 lg:px-12 flex flex-col min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>

      {/* Search Modal */}
      <DocsSearch
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        searchIndex={searchIndex}
      />
    </div>
  );
}
