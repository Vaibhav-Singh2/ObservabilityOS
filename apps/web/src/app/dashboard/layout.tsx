import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { connectToDatabase, User, Project } from "@repo/db";
import jwt from "jsonwebtoken";
import { Activity, LayoutDashboard, AlertOctagon, Search, LogOut, Settings, ChevronDown, Plus } from "lucide-react";
import ProjectSelector from "./ProjectSelector";

export const metadata = {
  title: "Dashboard — ObservabilityOS",
};

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  if (!token) {
    redirect("/");
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    redirect("/");
  }

  let decoded: any;
  try {
    decoded = jwt.verify(token, jwtSecret);
  } catch (e) {
    redirect("/");
  }

  await connectToDatabase();
  const user = await User.findById(decoded.userId);
  if (!user) {
    redirect("/");
  }

  const projects = await Project.find({ ownerId: user._id }).sort({ createdAt: -1 });
  const serializedProjects = projects.map(p => ({
    id: p._id.toString(),
    name: p.name,
    apiKey: p.apiKey,
  }));

  const userObj = {
    username: user.username,
    avatarUrl: user.avatarUrl || "",
    email: user.email || "",
  };

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-900 bg-slate-950 flex flex-col shrink-0">
        {/* Brand */}
        <div className="h-16 flex items-center gap-2.5 px-6 border-b border-slate-900">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <Activity className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-base tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            ObservabilityOS
          </span>
        </div>

        {/* Sidebar Nav */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          <Link
            id="nav_overview"
            href="/dashboard"
            className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg bg-slate-900 text-slate-100 transition-colors"
          >
            <LayoutDashboard className="w-4 h-4 text-indigo-400" />
            Overview
          </Link>

          <div
            id="nav_incidents_disabled"
            className="flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg text-slate-500 cursor-not-allowed group relative"
          >
            <span className="flex items-center gap-3">
              <AlertOctagon className="w-4 h-4 text-slate-600" />
              Incidents
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800 group-hover:block">
              Wk 2
            </span>
          </div>

          <div
            id="nav_search_disabled"
            className="flex items-center justify-between px-3 py-2 text-sm font-medium rounded-lg text-slate-500 cursor-not-allowed group"
          >
            <span className="flex items-center gap-3">
              <Search className="w-4 h-4 text-slate-600" />
              Log Search
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
              Wk 3
            </span>
          </div>
        </nav>

        {/* Footer info & logout */}
        <div className="p-4 border-t border-slate-900 bg-slate-950/50">
          <div className="flex items-center gap-3 mb-4">
            {userObj.avatarUrl ? (
              <img
                src={userObj.avatarUrl}
                alt={userObj.username}
                className="w-9 h-9 rounded-full border border-slate-800"
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-sm font-bold">
                {userObj.username.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-200 truncate">{userObj.username}</p>
              <p className="text-xs text-slate-500 truncate">{userObj.email || "No public email"}</p>
            </div>
          </div>

          <form action="/api/auth/logout" method="POST" className="w-full">
            <button
              id="logout_btn"
              type="submit"
              className="w-full flex items-center gap-2 justify-center text-xs font-semibold text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-900 border border-slate-900 hover:border-slate-800 h-9 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 border-b border-slate-900 bg-slate-950 flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">Active Project</span>
            <ProjectSelector projects={serializedProjects} />
          </div>

          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              System Operational
            </span>
          </div>
        </header>

        {/* Dashboard Content */}
        <main className="flex-1 overflow-y-auto p-8 relative">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />
          {children}
        </main>
      </div>
    </div>
  );
}
