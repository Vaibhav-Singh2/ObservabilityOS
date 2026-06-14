"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  Activity,
  LayoutDashboard,
  AlertOctagon,
  Search,
  Settings,
  LogOut,
  Menu,
  X,
  CreditCard,
  Terminal,
} from "lucide-react";
import ProjectSelector from "./ProjectSelector";

interface DashboardShellProps {
  user: {
    username: string;
    avatarUrl: string;
    email: string;
  };
  projects: any[];
  children: React.ReactNode;
}

export default function DashboardShell({
  user,
  projects,
  children,
}: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeProjectId = searchParams.get("projectId") || projects[0]?.id;

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
        fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-900 bg-slate-950 flex flex-col shrink-0 transition-transform duration-300 ease-in-out
        md:translate-x-0 md:static md:flex
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
      `}
      >
        {/* Brand */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-900">
          <Link
            id="brand_logo_link"
            href="/"
            className="flex items-center gap-2.5 hover:opacity-85 transition-opacity"
          >
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <Activity className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-base tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              ObservabilityOS
            </span>
          </Link>
          {/* Close button on mobile */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-900 hover:border-slate-800 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          <Link
            id="nav_overview"
            href="/dashboard"
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              pathname === "/dashboard"
                ? "bg-indigo-600/15 border border-indigo-500/30 text-white font-semibold"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-indigo-400" />
            Overview
          </Link>

          {projects.length > 0 ? (
            <>
              <Link
                id="nav_incidents"
                href={
                  activeProjectId
                    ? `/dashboard/incidents?projectId=${activeProjectId}`
                    : "/dashboard/incidents"
                }
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  pathname.startsWith("/dashboard/incidents")
                    ? "bg-indigo-600/15 border border-indigo-500/30 text-white font-semibold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                <AlertOctagon className="w-4 h-4 text-indigo-400" />
                Incidents
              </Link>

              <Link
                id="nav_search"
                href={
                  activeProjectId
                    ? `/dashboard/search?projectId=${activeProjectId}`
                    : "/dashboard/search"
                }
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  pathname.startsWith("/dashboard/search")
                    ? "bg-indigo-600/15 border border-indigo-500/30 text-white font-semibold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                <Search className="w-4 h-4 text-indigo-400" />
                Log Search
              </Link>

              <Link
                id="nav_playground"
                href={
                  activeProjectId
                    ? `/dashboard/playground?projectId=${activeProjectId}`
                    : "/dashboard/playground"
                }
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  pathname.startsWith("/dashboard/playground")
                    ? "bg-indigo-600/15 border border-indigo-500/30 text-white font-semibold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                <Terminal className="w-4 h-4 text-indigo-400" />
                Playground
              </Link>

              <Link
                id="nav_billing"
                href={
                  activeProjectId
                    ? `/dashboard/billing?projectId=${activeProjectId}`
                    : "/dashboard/billing"
                }
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  pathname.startsWith("/dashboard/billing")
                    ? "bg-indigo-600/15 border border-indigo-500/30 text-white font-semibold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                <CreditCard className="w-4 h-4 text-indigo-400" />
                Billing
              </Link>

              <Link
                id="nav_settings"
                href={
                  activeProjectId
                    ? `/dashboard/settings?projectId=${activeProjectId}`
                    : "/dashboard/settings"
                }
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  pathname.startsWith("/dashboard/settings")
                    ? "bg-indigo-600/15 border border-indigo-500/30 text-white font-semibold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                <Settings className="w-4 h-4 text-indigo-400" />
                Settings
              </Link>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 cursor-not-allowed select-none">
                <AlertOctagon className="w-4 h-4 text-slate-700" />
                Incidents
              </div>
              <div className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 cursor-not-allowed select-none">
                <Search className="w-4 h-4 text-slate-700" />
                Log Search
              </div>
              <div className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 cursor-not-allowed select-none">
                <Terminal className="w-4 h-4 text-slate-700" />
                Playground
              </div>
              <div className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 cursor-not-allowed select-none">
                <CreditCard className="w-4 h-4 text-slate-700" />
                Billing
              </div>
              <div className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-slate-600 cursor-not-allowed select-none">
                <Settings className="w-4 h-4 text-slate-700" />
                Settings
              </div>
            </>
          )}
        </nav>

        {/* Footer info & logout */}
        <div className="p-4 border-t border-slate-900 bg-slate-950/50">
          <div className="flex items-center gap-3 mb-4">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.username}
                className="w-9 h-9 rounded-full border border-slate-800"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold">
                {user.username.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-200 truncate">
                {user.username}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {user.email || "No public email"}
              </p>
            </div>
          </div>

          <form action="/api/auth/logout" method="POST" className="w-full">
            <button
              id="logout_btn"
              type="submit"
              className="w-full flex items-center gap-2 justify-center text-xs font-semibold text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-900 border border-slate-900 hover:border-slate-800 h-9 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-slate-900 bg-slate-950 flex items-center justify-between px-4 md:px-8 shrink-0">
          <div className="flex items-center gap-3 md:gap-4">
            {/* Mobile menu trigger */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-900 hover:border-slate-800 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="hidden sm:inline text-xs text-slate-500 uppercase tracking-widest font-bold">
              Active Project
            </span>
            <ProjectSelector projects={projects} />
          </div>

          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="hidden xs:inline">System Operational</span>
              <span className="xs:hidden">Operational</span>
            </span>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 relative">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />
          {children}
        </main>
      </div>
    </div>
  );
}
