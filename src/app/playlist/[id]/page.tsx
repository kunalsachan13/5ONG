"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ListMusic, Pencil, Trash2, BookmarkPlus, Play, Sparkles } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { PlayAllButtons, TrackList } from "@/components/TrackList";
import { Cover, EmptyState, Spinner } from "@/components/ui";
import type { Track } from "@/lib/types";

interface PlaylistData {
  id: string | number;
  name: string;
  cover?: string;
  isPublic?: boolean;
  source?: string;
  tracks: Track[];
}

export default function PlaylistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, ready, refreshLibrary, toast } = useApp();
  const [data, setData] = useState<PlaylistData | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "missing">("loading");
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/playlists/${id}`, { cache: "no-store" });
      if (!r.ok) return setState("missing");
      const j = await r.json();
      const pl = j.playlist;
      setData({
        id: pl.id,
        name: pl.name,
        cover: pl.cover,
        isPublic: Boolean(pl.isPublic),
        source: pl.source,
        tracks: j.tracks || [],
      });
      setName(pl.name);
      setState("ok");
    } catch {
      setState("missing");
    }
  }, [id]);

  useEffect(() => {
    if (ready) void load();
  }, [ready, load]);

  async function handleSaveToLibrary() {
    if (!user) {
      toast("Sign in to save playlists to your library", "err");
      router.push("/login");
      return;
    }
    if (!data) return;
    setSaving(true);
    try {
      const res = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.name }),
      });
      if (!res.ok) throw new Error("Failed to create playlist");
      const json = await res.json();
      if (data.tracks.length > 0) {
        await fetch(`/api/playlists/${json.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tracks: data.tracks }),
        });
      }
      await refreshLibrary();
      toast(`Saved “${data.name}” to your library!`);
    } catch {
      toast("Failed to save playlist", "err");
    } finally {
      setSaving(false);
    }
  }

  if (state === "loading") {
    return (
      <div className="grid place-items-center py-24">
        <Spinner size={30} />
      </div>
    );
  }

  if (state === "missing" || !data) {
    return (
      <div className="w-full transition-all duration-300">
        <EmptyState icon={<ListMusic />} title="Playlist not found">
          It may have been deleted, or you need to sign in to view private playlists.
        </EmptyState>
      </div>
    );
  }

  const isCatalog = Boolean(data.isPublic || String(id).startsWith("saavn_") || String(id).startsWith("dz_"));

  return (
    <div className="w-full flex flex-col gap-6 transition-all duration-300">
      <div className="relative w-full overflow-hidden rounded-[2rem] bg-gradient-to-br from-peach via-pink to-lilac dark:from-[#3a202d] dark:via-[#3b1c3c] dark:to-[#2e1d4d] p-6 shadow-lg shadow-lilac-deep/15 dark:shadow-black/40 border border-transparent dark:border-white/10 transition-all duration-300 md:p-8">
        <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/30 dark:bg-pink-deep/15 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 right-24 h-48 w-48 rounded-full bg-sky/40 dark:bg-lilac-deep/15 blur-2xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {data.cover ? (
            <div className="shrink-0 h-28 w-28 sm:h-36 sm:w-36 rounded-2xl overflow-hidden shadow-md ring-2 ring-white/20">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.cover} alt={data.name} className="h-full w-full object-cover" />
            </div>
          ) : null}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-black uppercase tracking-wider text-ink/60 dark:text-white/70">
                {isCatalog ? `${data.source || "Featured"} Playlist` : "Your Playlist"}
              </span>
              {isCatalog && (
                <span className="rounded-full bg-lilac/30 dark:bg-white/15 px-2 py-0.5 text-[10px] font-black text-lilac-deep dark:text-white">
                  Public
                </span>
              )}
            </div>

            {editing && !isCatalog ? (
              <form
                className="my-2 flex gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const r = await fetch(`/api/playlists/${id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name }),
                  });
                  if (r.ok) {
                    setData({ ...data, name });
                    setEditing(false);
                    refreshLibrary();
                  } else toast("Couldn't rename", "err");
                }}
              >
                <input
                  autoFocus
                  className="input !max-w-sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={80}
                />
                <button className="btn btn-primary" aria-label="Save name">
                  <Check size={16} />
                </button>
              </form>
            ) : (
              <h1 className="my-1 text-2xl font-black md:text-3xl lg:text-4xl text-ink dark:text-white truncate">
                {data.name}
              </h1>
            )}

            <p className="mb-4 text-sm font-semibold text-ink/70 dark:text-white/80">
              {data.tracks.length} track{data.tracks.length === 1 ? "" : "s"}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <PlayAllButtons tracks={data.tracks} />

              {isCatalog ? (
                <button
                  className="btn btn-soft flex items-center gap-1.5"
                  onClick={handleSaveToLibrary}
                  disabled={saving}
                  title="Save a copy of this playlist to your personal library"
                >
                  <BookmarkPlus size={15} /> {saving ? "Saving…" : "Save to library"}
                </button>
              ) : (
                <>
                  <button className="btn btn-soft" onClick={() => setEditing((e) => !e)}>
                    <Pencil size={14} /> Rename
                  </button>
                  <button
                    className="btn btn-soft !text-pink-deep"
                    onClick={async () => {
                      if (!confirm(`Delete “${data.name}”?`)) return;
                      const r = await fetch(`/api/playlists/${id}`, { method: "DELETE" });
                      if (r.ok) {
                        await refreshLibrary();
                        toast("Playlist deleted");
                        router.push("/library");
                      }
                    }}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <TrackList
        tracks={data.tracks}
        onRemove={
          isCatalog
            ? undefined
            : async (t) => {
                await fetch(`/api/playlists/${id}`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ action: "remove", trackId: t.id }),
                });
                setData((d) => (d ? { ...d, tracks: d.tracks.filter((x) => x.id !== t.id) } : d));
                refreshLibrary();
              }
        }
        empty={
          <EmptyState icon={<ListMusic />} title="This playlist is empty">
            {isCatalog ? "No songs currently in this playlist." : "Use “⋯ → Add to playlist” on any track."}
          </EmptyState>
        }
      />
    </div>
  );
}
