"use client";

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export default function BackToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.scrollY > 400) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);
    return () => window.removeEventListener("scroll", toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <button
      onClick={scrollToTop}
      className={`
        fixed bottom-6 right-6 z-50 p-3 rounded-xl
        bg-slate-900/80 backdrop-blur-md border border-slate-800/80 text-indigo-400 hover:text-white
        shadow-lg shadow-indigo-500/10 hover:shadow-indigo-500/20 hover:border-indigo-500/30
        transition-all duration-300 transform cursor-pointer
        ${isVisible ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-4 scale-90 pointer-events-none"}
      `}
      aria-label="Back to top"
    >
      <ArrowUp className="w-5 h-5 transition-transform duration-300 hover:-translate-y-0.5" />
    </button>
  );
}
