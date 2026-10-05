"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  ArrowLeft,
  AudioLines,
  ChevronDown,
  Clock,
  Disc3,
  Download,
  Gauge,
  Heart,
  ListMusic,
  MicVocal,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  PlusCircle,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { usePlayer, type Tab } from "@/components/PlayerProvider";
import { useTheme } from "@/components/ThemeProvider";
import { EmptyState, Cover } from "@/components/ui";
import Visualizer from "@/components/Visualizer";
import { EqualizerPanel, LyricsPanel, QueuePanel, RoomPanel } from "@/components/panels";
import { registerBackHandler } from "@/lib/backHandler";
import { fmtTime } from "@/lib/eq";
import { extractThemeFromCover, type TrackTheme } from "@/lib/colorExtractor";

const TABS: { id: Tab; label: string; Icon: React.ComponentType<{ size?: number }> }[] = [
  { id: "player", label: "Player", Icon: Disc3 },
  { id: "lyrics", label: "Lyrics", Icon: MicVocal },
  { id: "queue", label: "Queue", Icon: ListMusic },
  { id: "eq", label: "Equalizer", Icon: SlidersHorizontal },
  { id: "room", label: "Room", Icon: Users },
];

/**
 * Main Player View matching Spotify/Apple Music aesthetics with Cover-Driven Theming
 */
