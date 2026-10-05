"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Link2,
  ListPlus,
  Save,
  Music2,
  Sparkles,
  FileText,
  CheckCircle2,
  Play,
  Shuffle,
} from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { usePlayer } from "@/components/PlayerProvider";
import { PlayAllButtons, TrackList } from "@/components/TrackList";
import { Spinner } from "@/components/ui";
import type { Track } from "@/lib/types";

interface Imported {
  provider?: string;
  name: string;
  cover: string | null;
  total: number;
  tracks: Track[];
  missing: { title: string; artist: string }[];
}

type ProviderKey = "all" | "spotify" | "ytmusic" | "jiosaavn" | "amazon" | "text";

interface ProviderConfig {
  key: ProviderKey;
  label: string;
  icon: string;
  color: string;
  badgeBg: string;
  placeholder: string;
  hint: string;
  sampleUrl?: string;
}

const PROVIDERS: ProviderConfig[] = [
  {
    key: "all",
    label: "Auto-Detect",
    icon: "✨",
    color: "from-purple-500 to-pink-500",
    badgeBg: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
    placeholder: "Paste any link from Spotify, YouTube Music, JioSaavn, or Amazon Music...",
    hint: "Paste a playlist link from any supported app. 5ONG will automatically detect the source!",
  },
  {
    key: "spotify",
    label: "Spotify",
    icon: "🟢",
    color: "from-emerald-500 to-green-600",
    badgeBg: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    placeholder: "https://open.spotify.com/playlist/...",
    hint: "Paste any public Spotify playlist or album URL. We match every track to high-fidelity audio.",
    sampleUrl: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
  },
  {
    key: "ytmusic",
    label: "YouTube Music",
    icon: "🔴",
    color: "from-red-500 to-rose-600",
    badgeBg: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
    placeholder: "https://music.youtube.com/playlist?list=... or youtube.com/playlist?list=...",
    hint: "Paste YouTube Music or YouTube playlist links. Streams directly with verified audio matching.",
    sampleUrl: "https://music.youtube.com/playlist?list=PLMC9KNkIncKtPzgY-5rmhvj7fax8fdxoj",
  },
  {
    key: "jiosaavn",
    label: "JioSaavn",
    icon: "🔵",
    color: "from-teal-500 to-cyan-600",
    badgeBg: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20",
    placeholder: "https://www.jiosaavn.com/featured/... or /playlist/...",
    hint: "Paste JioSaavn playlist, featured, or album links for instant 320kbps HD audio streaming.",
    sampleUrl: "https://www.jiosaavn.com/featured/weekly-top-songs/8MT-LQlP35c_",
  },
  {
    key: "amazon",
    label: "Amazon Music",
    icon: "🟠",
    color: "from-amber-500 to-orange-600",
    badgeBg: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
    placeholder: "https://music.amazon.com/playlists/... or music.amazon.in/...",
    hint: "Paste public Amazon Music playlist or album links. We resolve tracks for direct playback.",
  },
  {
    key: "text",
    label: "Text Tracklist",
    icon: "📝",
    color: "from-indigo-500 to-blue-600",
    badgeBg: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20",
    placeholder: "Paste song titles or 'Song Name - Artist' (one per line)...",
    hint: "Paste track titles from any app or notes. 5ONG will search and build a playable playlist for you.",
  },
];

