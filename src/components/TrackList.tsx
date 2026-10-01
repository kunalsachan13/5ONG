"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Disc3,
  Download,
  Heart,
  ListEnd,
  ListPlus,
  ListStart,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Trash2,
  User,
} from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { usePlayer } from "@/components/PlayerProvider";
import { Cover } from "@/components/ui";
import { fmtTime } from "@/lib/eq";
import type { Track } from "@/lib/types";

export function TrackMenuButton({ track, onRemove, className = "" }: { track: Track; onRemove?: () => void; className?: string }) {
  const btn = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"main" | "playlists">("main");
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [newName, setNewName] = useState("");
  const { enqueue, playNext, downloadTrack } = usePlayer();
  const { playlists, addToPlaylist, createPlaylist, user, toast } = useApp();

  useLayoutEffect(() => {
    if (!open || !btn.current) return;
    const r = btn.current.getBoundingClientRect();
    const w = 240;
    const h = view === "main" ? 250 : 320;
    const left = Math.min(window.innerWidth - w - 8, Math.max(8, r.right - w));
    const top = r.bottom + h > window.innerHeight - 8 ? Math.max(8, r.top - h) : r.bottom + 4;
    setPos({ top, left });
  }, [open, view]);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      const t = e.target as HTMLElement;
      if (t.closest?.("[data-track-menu]") || btn.current?.contains(t)) return;
      setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    window.addEventListener("scroll", () => setOpen(false), true);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const item = "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold text-ink hover:bg-lilac/30";

  return (
    <>
      <button
        ref={btn}
        className={`icon-btn ${className}`}
        aria-label={`More options for ${track.title}`}
        onClick={(e) => {
          e.stopPropagation();
          setView("main");
          setOpen((o) => !o);
        }}
      >
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div
          data-track-menu
          className="pop-in glass fixed z-[70] w-60 rounded-2xl p-1.5"
          style={{ top: pos.top, left: pos.left }}
          onClick={(e) => e.stopPropagation()}
        >
          {view === "main" ? (
            <>
              <button className={item} onClick={() => (playNext(track), setOpen(false))}>
                <ListStart size={16} /> Play next
              </button>
              <button className={item} onClick={() => (enqueue(track), setOpen(false))}>
                <ListEnd size={16} /> Add to queue
              </button>
              <button
                className={item}
                onClick={() => (user ? setView("playlists") : toast("Sign in to use playlists", "err"))}
              >
                <ListPlus size={16} /> Add to playlist…
              </button>
              <button className={item} onClick={() => (downloadTrack(track), setOpen(false))}>
                <Download size={16} /> Download MP3
              </button>
              {track.artistId && (
                <Link
                  className={item}
                  href={`/search?artist=${track.artistId}&name=${encodeURIComponent(track.artist)}`}
                  onClick={() => setOpen(false)}
                >
                  <User size={16} /> More from {track.artist}
                </Link>
              )}
              {onRemove && (
                <button className={`${item} text-pink-deep`} onClick={() => (onRemove(), setOpen(false))}>
                  <Trash2 size={16} /> Remove
                </button>
              )}
            </>
          ) : (
            <div>
              <button className={`${item} text-muted`} onClick={() => setView("main")}>
                <ArrowLeft size={16} /> Back
              </button>
              <div className="max-h-44 overflow-y-auto">
                {playlists.length === 0 && <p className="px-3 py-2 text-xs text-muted">No playlists yet. Create one below.</p>}
                {playlists.map((p) => (
                  <button
                    key={p.id}
                    className={item}
                    onClick={async () => {
                      await addToPlaylist(p.id, [track]);
                      setOpen(false);
                    }}
                  >
                    <Disc3 size={16} /> <span className="truncate">{p.name}</span>
                  </button>
                ))}
              </div>
              <form
                className="mt-1 flex gap-1.5 border-t border-lilac/30 p-1.5 pt-2.5"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!newName.trim()) return;
                  const p = await createPlaylist(newName.trim(), [track]);
                  if (p) {
                    setNewName("");
                    setOpen(false);
                  }
                }}
              >
                <input
                  className="input !rounded-xl !px-3 !py-1.5 !text-sm"
                  placeholder="New playlist"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  maxLength={80}
                />
                <button className="btn btn-primary !px-3" aria-label="Create playlist">
                  <Plus size={16} />
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export function TrackRow({
  track,
  list,
  index,
  onRemove,
}: {
  track: Track;
  list: Track[];
  index: number;
  onRemove?: () => void;
}) {
  const { current, playing, playTrack, toggle } = usePlayer();
  const { likedIds, toggleLike } = useApp();
  const isCur = current?.id === track.id;
  const liked = likedIds.has(track.id);

  return (
    <div
      className={`group flex items-center gap-3 rounded-2xl px-2.5 py-2 transition-colors ${
        isCur ? "bg-lilac/30" : "hover:bg-white/70"
      }`}
      onDoubleClick={() => playTrack(track, list)}
    >
      <button
        className="relative shrink-0"
        aria-label={isCur && playing ? `Pause ${track.title}` : `Play ${track.title}`}
        onClick={() => (isCur ? toggle() : playTrack(track, list))}
      >
        <Cover src={track.cover} size={46} />
        <span
          className={`absolute inset-0 grid place-items-center rounded-xl bg-ink/35 text-white transition-opacity ${
            isCur ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          {isCur && playing ? (
            <span className="eq-anim flex items-end gap-0.5 [&>span]:!bg-white">
              <span />
              <span />
              <span />
            </span>
          ) : (
            <Play size={18} fill="currentColor" />
          )}
        </span>
      </button>
      <span className="hidden w-6 text-center text-xs font-bold text-muted sm:block">{index + 1}</span>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-bold ${isCur ? "text-lilac-deep" : ""}`}>
          {track.title}
          {track.explicit && (
            <span className="ml-1.5 rounded bg-ink/10 px-1 py-px align-middle text-[9px] font-black text-muted">E</span>
          )}
        </p>
        <p className="truncate text-xs text-muted">
          {track.artist}
          {track.album ? <span className="hidden md:inline"> · {track.album}</span> : null}
        </p>
      </div>
      <button
        className={`icon-btn ${liked ? "on !text-pink-deep" : ""}`}
        aria-label={liked ? "Unlike" : "Like"}
        aria-pressed={liked}
        onClick={() => toggleLike(track)}
      >
        <Heart size={18} fill={liked ? "currentColor" : "none"} />
      </button>
      <span className="hidden w-10 text-right text-xs tabular-nums text-muted sm:block">{fmtTime(track.duration)}</span>
      <TrackMenuButton track={track} onRemove={onRemove} />
    </div>
  );
}

export function TrackList({
  tracks,
  onRemove,
  empty,
}: {
  tracks: Track[];
  onRemove?: (t: Track) => void;
  empty?: React.ReactNode;
}) {
  if (!tracks.length) return <>{empty ?? null}</>;
  return (
    <div className="flex flex-col">
      {tracks.map((t, i) => (
        <TrackRow key={t.id + ":" + i} track={t} list={tracks} index={i} onRemove={onRemove ? () => onRemove(t) : undefined} />
      ))}
    </div>
  );
}

export function PlayAllButtons({ tracks }: { tracks: Track[] }) {
  const { playList, shufflePlay, enqueue } = usePlayer();
  if (!tracks.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button className="btn btn-primary" onClick={() => playList(tracks, 0)}>
        <Play size={16} fill="currentColor" /> Play all
      </button>
      <button className="btn btn-soft" onClick={() => shufflePlay(tracks)}>
        <span aria-hidden>✨</span> Smart shuffle
      </button>
      <button className="btn btn-soft" onClick={() => enqueue(tracks)}>
        <ListEnd size={16} /> Queue
      </button>
    </div>
  );
}

export { Pause };
