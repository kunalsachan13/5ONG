"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface HorizontalSliderProps {
  title?: React.ReactNode;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  step?: number;
}

export function HorizontalSlider({
  title,
  headerRight,
  children,
  className = "",
  containerClassName = "",
  step,
}: HorizontalSliderProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const hasOverflow = el.scrollWidth > el.clientWidth + 4;
    setCanScrollLeft(el.scrollLeft > 6);
    setCanScrollRight(hasOverflow && el.scrollLeft + el.clientWidth < el.scrollWidth - 6);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    checkScroll();

    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => checkScroll());
      ro.observe(el);
      Array.from(el.children).forEach((child) => ro?.observe(child));
    }

    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
      ro?.disconnect();
    };
  }, [checkScroll]);

  const handleScroll = (dir: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = step || Math.max(el.clientWidth * 0.75, 260);
    el.scrollBy({
      left: dir === "left" ? -distance : distance,
      behavior: "smooth",
    });
    setTimeout(checkScroll, 320);
  };

  return (
    <section className={`w-full ${className}`}>
      {(title || headerRight) ? (
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            {typeof title === "string" ? (
              <h2 className="truncate text-xl font-black">{title}</h2>
            ) : (
              title
            )}
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {headerRight}
            <button
              type="button"
              onClick={() => handleScroll("left")}
              disabled={!canScrollLeft}
              aria-label="Scroll left"
              title="Scroll left"
              className="icon-btn !h-8 !w-8 bg-white/80 dark:bg-[#201838] border border-ink/10 dark:border-white/10 shadow-xs hover:bg-white dark:hover:bg-[#2f2452] text-ink dark:text-[#f2eefa] hover:scale-105 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed disabled:pointer-events-none transition"
            >
              <ChevronLeft size={18} strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={() => handleScroll("right")}
              disabled={!canScrollRight}
              aria-label="Scroll right"
              title="Scroll right"
              className="icon-btn !h-8 !w-8 bg-white/80 dark:bg-[#201838] border border-ink/10 dark:border-white/10 shadow-xs hover:bg-white dark:hover:bg-[#2f2452] text-ink dark:text-[#f2eefa] hover:scale-105 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed disabled:pointer-events-none transition"
            >
              <ChevronRight size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      ) : (
        <div className="mb-2 flex items-center justify-end">
          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleScroll("left")}
              disabled={!canScrollLeft}
              aria-label="Scroll left"
              title="Scroll left"
              className="icon-btn !h-8 !w-8 bg-white/80 dark:bg-[#201838] border border-ink/10 dark:border-white/10 shadow-xs hover:bg-white dark:hover:bg-[#2f2452] text-ink dark:text-[#f2eefa] hover:scale-105 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed disabled:pointer-events-none transition"
            >
              <ChevronLeft size={18} strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={() => handleScroll("right")}
              disabled={!canScrollRight}
              aria-label="Scroll right"
              title="Scroll right"
              className="icon-btn !h-8 !w-8 bg-white/80 dark:bg-[#201838] border border-ink/10 dark:border-white/10 shadow-xs hover:bg-white dark:hover:bg-[#2f2452] text-ink dark:text-[#f2eefa] hover:scale-105 active:scale-95 disabled:opacity-25 disabled:cursor-not-allowed disabled:pointer-events-none transition"
            >
              <ChevronRight size={18} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      )}
      <div
        ref={scrollRef}
        className={`no-scrollbar flex w-full gap-4 overflow-x-auto pb-2 scroll-smooth ${containerClassName}`}
      >
        {children}
      </div>
    </section>
  );
}

export default HorizontalSlider;
