"use client";

import Link from "next/link";
import { Play, Sparkles, TrendingUp } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { usePlayer } from "@/components/PlayerProvider";
import { PlayAllButtons, TrackList } from "@/components/TrackList";
import { Cover, Spinner } from "@/components/ui";
import GenreChips from "@/components/GenreChips";
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
    <div className="mx-auto flex max-w-6xl flex-col gap-8 pb-6">
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-lilac via-pink to-peach p-6 shadow-lg shadow-lilac-deep/20 md:p-10">
        <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/30 blur-2xl" />
        <div className="absolute -bottom-16 right-24 h-48 w-48 rounded-full bg-sky/50 blur-2xl" />
        <div className="relative max-w-xl">
          <p className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/60 px-3 py-1 text-xs font-black">
            <Sparkles size={13} /> {user ? `Welcome back, ${user.username}` : "Welcome to 5ONG"}
          </p>
          <h1 className="text-3xl font-black leading-tight md:text-5xl">Music that moves with you.</h1>
          <p className="mt-2 text-sm font-semibold text-ink/70 md:text-base">
            Tune it with a live equalizer, sing along with synced lyrics, or start a room and listen together.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button className="btn bg-ink text-white shadow-lg hover:scale-105" disabled={!tracks.length} onClick={() => playList(tracks, 0)}>
              <Play size={16} fill="currentColor" /> Play top charts
            </button>
            <button className="btn bg-white/80" disabled={!tracks.length} onClick={() => shufflePlay(tracks)}>
              <Sparkles size={16} /> Smart shuffle
            </button>
          </div>
        </div>
      </section>

      {recent.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-black">Jump back in</h2>
          <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 pb-2 md:-mx-8 md:px-8">
            {recent.map((t) => (
              <button key={t.id} className="group w-36 shrink-0 text-left" onClick={() => playList(recent, recent.indexOf(t))}>
                <div className="relative">
                  <Cover src={t.coverBig || t.cover} size={144} rounded="rounded-2xl" className="shadow-md transition group-hover:-translate-y-1 group-hover:shadow-xl" />
                  <span className="absolute bottom-2 right-2 grid h-9 w-9 translate-y-1 place-items-center rounded-full bg-white text-lilac-deep opacity-0 shadow-lg transition group-hover:translate-y-0 group-hover:opacity-100">
                    <Play size={16} fill="currentColor" />
                  </span>
                </div>
                <p className="mt-2 truncate text-sm font-extrabold">{t.title}</p>
                <p className="truncate text-xs text-muted">{t.artist}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-xl font-black">Browse by genre</h2>
        <GenreChips />
      </section>

      {data?.artists && data.artists.length > 0 && (
        <section>
          <h2 className="mb-3 text-xl font-black">Popular artists</h2>
          <div className="no-scrollbar -mx-4 flex gap-5 overflow-x-auto px-4 pb-2 md:-mx-8 md:px-8">
            {data.artists.map((a) => (
              <Link key={a.id} href={`/search?artist=${a.id}&name=${encodeURIComponent(a.name)}`} className="group w-28 shrink-0 text-center">
                <Cover src={a.picture} size={112} rounded="rounded-full" className="shadow-md transition group-hover:scale-105" />
                <p className="mt-2 truncate text-sm font-extrabold">{a.name}</p>
              </Link>
            ))}
          </div>
        </section>
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
