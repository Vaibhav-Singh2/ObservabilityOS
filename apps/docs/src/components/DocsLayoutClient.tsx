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
  const [expandedDiagram, setExpandedDiagram] = useState<string | null>(null);

  const [activeId, setActiveId] = useState("");

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

  // active heading scroll-spy using IntersectionObserver
  useEffect(() => {
    const headings = Array.from(document.querySelectorAll("article h2, article h3"));
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((e) => e.isIntersecting);
        if (visibleEntries.length > 0) {
          // Find the topmost visible heading
          const topHeading = visibleEntries.reduce((prev, curr) => 
            curr.boundingClientRect.top < prev.boundingClientRect.top ? curr : prev
          );
          if (topHeading.target.id) {
            setActiveId(topHeading.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: [0, 1] }
    );

    headings.forEach((h) => {
      if (h.id) observer.observe(h);
    });

    return () => observer.disconnect();
  }, [children]);

  // Update Table of Contents (TOC) active link style in the DOM
  useEffect(() => {
    const links = document.querySelectorAll("aside ul li a");
    links.forEach((link) => {
      const href = link.getAttribute("href");
      const isActive = href === `#${activeId}`;
      if (isActive) {
        link.classList.add("text-indigo-400", "font-bold", "translate-x-1");
        link.classList.remove("text-slate-400");
      } else {
        link.classList.remove("text-indigo-400", "font-bold", "translate-x-1");
        link.classList.add("text-slate-400");
      }
    });
  }, [activeId]);

  // Decorate code blocks with copy-to-clipboard headers and wrapper containers
  useEffect(() => {
    let cancelled = false;

    const renderMermaid = async () => {
      const diagrams = Array.from(
        document.querySelectorAll<HTMLElement>("[data-mermaid-source]")
      ).filter((diagram) => !diagram.dataset.processed);

      if (diagrams.length === 0) return;

      try {
        const { default: mermaid } = await import("mermaid");
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "base",
          themeVariables: {
            background: "#020617",
            primaryColor: "#0f172a",
            primaryTextColor: "#e2e8f0",
            primaryBorderColor: "#475569",
            lineColor: "#94a3b8",
            secondaryColor: "#1e293b",
            tertiaryColor: "#0f172a",
            tertiaryTextColor: "#e2e8f0",
            textColor: "#e2e8f0",
            labelTextColor: "#e2e8f0",
            nodeTextColor: "#e2e8f0",
            mainBkg: "#0f172a",
            nodeBorder: "#475569",
            clusterBkg: "#0f172a",
            clusterBorder: "#334155",
            edgeLabelBackground: "#020617",
            attributeBackgroundColorOdd: "#0f172a",
            attributeBackgroundColorEven: "#172033",
            attributeTextColorOdd: "#e2e8f0",
            attributeTextColorEven: "#e2e8f0",
            fontFamily: "var(--font-geist-sans), Arial, sans-serif",
            fontSize: "16px",
          },
        });

        for (const diagram of diagrams) {
          if (cancelled) return;

          const status = diagram
            .closest<HTMLElement>("[data-mermaid-container]")
            ?.querySelector<HTMLElement>("[data-mermaid-status]");

          await mermaid.run({ nodes: [diagram], suppressErrors: false });
          diagram.dataset.processed = "true";
          if (status) status.textContent = "Rendered";
        }
      } catch (error) {
        diagrams.forEach((diagram) => {
          const container = diagram.closest<HTMLElement>(
            "[data-mermaid-container]"
          );
          const status = container?.querySelector<HTMLElement>(
            "[data-mermaid-status]"
          );
          diagram.dataset.processed = "error";
          container?.classList.add("mermaid-shell-error");
          if (status) status.textContent = "Source";
        });
        console.error("Unable to render Mermaid diagram", error);
      }
    };

    void renderMermaid();
    return () => {
      cancelled = true;
    };
  }, [children]);

  useEffect(() => {
    const handleExpand = (event: MouseEvent) => {
      const button = (event.target as HTMLElement).closest(
        "[data-expand-mermaid]"
      );
      if (!button) return;

      const svg = button
        .closest<HTMLElement>("[data-mermaid-container]")
        ?.querySelector<SVGElement>(".mermaid svg");

      if (svg) setExpandedDiagram(svg.outerHTML);
    };

    document.addEventListener("click", handleExpand);
    return () => document.removeEventListener("click", handleExpand);
  }, []);

  useEffect(() => {
    if (!expandedDiagram) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExpandedDiagram(null);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [expandedDiagram]);

  useEffect(() => {
    const preElements = document.querySelectorAll("article pre");
    
    preElements.forEach((pre) => {
      if (pre.closest("[data-mermaid-container]")) return;

      // Check if wrapper is already present
      if (pre.parentElement?.classList.contains("code-block-wrapper")) return;

      const code = pre.querySelector("code");
      if (!code) return;

      // Detect syntax language
      let language = "code";
      const classes = Array.from(code.classList);
      const langClass = classes.find((c) => c.startsWith("language-"));
      if (langClass) {
        language = langClass.replace("language-", "").toUpperCase();
      }

      const header = document.createElement("div");
      header.className = "code-copy-header";
      
      const langLabel = document.createElement("span");
      langLabel.innerText = language;

      const copyBtn = document.createElement("button");
      copyBtn.className = "code-copy-button";
      copyBtn.type = "button";
      copyBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
        <span>Copy</span>
      `;

      copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(code.innerText).then(() => {
          copyBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="text-emerald-400"><path d="M20 6 9 17l-5-5"/></svg>
            <span class="text-emerald-400">Copied!</span>
          `;
          setTimeout(() => {
            copyBtn.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
              <span>Copy</span>
            `;
          }, 2000);
        });
      });

      header.appendChild(langLabel);
      header.appendChild(copyBtn);

      // Create parent container wrapper
      const wrapper = document.createElement("div");
      wrapper.className = "code-block-wrapper";
      
      // Insert wrapper in DOM before pre element
      pre.parentNode?.insertBefore(wrapper, pre);
      
      pre.className = "";

      wrapper.appendChild(header);
      wrapper.appendChild(pre);
    });
  }, [children]);

  return (
    <div className="flex h-screen max-h-screen flex-col overflow-hidden bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Sticky Header */}
      <DocsHeader
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onSearchOpen={() => setSearchOpen(true)}
      />

      <div className="mx-auto flex h-[calc(100vh-4rem)] w-full max-w-[1440px] flex-1 overflow-hidden px-4 sm:px-6">
        {/* Navigation Sidebar */}
        <DocsSidebar 
          isOpen={sidebarOpen} 
          onClose={() => setSidebarOpen(false)} 
        />

        {/* Page Content Panel */}
        <main className="flex h-full min-w-0 flex-1 flex-col overflow-y-auto scroll-smooth">
          <div className="mx-auto w-full max-w-5xl px-1 py-10 md:px-10 md:py-14">
            {children}
          </div>
        </main>
      </div>

      {/* Search Modal */}
      <DocsSearch
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        searchIndex={searchIndex}
      />

      {expandedDiagram && (
        <div
          className="diagram-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Expanded architecture diagram"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setExpandedDiagram(null);
          }}
        >
          <div className="diagram-modal-panel">
            <div className="diagram-modal-header">
              <div>
                <span className="diagram-modal-eyebrow">Architecture diagram</span>
                <h2>Large view</h2>
              </div>
              <button
                type="button"
                className="diagram-modal-close"
                onClick={() => setExpandedDiagram(null)}
                aria-label="Close large diagram view"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
              </button>
            </div>
            <div
              className="diagram-modal-canvas mermaid"
              dangerouslySetInnerHTML={{ __html: expandedDiagram }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
