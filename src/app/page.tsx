"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Flame, Headphones, Play, Radio, Sparkles, TrendingUp, Wand2, Users, ArrowRight, Shield } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { usePlayer } from "@/components/PlayerProvider";
import { useTheme } from "@/components/ThemeProvider";
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

interface RecommendationsData {
  recommended: Track[];
  spotlight: { artist: string; tracks: Track[] } | null;
  topTracks: Track[];
  topArtists: string[];
  hasTasteProfile: boolean;
}

export default function HomePage() {
  const { data, loading, error } = useJson<Charts>("/api/music/charts?genre=0&limit=50");
  const { history, likes, user } = useApp();
  const { playList, shufflePlay } = usePlayer();

  const [recs, setRecs] = useState<RecommendationsData | null>(null);
  const [recsLoading, setRecsLoading] = useState(false);

  useEffect(() => {
    if (!history.length && !likes.length) {
      setRecs(null);
      return;
    }

    let isCancelled = false;
    setRecsLoading(true);

    fetch("/api/music/recommendations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        history: history.slice(-50),
        likes,
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: RecommendationsData | null) => {
        if (!isCancelled && data) {
          setRecs(data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!isCancelled) setRecsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [history.length, likes.length]);

  const recent: Track[] = [];
  const seen = new Set<string>();
  for (const h of history) {
    if (!seen.has(h.id)) {
      seen.add(h.id);
      recent.push(h);
    }
    if (recent.length >= 12) break;
  }
  const tracks = data?.tracks ?? [];

  return (
    <div className="flex w-full flex-col gap-8 pb-6 transition-all duration-300">
      {/* Hero Welcome banner */}
      <section
        className="relative w-full overflow-hidden rounded-[2rem] bg-gradient-to-br from-lilac via-pink to-peach dark:from-[#21163e] dark:via-[#2b173e] dark:to-[#1a1331] p-6 shadow-lg shadow-lilac-deep/15 dark:shadow-black/50 border border-transparent dark:border-white/10 transition-all duration-700 md:p-8"
      >
        <div
          className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/30 dark:bg-purple-500/15 blur-2xl pointer-events-none transition-colors duration-700"
        />
        <div
          className="absolute -bottom-16 right-24 h-48 w-48 rounded-full bg-sky/50 dark:bg-pink-500/15 blur-2xl pointer-events-none transition-colors duration-700"
        />
        <div className="relative max-w-xl">
          <p
            className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/70 dark:bg-white/10 dark:text-purple-300 dark:border dark:border-white/10 px-3 py-1 text-xs font-black text-ink"
          >
            <Sparkles size={13} className="text-lilac-deep dark:text-purple-300" /> {user ? `Welcome back, ${user.username}` : "Welcome to 5ONG"}
          </p>
          <h1 className="text-3xl font-black leading-tight md:text-5xl text-ink dark:text-white">Music that moves with you.</h1>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              className="btn bg-ink text-white dark:bg-white dark:!text-[#0c0918] shadow-lg hover:scale-105 transition-all duration-300"
              disabled={!tracks.length}
              onClick={() => playList(tracks, 0)}
            >
              <Play size={16} fill="currentColor" /> Play top charts
            </button>
            <button
              className="btn bg-white/80 dark:bg-white/10 dark:text-white transition-all duration-300"
              disabled={!tracks.length}
              onClick={() => shufflePlay(tracks)}
            >
              <Sparkles size={16} /> Smart shuffle
            </button>
            {recs?.recommended && recs.recommended.length > 0 && (
              <button
                className="btn bg-lilac-deep text-white shadow-lg hover:scale-105 transition-all duration-300"
                onClick={() => playList(recs.recommended, 0)}
              >
                <Radio size={16} /> Your Taste Mix
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 1. Personalized Recommendations ("Recommended For You") */}
      {recs?.recommended && recs.recommended.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="grid h-8 w-8 place-items-center rounded-xl bg-lilac-deep/10 text-lilac-deep dark:bg-purple-500/20 dark:text-purple-300 transition-colors"
              >
                <Wand2 size={18} />
              </span>
              <div>
                <h2 className="text-xl font-black">Recommended For You</h2>
                <p className="text-xs text-muted">
                  Fresh discoveries tailored to what you listen to most
                  {recs.topArtists.length > 0 && ` (${recs.topArtists.slice(0, 3).join(", ")})`}
                </p>
              </div>
            </div>
            <PlayAllButtons tracks={recs.recommended} />
          </div>

          <HorizontalSlider title="" step={320}>
            {recs.recommended.map((t, idx) => (
              <button
                key={t.id}
                className="group w-36 shrink-0 text-left"
                onClick={() => playList(recs.recommended, idx)}
              >
                <div className="relative">
                  <Cover
                    src={t.coverBig || t.cover}
                    size={144}
                    rounded="rounded-2xl"
                    className="shadow-md transition group-hover:-translate-y-1 group-hover:shadow-xl"
                  />
                  <span className="absolute bottom-2 right-2 grid h-9 w-9 translate-y-1 place-items-center rounded-full bg-white dark:bg-lilac-deep text-lilac-deep dark:text-white opacity-0 shadow-lg transition group-hover:translate-y-0 group-hover:opacity-100">
                    <Play size={16} fill="currentColor" />
                  </span>
                </div>
                <p className="mt-2 truncate text-sm font-extrabold">{t.title}</p>
                <p className="truncate text-xs text-muted">{t.artist}</p>
              </button>
            ))}
          </HorizontalSlider>
        </section>
      )}

      {/* 2. Jump back in (Recents) */}
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

      {/* 5. Browse genres */}
      <GenreChips title="Browse by genre" />

      {/* 6. Popular artists */}
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

      {/* 7. Trending Now */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xl font-black">
            <TrendingUp size={20} className="text-lilac-deep" /> {data?.name ?? "Now Trending"}
          </h2>
          <PlayAllButtons tracks={tracks} />
        </div>
        {loading && !tracks.length && (
          <div className="grid place-items-center py-16">
            <Spinner size={28} />
          </div>
        )}
        {error && !loading && !tracks.length && (
          <p className="card p-4 text-sm font-semibold text-muted">⚠ {error}. Please try again in a moment.</p>
        )}
        <TrackList tracks={tracks} />
      </section>

      {/* 8. Call To Action (CTA) Section */}
      <section className="relative overflow-hidden rounded-[2.5rem] border border-lilac-deep/20 dark:border-white/10 bg-gradient-to-r from-lilac-deep/15 via-pink-deep/15 to-sky/20 dark:from-[#1b1035] dark:via-[#251238] dark:to-[#0f1b32] p-8 md:p-12 shadow-xl backdrop-blur-md">
        <div className="relative z-10 flex flex-col items-center text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-lilac-deep/20 dark:bg-purple-500/20 px-3.5 py-1 text-xs font-black text-lilac-deep dark:text-purple-300 mb-3">
            <Users size={14} /> Synchronized Listening
          </span>
          <h2 className="text-2xl md:text-4xl font-black text-ink dark:text-white leading-tight">
            Listen together in real time with Jam Rooms.
          </h2>
          <p className="mt-3 text-sm text-muted max-w-lg">
            Create your own room, invite friends, sync lossless music playback instantly across mobile and desktop, and vote on what plays next.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/rooms"
              className="btn btn-primary !py-3 !px-6 text-sm font-black shadow-xl hover:scale-105 transition-all"
            >
              <Users size={17} /> Create or Join a Room <ArrowRight size={15} />
            </Link>
            <Link
              href="/search"
              className="btn btn-soft !py-3 !px-6 text-sm font-bold hover:scale-105 transition-all"
            >
              Explore Music Catalog
            </Link>
          </div>
        </div>
      </section>

      {/* 9. Site Footer */}
      <footer className="mt-4 border-t border-ink/5 dark:border-white/10 pt-8 pb-12 text-xs text-muted">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-extrabold text-ink dark:text-white text-sm">5ONG</p>
            <p className="mt-1 text-xs">High-fidelity music streaming &amp; real-time synchronized rooms.</p>
          </div>
          <div className="flex flex-wrap items-center gap-4 font-bold">
            <Link href="/privacy" className="hover:text-ink dark:hover:text-white transition">Privacy Policy</Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-ink dark:hover:text-white transition">Terms of Service</Link>
            <span>•</span>
            <Link href="/rooms" className="hover:text-ink dark:hover:text-white transition">Jam Rooms</Link>
            <span>•</span>
            <Link href="/library" className="hover:text-ink dark:hover:text-white transition">Your Library</Link>
            <span>•</span>
            <button
              onClick={() => {
                if (typeof window !== "undefined") {
                  window.dispatchEvent(new Event("5ong_reopen_cookie_banner"));
                }
              }}
              className="hover:text-ink dark:hover:text-white underline cursor-pointer"
            >
              Cookie Settings
            </button>
          </div>
        </div>
        <p className="mt-6 text-[11px] text-muted/80">
          © {new Date().getFullYear()} 5ONG. All rights reserved. Encrypted via HTTPS with strict privacy safeguards.
        </p>
      </footer>
    </div>
  );
}
