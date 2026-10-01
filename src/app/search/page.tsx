"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { PlayAllButtons, TrackList } from "@/components/TrackList";
import { Cover, EmptyState, Spinner } from "@/components/ui";
import GenreChips from "@/components/GenreChips";
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
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <EmptyState icon={<Search />} title="Search 5ONG">
          Type in the search bar above — or press <kbd className="rounded bg-white px-1.5 font-black">/</kbd> anywhere.
        </EmptyState>
        <h2 className="text-xl font-black">Browse genres</h2>
        <GenreChips />
      </div>
    );
  }

  const tracks = data?.tracks ?? [];
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-black">
          {artist ? `Top tracks · ${name ?? "Artist"}` : `Results for “${q}”`}
        </h1>
        <PlayAllButtons tracks={tracks} />
      </div>
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
