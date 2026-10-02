"use client";

import Link from "next/link";
import { Play, Sparkles, TrendingUp } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { usePlayer } from "@/components/PlayerProvider";
import { PlayAllButtons, TrackList } from "@/components/TrackList";
import { Cover, Spinner } from "@/components/ui";
import GenreChips from "@/components/GenreChips";
import HorizontalSlider from "@/components/HorizontalSlider";
import { useJson } from "@/lib/useJson";
import type { Track } from "@/lib/types";

interface Charts {
  name: string;
  tracks: Track[];
  artists: { id: string; name: string; picture: string }[];
}

export default function HomePage() {
  const { data, loading, error } = useJson<Charts>("/api/music/charts?genre=0&limit=50");
  const { history, user } = useApp();
  const { playList, shufflePlay } = usePlayer();

  const recent: Track[] = [];
  const seen = new Set<string>();
  for (const h of history) {
    if (!seen.has(h.id)) {
      seen.add(h.id);
      recent.push(h);
    }
    if (recent.length >= 10) break;
  }
  const tracks = data?.tracks ?? [];

  return (
    <div className="flex w-full flex-col gap-8 pb-6 transition-all duration-300">
      <section className="relative w-full overflow-hidden rounded-[2rem] bg-gradient-to-br from-lilac via-pink to-peach dark:from-[#2e1c4e] dark:via-[#3d1c44] dark:to-[#38233b] p-6 shadow-lg shadow-lilac-deep/15 dark:shadow-black/40 border border-transparent dark:border-white/10 transition-all duration-300 md:p-8">
        <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/30 dark:bg-lilac-deep/20 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 right-24 h-48 w-48 rounded-full bg-sky/50 dark:bg-pink-deep/15 blur-2xl pointer-events-none" />
        <div className="relative max-w-xl">
          <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/60 dark:bg-white/10 dark:text-lilac-deep px-3 py-1 text-xs font-black">
            <Sparkles size={13} /> {user ? `Welcome back, ${user.username}` : "Welcome to 5ONG"}
          </p>
          <h1 className="text-3xl font-black leading-tight md:text-5xl text-ink dark:text-white">Music that moves with you.</h1>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              className="btn bg-ink text-white dark:bg-white dark:!text-[#0c0918] shadow-lg hover:scale-105"
              disabled={!tracks.length}
              onClick={() => playList(tracks, 0)}
            >
              <Play size={16} fill="currentColor" /> Play top charts
            </button>
            <button
              className="btn bg-white/80 dark:bg-white/10 dark:text-white"
              disabled={!tracks.length}
              onClick={() => shufflePlay(tracks)}
            >
              <Sparkles size={16} /> Smart shuffle
            </button>
          </div>
        </div>
      </section>

      {recent.length > 0 && (
        <HorizontalSlider title="Jump back in" step={300}>
          {recent.map((t, idx) => (
            <button key={t.id} className="group w-36 shrink-0 text-left" onClick={() => playList(recent, idx)}>
              <div className="relative">
                <Cover src={t.coverBig || t.cover} size={144} rounded="rounded-2xl" className="shadow-md transition group-hover:-translate-y-1 group-hover:shadow-xl" />
                <span className="absolute bottom-2 right-2 grid h-9 w-9 translate-y-1 place-items-center rounded-full bg-white dark:bg-lilac-deep text-lilac-deep dark:text-white opacity-0 shadow-lg transition group-hover:translate-y-0 group-hover:opacity-100">
                  <Play size={16} fill="currentColor" />
                </span>
              </div>
              <p className="mt-2 truncate text-sm font-extrabold">{t.title}</p>
              <p className="truncate text-xs text-muted">{t.artist}</p>
            </button>
          ))}
        </HorizontalSlider>
      )}

      <GenreChips title="Browse by genre" />

      {data?.artists && data.artists.length > 0 && (
        <HorizontalSlider title="Popular artists" containerClassName="gap-5" step={300}>
          {data.artists.map((a) => (
            <Link key={a.id} href={`/search?artist=${a.id}&name=${encodeURIComponent(a.name)}`} className="group w-28 shrink-0 text-center">
              <Cover src={a.picture} size={112} rounded="rounded-full" className="shadow-md transition group-hover:scale-105" />
              <p className="mt-2 truncate text-sm font-extrabold">{a.name}</p>
            </Link>
          ))}
        </HorizontalSlider>
      )}

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xl font-black">
            <TrendingUp size={20} className="text-lilac-deep" /> {data?.name ?? "Trending in India"}
          </h2>
          <PlayAllButtons tracks={tracks} />
        </div>
        {loading && (
          <div className="grid place-items-center py-16">
            <Spinner size={28} />
          </div>
        )}
        {error && !loading && <p className="card p-4 text-sm font-semibold text-muted">⚠ {error}. Please try again in a moment.</p>}
        <TrackList tracks={tracks} />
      </section>
    </div>
  );
}
