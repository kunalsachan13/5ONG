"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon, Sparkles } from "lucide-react";
import { useTheme } from "@/components/ThemeProvider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, cycleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-9 w-9 rounded-full bg-white/40 dark:bg-white/5 animate-pulse" />;
  }

  const isDark = theme === "dark";
  const label = isDark ? "Switch to Light Theme" : "Switch to Dark Theme";

  return (
    <button
      type="button"
      onClick={cycleTheme}
      aria-label={label}
      title={label}
      className={`icon-btn !h-9 !w-9 rounded-full border shadow-xs backdrop-blur-md transition-all duration-300 hover:scale-105 active:scale-95 bg-white/80 dark:bg-[#201938] border-ink/10 dark:border-white/10 ${
        isDark ? "text-butter" : "text-amber-500"
      } ${className}`}
    >
      {isDark ? (
        <Moon size={17} className="text-butter transition-transform duration-300 hover:-rotate-12" />
      ) : (
        <Sun size={17} className="text-amber-500 transition-transform duration-300 hover:rotate-45" />
      )}
    </button>
  );
}

export default ThemeToggle;
