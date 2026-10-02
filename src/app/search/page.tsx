"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, ListMusic, Music2, User as UserIcon } from "lucide-react";
import { PlayAllButtons, TrackList } from "@/components/TrackList";
import { Cover, EmptyState, Spinner } from "@/components/ui";
import GenreChips from "@/components/GenreChips";
import HorizontalSlider from "@/components/HorizontalSlider";
import { useJson } from "@/lib/useJson";
import type { Track, PlaylistSummary } from "@/lib/types";

interface Result {
  tracks: Track[];
  playlists?: PlaylistSummary[];
  artists: { id: string; name: string; picture: string }[];
  source?: string;
  switchedFrom?: string | null;
}

type SourceType = "all" | "spotify" | "saavn" | "deezer" | "youtube";

function SearchInner() {
  const sp = useSearchParams();
  const q = sp.get("q")?.trim() ?? "";
  const artist = sp.get("artist");
  const name = sp.get("name");
  const [activeTab, setActiveTab] = useState<"all" | "songs" | "playlists" | "artists">("all");
  const [source, setSource] = useState<SourceType>("all");

  const url = artist
    ? `/api/music/search?artist=${encodeURIComponent(artist)}`
    : q
    ? `/api/music/search?q=${encodeURIComponent(q)}&source=${source}`
    : null;
  const { data, loading, error } = useJson<Result>(url);

  if (!url) {
    return (
      <div className="flex w-full flex-col gap-6 transition-all duration-300">
        <section className="relative w-full overflow-hidden rounded-[2rem] bg-gradient-to-br from-lilac via-pink to-peach dark:from-[#21163e] dark:via-[#2b173e] dark:to-[#1a1331] p-6 shadow-lg shadow-lilac-deep/15 dark:shadow-black/50 border border-transparent dark:border-white/10 transition-all duration-300 md:p-8">
          <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/30 dark:bg-purple-500/15 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-16 right-24 h-48 w-48 rounded-full bg-sky/40 dark:bg-pink-500/15 blur-2xl pointer-events-none" />
          <div className="relative max-w-xl">
            <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/70 dark:bg-white/10 dark:text-purple-300 dark:border dark:border-white/10 px-3 py-1 text-xs font-black text-ink">
              <Search size={13} className="text-lilac-deep dark:text-purple-300" /> Explore catalog
            </p>
            <h1 className="text-3xl font-black leading-tight md:text-4xl text-ink dark:text-white">
              Find any song, playlist or artist.
            </h1>
            <p className="mt-2 text-sm font-semibold text-ink/75 dark:text-white/80 md:text-base">
              Search millions of songs & playlists from Spotify, JioSaavn, Deezer and YouTube with smart source switching!
            </p>
          </div>
        </section>
        <GenreChips title="Browse genres" />
      </div>
    );
  }

  const tracks = data?.tracks ?? [];
  const playlists = data?.playlists ?? [];
  const artists = data?.artists ?? [];

  const hasResults = tracks.length > 0 || playlists.length > 0 || artists.length > 0;

  return (
    <div className="w-full flex flex-col gap-6 transition-all duration-300">
      {/* Search Header */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black md:text-3xl text-ink dark:text-white">
              {artist ? `Top tracks · ${name ?? "Artist"}` : `Results for “${q}”`}
            </h1>
            {!loading && hasResults && (
              <p className="mt-0.5 text-xs font-semibold text-muted">
                {tracks.length} song{tracks.length === 1 ? "" : "s"}
                {playlists.length > 0 && ` · ${playlists.length} playlist${playlists.length === 1 ? "" : "s"}`}
                {artists.length > 0 && ` · ${artists.length} artist${artists.length === 1 ? "" : "s"}`}
              </p>
            )}
          </div>
          {tracks.length > 0 && (activeTab === "all" || activeTab === "songs") && (
            <PlayAllButtons tracks={tracks} />
          )}
        </div>

        {/* Source Switcher */}
        {!artist && (
          <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/10 w-fit">
            <button
              type="button"
              onClick={() => setSource("all")}
              className={`px-3 py-1 text-xs font-bold rounded-xl transition-all ${
                source === "all"
                  ? "bg-lilac-deep text-white shadow-xs"
                  : "text-muted hover:text-ink dark:hover:text-white"
              }`}
            >
              🌐 All Sources
            </button>
            <button
              type="button"
              onClick={() => setSource("spotify")}
              className={`px-3 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                source === "spotify"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "text-muted hover:text-ink dark:hover:text-white"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block" />
              Spotify
            </button>
            <button
              type="button"
              onClick={() => setSource("saavn")}
              className={`px-3 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                source === "saavn"
                  ? "bg-teal-600 text-white shadow-xs"
                  : "text-muted hover:text-ink dark:hover:text-white"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-teal-300 inline-block" />
              JioSaavn
            </button>
            <button
              type="button"
              onClick={() => setSource("deezer")}
              className={`px-3 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                source === "deezer"
                  ? "bg-purple-600 text-white shadow-xs"
                  : "text-muted hover:text-ink dark:hover:text-white"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-purple-300 inline-block" />
              Deezer
            </button>
            <button
              type="button"
              onClick={() => setSource("youtube")}
              className={`px-3 py-1 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 ${
                source === "youtube"
                  ? "bg-red-600 text-white shadow-xs"
                  : "text-muted hover:text-ink dark:hover:text-white"
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-red-400 inline-block" />
              YouTube
            </button>
          </div>
        )}

        {/* Auto-Switch Fallback Alert */}
        {!loading && data?.switchedFrom && (
          <div className="flex items-center gap-2.5 p-3 px-4 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs font-semibold">
            <span className="text-base">⚡</span>
            <span>
              Few or no results found on <strong className="capitalize font-black">{data.switchedFrom}</strong>.
              Automatically switched to other sources so you get the best matching songs & playlists!
            </span>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      {!loading && hasResults && (
        <div className="flex flex-wrap gap-2 border-b border-ink/5 dark:border-white/10 pb-3">
          <button
            className={`btn !py-1.5 !px-3.5 !text-xs font-bold ${
              activeTab === "all" ? "btn-primary" : "btn-soft"
            }`}
            onClick={() => setActiveTab("all")}
          >
            All
          </button>
          {tracks.length > 0 && (
            <button
              className={`btn !py-1.5 !px-3.5 !text-xs font-bold flex items-center gap-1.5 ${
                activeTab === "songs" ? "btn-primary" : "btn-soft"
              }`}
              onClick={() => setActiveTab("songs")}
            >
              <Music2 size={13} /> Songs ({tracks.length})
            </button>
          )}
          {playlists.length > 0 && (
            <button
              className={`btn !py-1.5 !px-3.5 !text-xs font-bold flex items-center gap-1.5 ${
                activeTab === "playlists" ? "btn-primary" : "btn-soft"
              }`}
              onClick={() => setActiveTab("playlists")}
            >
              <ListMusic size={13} /> Playlists ({playlists.length})
            </button>
          )}
          {artists.length > 0 && (
            <button
              className={`btn !py-1.5 !px-3.5 !text-xs font-bold flex items-center gap-1.5 ${
                activeTab === "artists" ? "btn-primary" : "btn-soft"
              }`}
              onClick={() => setActiveTab("artists")}
            >
              <UserIcon size={13} /> Artists ({artists.length})
            </button>
          )}
        </div>
      )}

      {loading && (
        <div className="grid place-items-center py-20">
          <Spinner size={32} />
        </div>
      )}

      {error && !loading && (
        <p className="card p-4 text-sm font-semibold text-muted">⚠ {error}</p>
      )}

      {!loading && !error && !hasResults && (
        <EmptyState icon={<Search />} title="No results found">
          Try searching with a song title, singer name, or playlist mood across different sources.
        </EmptyState>
      )}

      {/* Playlists Section */}
      {!loading && playlists.length > 0 && (activeTab === "all" || activeTab === "playlists") && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-ink dark:text-white">
              <ListMusic size={18} className="text-lilac-deep dark:text-purple-400" />
              Playlists ({playlists.length})
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {playlists.map((pl) => (
              <Link
                key={pl.id}
                href={`/playlist/${pl.id}`}
                className="group card flex flex-col gap-2.5 p-3 hover:-translate-y-1 transition-all duration-200"
              >
                <div className="relative aspect-square w-full overflow-hidden rounded-2xl bg-lilac/20 dark:bg-white/10 shadow-xs">
                  {pl.covers?.[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pl.covers[0]}
                      alt={pl.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="grid h-full w-full place-items-center text-lilac-deep">
                      <ListMusic size={32} />
                    </div>
                  )}
                  {pl.source && (
                    <span className="absolute bottom-2 right-2 rounded-full bg-black/60 backdrop-blur-xs px-2 py-0.5 text-[9px] font-black uppercase text-white tracking-wider">
                      {pl.source}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink dark:text-white group-hover:text-lilac-deep dark:group-hover:text-purple-300 transition-colors">
                    {pl.name}
                  </p>
                  <p className="truncate text-xs font-semibold text-muted">
                    {pl.count > 0 ? `${pl.count} songs` : "Playlist"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Artists Section */}
      {!loading && artists.length > 0 && (activeTab === "all" || activeTab === "artists") && (
        <HorizontalSlider title="Artists" containerClassName="gap-5" step={260}>
          {artists.map((a) => (
            <Link
              key={a.id}
              href={`/search?artist=${a.id}&name=${encodeURIComponent(a.name)}`}
              className="w-24 shrink-0 text-center group"
            >
              <Cover src={a.picture} size={96} rounded="rounded-full" className="transition-transform group-hover:scale-105" />
              <p className="mt-1.5 truncate text-xs font-extrabold group-hover:text-lilac-deep dark:group-hover:text-purple-300 transition-colors">
                {a.name}
              </p>
            </Link>
          ))}
        </HorizontalSlider>
      )}

      {/* Songs Section */}
      {!loading && tracks.length > 0 && (activeTab === "all" || activeTab === "songs") && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-ink dark:text-white">
              <Music2 size={18} className="text-lilac-deep dark:text-purple-400" />
              Songs ({tracks.length})
            </h2>
          </div>
          <TrackList tracks={tracks} />
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="grid place-items-center py-20">
          <Spinner size={32} />
        </div>
      }
    >
      <SearchInner />
    </Suspense>
  );
}
