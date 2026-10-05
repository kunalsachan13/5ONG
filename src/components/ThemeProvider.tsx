"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  isAdaptive: boolean;
  setTheme: (t: Theme) => void;
  toggleTheme: () => void;
  cycleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);

  // Apply theme to DOM
  const applyTheme = useCallback((targetTheme: Theme) => {
    const isDark = targetTheme === "dark";

    const root = document.documentElement;
    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    root.classList.remove("theme-adaptive");

    // Keep root style colorScheme dark so native title bar controls stay high-contrast
    root.style.colorScheme = "dark";
    setResolvedTheme(targetTheme === "light" ? "light" : "dark");

    if (typeof document !== "undefined") {
      const themeColor = isDark ? "#0c0918" : "#faf6ff";
      const metas = document.querySelectorAll('meta[name="theme-color"]');
      if (metas.length > 0) {
        metas.forEach((m, i) => {
          if (i === 0) {
            m.removeAttribute("media");
            m.setAttribute("content", themeColor);
          } else {
            m.remove();
          }
        });
      } else {
        const meta = document.createElement("meta");
        meta.setAttribute("name", "theme-color");
        meta.setAttribute("content", themeColor);
        document.head.appendChild(meta);
      }
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    let saved = (localStorage.getItem("5ong_theme") as string) || "dark";
    if (saved === "adaptive") saved = "dark";
    const finalTheme = (saved === "light" ? "light" : "dark") as Theme;
    setThemeState(finalTheme);
    applyTheme(finalTheme);
  }, [applyTheme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("5ong_theme", newTheme);

    // Use native View Transitions API on Android and modern browsers for hardware-accelerated 60fps transitions
    if (typeof document !== "undefined" && "startViewTransition" in document) {
      (document as unknown as { startViewTransition: (cb: () => void) => void }).startViewTransition(() => {
        applyTheme(newTheme);
      });
    } else {
      applyTheme(newTheme);
    }
  };

  const cycleTheme = () => {
    // Cycles: light <-> dark
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
  };

  const toggleTheme = () => {
    cycleTheme();
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, isAdaptive: false, setTheme, toggleTheme, cycleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export default ThemeProvider;
