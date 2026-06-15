"use client";

import { useState, useEffect } from "react";
import DocsHeader from "./DocsHeader";
import DocsSidebar from "./DocsSidebar";
import DocsSearch from "./DocsSearch";
import type { SearchDoc } from "@/lib/navigation";

interface DocsNavShellProps {
  searchIndex: SearchDoc[];
  children: React.ReactNode;
}

export default function DocsNavShell({
  searchIndex,
  children,
}: DocsNavShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setSearchOpen(true);
    window.addEventListener("open-docs-search", handleOpen);
    return () => window.removeEventListener("open-docs-search", handleOpen);
  }, []);

  return (
    <div className="flex h-dvh max-h-dvh min-h-0 flex-col overflow-hidden bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Sticky Header */}
      <DocsHeader
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onSearchOpen={() => setSearchOpen(true)}
      />

      <div className="mx-auto flex min-h-0 w-full max-w-360 flex-1 overflow-hidden px-4 sm:px-6">
        {/* Navigation Sidebar */}
        <DocsSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        {/* Page Content Panel */}
        {children}
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
