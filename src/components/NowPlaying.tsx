"use client";

import { useState } from "react";
import {
  AudioLines,
  ChevronDown,
  Disc3,
  Download,
  Heart,
  ListMusic,
  MicVocal,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { usePlayer, type Tab, type VizMode } from "@/components/PlayerProvider";
import { EmptyState, Cover } from "@/components/ui";
import Visualizer from "@/components/Visualizer";
import { TrackMenuButton } from "@/components/TrackList";
import { EqualizerPanel, LyricsPanel, QueuePanel, RoomPanel } from "@/components/panels";

const TABS: { id: Tab; label: string; Icon: typeof Disc3 }[] = [
  { id: "player", label: "Now Playing", Icon: Disc3 },
  { id: "lyrics", label: "Lyrics", Icon: MicVocal },
  { id: "eq", label: "Equalizer", Icon: SlidersHorizontal },
  { id: "queue", label: "Queue", Icon: ListMusic },
  { id: "room", label: "Room", Icon: Users },
];

const VIZ: { id: VizMode; label: string }[] = [
  { id: "bars", label: "Bars" },
  { id: "mirror", label: "Mirror" },
  { id: "wave", label: "Wave" },
  { id: "orbit", label: "Orbit" },
];

function PlayerTab() {
  const p = usePlayer();
  const { likedIds, toggleLike } = useApp();
  const [quality, setQuality] = useState(320);
  const t = p.current;
  if (!t) return <EmptyState icon={<AudioLines />} title="Nothing playing yet">Pick a track from Home or Search to start the show.</EmptyState>;
  const liked = likedIds.has(t.id);
  return (
    <div className="mx-auto grid h-full w-full max-w-6xl min-h-0 gap-6 overflow-y-auto lg:grid-cols-[minmax(280px,380px)_1fr] lg:items-center">
      <div className="flex flex-col items-center gap-4">
        <div className={`relative ${p.playing ? "[animation:floaty_5s_ease-in-out_infinite]" : ""}`}>
          <div className="absolute -inset-3 rounded-[2.2rem] bg-gradient-to-br from-lilac via-pink to-peach opacity-60 blur-2xl" />
          <Cover src={t.coverBig || t.cover} size={300} rounded="rounded-[2rem]" className="relative !h-auto !w-[min(70vw,300px)] aspect-square shadow-2xl lg:!w-[340px]" />
        </div>
        <div className="w-full text-center">
          <h2 className="text-2xl font-black leading-tight">{t.title}</h2>
          <p className="text-base font-semibold text-muted">{t.artist}</p>
          {t.album && <p className="text-xs text-muted/80">{t.album}</p>}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            className={`btn ${liked ? "btn-primary" : "btn-soft"}`}
            aria-pressed={liked}
            onClick={() => toggleLike(t)}
          >
            <Heart size={16} fill={liked ? "currentColor" : "none"} /> {liked ? "Liked" : "Like"}
          </button>
          <div className="flex items-center overflow-hidden rounded-full border border-lilac-deep/25 bg-white/80">
            <select
              aria-label="Download quality"
              className="bg-transparent py-2 pl-3 pr-1 text-sm font-bold outline-none"
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
            >
              <option value={128}>128 kbps</option>
              <option value={192}>192 kbps</option>
              <option value={320}>320 kbps</option>
            </select>
            <button className="btn btn-primary !rounded-none" onClick={() => p.downloadTrack(t, quality)}>
              <Download size={16} /> MP3
            </button>
          </div>
          {/* Sleep timer selector */}
          <div className="flex items-center rounded-full border border-lilac-deep/25 bg-white/80 px-2.5 py-1.5 text-xs font-bold">
            <span className="mr-1.5 opacity-60">⏳</span>
            <select
              aria-label="Sleep timer"
              className="bg-transparent text-xs font-bold outline-none"
              value={p.sleepTimer ?? 0}
              onChange={(e) => {
                const val = Number(e.target.value);
                p.setSleepTimer(val === 0 ? null : val);
              }}
            >
              <option value={0}>Timer Off</option>
              <option value={15}>15 mins</option>
              <option value={30}>30 mins</option>
              <option value={45}>45 mins</option>
              <option value={60}>60 mins</option>
            </select>
          </div>
          {/* Playback speed selector */}
          <div className="flex items-center rounded-full border border-lilac-deep/25 bg-white/80 px-2.5 py-1.5 text-xs font-bold">
            <select
              aria-label="Playback speed"
              className="bg-transparent text-xs font-bold outline-none"
              value={p.playbackRate}
              onChange={(e) => p.setPlaybackRate(Number(e.target.value))}
            >
              <option value={0.75}>0.75×</option>
              <option value={1}>1.0×</option>
              <option value={1.25}>1.25×</option>
              <option value={1.5}>1.5×</option>
              <option value={2}>2.0×</option>
            </select>
          </div>
          <TrackMenuButton track={t} className="!bg-white/80" />
        </div>
        {/* Stream quality indicator */}
        <div className="flex items-center gap-2">
          {p.sourceType === "saavn" && (
            <span className="rounded-full bg-lilac/30 px-3 py-1 text-xs font-extrabold text-lilac-deep">
              ✨ 320 kbps High Fidelity Audio
            </span>
          )}
          {p.sourceType === "youtube" && (
            <span className="rounded-full bg-pink/30 px-3 py-1 text-xs font-extrabold text-pink-deep">
              🎵 Full Length Official Song Stream
            </span>
          )}
          {p.sourceType === "deezer" && (
            <span className="rounded-full bg-peach/40 px-3 py-1 text-xs font-extrabold text-ink">
              Audio Stream
            </span>
          )}
        </div>
      </div>
      <div className="flex min-h-[260px] flex-col gap-3">
        <div className="card relative h-64 flex-1 overflow-hidden p-3 lg:h-[420px]">
          <Visualizer />
        </div>
        <div className="flex items-center justify-center gap-1.5" role="group" aria-label="Visualizer style">
          {VIZ.map((v) => (
            <button
              key={v.id}
              className={`btn !py-1.5 !text-xs ${p.vizMode === v.id ? "btn-primary" : "btn-soft"}`}
              aria-pressed={p.vizMode === v.id}
              onClick={() => p.setVizMode(v.id)}
            >
              {v.label}
            </button>
          ))}
          <span className="ml-2 hidden text-[11px] text-muted sm:block">
            press <kbd className="rounded bg-white px-1">V</kbd> to cycle
          </span>
        </div>
      </div>
    </div>
  );
}

export default function NowPlaying() {
  const { panel, setPanel } = usePlayer();
  if (!panel) return null;
  return (
    <div
      className="pop-in fixed inset-0 z-40 flex flex-col bg-cream/95 backdrop-blur-xl"
      role="dialog"
      aria-label="Now playing"
      style={{
        backgroundImage:
          "radial-gradient(700px 400px at 10% 0%, rgba(205,184,255,.5), transparent 60%), radial-gradient(700px 500px at 100% 100%, rgba(255,196,221,.5), transparent 60%)",
      }}
    >
      <div className="flex items-center gap-2 px-3 pt-3 md:px-6 md:pt-4">
        <button className="icon-btn" aria-label="Close" onClick={() => setPanel(null)}>
          <ChevronDown size={22} />
        </button>
        <nav className="no-scrollbar flex flex-1 items-center gap-1 overflow-x-auto" role="tablist">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={panel === id}
              onClick={() => setPanel(id)}
              className={`btn !py-1.5 whitespace-nowrap ${panel === id ? "btn-primary" : "btn-ghost"}`}
            >
              <Icon size={15} /> <span className={panel === id ? "" : "hidden sm:inline"}>{label}</span>
            </button>
          ))}
        </nav>
      </div>
      <div className="min-h-0 flex-1 px-3 pb-[150px] pt-4 md:px-8 md:pb-[110px]">
        {panel === "player" && <PlayerTab />}
        {panel === "lyrics" && <LyricsPanel />}
        {panel === "eq" && <EqualizerPanel />}
        {panel === "queue" && <QueuePanel />}
        {panel === "room" && (
          <div className="h-full overflow-y-auto">
            <RoomPanel />
          </div>
        )}
      </div>
    </div>
  );
}
