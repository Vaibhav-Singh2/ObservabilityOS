"use client";

import { useState, useEffect } from "react";
import DocsHeader from "./DocsHeader";
import DocsSearch from "./DocsSearch";
import type { SearchDoc } from "@/lib/navigation";

interface LandingHeaderAndSearchProps {
  searchIndex: SearchDoc[];
}

export default function LandingHeaderAndSearch({
  searchIndex,
}: LandingHeaderAndSearchProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    const handleOpenSearch = () => setSearchOpen(true);
    window.addEventListener("open-docs-search", handleOpenSearch);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("open-docs-search", handleOpenSearch);
    };
  }, []);

  return (
    <>
      <DocsHeader
        sidebarOpen={false}
        setSidebarOpen={() => {}}
        onSearchOpen={() => setSearchOpen(true)}
        hideMobileMenuTrigger={true}
      />
      <DocsSearch
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        searchIndex={searchIndex}
      />
    </>
  );
}
