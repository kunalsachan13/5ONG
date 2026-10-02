"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ListMusic, Pencil, Trash2 } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { PlayAllButtons, TrackList } from "@/components/TrackList";
import { EmptyState, Spinner } from "@/components/ui";
import type { Track } from "@/lib/types";

export default function PlaylistPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user, ready, refreshLibrary, toast } = useApp();
  const [data, setData] = useState<{ name: string; tracks: Track[] } | null>(null);
  const [state, setState] = useState<"loading" | "ok" | "missing">("loading");
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");

  const load = useCallback(async () => {
    const r = await fetch(`/api/playlists/${id}`, { cache: "no-store" });
    if (!r.ok) return setState("missing");
    const j = await r.json();
    setData({ name: j.playlist.name, tracks: j.tracks });
    setName(j.playlist.name);
    setState("ok");
  }, [id]);

  useEffect(() => {
    if (ready && user) void load();
    else if (ready) setState("missing");
  }, [ready, user, load]);

  if (state === "loading") return <div className="grid place-items-center py-24"><Spinner size={30} /></div>;
  if (state === "missing" || !data)
    return (
      <div className="w-full transition-all duration-300">
        <EmptyState icon={<ListMusic />} title="Playlist not found">It may have been deleted, or you need to sign in.</EmptyState>
      </div>
    );

  return (
    <div className="w-full flex flex-col gap-6 transition-all duration-300">
      <div className="relative w-full overflow-hidden rounded-[2rem] bg-gradient-to-br from-peach via-pink to-lilac p-6 shadow-lg shadow-lilac-deep/15 transition-all duration-300 md:p-8">
        <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/30 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 right-24 h-48 w-48 rounded-full bg-sky/40 blur-2xl pointer-events-none" />
        <p className="text-xs font-black uppercase tracking-wider text-ink/60">Playlist</p>
        {editing ? (
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
            <input autoFocus className="input !max-w-sm" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
            <button className="btn btn-primary" aria-label="Save name"><Check size={16} /></button>
          </form>
        ) : (
          <h1 className="my-1 text-3xl font-black md:text-4xl">{data.name}</h1>
        )}
        <p className="mb-4 text-sm font-semibold text-ink/60">{data.tracks.length} tracks</p>
        <div className="flex flex-wrap items-center gap-2">
          <PlayAllButtons tracks={data.tracks} />
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
        </div>
      </div>
      <TrackList
        tracks={data.tracks}
        onRemove={async (t) => {
          await fetch(`/api/playlists/${id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "remove", trackId: t.id }),
          });
          setData((d) => (d ? { ...d, tracks: d.tracks.filter((x) => x.id !== t.id) } : d));
          refreshLibrary();
        }}
        empty={<EmptyState icon={<ListMusic />} title="This playlist is empty">Use “⋯ → Add to playlist” on any track.</EmptyState>}
      />
    </div>
  );
}
