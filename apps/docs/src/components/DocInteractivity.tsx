"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function DocInteractivity() {
  const pathname = usePathname();
  const [expandedDiagram, setExpandedDiagram] = useState<string | null>(null);
  const [activeId, setActiveId] = useState("");

  // Pan and zoom states for diagram view
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Touch gesture states for mobile support
  const [touchStartDist, setTouchStartDist] = useState<number | null>(null);
  const [touchStartScale, setTouchStartScale] = useState(1);
  const [lastTouch, setLastTouch] = useState<{ x: number; y: number } | null>(
    null,
  );

  // Reset zoom & pan when diagram closes
  useEffect(() => {
    if (!expandedDiagram) {
      setScale(1);
      setTranslateX(0);
      setTranslateY(0);
      setIsDragging(false);
      setTouchStartDist(null);
      setLastTouch(null);
    }
  }, [expandedDiagram]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      // Single touch: pan drag
      const touch = e.touches[0];
      setLastTouch({ x: touch.clientX, y: touch.clientY });
      setTouchStartDist(null);
    } else if (e.touches.length === 2) {
      // Two touch: pinch zoom
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      setTouchStartDist(dist);
      setTouchStartScale(scale);
      setLastTouch(null);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && lastTouch) {
      const touch = e.touches[0];
      const dx = touch.clientX - lastTouch.x;
      const dy = touch.clientY - lastTouch.y;
      setTranslateX((prev) => prev + dx);
      setTranslateY((prev) => prev + dy);
      setLastTouch({ x: touch.clientX, y: touch.clientY });
    } else if (e.touches.length === 2 && touchStartDist !== null) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const factor = dist / touchStartDist;
      setScale(Math.max(0.1, Math.min(8, touchStartScale * factor)));
    }
  };

  const handleTouchEnd = () => {
    setLastTouch(null);
    setTouchStartDist(null);
  };

  // Touchpad pinch-to-zoom and two-finger pan scroll listener
  useEffect(() => {
    if (!expandedDiagram) return;

    const canvas = document.querySelector(".diagram-modal-canvas");
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey) {
        // Trackpad pinch gesture (represented as wheel with ctrlKey: true)
        const factor = e.deltaY < 0 ? 1.06 : 0.94;
        setScale((prev) => Math.max(0.1, Math.min(8, prev * factor)));
      } else {
        // Trackpad standard scroll or mouse scroll panning
        setTranslateX((prev) => prev - e.deltaX * 1.1);
        setTranslateY((prev) => prev - e.deltaY * 1.1);
      }
    };

    canvas.addEventListener("wheel", handleWheel as any, { passive: false });
    return () => {
      canvas.removeEventListener("wheel", handleWheel as any);
    };
  }, [expandedDiagram]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Left mouse click only
    setIsDragging(true);
    setDragStart({ x: e.clientX - translateX, y: e.clientY - translateY });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setTranslateX(e.clientX - dragStart.x);
    setTranslateY(e.clientY - dragStart.y);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // active heading scroll-spy using IntersectionObserver
  useEffect(() => {
    const headings = Array.from(
      document.querySelectorAll("article h2, article h3"),
    );
    if (headings.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((e) => e.isIntersecting);
        if (visibleEntries.length > 0) {
          const topHeading = visibleEntries.reduce((prev, curr) =>
            curr.boundingClientRect.top < prev.boundingClientRect.top
              ? curr
              : prev,
          );
          if (topHeading.target.id) {
            setActiveId(topHeading.target.id);
          }
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: [0, 1] },
    );

    headings.forEach((h) => {
      if (h.id) observer.observe(h);
    });

    return () => observer.disconnect();
  }, [pathname]);

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
  }, [activeId, pathname]);

  // Decorate code blocks with copy-to-clipboard headers and wrapper containers
  useEffect(() => {
    const preElements = document.querySelectorAll("article pre");

    preElements.forEach((pre) => {
      if (pre.closest("[data-mermaid-container]")) return;
      if (pre.parentElement?.classList.contains("code-block-wrapper")) return;

      const code = pre.querySelector("code");
      if (!code) return;

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

      const wrapper = document.createElement("div");
      wrapper.className = "code-block-wrapper";
      pre.parentNode?.insertBefore(wrapper, pre);
      pre.className = "";
      wrapper.appendChild(header);
      wrapper.appendChild(pre);
    });
  }, [pathname]);

  // Render Mermaid diagrams
  useEffect(() => {
    let cancelled = false;

    const renderMermaid = async () => {
      const diagrams = Array.from(
        document.querySelectorAll<HTMLElement>("[data-mermaid-source]"),
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
            "[data-mermaid-container]",
          );
          const status = container?.querySelector<HTMLElement>(
            "[data-mermaid-status]",
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
  }, [pathname]);

  // Mermaid expand button
  useEffect(() => {
    const handleExpand = (event: MouseEvent) => {
      const button = (event.target as HTMLElement).closest(
        "[data-expand-mermaid]",
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

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [expandedDiagram]);

  if (!expandedDiagram) return null;

  const handleZoom = (factor: number) => {
    setScale((prev) => Math.max(0.1, Math.min(8, prev * factor)));
  };

  const handlePan = (dx: number, dy: number) => {
    setTranslateX((prev) => prev + dx);
    setTranslateY((prev) => prev + dy);
  };

  const handleReset = () => {
    setScale(1);
    setTranslateX(0);
    setTranslateY(0);
  };

  return (
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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>
        <div
          className="diagram-modal-canvas mermaid cursor-grab active:cursor-grabbing select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            position: "relative",
            width: "100%",
            height: "100%",
            touchAction: "none", // Prevent page scroll on touch movement
          }}
        >
          <div
            style={{
              transform: `translate(${translateX}px, ${translateY}px) scale(${scale})`,
              transformOrigin: "center center",
              transition: isDragging ? "none" : "transform 150ms ease-out",
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            dangerouslySetInnerHTML={{ __html: expandedDiagram }}
          />
        </div>

        {/* Floating Pan and Zoom Controls */}
        <div className="diagram-modal-controls">
          {/* Pan Up */}
          <button
            type="button"
            onClick={() => handlePan(0, 60)}
            className="diagram-control-btn"
            title="Pan Up"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m18 15-6-6-6 6" />
            </svg>
          </button>

          <div className="diagram-control-group">
            {/* Pan Left */}
            <button
              type="button"
              onClick={() => handlePan(60, 0)}
              className="diagram-control-btn"
              title="Pan Left"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            {/* Reset */}
            <button
              type="button"
              onClick={handleReset}
              className="diagram-control-btn text-[10px] font-bold font-mono tracking-tighter"
              title="Reset Zoom & Pan"
            >
              RST
            </button>
            {/* Pan Right */}
            <button
              type="button"
              onClick={() => handlePan(-60, 0)}
              className="diagram-control-btn"
              title="Pan Right"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>

          {/* Pan Down */}
          <button
            type="button"
            onClick={() => handlePan(0, -60)}
            className="diagram-control-btn"
            title="Pan Down"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {/* Zoom controls section */}
          <div className="diagram-control-group mt-1 pt-1.5 border-t border-slate-800 w-full justify-center">
            {/* Zoom Out */}
            <button
              type="button"
              onClick={() => handleZoom(0.8)}
              className="diagram-control-btn"
              title="Zoom Out"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
            {/* Zoom In */}
            <button
              type="button"
              onClick={() => handleZoom(1.25)}
              className="diagram-control-btn"
              title="Zoom In"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