export default function ImportPage() {
  const { createPlaylist, user, toast } = useApp();
  const { playList } = usePlayer();
  const [provider, setProvider] = useState<ProviderKey>("all");
  const [inputVal, setInputVal] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Imported | null>(null);
  const [saved, setSaved] = useState(false);

  const activeConfig = PROVIDERS.find((p) => p.key === provider) || PROVIDERS[0];

  async function run(e: React.FormEvent) {
    e.preventDefault();
    const clean = inputVal.trim();
    if (!clean) return;

    setBusy(true);
    setError(null);
    setResult(null);
    setSaved(false);

    try {
      const payload: Record<string, string> = {
        provider: provider === "all" ? "" : provider,
      };

      if (provider === "text" || clean.includes("\n")) {
        payload.text = clean;
      } else {
        payload.url = clean;
      }

      const r = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const j = await r.json();
      if (!r.ok) {
        throw new Error(j.error ?? "Failed to import playlist");
      }
      setResult(j);
      toast(`Successfully imported "${j.name}" (${j.tracks?.length || 0} tracks)!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex w-full flex-col gap-6 transition-all duration-300 pb-16">
      {/* Top Banner */}
      <section className="relative w-full overflow-hidden rounded-[2rem] bg-gradient-to-br from-mint via-sky to-lilac dark:from-[#112435] dark:via-[#16203d] dark:to-[#1e153b] p-6 shadow-lg shadow-lilac-deep/15 dark:shadow-black/50 border border-transparent dark:border-white/10 transition-all duration-300 md:p-8">
        <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/30 dark:bg-emerald-400/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 right-24 h-48 w-48 rounded-full bg-pink/40 dark:bg-purple-500/15 blur-2xl pointer-events-none" />

        <div className="relative max-w-2xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 dark:bg-white/10 dark:text-emerald-300 dark:border dark:border-white/10 px-3 py-1 text-xs font-black text-ink">
              <Link2 size={13} className="text-mint dark:text-emerald-300" /> Universal Playlist Converter
            </span>
          </div>

          <h1 className="text-3xl font-black leading-tight md:text-4xl text-ink dark:text-white">
            Import Any Playlist
          </h1>

          <p className="mb-4 mt-2 text-sm font-semibold text-ink/75 dark:text-white/80 md:text-base">
            Import your public playlists and albums directly into 5ONG from{" "}
            <b className="text-ink dark:text-white">Spotify</b>,{" "}
            <b className="text-ink dark:text-white">YouTube Music</b>,{" "}
            <b className="text-ink dark:text-white">JioSaavn</b>, and{" "}
            <b className="text-ink dark:text-white">Amazon Music</b> with zero playback limits.
          </p>

          {/* Provider Tabs / Selector Pills */}
          <div className="flex flex-wrap items-center gap-1.5 mb-4">
            {PROVIDERS.map((p) => {
              const isActive = provider === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => {
                    setProvider(p.key);
                    setError(null);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black transition cursor-pointer ${
                    isActive
                      ? "bg-ink text-white dark:bg-white dark:text-ink shadow-md scale-[1.02]"
                      : "bg-white/60 dark:bg-white/10 text-ink/80 dark:text-white/80 hover:bg-white/90 dark:hover:bg-white/20"
                  }`}
                >
                  <span>{p.icon}</span>
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tip / Hint */}
          <p className="mb-3 text-xs font-bold text-ink/70 dark:text-white/70 flex items-center gap-1.5">
            <Sparkles size={13} className="text-lilac-deep dark:text-purple-300 shrink-0" />
            <span>{activeConfig.hint}</span>
          </p>

          {/* Input Form */}
          <form className="flex flex-col gap-2 max-w-2xl" onSubmit={run}>
            {provider === "text" ? (
              <textarea
                rows={5}
                className="input !rounded-2xl dark:!bg-[#120d24] dark:!border-white/20 dark:!text-white dark:placeholder-white/40 font-mono text-xs resize-y"
                placeholder={`Arijit Singh - Kesariya\nTaylor Swift - Blank Space\nEd Sheeran - Perfect\n...`}
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                aria-label="Track list"
                required
              />
            ) : (
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  className="input !rounded-2xl dark:!bg-[#120d24] dark:!border-white/20 dark:!text-white dark:placeholder-white/40 flex-1"
                  placeholder={activeConfig.placeholder}
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  aria-label="Playlist link"
                  required
                />
                <button
                  type="submit"
                  className="btn btn-primary shrink-0 cursor-pointer"
                  disabled={busy || !inputVal.trim()}
                >
                  {busy ? <Spinner size={16} /> : <Link2 size={16} />}
                  <span>{busy ? "Resolving tracks…" : "Import Playlist"}</span>
                </button>
              </div>
            )}

            {provider === "text" && (
              <button
                type="submit"
                className="btn btn-primary self-start cursor-pointer"
                disabled={busy || !inputVal.trim()}
              >
                {busy ? <Spinner size={16} /> : <FileText size={16} />}
                <span>{busy ? "Matching tracks…" : "Import Tracklist"}</span>
              </button>
            )}

            {/* Quick Sample Button if provided */}
            {activeConfig.sampleUrl && (
              <div className="mt-1 flex items-center gap-2">
                <span className="text-[11px] text-muted font-bold">Try sample:</span>
                <button
                  type="button"
                  onClick={() => setInputVal(activeConfig.sampleUrl || "")}
                  className="text-[11px] font-black underline text-lilac-deep dark:text-purple-300 hover:opacity-80 cursor-pointer"
                >
                  Load {activeConfig.label} demo link
                </button>
              </div>
            )}
          </form>
        </div>
      </section>

      {/* Error state */}
      {error && (
        <div className="card flex items-center gap-2.5 p-4 text-sm font-bold text-rose-600 dark:text-rose-400 border border-rose-500/20 bg-rose-500/5">
          <AlertTriangle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Busy state */}
      {busy && (
        <div className="card flex flex-col items-center justify-center gap-3 p-8 text-center animate-pulse">
          <Spinner size={24} />
          <div>
            <p className="text-base font-black text-ink dark:text-white">Importing and matching tracks…</p>
            <p className="text-xs text-muted mt-1">
              Extracting playlist songs and linking 320kbps full-length audio. Large playlists may take a few moments.
            </p>
          </div>
        </div>
      )}

      {/* Results Section */}
      {result && (
        <section className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="card flex flex-wrap items-center gap-4 p-5 shadow-md">
            {result.cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={result.cover}
                alt=""
                className="h-24 w-24 rounded-2xl object-cover shadow-md border border-ink/5 dark:border-white/10"
              />
            ) : (
              <div className="grid h-24 w-24 place-items-center rounded-2xl bg-gradient-to-br from-lilac to-pink text-white shadow-md">
                <Music2 size={36} />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                {result.provider && (
                  <span className="rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider bg-lilac/30 dark:bg-purple-900/40 text-lilac-deep dark:text-purple-300 border border-lilac-deep/20">
                    {result.provider}
                  </span>
                )}
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 size={13} /> Ready to play
                </span>
              </div>
              <h2 className="truncate text-xl font-black text-ink dark:text-white md:text-2xl">{result.name}</h2>
              <p className="text-xs text-muted mt-0.5">
                Matched <b className="text-ink dark:text-white">{result.tracks.length}</b> of {result.total} tracks
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="btn btn-primary cursor-pointer"
                disabled={!result.tracks.length}
                onClick={() => playList(result.tracks, 0)}
              >
                <Play size={16} fill="currentColor" /> Play All
              </button>
              <button
                type="button"
                className="btn btn-soft cursor-pointer"
                disabled={!result.tracks.length}
                onClick={() => {
                  const shuffled = [...result.tracks].sort(() => Math.random() - 0.5);
                  playList(shuffled, 0);
                }}
              >
                <Shuffle size={16} /> Shuffle
              </button>
              <button
                type="button"
                className="btn btn-soft cursor-pointer"
                disabled={saved || !result.tracks.length}
                onClick={async () => {
                  if (!user) return toast("Sign in to save playlists to your library", "err");
                  const p = await createPlaylist(result.name, result.tracks);
                  if (p) {
                    setSaved(true);
                    toast(`Playlist "${result.name}" saved to your library!`);
                  }
                }}
              >
                {saved ? <CheckCircle2 size={16} className="text-emerald-500" /> : <Save size={16} />}
                <span>{saved ? "Saved to Library" : "Save as Playlist"}</span>
              </button>
            </div>
          </div>

          {result.missing && result.missing.length > 0 && (
            <details className="card p-4 text-xs">
              <summary className="cursor-pointer font-bold text-muted hover:text-ink dark:hover:text-white">
                {result.missing.length} tracks could not be automatically matched (click to view)
              </summary>
              <ul className="mt-2.5 list-disc pl-5 text-muted space-y-1">
                {result.missing.map((m, i) => (
                  <li key={i}>
                    <span className="font-semibold text-ink dark:text-white">{m.title}</span>
                    {m.artist ? ` — ${m.artist}` : ""}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {/* Interactive Tracks List */}
          <div className="card p-4">
            <h3 className="text-sm font-black mb-3 px-1 text-ink dark:text-white">
              Playlist Tracks ({result.tracks.length})
            </h3>
            <TrackList tracks={result.tracks} />
          </div>
        </section>
      )}
    </div>
  );
}
