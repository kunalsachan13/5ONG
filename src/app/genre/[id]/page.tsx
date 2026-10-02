"use client";

import { use } from "react";
import { TrendingUp } from "lucide-react";
import Link from "next/link";
import { PlayAllButtons, TrackList } from "@/components/TrackList";
import { Cover, Spinner } from "@/components/ui";
import { useJson } from "@/lib/useJson";
import type { Track } from "@/lib/types";
import GenreChips from "@/components/GenreChips";

interface Charts {
  name: string;
  tracks: Track[];
  artists: { id: string; name: string; picture: string }[];
}

export default function GenrePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, loading, error } = useJson<Charts>(`/api/music/charts?genre=${id}&limit=50`);
  return (
    <div className="w-full flex flex-col gap-6 transition-all duration-300">
      <div className="rounded-[2rem] bg-gradient-to-br from-sky via-mint to-butter p-6 md:p-8">
        <p className="text-xs font-black uppercase tracking-wider text-ink/60">Genre charts</p>
        <h1 className="mb-4 text-3xl font-black md:text-4xl">{data?.name ?? "…"}</h1>
        <PlayAllButtons tracks={data?.tracks ?? []} />
      </div>
      <GenreChips />
      {data?.artists && data.artists.length > 0 && (
        <div className="no-scrollbar flex gap-5 overflow-x-auto pb-2">
          {data.artists.map((a) => (
            <Link key={a.id} href={`/search?artist=${a.id}&name=${encodeURIComponent(a.name)}`} className="w-24 shrink-0 text-center">
              <Cover src={a.picture} size={96} rounded="rounded-full" />
              <p className="mt-1.5 truncate text-xs font-extrabold">{a.name}</p>
            </Link>
          ))}
        </div>
      )}
      <h2 className="flex items-center gap-2 text-xl font-black">
        <TrendingUp size={20} className="text-lilac-deep" /> Top tracks
      </h2>
      {loading && <div className="grid place-items-center py-16"><Spinner size={28} /></div>}
      {error && !loading && <p className="card p-4 text-sm font-semibold text-muted">⚠ {error}</p>}
      <TrackList tracks={data?.tracks ?? []} />
    </div>
  );
}
