"use client";

import React, { useState } from "react";
import { RotateCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/AppProvider";

export function AppRefreshButton({ className = "" }: { className?: string }) {
  const [isSpinning, setIsSpinning] = useState(false);
  const router = useRouter();
  const { toast, refreshLibrary } = useApp();

  const handleRefresh = async () => {
    if (isSpinning) return;
    setIsSpinning(true);

    try {
      // 1. Dispatch global event for all useJson hooks to immediately fetch fresh uncached data
      window.dispatchEvent(new CustomEvent("app:refresh", { detail: { timestamp: Date.now() } }));

      // 2. Clear temporary session cache
      try {
        sessionStorage.clear();
      } catch {}

      // 3. Re-sync user library / playlists / likes
      refreshLibrary().catch(() => {});

      // 4. Soft router refresh to revalidate any server components without stopping audio playback
      router.refresh();

      // 5. Notify user
      toast("App refreshed with latest releases!", "ok");
    } finally {
      setTimeout(() => {
        setIsSpinning(false);
      }, 1000);
    }
  };

  return (
    <button
      type="button"
      onClick={handleRefresh}
      disabled={isSpinning}
      aria-label="Refresh whole app (get new & trending songs)"
      title="Refresh whole app (get new & trending songs)"
      className={`icon-btn !h-9 !w-9 rounded-full bg-white/80 dark:bg-[#201938] border border-ink/10 dark:border-white/10 shadow-xs backdrop-blur-md transition-all duration-300 hover:scale-105 active:scale-95 text-ink dark:text-[#f2eefa] disabled:opacity-70 ${className}`}
    >
      <RotateCw
        size={17}
        className={`transition-all duration-300 ${
          isSpinning
            ? "animate-spin text-lilac-deep"
            : "text-ink/80 dark:text-white/80 hover:text-lilac-deep dark:hover:text-purple-300"
        }`}
      />
    </button>
  );
}

export default AppRefreshButton;
