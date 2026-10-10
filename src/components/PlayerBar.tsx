"use client";

import { useEffect, useState, useRef } from "react";
import {
  ChevronUp,
  Heart,
  ListMusic,
  Loader2,
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
  Maximize2,
  Minimize2,
} from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { usePlayer } from "@/components/PlayerProvider";
import { useTheme } from "@/components/ThemeProvider";
import { Cover, Slider } from "@/components/ui";
import { fmtTime } from "@/lib/eq";

export default function PlayerBar() {
  const p = usePlayer();
  const { likedIds, toggleLike } = useApp();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);
  const [scrubPos, setScrubPos] = useState(0);
  const mobileTrackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const handleMobileScrub = (clientX: number) => {
    if (!mobileTrackRef.current || !p.duration) return;
    const rect = mobileTrackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const target = ratio * p.duration;
    setScrubPos(target);
  };

  const t = p.current;
  const liked = t ? likedIds.has(t.id) : false;
  const VolIcon = p.muted || p.volume === 0 ? VolumeX : p.volume < 0.5 ? Volume1 : Volume2;
  const tabBtn = (tab: "eq" | "queue" | "room", Icon: typeof ListMusic, label: string) => (
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

  const displayPos = scrubbing ? scrubPos : p.position;
  const pct = p.duration ? Math.max(0, Math.min(100, (displayPos / p.duration) * 100)) : 0;

  return (
    <div className="relative mx-2 mb-2 rounded-3xl md:mx-4 md:mb-3 bg-white/95 dark:bg-[#140e26]/95 backdrop-blur-2xl border border-black/5 dark:border-white/10 shadow-2xl" role="region" aria-label="Player">
      {/* Mobile Interactive Touch Scrubber */}
      <div
        ref={mobileTrackRef}
        className="absolute -top-2.5 inset-x-4 z-20 flex h-6 items-center cursor-pointer touch-none select-none md:hidden"
        onTouchStart={(e) => {
          if (!p.duration || p.locked) return;
          setScrubbing(true);
          handleMobileScrub(e.touches[0].clientX);
        }}
        onTouchMove={(e) => {
          if (!p.duration || p.locked) return;
          handleMobileScrub(e.touches[0].clientX);
        }}
        onTouchEnd={() => {
          if (p.duration && !p.locked) {
            p.seek(scrubPos);
          }
          setScrubbing(false);
        }}
        onClick={(e) => {
          if (!p.duration || p.locked) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          p.seek(ratio * p.duration);
        }}
        aria-label="Seek track"
        role="slider"
        aria-valuemin={0}
        aria-valuemax={p.duration || 1}
        aria-valuenow={displayPos}
      >
        {/* Track background */}
        <div className="relative h-1.5 w-full rounded-full bg-ink/15 dark:bg-white/20 overflow-visible">
          {/* Progress fill */}
          <div
            className="h-full rounded-full transition-all duration-150"
            style={{
              width: `${pct}%`,
              background: "linear-gradient(to right, var(--color-lilac-deep), var(--color-pink))",
            }}
          />
          {/* Thumb handle */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full bg-white shadow-md border-2 pointer-events-none transition-transform"
            style={{
              left: `${pct}%`,
              borderColor: "var(--color-lilac-deep)",
            }}
          />
          {/* Floating Time Pill during drag */}
          {scrubbing && (
            <div
              className="absolute -top-7 -translate-x-1/2 rounded-full bg-black/90 text-white px-2 py-0.5 text-[10px] font-extrabold shadow-lg pointer-events-none whitespace-nowrap"
              style={{ left: `${pct}%` }}
            >
              {fmtTime(scrubPos)} / {fmtTime(p.duration)}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto] items-center gap-2 px-3 py-2.5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_minmax(0,1fr)] md:gap-4 md:px-4">
        {/* track info */}
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <button
            className="group relative shrink-0"
            aria-label="Open now playing"
            onClick={() => p.setPanel(p.panel ? null : "player")}
          >
            <Cover src={t?.cover} size={46} className="!rounded-2xl shrink-0" />
            <span className="absolute inset-0 hidden place-items-center rounded-2xl bg-black/60 text-white group-hover:grid">
              <ChevronUp size={20} />
            </span>
          </button>
          <div
            className="min-w-0 flex-1 cursor-pointer"
            onClick={() => p.setPanel(p.panel ? null : "player")}
          >
            <p className="truncate text-sm font-extrabold text-ink dark:text-white leading-tight">
              {t?.title ?? "Nothing playing"}
            </p>
            <p className="flex items-center gap-1.5 truncate text-[11px] sm:text-xs text-muted mt-0.5">
              <span className="truncate">{t ? t.artist : "Pick a song to start"}</span>
              {p.sourceType === "saavn" && (
                <span className="shrink-0 rounded-full bg-lilac/30 dark:bg-purple-500/25 px-1.5 py-0.2 text-[9px] font-black text-lilac-deep dark:text-purple-300">
                  320k HD
                </span>
              )}
              {p.sourceType === "youtube" && (
                <span className="shrink-0 rounded-full bg-pink/30 dark:bg-pink-500/25 px-1.5 py-0.2 text-[9px] font-black text-pink-deep dark:text-pink-300">
                  FULL
                </span>
              )}
              {p.roomCode && (
                <span className="shrink-0 rounded-full bg-mint dark:bg-emerald-400 px-1.5 py-0.5 text-[9px] font-black text-ink dark:text-[#0c0918]">
                  LIVE {p.roomCode}
                </span>
              )}
            </p>
          </div>
          {t && (
            <button
              className={`icon-btn !hidden sm:!grid ${liked ? "!text-pink-deep" : ""}`}
              aria-label={liked ? "Unlike" : "Like"}
              aria-pressed={liked}
              onClick={() => toggleLike(t)}
            >
              <Heart size={18} fill={liked ? "currentColor" : "none"} />
            </button>
          )}
        </div>

        {/* transport */}
        <div className="flex flex-col items-center gap-1 md:order-none shrink-0">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              className={`icon-btn !hidden md:!grid ${p.shuffle !== "off" ? "on" : ""}`}
              aria-label={`Shuffle: ${p.shuffle}`}
              title={`Shuffle: ${p.shuffle === "smart" ? "Smart (AI)" : p.shuffle} (S)`}
              onClick={p.cycleShuffle}
            >
              {p.shuffle === "smart" ? <Sparkles size={18} /> : <Shuffle size={18} />}
            </button>
            <button
              className="icon-btn !h-9 !w-9 sm:!h-10 sm:!w-10 text-ink/80 dark:text-white/80 hover:text-ink dark:hover:text-white transition active:scale-95 disabled:opacity-40"
              aria-label="Previous"
              onClick={p.prev}
              disabled={!t}
            >
              <SkipBack size={19} fill="currentColor" />
            </button>
            <button
              className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full btn-primary !p-0 transition hover:scale-105 active:scale-95 disabled:opacity-50"
              aria-label={p.playing ? "Pause" : "Play"}
              onClick={p.toggle}
              disabled={!t}
            >
              {p.loading && p.playing ? (
                <Loader2 size={19} className="animate-spin shrink-0" />
              ) : p.playing ? (
                <Pause size={19} fill="currentColor" className="shrink-0" />
              ) : (
                <Play size={19} fill="currentColor" className="shrink-0" />
              )}
            </button>
            <button
              className="icon-btn !h-9 !w-9 sm:!h-10 sm:!w-10 text-ink/80 dark:text-white/80 hover:text-ink dark:hover:text-white transition active:scale-95 disabled:opacity-40"
              aria-label="Next"
              onClick={p.next}
              disabled={!t}
            >
              <SkipForward size={19} fill="currentColor" />
            </button>
            <button
              className={`icon-btn !hidden md:!grid ${p.repeat !== "off" ? "on" : ""}`}
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
          {tabBtn("queue", ListMusic, "Queue (Q)")}
          {tabBtn("eq", SlidersHorizontal, "Equalizer (E)")}
          {tabBtn("room", Users, "Listening room")}
          <button className="icon-btn" aria-label={p.muted ? "Unmute" : "Mute"} onClick={p.toggleMute}>
            <VolIcon size={18} />
          </button>
          <div className="w-20 lg:w-28">
            <Slider label="Volume" value={p.muted ? 0 : p.volume} max={1} step={0.01} onChange={p.setVolume} />
          </div>
          <button
            className={`icon-btn ${isFullscreen ? "on text-lilac-deep" : ""}`}
            aria-label={isFullscreen ? "Exit full-screen (F11)" : "Full-screen (F11)"}
            title={isFullscreen ? "Exit full-screen (F11)" : "Full-screen (F11)"}
            onClick={() => {
              if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
              } else {
                document.exitFullscreen().catch(() => {});
              }
            }}
          >
            {isFullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
          </button>
        </div>
      </div>
    </div>
  );
}
