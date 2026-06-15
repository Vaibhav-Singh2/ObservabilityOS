"use client";

import { Menu } from "lucide-react";

export default function MobileSidebarTrigger() {
  const handleOpen = () => {
    window.dispatchEvent(new CustomEvent("open-mobile-sidebar"));
  };

  return (
    <button
      onClick={handleOpen}
      className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-900 hover:border-slate-800 cursor-pointer"
      aria-label="Open mobile sidebar"
    >
      <Menu className="w-5 h-5" />
    </button>
  );
}
