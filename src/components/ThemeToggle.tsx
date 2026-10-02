"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon, Laptop } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-9 w-9 rounded-full bg-white/40 dark:bg-white/5 animate-pulse" />;
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`icon-btn !h-9 !w-9 rounded-full bg-white/80 dark:bg-[#201938] border border-ink/10 dark:border-white/10 shadow-xs backdrop-blur-md transition-all duration-300 hover:scale-105 active:scale-95 text-ink dark:text-[#f2eefa] ${className}`}
    >
      {isDark ? (
        <Sun size={17} className="text-butter transition-transform duration-300 hover:rotate-45" />
      ) : (
        <Moon size={17} className="text-lilac-deep transition-transform duration-300 hover:-rotate-12" />
      )}
    </button>
  );
}

export default ThemeToggle;
