import Link from "next/link";
import { Activity } from "lucide-react";
import ProjectSelector from "./ProjectSelector";
import SidebarNavList from "./SidebarNavList";
import SidebarProfileFooter from "./SidebarProfileFooter";
import MobileSidebarTrigger from "./MobileSidebarTrigger";
import MobileSidebarDrawer from "./MobileSidebarDrawer";

interface ProjectItem {
  id: string;
  name: string;
  apiKey: string;
}

interface DashboardShellProps {
  user: {
    username: string;
    avatarUrl: string;
    email: string;
  };
  projects: ProjectItem[];
  children: React.ReactNode;
}

export default function DashboardShell({
  user,
  projects,
  children,
}: DashboardShellProps) {
  const profileFooter = <SidebarProfileFooter user={user} />;

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Desktop Sidebar (static on desktop, hidden on mobile) */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-900 bg-slate-950 flex-col shrink-0 static h-full">
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
            <span className="font-semibold text-base tracking-tight bg-linear-to-r from-white to-slate-400 bg-clip-text text-transparent">
              ObservabilityOS
            </span>
          </Link>
        </div>

        {/* Sidebar Nav */}
        <SidebarNavList projects={projects} />

        {/* Footer info & logout */}
        {profileFooter}
      </aside>

      {/* Main Container */}
      <div className="flex h-dvh min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-slate-900 bg-slate-950 flex items-center justify-between px-4 md:px-8 shrink-0">
          <div className="flex items-center gap-3 md:gap-4">
            {/* Mobile menu trigger */}
            <MobileSidebarTrigger />
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
        <main className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 md:p-8">
          <div className="absolute top-0 right-0 w-100 h-100 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />
          {children}
        </main>
      </div>

      {/* Mobile Drawer */}
      <MobileSidebarDrawer projects={projects} profileFooter={profileFooter} />
    </div>
  );
}
