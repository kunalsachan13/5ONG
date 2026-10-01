"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Clock, Heart, Library, ListMusic, LogIn, Plus } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { PlayAllButtons, TrackList } from "@/components/TrackList";
import { Cover, EmptyState } from "@/components/ui";
import type { Track } from "@/lib/types";

type Tab = "liked" | "playlists" | "history";

function timeAgo(iso?: string) {
  if (!iso) return "";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function LibraryInner() {
  const { user, ready, likes, playlists, history, createPlaylist } = useApp();
  const sp = useSearchParams();
  const [tab, setTab] = useState<Tab>(sp.get("new") ? "playlists" : "liked");
  const [creating, setCreating] = useState(Boolean(sp.get("new")));
  const [name, setName] = useState("");

  useEffect(() => {
    if (sp.get("new")) {
      setTab("playlists");
      setCreating(true);
    }
  }, [sp]);

  const tabs: { id: Tab; label: string; Icon: typeof Heart; n: number }[] = [
    { id: "liked", label: "Liked songs", Icon: Heart, n: likes.length },
    { id: "playlists", label: "Playlists", Icon: ListMusic, n: playlists.length },
    { id: "history", label: "Listening log", Icon: Clock, n: history.length },
  ];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black">Your library</h1>
        {!user && (
          <Link href="/login" className="btn btn-soft !py-1.5 !text-xs">
            <LogIn size={14} /> Sign in to sync
          </Link>
        )}
      </div>
      <div className="flex flex-wrap gap-2" role="tablist">
        {tabs.map(({ id, label, Icon, n }) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            className={`btn ${tab === id ? "btn-primary" : "btn-soft"}`}
            onClick={() => setTab(id)}
          >
            <Icon size={16} /> {label} <span className="text-xs opacity-70">{n}</span>
          </button>
        ))}
      </div>

      {tab === "liked" && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-pink to-lilac">
                <Heart fill="currentColor" className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black">Liked Songs</h2>
                <p className="text-xs text-muted">{likes.length} songs</p>
              </div>
            </div>
            <PlayAllButtons tracks={likes} />
          </div>
          <TrackList
            tracks={likes}
            empty={<EmptyState icon={<Heart />} title="No liked songs yet">Tap the heart on any track (or press L while playing).</EmptyState>}
          />
        </section>
      )}

      {tab === "playlists" && (
        <section className="flex flex-col gap-4">
          {creating ? (
            <form
              className="card flex flex-wrap items-center gap-2 p-3"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!name.trim()) return;
                const p = await createPlaylist(name.trim());
                if (p) {
                  setName("");
                  setCreating(false);
                }
              }}
            >
              <input autoFocus className="input !w-auto min-w-0 flex-1" placeholder="Playlist name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} />
              <button className="btn btn-primary">Create</button>
              <button type="button" className="btn btn-ghost" onClick={() => setCreating(false)}>Cancel</button>
            </form>
          ) : (
            <div>
              <button className="btn btn-primary" onClick={() => setCreating(true)}>
                <Plus size={16} /> New playlist
              </button>
            </div>
          )}
          {playlists.length === 0 ? (
            <EmptyState icon={<ListMusic />} title="No playlists yet">
              Create one, or <Link className="font-bold text-lilac-deep underline" href="/import">import from Spotify</Link>.
            </EmptyState>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {playlists.map((p) => (
                <Link key={p.id} href={`/playlist/${p.id}`} className="card group p-3 transition hover:-translate-y-1 hover:shadow-lg">
                  <div className="grid aspect-square grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden rounded-xl bg-gradient-to-br from-lilac to-pink">
                    {[0, 1, 2, 3].map((i) =>
                      p.covers[i] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={p.covers[i]} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div key={i} className="bg-white/20" />
                      ),
                    )}
                  </div>
                  <p className="mt-2 truncate text-sm font-extrabold">{p.name}</p>
                  <p className="text-xs text-muted">{p.count} tracks</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === "history" && (
        <section className="flex flex-col gap-2">
          {history.length === 0 ? (
            <EmptyState icon={<Clock />} title="Nothing logged yet">Songs you listen to for 10+ seconds show up here.</EmptyState>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted">Your last {history.length} plays</p>
                <PlayAllButtons tracks={history as Track[]} />
              </div>
              <div className="flex flex-col">
                {history.slice(0, 100).map((h, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-2xl px-2.5 py-2 hover:bg-white/70">
                    <Cover src={h.cover} size={40} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{h.title}</p>
                      <p className="truncate text-xs text-muted">{h.artist}</p>
                    </div>
                    <span className="text-xs text-muted">{timeAgo(h.playedAt)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense fallback={null}>
      <LibraryInner />
    </Suspense>
  );
}
