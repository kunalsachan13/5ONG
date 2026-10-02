"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Users } from "lucide-react";
import { RoomPanel } from "@/components/panels";

function RoomsInner() {
  const code = useSearchParams().get("code")?.toUpperCase().slice(0, 6) ?? undefined;
  return (
    <div className="flex w-full flex-col gap-6 transition-all duration-300">
      <section className="relative w-full overflow-hidden rounded-[2rem] bg-gradient-to-br from-butter via-peach to-pink dark:from-[#3a2818] dark:via-[#3b2034] dark:to-[#381c3b] p-6 shadow-lg shadow-lilac-deep/15 dark:shadow-black/40 border border-transparent dark:border-white/10 transition-all duration-300 md:p-8">
        <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/30 dark:bg-butter/15 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 right-24 h-48 w-48 rounded-full bg-lilac/40 dark:bg-pink-deep/15 blur-2xl pointer-events-none" />
        <div className="relative max-w-xl">
          <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/60 dark:bg-white/10 dark:text-butter px-3 py-1 text-xs font-black text-ink">
            <Users size={13} /> Synchronized listening
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
