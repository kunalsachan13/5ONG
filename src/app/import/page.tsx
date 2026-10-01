"use client";

import { useState } from "react";
import { AlertTriangle, Link2, ListPlus, Save } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { PlayAllButtons, TrackList } from "@/components/TrackList";
import { Spinner } from "@/components/ui";
import type { Track } from "@/lib/types";

interface Imported {
  name: string;
  cover: string | null;
  total: number;
  tracks: Track[];
  missing: { title: string; artist: string }[];
}

export default function ImportPage() {
  const { createPlaylist, user, toast } = useApp();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Imported | null>(null);
  const [saved, setSaved] = useState(false);

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    setSaved(false);
    try {
      const r = await fetch("/api/spotify/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Import failed");
      setResult(j);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div className="rounded-[2rem] bg-gradient-to-br from-mint via-sky to-lilac p-6 md:p-8">
        <h1 className="flex items-center gap-2 text-3xl font-black">
          <Link2 /> Import from Spotify
        </h1>
        <p className="mb-4 mt-1 max-w-xl text-sm font-semibold text-ink/70">
          Paste a public Spotify playlist or album link. We read the track list instantly and match every song to playable audio.
        </p>
        <form className="flex flex-col gap-2 sm:flex-row" onSubmit={run}>
          <input
            className="input"
            placeholder="https://open.spotify.com/playlist/…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            aria-label="Spotify link"
            required
          />
          <button className="btn btn-primary shrink-0 !bg-ink !text-white" disabled={busy || !url.trim()}>
            {busy ? <Spinner size={16} /> : <Link2 size={16} />} {busy ? "Matching tracks…" : "Import"}
          </button>
        </form>
      </div>

      {error && (
        <p className="card flex items-center gap-2 p-4 text-sm font-bold text-pink-deep">
          <AlertTriangle size={18} /> {error}
        </p>
      )}

      {busy && <p className="text-center text-sm font-semibold text-muted">Resolving tracks — big playlists can take up to a minute…</p>}

      {result && (
        <section className="flex flex-col gap-4">
          <div className="card flex flex-wrap items-center gap-4 p-4">
            {result.cover && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={result.cover} alt="" className="h-20 w-20 rounded-2xl object-cover shadow" />
            )}
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-xl font-black">{result.name}</h2>
              <p className="text-sm text-muted">
                Matched <b className="text-ink">{result.tracks.length}</b> of {result.total} tracks
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <PlayAllButtons tracks={result.tracks} />
              <button
                className="btn btn-soft"
                disabled={saved || !result.tracks.length}
                onClick={async () => {
                  if (!user) return toast("Sign in to save playlists", "err");
                  const p = await createPlaylist(result.name, result.tracks);
                  if (p) setSaved(true);
                }}
              >
                {saved ? <ListPlus size={16} /> : <Save size={16} />} {saved ? "Saved" : "Save as playlist"}
              </button>
            </div>
          </div>
          {result.missing.length > 0 && (
            <details className="card p-4 text-sm">
              <summary className="cursor-pointer font-bold">{result.missing.length} tracks couldn’t be matched</summary>
              <ul className="mt-2 list-disc pl-5 text-muted">
                {result.missing.map((m, i) => (
                  <li key={i}>
                    {m.title} — {m.artist}
                  </li>
                ))}
              </ul>
            </details>
          )}
          <TrackList tracks={result.tracks} />
        </section>
      )}
    </div>
  );
}
