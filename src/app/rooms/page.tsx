"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Users } from "lucide-react";
import { RoomPanel } from "@/components/panels";

function RoomsInner() {
  const code = useSearchParams().get("code")?.toUpperCase().slice(0, 6) ?? undefined;
  return (
    <div className="flex w-full flex-col gap-6 transition-all duration-300">
      <section className="relative w-full overflow-hidden rounded-[2rem] bg-gradient-to-br from-butter via-peach to-pink p-6 shadow-lg shadow-lilac-deep/15 transition-all duration-300 md:p-8">
        <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/30 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 right-24 h-48 w-48 rounded-full bg-lilac/40 blur-2xl pointer-events-none" />
        <div className="relative max-w-xl">
          <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/60 px-3 py-1 text-xs font-black text-ink">
            <Users size={13} /> Synchronized listening
          </p>
          <h1 className="text-3xl font-black leading-tight md:text-4xl text-ink">
            Listening rooms
          </h1>
          <p className="mt-2 text-sm font-semibold text-ink/75 md:text-base">
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
