"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { PlayAllButtons, TrackList } from "@/components/TrackList";
import { Cover, EmptyState, Spinner } from "@/components/ui";
import GenreChips from "@/components/GenreChips";
import HorizontalSlider from "@/components/HorizontalSlider";
import { useJson } from "@/lib/useJson";
import type { Track } from "@/lib/types";

interface Result {
  tracks: Track[];
  artists: { id: string; name: string; picture: string }[];
}

function SearchInner() {
  const sp = useSearchParams();
  const q = sp.get("q")?.trim() ?? "";
  const artist = sp.get("artist");
  const name = sp.get("name");
  const url = artist ? `/api/music/search?artist=${encodeURIComponent(artist)}` : q ? `/api/music/search?q=${encodeURIComponent(q)}` : null;
  const { data, loading, error } = useJson<Result>(url);

  if (!url) {
    return (
      <div className="flex w-full flex-col gap-6 transition-all duration-300">
        <section className="relative w-full overflow-hidden rounded-[2rem] bg-gradient-to-br from-lilac via-pink to-peach dark:from-[#2e1c4e] dark:via-[#3d1c44] dark:to-[#38233b] p-6 shadow-lg shadow-lilac-deep/15 dark:shadow-black/40 border border-transparent dark:border-white/10 transition-all duration-300 md:p-8">
          <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/30 dark:bg-lilac-deep/20 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-16 right-24 h-48 w-48 rounded-full bg-sky/40 dark:bg-pink-deep/15 blur-2xl pointer-events-none" />
          <div className="relative max-w-xl">
            <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/60 dark:bg-white/10 dark:text-lilac-deep px-3 py-1 text-xs font-black text-ink">
              <Search size={13} /> Explore catalog
            </p>
            <h1 className="text-3xl font-black leading-tight md:text-4xl text-ink">
              Find any song, artist or album.
            </h1>
            <p className="mt-2 text-sm font-semibold text-ink/75 dark:text-ink/80 md:text-base">
              Use the search bar above — or press <kbd className="rounded bg-white/80 dark:bg-white/10 px-1.5 py-0.5 font-black text-ink shadow-xs">/</kbd> anywhere to start typing.
            </p>
          </div>
        </section>
        <GenreChips title="Browse genres" />
      </div>
    );
  }

  const tracks = data?.tracks ?? [];
  return (
    <div className="w-full flex flex-col gap-6 transition-all duration-300">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black">
          {artist ? `Top tracks · ${name ?? "Artist"}` : `Results for “${q}”`}
        </h1>
        <PlayAllButtons tracks={tracks} />
      </div>
      {data?.artists && data.artists.length > 0 && (
        <HorizontalSlider title="Related artists" containerClassName="gap-5" step={260}>
          {data.artists.map((a) => (
            <Link key={a.id} href={`/search?artist=${a.id}&name=${encodeURIComponent(a.name)}`} className="w-24 shrink-0 text-center">
              <Cover src={a.picture} size={96} rounded="rounded-full" />
              <p className="mt-1.5 truncate text-xs font-extrabold">{a.name}</p>
            </Link>
          ))}
        </HorizontalSlider>
      )}
      {loading && <div className="grid place-items-center py-16"><Spinner size={28} /></div>}
      {error && !loading && <p className="card p-4 text-sm font-semibold text-muted">⚠ {error}</p>}
      {!loading && !error && tracks.length === 0 && <EmptyState icon={<Search />} title="No results">Try a different spelling or artist name.</EmptyState>}
      <TrackList tracks={tracks} />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="grid place-items-center py-16"><Spinner size={28} /></div>}>
      <SearchInner />
    </Suspense>
  );
}
