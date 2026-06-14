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
    <>
      {/* Mobile Sidebar Backdrop */}
      {isOpen && (
        <div 
          onClick={onClose}
          className="fixed inset-0 top-16 z-30 bg-slate-950/80 backdrop-blur-xs md:hidden animate-in fade-in duration-200"
        />
      )}

      <aside
        className={cn(
          "scrollbar-none flex h-full w-64 shrink-0 flex-col gap-7 overflow-y-auto border-r border-slate-900 bg-slate-950 px-4 py-7 transition-transform duration-300 ease-out md:translate-x-0",
          isOpen 
            ? "fixed inset-y-16 left-0 z-40 w-[260px] translate-x-0 shadow-2xl shadow-black/80" 
            : "fixed inset-y-16 -translate-x-full md:relative md:top-0 md:h-full md:translate-x-0",
          className
        )}
      >
        {sidebarData.map((category, idx) => (
          <div key={idx} className="space-y-2">
            <h4 className="px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
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
                        "flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2.5 text-[13px] font-medium leading-none text-slate-400 transition-all hover:border-slate-800 hover:bg-slate-900/50 hover:text-slate-200",
                        isActive
                          ? "border-indigo-500/20 bg-indigo-500/10 text-indigo-300"
                          : "border-transparent"
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
    </>
  );
}
