"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, Activity } from "lucide-react";
import SidebarNavList from "./SidebarNavList";

interface ProjectItem {
  id: string;
  name: string;
  apiKey: string;
}

interface MobileSidebarDrawerProps {
  projects: ProjectItem[];
  profileFooter: React.ReactNode;
}

export default function MobileSidebarDrawer({
  projects,
  profileFooter,
}: MobileSidebarDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener("open-mobile-sidebar", handleOpen);
    return () => window.removeEventListener("open-mobile-sidebar", handleOpen);
  }, []);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
        onClick={() => setIsOpen(false)}
      />

      {/* Drawer Container */}
      <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-900 bg-slate-950 flex flex-col shrink-0 transition-transform duration-300 ease-in-out md:hidden translate-x-0">
        {/* Brand */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-900">
          <Link
            id="mobile_brand_logo_link"
            href="/"
            onClick={() => setIsOpen(false)}
            className="flex items-center gap-2.5 hover:opacity-85 transition-opacity"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-base tracking-tight bg-linear-to-r from-white to-slate-400 bg-clip-text text-transparent">
              ObservabilityOS
            </span>
          </Link>
          {/* Close button */}
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-900 hover:border-slate-800 cursor-pointer"
            aria-label="Close mobile sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sidebar Nav */}
        <SidebarNavList
          projects={projects}
          onCloseMobile={() => setIsOpen(false)}
        />

        {/* Footer info & logout */}
        {profileFooter}
      </aside>
    </>
  );
}
