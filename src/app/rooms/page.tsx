"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Users } from "lucide-react";
import { RoomPanel } from "@/components/panels";
import { usePlayer } from "@/components/PlayerProvider";
import { useTheme } from "@/components/ThemeProvider";

function RoomsInner() {
  const code = useSearchParams().get("code")?.toUpperCase().slice(0, 6) ?? undefined;

  return (
    <div className="flex w-full flex-col gap-6 transition-all duration-300">
      <section
        className="relative w-full overflow-hidden rounded-[2rem] bg-gradient-to-br from-lilac via-pink to-peach dark:from-[#21163e] dark:via-[#2b173e] dark:to-[#1a1331] p-6 shadow-lg shadow-lilac-deep/15 dark:shadow-black/50 border border-transparent dark:border-white/10 transition-all duration-500 md:p-8"
      >
        <div
          className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/30 dark:bg-purple-500/15 blur-2xl pointer-events-none transition-colors duration-500"
        />
        <div
          className="absolute -bottom-16 right-24 h-48 w-48 rounded-full bg-sky/50 dark:bg-pink-500/15 blur-2xl pointer-events-none transition-colors duration-500"
        />
        <div className="relative max-w-xl">
          <p
            className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/70 dark:bg-white/10 px-3 py-1 text-xs font-black text-ink dark:text-white border border-ink/5 dark:border-white/10"
          >
            <Users size={13} className="text-lilac-deep dark:text-purple-300" /> Synchronized listening
          </p>
          <h1 className="text-3xl font-black leading-tight md:text-4xl text-ink dark:text-white">
            Listening rooms
          </h1>
          <p className="mt-2 text-sm font-semibold text-ink/75 dark:text-white/80 md:text-base">
            Host a room, share the invite code, and listen in perfect sync. The host drives the music — everyone else enjoys.
          </p>
        </div>
      </section>
      <RoomPanel initialCode={code} />
    </div>
  );
}

export default function RoomsPage() {
  return (
    <Suspense fallback={null}>
      <RoomsInner />
    </Suspense>
  );
}
