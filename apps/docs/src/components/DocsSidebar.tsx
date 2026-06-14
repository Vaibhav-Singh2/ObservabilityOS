"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { getSidebarNav } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { BookOpen, Layers, Terminal, Shield, Wrench, FileText, Settings, Rocket, HelpCircle, AlertTriangle, Milestone, History } from "lucide-react";

interface DocsSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  className?: string;
}

// Map slug names to icons
const SLUG_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  introduction: BookOpen,
  quickstart: Rocket,
  installation: Settings,
  development: Wrench,
  architecture: Layers,
  database: FileText,
  security: Shield,
  api: Terminal,
  deployment: Rocket,
  troubleshooting: AlertTriangle,
  faq: HelpCircle,
  contributing: Wrench,
  roadmap: Milestone,
  changelog: History
};

export default function DocsSidebar({ isOpen, onClose, className }: DocsSidebarProps) {
  const pathname = usePathname();
  const sidebarData = getSidebarNav();

  const getActiveDocSlug = (): string => {
    // pathname looks like /docs/quickstart
    const parts = pathname.split("/").filter(Boolean);
    if (parts[0] === "docs" && parts[1]) {
      return parts[1];
    }
    return "introduction"; // Default fallback
  };

  const activeSlug = getActiveDocSlug();

  return (
    <aside
      className={cn(
        "w-64 border-r border-slate-900 bg-slate-950 p-6 flex flex-col gap-6 shrink-0 h-[calc(100vh-4rem)] overflow-y-auto sticky top-16 scrollbar-none",
        isOpen ? "block fixed inset-y-16 left-0 z-40 w-full max-w-[260px]" : "hidden md:block",
        className
      )}
    >
      {sidebarData.map((category, idx) => (
        <div key={idx} className="space-y-2.5">
          <h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 font-mono">
            {category.title}
          </h4>
          <ul className="space-y-1 text-xs">
            {category.items.map((item, itemIdx) => {
              const isActive = activeSlug === item.slug;
              const Icon = SLUG_ICONS[item.slug] || FileText;
              return (
                <li key={itemIdx}>
                  <Link
                    href={`/docs/${item.slug}`}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 rounded-lg font-semibold transition-all hover:bg-slate-900/40 text-slate-400 hover:text-slate-200 cursor-pointer",
                      isActive
                        ? "bg-indigo-600/10 border border-indigo-500/10 text-indigo-400 hover:text-indigo-400 hover:bg-indigo-600/10"
                        : "border border-transparent"
                    )}
                  >
                    <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-indigo-400" : "text-slate-500")} />
                    <span className="truncate">{item.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </aside>
  );
}
