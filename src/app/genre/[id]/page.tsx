"use client";

import { use } from "react";
import { TrendingUp } from "lucide-react";
import Link from "next/link";
import { PlayAllButtons, TrackList } from "@/components/TrackList";
import { Cover, Spinner } from "@/components/ui";
import { useJson } from "@/lib/useJson";
import type { Track } from "@/lib/types";
import GenreChips from "@/components/GenreChips";
import HorizontalSlider from "@/components/HorizontalSlider";

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
      <div className="relative w-full overflow-hidden rounded-[2rem] bg-gradient-to-br from-sky via-mint to-butter p-6 shadow-lg shadow-lilac-deep/15 transition-all duration-300 md:p-8">
        <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/30 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 right-24 h-48 w-48 rounded-full bg-pink/40 blur-2xl pointer-events-none" />
        <p className="text-xs font-black uppercase tracking-wider text-ink/60">Genre charts</p>
        <h1 className="mb-4 text-3xl font-black md:text-4xl">{data?.name ?? "…"}</h1>
        <PlayAllButtons tracks={data?.tracks ?? []} />
      </div>
      <GenreChips title="Explore genres" />
      {data?.artists && data.artists.length > 0 && (
        <HorizontalSlider title="Top artists in this genre" containerClassName="gap-5" step={260}>
          {data.artists.map((a) => (
            <Link key={a.id} href={`/search?artist=${a.id}&name=${encodeURIComponent(a.name)}`} className="w-24 shrink-0 text-center">
              <Cover src={a.picture} size={96} rounded="rounded-full" />
              <p className="mt-1.5 truncate text-xs font-extrabold">{a.name}</p>
            </Link>
          ))}
        </HorizontalSlider>
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