function MainPlayerLayout({ theme }: { theme: TrackTheme }) {
  const p = usePlayer();
  const { likedIds, toggleLike } = useApp();
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(0);

  const t = p.current;

  if (!t) {
    return (
      <EmptyState icon={<AudioLines />} title="Nothing playing yet">
        Pick a track from Home or Search to start the show.
      </EmptyState>
    );
  }

  const liked = likedIds.has(t.id);
  const currentPos = isScrubbing ? scrubValue : p.position;
  const pct = p.duration ? Math.max(0, Math.min(100, (currentPos / p.duration) * 100)) : 0;

  return (
    <div className="relative h-full w-full max-w-2xl mx-auto flex flex-col justify-center overflow-hidden">
      {/* Centered Body: Cover + Seek Bar + Song Title + Artist + Transport */}
      <div className="flex flex-col items-center justify-center w-full max-w-md mx-auto px-4">
          {/* Album Artwork with Dynamic Cover Glow */}
          <div className="relative w-full flex justify-center">
            {/* Ambient matching radiant bloom behind cover */}
            {t.coverBig || t.cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={t.coverBig || t.cover}
                alt=""
                aria-hidden
                className="absolute inset-0 m-auto h-[88%] w-[88%] rounded-3xl object-cover blur-[50px] opacity-75 pointer-events-none transform-gpu scale-95"
              />
            ) : null}

            <div
              className="relative group rounded-[1.75rem]"
              style={{
                boxShadow: `0 20px 50px -10px ${theme.glow}, 0 10px 30px rgba(0,0,0,0.6)`,
              }}
            >
              <Cover
                src={t.coverBig || t.cover}
                size={360}
                rounded="rounded-[1.75rem]"
                className="w-[min(72vw,320px)] aspect-square lg:w-[340px] xl:w-[370px] max-h-[min(44vh,370px)] transition-transform duration-300"
              />
            </div>
          </div>

          {/* Seek Bar with Timestamps inline in one row matching reference image: 1:38 [====] 3:36 */}
          <div className="w-full mt-6 flex items-center gap-3">
            <span className="w-10 text-right text-xs font-extrabold text-white/90 tabular-nums select-none shrink-0">
              {fmtTime(currentPos)}
            </span>

            <div className="relative flex-1 flex items-center group py-2">
              <input
                type="range"
                min={0}
                max={p.duration || 1}
                step={0.1}
                value={currentPos}
                onMouseDown={() => setIsScrubbing(true)}
                onTouchStart={() => setIsScrubbing(true)}
                onChange={(e) => setScrubValue(Number(e.target.value))}
                onMouseUp={() => {
                  setIsScrubbing(false);
                  p.seek(scrubValue);
                }}
                onTouchEnd={() => {
                  setIsScrubbing(false);
                  p.seek(scrubValue);
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                aria-label="Seek time"
              />
              {/* Visible Themed Seek Track */}
              <div className="relative h-1.5 w-full rounded-full bg-white/20 overflow-visible">
                <div
                  className="h-full rounded-full transition-[width] duration-75"
                  style={{
                    width: `${pct}%`,
                    background: `linear-gradient(to right, ${theme.primary}, ${theme.accent})`,
                    boxShadow: `0 0 10px ${theme.glow}`,
                  }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3.5 w-3.5 rounded-full bg-white shadow-lg pointer-events-none transition-transform group-hover:scale-125 border-2"
                  style={{
                    left: `${pct}%`,
                    borderColor: theme.accent,
                    boxShadow: `0 0 8px ${theme.glow}`,
                  }}
                />
              </div>
            </div>

            <span className="w-10 text-left text-xs font-extrabold text-white/90 tabular-nums select-none shrink-0">
              {fmtTime(p.duration)}
            </span>
          </div>

          {/* Song Title & Artist (Clean, bold typography) */}
          <div className="w-full text-center mt-2.5">
            <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight tracking-tight drop-shadow-md line-clamp-2">
              {t.title}
            </h2>
            <p className="text-sm sm:text-base font-semibold text-white/75 mt-1 truncate">
              {t.artist}
            </p>
            {t.album && t.album.trim().toLowerCase() !== t.title.trim().toLowerCase() && (
              <p className="text-xs text-white/45 mt-0.5 truncate">{t.album}</p>
            )}
          </div>

          {/* Audio stream tag / 320k indicator (Themed) */}
          <div className="mt-2 flex items-center gap-2">
            <span
              className="rounded-full px-3 py-0.5 text-[11px] font-black tracking-wide border shadow-sm"
              style={{
                backgroundColor: `${theme.primary}25`,
                color: theme.accent,
                borderColor: `${theme.accent}45`,
              }}
            >
              {p.sourceType === "saavn" ? "✨ 320 kbps HD Audio" : "🎵 Official Stream"}
            </span>
          </div>

          {/* Audio Visualizer matching Cover Art palette */}
          <div className="w-full max-w-[220px] h-6 mx-auto mt-2.5 mb-0.5 flex items-center justify-center pointer-events-none">
            <Visualizer colors={[theme.primary, theme.accent, theme.buttonText === "#000000" ? "#ffffff" : theme.accent]} />
          </div>

          {/* Main Playback Controls Bar */}
          <div className="flex items-center justify-center gap-4 sm:gap-6 mt-3">
            {/* Shuffle */}
            <button
              className="p-2.5 rounded-full transition-all active:scale-95"
              style={{
                color: p.shuffle !== "off" ? theme.accent : "rgba(255, 255, 255, 0.7)",
                backgroundColor: p.shuffle !== "off" ? `${theme.primary}33` : "transparent",
              }}
              onClick={p.cycleShuffle}
              title={`Shuffle: ${p.shuffle}`}
              aria-label="Shuffle"
            >
              {p.shuffle === "smart" ? <Sparkles size={20} /> : <Shuffle size={20} />}
            </button>

            {/* Skip Back */}
            <button
              className="p-2 rounded-full text-white hover:text-white/80 transition active:scale-95 disabled:opacity-40"
              onClick={p.prev}
              disabled={!t}
              aria-label="Previous track"
            >
              <SkipBack size={26} fill="currentColor" />
            </button>

            {/* Play/Pause Button (Themed with Cover's Primary & Accent Glow) */}
            <button
              className="grid h-14 w-14 place-items-center rounded-full transition hover:scale-105 active:scale-95 disabled:opacity-40"
              style={{
                backgroundColor: theme.buttonBg,
                color: theme.buttonText,
                boxShadow: `0 8px 25px ${theme.glow}`,
              }}
              onClick={p.toggle}
              disabled={!t}
              aria-label={p.playing ? "Pause" : "Play"}
            >
              {p.playing ? (
                <Pause size={28} fill="currentColor" />
              ) : (
                <Play size={28} fill="currentColor" className="translate-x-0.5" />
              )}
            </button>

            {/* Skip Forward */}
            <button
              className="p-2 rounded-full text-white hover:text-white/80 transition active:scale-95 disabled:opacity-40"
              onClick={p.next}
              disabled={!t}
              aria-label="Next track"
            >
              <SkipForward size={26} fill="currentColor" />
            </button>

            {/* Repeat */}
            <button
              className="p-2.5 rounded-full transition-all active:scale-95"
              style={{
                color: p.repeat !== "off" ? theme.accent : "rgba(255, 255, 255, 0.7)",
                backgroundColor: p.repeat !== "off" ? `${theme.primary}33` : "transparent",
              }}
              onClick={p.cycleRepeat}
              title={`Repeat: ${p.repeat}`}
              aria-label="Repeat"
            >
              {p.repeat === "one" ? <Repeat1 size={20} /> : <Repeat size={20} />}
            </button>
          </div>
        </div>
    </div>
  );
}

export default function NowPlaying() {
  const p = usePlayer();
  const { likedIds, toggleLike, toast, playlists, addToPlaylist, createPlaylist } = useApp();
  const { panel, setPanel } = p;
  const [showOptions, setShowOptions] = useState(false);
  const [optionsView, setOptionsView] = useState<"menu" | "playlist">("menu");
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const optionsModalRef = useRef<HTMLDivElement>(null);

  const t = p.current;
  const liked = t ? likedIds.has(t.id) : false;

  // Dynamic Theme state extracted from current cover art
  const [theme, setTheme] = useState<TrackTheme>({
    primary: "#e11d48",
    accent: "#f43f5e",
    bgStart: "rgba(45, 10, 15, 0.94)",
    bgEnd: "rgba(8, 4, 10, 0.98)",
    glow: "rgba(225, 29, 72, 0.5)",
    buttonBg: "#ffffff",
    buttonText: "#000000",
  });

  useEffect(() => {
    if (!t) return;
    let active = true;
    extractThemeFromCover(t.coverBig || t.cover, `${t.title}_${t.artist}`).then((th) => {
      if (active) setTheme(th);
    });
    return () => {
      active = false;
    };
  }, [t?.id, t?.cover, t?.coverBig, t?.title, t?.artist]);

  useEffect(() => {
    if (!panel) return;
    return registerBackHandler(() => {
      if (showOptions) {
        setShowOptions(false);
        setOptionsView("menu");
        return true;
      }
      setPanel(null);
      return true;
    });
  }, [panel, setPanel, showOptions]);

  // Outside click handler for options popover that doesn't trigger on internal clicks
  useEffect(() => {
    if (!showOptions) return;
    const handleOutsideClick = (e: MouseEvent) => {
      if (optionsModalRef.current && !optionsModalRef.current.contains(e.target as Node)) {
        setShowOptions(false);
        setOptionsView("menu");
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showOptions]);

  if (!panel) return null;

  return (
    <div
      className="pop-in dark fixed inset-0 z-[70] flex flex-col text-white overflow-hidden"
      role="dialog"
      aria-label="Now playing"
      style={{
        backgroundColor: "#08050c",
      }}
    >
      {/* Full-bleed ambient blurred album background */}
      {t && (t.coverBig || t.cover) ? (
        <div
          className="absolute inset-0 bg-cover bg-center scale-110 filter blur-[80px] opacity-50 pointer-events-none transition-all duration-700 transform-gpu"
          style={{ backgroundImage: `url(${t.coverBig || t.cover})` }}
        />
      ) : null}

      {/* Dynamic theme gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none transition-colors duration-700"
        style={{
          background: `radial-gradient(circle at 20% 30%, ${theme.bgStart} 0%, ${theme.bgEnd} 80%)`,
        }}
      />

      {/* Top Header Bar */}
      <div className="relative z-20 flex items-center justify-between px-4 pt-3 pb-2 md:px-8 md:pt-4">
        {/* Left: Options Menu button (...) matching image */}
        <div className="relative" ref={optionsModalRef}>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition active:scale-95 border border-white/10 shadow-md"
            aria-label="Options"
            title="Options and settings"
            onClick={() => {
              setShowOptions((prev) => !prev);
              if (showOptions) setOptionsView("menu");
            }}
          >
            <MoreHorizontal size={22} />
          </button>

          {/* Fully Interactive Themed Options Popover */}
          {showOptions && t && (
            <div
              className="absolute left-0 top-12 z-50 w-72 sm:w-80 rounded-3xl p-4 shadow-2xl border border-white/15 pop-in text-white text-xs backdrop-blur-2xl"
              style={{
                backgroundColor: "rgba(18, 12, 28, 0.96)",
                boxShadow: `0 20px 50px rgba(0,0,0,0.8), 0 0 30px ${theme.glow}`,
              }}
            >
              {optionsView === "playlist" ? (
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-white/10">
                    <button
                      type="button"
                      onClick={() => setOptionsView("menu")}
                      className="flex items-center gap-1 text-white/70 hover:text-white font-bold text-xs transition"
                    >
                      <ArrowLeft size={14} /> Back
                    </button>
                    <span className="font-extrabold text-sm text-white">Add to Playlist</span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowOptions(false);
                        setOptionsView("menu");
                      }}
                      className="rounded-full p-1 text-white/60 hover:text-white hover:bg-white/10"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="max-h-52 overflow-y-auto flex flex-col gap-1 pr-1">
                    {playlists.length === 0 ? (
                      <p className="py-4 text-xs text-center text-white/50">No playlists yet. Create one below!</p>
                    ) : (
                      playlists.map((pl) => (
                        <button
                          key={pl.id}
                          type="button"
                          className="flex items-center justify-between px-3 py-2 rounded-xl bg-white/5 hover:bg-white/15 text-left text-xs font-bold transition-all text-white active:scale-98"
                          onClick={async () => {
                            await addToPlaylist(pl.id, [t]);
                            setShowOptions(false);
                            setOptionsView("menu");
                          }}
                        >
                          <span className="flex items-center gap-2 truncate">
                            <Disc3 size={15} style={{ color: theme.accent }} />
                            <span className="truncate">{pl.name}</span>
                          </span>
                          <span className="text-[10px] text-white/50 font-normal shrink-0">
                            {pl.count ?? 0} tracks
                          </span>
                        </button>
                      ))
                    )}
                  </div>

                  <form
                    className="flex items-center gap-1.5 pt-2 border-t border-white/10"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!newPlaylistName.trim()) return;
                      const pl = await createPlaylist(newPlaylistName.trim(), [t]);
                      if (pl) {
                        setNewPlaylistName("");
                        setShowOptions(false);
                        setOptionsView("menu");
                      }
                    }}
                  >
                    <input
                      className="flex-1 bg-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/40 border border-white/10 focus:outline-none focus:border-white/30"
                      placeholder="New playlist name..."
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      maxLength={80}
                    />
                    <button
                      type="submit"
                      disabled={!newPlaylistName.trim()}
                      className="p-2 rounded-xl text-xs font-black transition disabled:opacity-40"
                      style={{ backgroundColor: theme.buttonBg, color: theme.buttonText }}
                      title="Create playlist & add song"
                    >
                      <Plus size={16} />
                    </button>
                  </form>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <span className="font-extrabold text-sm text-white flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: theme.accent }}
                      />
                      Playback Options
                    </span>
                    <button
                      onClick={() => setShowOptions(false)}
                      className="rounded-full p-1 text-white/60 hover:text-white hover:bg-white/10"
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="flex flex-col gap-3.5 pt-3">
                    {/* 1. Like / Favorite Button */}
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-2xl px-3.5 py-2.5 font-bold transition-all border border-white/10 hover:bg-white/10"
                      onClick={() => {
                        toggleLike(t);
                      }}
                    >
                      <span className="flex items-center gap-2">
                        <Heart
                          size={18}
                          fill={liked ? "currentColor" : "none"}
                          style={{ color: liked ? theme.accent : "#ffffff" }}
                        />
                        <span>{liked ? "Saved to Favorites" : "Add to Favorites"}</span>
                      </span>
                      <span
                        className="text-[10px] font-black px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: liked ? `${theme.primary}33` : "rgba(255,255,255,0.1)",
                          color: liked ? theme.accent : "rgba(255,255,255,0.7)",
                        }}
                      >
                        {liked ? "Liked" : "+ Like"}
                      </span>
                    </button>

                    {/* 2. Sleep Timer with dedicated clickable pills */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-white/70 flex items-center gap-1.5">
                        <Clock size={13} style={{ color: theme.accent }} /> Sleep Timer
                      </span>
                      <div className="grid grid-cols-5 gap-1">
                        {[0, 15, 30, 45, 60].map((mins) => {
                          const isActive = (p.sleepTimer ?? 0) === mins;
                          return (
                            <button
                              key={mins}
                              type="button"
                              onClick={() => {
                                p.setSleepTimer(mins === 0 ? null : mins);
                                toast(mins === 0 ? "Sleep timer turned off" : `Timer set for ${mins} minutes`);
                              }}
                              className="py-1.5 rounded-xl text-center text-xs font-bold transition-all"
                              style={{
                                backgroundColor: isActive ? theme.buttonBg : "rgba(255,255,255,0.08)",
                                color: isActive ? theme.buttonText : "rgba(255,255,255,0.8)",
                                border: isActive ? `1px solid ${theme.accent}` : "1px solid transparent",
                              }}
                            >
                              {mins === 0 ? "Off" : `${mins}m`}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 3. Playback Speed with clickable pills */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-white/70 flex items-center gap-1.5">
                        <Gauge size={13} style={{ color: theme.accent }} /> Playback Speed
                      </span>
                      <div className="grid grid-cols-5 gap-1">
                        {[0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => {
                          const isActive = p.playbackRate === rate;
                          return (
                            <button
                              key={rate}
                              type="button"
                              onClick={() => {
                                p.setPlaybackRate(rate);
                                toast(`Playback speed set to ${rate}×`);
                              }}
                              className="py-1.5 rounded-xl text-center text-xs font-bold transition-all"
                              style={{
                                backgroundColor: isActive ? theme.buttonBg : "rgba(255,255,255,0.08)",
                                color: isActive ? theme.buttonText : "rgba(255,255,255,0.8)",
                                border: isActive ? `1px solid ${theme.accent}` : "1px solid transparent",
                              }}
                            >
                              {rate}×
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 4. Download buttons */}
                    <div className="flex items-center justify-between pt-1 border-t border-white/10">
                      <span className="text-xs font-bold text-white/80">Download Audio</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            p.downloadTrack(t, 160);
                            setShowOptions(false);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition"
                        >
                          160k
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            p.downloadTrack(t, 320);
                            setShowOptions(false);
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-xl font-black text-xs transition shadow-md"
                          style={{
                            backgroundColor: theme.buttonBg,
                            color: theme.buttonText,
                          }}
                        >
                          <Download size={13} /> 320k HD
                        </button>
                      </div>
                    </div>

                    {/* 5. Lyrics & Add to Playlist */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => {
                          setShowOptions(false);
                          setPanel("lyrics");
                        }}
                        className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition active:scale-95"
                      >
                        <MicVocal size={14} style={{ color: theme.accent }} /> Lyrics
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setOptionsView("playlist");
                        }}
                        className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition active:scale-95"
                      >
                        <PlusCircle size={14} style={{ color: theme.accent }} /> Add to Playlist
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Center: Desktop Tabs (5 tabs) */}
        <nav
          className="no-scrollbar hidden lg:flex items-center gap-1 overflow-x-auto rounded-full p-1 backdrop-blur-xl border border-white/15 shadow-xl"
          role="tablist"
          style={{
            backgroundColor: "rgba(0, 0, 0, 0.45)",
          }}
        >
          {TABS.map(({ id, label, Icon }) => {
            const isActive = panel === id;
            return (
              <button
                key={id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setPanel(id)}
                className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-black transition-all cursor-pointer whitespace-nowrap"
                style={{
                  backgroundColor: isActive ? theme.buttonBg : "transparent",
                  color: isActive ? theme.buttonText : "rgba(255, 255, 255, 0.85)",
                  boxShadow: isActive ? `0 2px 10px ${theme.glow}` : "none",
                }}
              >
                <Icon size={14} />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        {/* Center: Mobile Header Title */}
        <div className="flex lg:hidden items-center justify-center">
          {panel === "player" ? (
            <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/45 backdrop-blur-xl border border-white/15 text-xs font-black text-white shadow-md">
              <Disc3 size={15} style={{ color: theme.accent }} />
              <span>Now Playing</span>
            </div>
          ) : (
            <button
              onClick={() => setPanel("player")}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-black/45 hover:bg-black/60 backdrop-blur-xl border border-white/15 text-xs font-black text-white shadow-md transition active:scale-95"
              title="Return to Player"
            >
              <ArrowLeft size={13} style={{ color: theme.accent }} />
              {panel === "lyrics" && <MicVocal size={14} style={{ color: theme.accent }} />}
              {panel === "queue" && <ListMusic size={14} style={{ color: theme.accent }} />}
              {panel === "eq" && <SlidersHorizontal size={14} style={{ color: theme.accent }} />}
              {panel === "room" && <Users size={14} style={{ color: theme.accent }} />}
              <span className="capitalize">{panel === "eq" ? "Equalizer" : panel}</span>
            </button>
          )}
        </div>

        {/* Right: Close / Collapse button */}
        <button
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition active:scale-95 border border-white/10 shadow-md"
          aria-label="Collapse player"
          onClick={() => setPanel(null)}
        >
          <ChevronDown size={24} />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="relative z-10 flex-1 min-h-0 px-4 pb-6 pt-1 md:px-8 md:pb-8">
        {panel === "player" && <MainPlayerLayout theme={theme} />}
        {panel === "lyrics" && (
          <div className="h-full overflow-y-auto max-w-3xl mx-auto">
            <LyricsPanel theme={theme} />
          </div>
        )}
        {panel === "eq" && (
          <div className="h-full overflow-y-auto max-w-3xl mx-auto">
            <EqualizerPanel theme={theme} />
          </div>
        )}
        {panel === "queue" && (
          <div className="h-full overflow-y-auto max-w-3xl mx-auto">
            <QueuePanel theme={theme} />
          </div>
        )}
        {panel === "room" && (
          <div className="h-full overflow-y-auto max-w-3xl mx-auto">
            <RoomPanel theme={theme} />
          </div>
        )}
      </div>
    </div>
  );
}
