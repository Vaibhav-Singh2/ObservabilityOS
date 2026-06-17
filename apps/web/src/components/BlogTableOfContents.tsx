"use client";

import { useEffect, useState } from "react";
import { slugify } from "@/lib/blog-data";

interface TocItem {
  id: string;
  label: string;
}

interface BlogTableOfContentsProps {
  headings: string[];
}

export default function BlogTableOfContents({
  headings,
}: BlogTableOfContentsProps) {
  const [activeId, setActiveId] = useState<string>("");

  const items: TocItem[] = headings.map((h) => ({
    id: slugify(h),
    label: h,
  }));

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: 0 },
    );

    items.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [items]);

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <nav aria-label="Table of contents">
      <p className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-widest mb-3">
        On this page
      </p>
      <ul className="space-y-1">
        {items.map(({ id, label }) => (
          <li key={id}>
            <button
              onClick={() => handleClick(id)}
              className={`text-left w-full text-xs leading-relaxed py-0.5 transition-colors duration-150 ${
                activeId === id
                  ? "text-indigo-400 font-semibold"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              {label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
