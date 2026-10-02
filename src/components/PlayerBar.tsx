"use client";

import {
  ChevronUp,
  Heart,
  ListMusic,
  Loader2,
  MicVocal,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Sparkles,
  Users,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { usePlayer } from "@/components/PlayerProvider";
import { Cover, Slider } from "@/components/ui";
import { fmtTime } from "@/lib/eq";

export default function PlayerBar() {
  const p = usePlayer();
  const { likedIds, toggleLike } = useApp();
  const t = p.current;
  const liked = t ? likedIds.has(t.id) : false;
  const VolIcon = p.muted || p.volume === 0 ? VolumeX : p.volume < 0.5 ? Volume1 : Volume2;
  const tabBtn = (tab: "lyrics" | "eq" | "queue" | "room", Icon: typeof MicVocal, label: string) => (
    <button
      className={`icon-btn ${p.panel === tab ? "on" : ""}`}
      aria-label={label}
      title={label}
      aria-pressed={p.panel === tab}
      onClick={() => p.setPanel(p.panel === tab ? null : tab)}
    >
      <Icon size={18} />
    </button>
  );

  return (
    <div className="glass relative mx-2 mb-2 rounded-3xl md:mx-4 md:mb-3" role="region" aria-label="Player">
      {/* mobile progress */}
      <div className="absolute inset-x-5 top-0 h-[3px] overflow-hidden rounded-full bg-ink/10 md:hidden">
        <div
          className="h-full bg-lilac-deep"
          style={{ width: `${p.duration ? (p.position / p.duration) * 100 : 0}%` }}
        />
      </div>
      <div className="grid grid-cols-[1fr_auto] items-center gap-2 px-3 py-2.5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1fr)] md:gap-4 md:px-4">
        {/* track info */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            className="group relative shrink-0"
            aria-label="Open now playing"
            onClick={() => p.setPanel(p.panel ? null : "player")}
          >
            <Cover src={t?.cover} size={52} />
            <span className="absolute inset-0 hidden place-items-center rounded-xl bg-black/60 text-white group-hover:grid">
              <ChevronUp size={20} />
            </span>
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold">{t?.title ?? "Nothing playing"}</p>
            <p className="flex items-center gap-1.5 truncate text-xs text-muted">
              <span className="truncate">{t ? t.artist : "Pick a song to start"}</span>
              {p.sourceType === "saavn" && (
                <span className="shrink-0 rounded-full bg-lilac/30 px-1.5 py-0.2 text-[9px] font-black text-lilac-deep">
                  320k HD
                </span>
              )}
              {p.sourceType === "youtube" && (
                <span className="shrink-0 rounded-full bg-pink/30 px-1.5 py-0.2 text-[9px] font-black text-pink-deep">
                  FULL
                </span>
              )}
              {p.roomCode && (
                <span className="shrink-0 rounded-full bg-mint px-1.5 py-0.5 text-[10px] font-black text-ink">
                  LIVE {p.roomCode}
                </span>
              )}
            </p>
          </div>
          {t && (
            <button
              className={`icon-btn hidden sm:grid ${liked ? "!text-pink-deep" : ""}`}
              aria-label={liked ? "Unlike" : "Like"}
              aria-pressed={liked}
              onClick={() => toggleLike(t)}
            >
              <Heart size={18} fill={liked ? "currentColor" : "none"} />
            </button>
          )}
        </div>

        {/* transport */}
        <div className="flex flex-col items-center gap-1 md:order-none">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              className={`icon-btn hidden sm:grid ${p.shuffle !== "off" ? "on" : ""}`}
              aria-label={`Shuffle: ${p.shuffle}`}
              title={`Shuffle: ${p.shuffle === "smart" ? "Smart (AI)" : p.shuffle} (S)`}
              onClick={p.cycleShuffle}
            >
              {p.shuffle === "smart" ? <Sparkles size={18} /> : <Shuffle size={18} />}
            </button>
            <button className="icon-btn" aria-label="Previous" onClick={p.prev} disabled={!t}>
              <SkipBack size={20} fill="currentColor" />
            </button>
            <button
              className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-lilac to-pink text-ink shadow-lg shadow-lilac-deep/30 transition hover:scale-105 active:scale-95 disabled:opacity-50"
              aria-label={p.playing ? "Pause" : "Play"}
              onClick={p.toggle}
              disabled={!t}
            >
              {p.loading && p.playing ? (
                <Loader2 size={20} className="animate-spin" />
              ) : p.playing ? (
                <Pause size={20} fill="currentColor" />
              ) : (
                <Play size={20} fill="currentColor" className="translate-x-px" />
              )}
            </button>
            <button className="icon-btn" aria-label="Next" onClick={p.next} disabled={!t}>
              <SkipForward size={20} fill="currentColor" />
            </button>
            <button
              className={`icon-btn hidden sm:grid ${p.repeat !== "off" ? "on" : ""}`}
              aria-label={`Repeat: ${p.repeat}`}
              title={`Repeat: ${p.repeat} (R)`}
              onClick={p.cycleRepeat}
            >
              {p.repeat === "one" ? <Repeat1 size={18} /> : <Repeat size={18} />}
            </button>
          </div>
          <div className="hidden w-full items-center gap-2 md:flex">
            <span className="w-9 text-right text-[11px] tabular-nums text-muted">{fmtTime(p.position)}</span>
            <Slider
              label="Seek"
              value={p.position}
              max={p.duration || 1}
              step={0.1}
              onChange={p.seek}
              className={p.locked ? "opacity-60" : ""}
            />
            <span className="w-9 text-[11px] tabular-nums text-muted">{fmtTime(p.duration)}</span>
          </div>
        </div>

        {/* extras */}
        <div className="hidden items-center justify-end gap-0.5 md:flex">
          {tabBtn("lyrics", MicVocal, "Lyrics (Y)")}
          {tabBtn("eq", SlidersHorizontal, "Equalizer (E)")}
          {tabBtn("queue", ListMusic, "Queue (Q)")}
          {tabBtn("room", Users, "Listening room")}
          <button className="icon-btn" aria-label={p.muted ? "Unmute" : "Mute"} onClick={p.toggleMute}>
            <VolIcon size={18} />
          </button>
          <div className="w-20 lg:w-28">
            <Slider label="Volume" value={p.muted ? 0 : p.volume} max={1} step={0.01} onChange={p.setVolume} />
          </div>
        </div>
      </div>
    </div>
  );
}
