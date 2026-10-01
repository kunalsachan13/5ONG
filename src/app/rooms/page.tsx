"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Users } from "lucide-react";
import { RoomPanel } from "@/components/panels";

function RoomsInner() {
  const code = useSearchParams().get("code")?.toUpperCase().slice(0, 6) ?? undefined;
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="rounded-[2rem] bg-gradient-to-br from-butter via-peach to-pink p-6 md:p-8">
        <h1 className="flex items-center gap-2 text-3xl font-black">
          <Users /> Listening rooms
        </h1>
        <p className="mt-1 max-w-xl text-sm font-semibold text-ink/70">
          Host a room, share the invite code, and listen in perfect sync. The host drives the music — everyone else just enjoys.
        </p>
      </div>
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
