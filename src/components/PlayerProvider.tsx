"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useApp } from "@/components/AppProvider";
import { useTheme } from "@/components/ThemeProvider";
import { EQ_BANDS, EQ_PRESETS } from "@/lib/eq";
import { buildAffinity, fisherYates, smartShuffle } from "@/lib/smartShuffle";
import { resolveAudioStream } from "@/lib/audioResolver";
import { youtubeAudio } from "@/lib/youtubeAudio";
import { getLocalTrackAudioUrl } from "@/lib/localAudio";
import { extractThemeFromCover, type TrackTheme } from "@/lib/colorExtractor";
import type { RoomInfo, Track } from "@/lib/types";

export type ShuffleMode = "off" | "on" | "smart";
export type RepeatMode = "off" | "all" | "one";
export type Tab = "player" | "lyrics" | "eq" | "queue" | "room";
export type VizMode = "bars" | "wave" | "orbit" | "mirror";
export interface EqState {
  enabled: boolean;
  preamp: number;
  gains: number[];
  preset: string;
}

interface PlayerCtx {
  current: Track | null;
  trackTheme: TrackTheme | null;
  queue: Track[];
  index: number;
  playing: boolean;
  loading: boolean;
  position: number;
  duration: number;
  volume: number;
  muted: boolean;
  shuffle: ShuffleMode;
  repeat: RepeatMode;
  radio: boolean;
  eq: EqState;
  lyricsOffset: number;
  panel: Tab | null;
  vizMode: VizMode;
  helpOpen: boolean;
  room: RoomInfo | null;
  roomCode: string | null;
  locked: boolean;
  setRoom: React.Dispatch<React.SetStateAction<RoomInfo | null>>;
  setPanel: (p: Tab | null) => void;
  setHelpOpen: (v: boolean) => void;
  setVizMode: (m: VizMode) => void;
  getAnalyser: () => AnalyserNode | null;
  playList: (tracks: Track[], start?: number) => void;
  shufflePlay: (tracks: Track[]) => void;
  playTrack: (t: Track, context?: Track[]) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  seek: (t: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  setShuffle: (m: ShuffleMode) => void;
  cycleShuffle: () => void;
  cycleRepeat: () => void;
  setRadio: (v: boolean) => void;
  enqueue: (t: Track | Track[]) => void;
  playNext: (t: Track) => void;
  removeFromQueue: (i: number) => void;
  moveInQueue: (i: number, dir: -1 | 1) => void;
  clearQueue: () => void;
  jumpTo: (i: number) => void;
  smartReshuffle: () => void;
  setEq: (patch: Partial<EqState>) => void;
  setEqBand: (i: number, v: number) => void;
  applyPreset: (name: string) => void;
  setLyricsOffset: (s: number) => void;
  downloadTrack: (t: Track, quality?: number) => void;
  sleepTimer: number | null;
  setSleepTimer: (m: number | null) => void;
  playbackRate: number;
  setPlaybackRate: (rate: number) => void;
  sourceType: "saavn" | "youtube" | "deezer" | null;
  createRoom: () => Promise<void>;
  joinRoom: (code: string) => Promise<boolean>;
  leaveRoom: () => Promise<void>;
  endRoom: () => Promise<void>;
  transferHost: (newHostId: number | string) => Promise<boolean>;
}

const Ctx = createContext<PlayerCtx | null>(null);
export function usePlayer() {
  const c = useContext(Ctx);
  if (!c) throw new Error("usePlayer outside provider");
  return c;
}

const SETTINGS_KEY = "5ong.settings.v1";
const OFFSETS_KEY = "5ong.lyricOffsets.v1";
const ROOM_KEY = "5ong.room.v1";
const LAST_TRACK_KEY = "5ong.lastTrack.v2";

interface LastTrackState {
  track: Track;
  queue: Track[];
  index: number;
  position: number;
  duration: number;
  sourceType: "saavn" | "youtube" | "deezer" | null;
  timestamp: number;
}

const DEFAULT_EQ: EqState = { enabled: true, preamp: 0, gains: EQ_PRESETS.Flat.slice(), preset: "Flat" };
const VIZ_ORDER: VizMode[] = ["bars", "wave", "orbit", "mirror"];

function createKeepaliveAudioUrl(): string {
  if (typeof window === "undefined") return "";
  try {
    const sampleRate = 8000;
    const duration = 2;
    const numSamples = sampleRate * duration;
    const buffer = new ArrayBuffer(44 + numSamples);
    const view = new DataView(buffer);

    view.setUint32(0, 0x52494646, false); // 'RIFF'
    view.setUint32(4, 36 + numSamples, true);
    view.setUint32(8, 0x57415645, false); // 'WAVE'
    view.setUint32(12, 0x666d7420, false); // 'fmt '
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate, true);
    view.setUint16(32, 1, true);
    view.setUint16(34, 8, true);
    view.setUint32(36, 0x64617461, false); // 'data'
    view.setUint32(40, numSamples, true);

    for (let i = 0; i < numSamples; i++) {
      const val = Math.round(128 + 120 * Math.sin((2 * Math.PI * 20 * i) / sampleRate));
      view.setUint8(44 + i, Math.max(0, Math.min(255, val)));
    }

    const blob = new Blob([buffer], { type: "audio/wav" });
    return URL.createObjectURL(blob);
  } catch {
    return "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
  }
}

export default function PlayerProvider({ children }: { children: ReactNode }) {
  const { toast, logPlay, toggleLike, likes, history, user } = useApp();
  const keepaliveUrlRef = useRef<string>("");
  const keepaliveAudioRef = useRef<HTMLAudioElement | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const acRef = useRef<AudioContext | null>(null);
  const filtersRef = useRef<BiquadFilterNode[]>([]);
  const preampRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const [queue, setQueue] = useState<Track[]>([]);
  const [index, setIndex] = useState(-1);
  const queueRef = useRef<Track[]>([]);
  const indexRef = useRef(-1);
  const origQueueRef = useRef<Track[] | null>(null);

  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.85);
  const [muted, setMuted] = useState(false);
  const [shuffle, setShuffleState] = useState<ShuffleMode>("off");
  const [repeat, setRepeatState] = useState<RepeatMode>("off");
  const [radio, setRadioState] = useState(true);
  const [eq, setEqState] = useState<EqState>(DEFAULT_EQ);
  const [panel, setPanel] = useState<Tab | null>(null);
  const [vizMode, setVizMode] = useState<VizMode>("bars");
  const [helpOpen, setHelpOpen] = useState(false);
  const [offsets, setOffsets] = useState<Record<string, number>>({});
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [room, setRoom] = useState<RoomInfo | null>(null);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [sourceType, setSourceType] = useState<"saavn" | "youtube" | "deezer" | null>(null);
  const sourceTypeRef = useRef(sourceType);
  sourceTypeRef.current = sourceType;
  const [playbackRate, setPlaybackRateState] = useState(1);
  const [sleepTimer, setSleepTimerState] = useState<number | null>(null);
  const sleepTimerIdRef = useRef<any>(null);

  const shuffleRef = useRef<ShuffleMode>("off");
  const repeatRef = useRef<RepeatMode>("off");
  const radioRef = useRef(true);
  const eqRef = useRef<EqState>(DEFAULT_EQ);
  const volumeRef = useRef(0.85);
  const mutedRef = useRef(false);
  volumeRef.current = volume;
  mutedRef.current = muted;
  const pendingStart = useRef(0);
  const loggedRef = useRef(false);
  const errorStreak = useRef(0);
  const radioBusy = useRef(false);
  const roomRef = useRef<RoomInfo | null>(null);
  const roomCodeRef = useRef<string | null>(null);
  const seqRef = useRef(0);
  const lastPosState = useRef(0);

  const current = index >= 0 ? (queue[index] ?? null) : null;
  const currentRef = useRef<Track | null>(null);
  currentRef.current = current;
  const playingRef = useRef(false);
  playingRef.current = playing;
  const userPausedRef = useRef(false);
  const locked = Boolean(room && !room.isHost);
  const lockedRef = useRef(false);
  lockedRef.current = locked;
  roomRef.current = room;
  roomCodeRef.current = roomCode;
  eqRef.current = eq;
  const logPlayRef = useRef(logPlay);
  logPlayRef.current = logPlay;

  const affinity = useMemo(() => buildAffinity(likes, history), [likes, history]);
  const affinityRef = useRef(affinity);
  affinityRef.current = affinity;

  const [trackTheme, setTrackTheme] = useState<TrackTheme | null>(null);

  useEffect(() => {
    if (!current) {
      setTrackTheme(null);
      return;
    }
    let alive = true;
    extractThemeFromCover(current.coverBig || current.cover, `${current.title}_${current.artist}`).then((th) => {
      if (alive) setTrackTheme(th);
    });
    return () => {
      alive = false;
    };
  }, [current?.id, current?.cover, current?.coverBig, current?.title, current?.artist]);

  // Clean up any residual CSS custom properties on documentElement
  useEffect(() => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    root.style.removeProperty("--color-lilac-deep");
    root.style.removeProperty("--color-lilac");
    root.style.removeProperty("--color-pink-deep");
    root.style.removeProperty("--color-pink");
    root.style.removeProperty("--theme-primary");
    root.style.removeProperty("--theme-accent");
    root.style.removeProperty("--theme-glow");
    root.style.removeProperty("--theme-bg-start");
    root.style.removeProperty("--theme-bg-end");
    root.style.removeProperty("--theme-button-bg");
    root.style.removeProperty("--theme-button-text");
  }, []);

  /* ---------------------------------- settings ---------------------------------- */
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "null");
      if (s) {
        if (typeof s.volume === "number") setVolumeState(s.volume);
        if (typeof s.muted === "boolean") setMuted(s.muted);
        if (s.shuffle) {
          setShuffleState(s.shuffle);
          shuffleRef.current = s.shuffle;
        }
        if (s.repeat) {
          setRepeatState(s.repeat);
          repeatRef.current = s.repeat;
        }
        if (typeof s.radio === "boolean") {
          setRadioState(s.radio);
          radioRef.current = s.radio;
        }
        if (s.eq?.gains?.length === EQ_BANDS.length) setEqState(s.eq);
        if (s.viz) setVizMode(s.viz);
      }
      setOffsets(JSON.parse(localStorage.getItem(OFFSETS_KEY) ?? "{}"));
      const rc = localStorage.getItem(ROOM_KEY);
      if (rc) setRoomCode(rc);
    } catch {
      /* ignore */
    }
    setSettingsLoaded(true);
  }, []);

  useEffect(() => {
    if (!settingsLoaded) return;
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ volume, muted, shuffle, repeat, radio, eq, viz: vizMode }),
    );
  }, [settingsLoaded, volume, muted, shuffle, repeat, radio, eq, vizMode]);

  useEffect(() => {
    if (!settingsLoaded) return;
    if (roomCode) localStorage.setItem(ROOM_KEY, roomCode);
    else localStorage.removeItem(ROOM_KEY);
  }, [settingsLoaded, roomCode]);

  /* ------------------------------- queue plumbing ------------------------------- */
  const setQ = useCallback((q: Track[], i: number) => {
    queueRef.current = q;
    indexRef.current = i;
    setQueue(q);
    setIndex(i);
  }, []);

  const blocked = useCallback(() => {
    if (lockedRef.current) {
      toast("Only the host controls playback in a room", "err");
      return true;
    }
    return false;
  }, [toast]);

  /* ---------------------------------- Web Audio --------------------------------- */
  const applyEq = useCallback((s: EqState) => {
    const filters = filtersRef.current;
    const gains = Array.isArray(s?.gains) ? s.gains : EQ_PRESETS.Flat;
    filters.forEach((f, i) => {
      const g = typeof gains[i] === "number" && !isNaN(gains[i]) ? gains[i] : 0;
      f.gain.value = s?.enabled ? g : 0;
    });
    if (preampRef.current) {
      const p = typeof s?.preamp === "number" && !isNaN(s.preamp) ? s.preamp : 0;
      preampRef.current.gain.value = s?.enabled ? Math.pow(10, p / 20) : 1;
    }
  }, []);

  const ensureGraph = useCallback((force = false) => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.crossOrigin !== "anonymous") {
      audio.crossOrigin = "anonymous";
    }
    // On Android and mobile devices, routing HTML5 audio into Web Audio AudioContext causes
    // background audio playback to stop when the app is minimized because Chrome/OS suspends AudioContext.
    // Keep native audio streaming directly unless EQ is explicitly enabled.
    if (!force && !eqRef.current?.enabled) {
      return;
    }
    if (acRef.current) {
      if (acRef.current.state === "suspended") acRef.current.resume().catch(() => {});
      return;
    }
    try {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      const src = ctx.createMediaElementSource(audio);
      const pre = ctx.createGain();
      const filters = EQ_BANDS.map((f, i) => {
        const b = ctx.createBiquadFilter();
        b.type = i === 0 ? "lowshelf" : i === EQ_BANDS.length - 1 ? "highshelf" : "peaking";
        b.frequency.value = f;
        b.Q.value = 1.1;
        return b;
      });
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.82;
      let node: AudioNode = src;
      node.connect(pre);
      node = pre;
      for (const f of filters) {
        node.connect(f);
        node = f;
      }
      node.connect(analyser);
      analyser.connect(ctx.destination);
      ctx.onstatechange = () => {
        if (ctx.state === "suspended" && playingRef.current && !userPausedRef.current) {
          ctx.resume().catch(() => {});
        }
      };
      acRef.current = ctx;
      filtersRef.current = filters;
      preampRef.current = pre;
      analyserRef.current = analyser;
      applyEq(eqRef.current);
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
    } catch (e) {
      console.warn("Web Audio graph note:", e);
    }
  }, [applyEq]);

  useEffect(() => {
    if (eq.enabled) {
      ensureGraph(true);
    }
    applyEq(eq);
  }, [eq, applyEq, ensureGraph]);

  const getAnalyser = useCallback(() => {
    if (!acRef.current && typeof window !== "undefined") {
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator?.userAgent || "");
      if (!isMobile) {
        ensureGraph(true);
      }
    }
    return analyserRef.current;
  }, [ensureGraph]);

  /* ---------------------------------- playback ---------------------------------- */
  const playViaYouTube = useCallback(async (t: Track, autoplay = true, startAt = 0): Promise<boolean> => {
    const a = audioRef.current;
    if (a) {
      try {
        a.pause();
        a.removeAttribute("src");
        a.load();
      } catch (_) {}
    }

    if (typeof Audio !== "undefined") {
      try {
        if (!keepaliveAudioRef.current) {
          if (!keepaliveUrlRef.current) {
            keepaliveUrlRef.current = createKeepaliveAudioUrl();
          }
          const ka = new Audio(keepaliveUrlRef.current);
          ka.loop = true;
          ka.volume = 0.05;
          keepaliveAudioRef.current = ka;
        }
        if (autoplay && keepaliveAudioRef.current) {
          keepaliveAudioRef.current.play().catch(() => {});
        }
      } catch (_) {}
    }
    setLoading(true);
    let vid: string | null = null;
    if (t.id && t.id.startsWith("yt-")) {
      vid = t.id.replace("yt-", "");
    } else if (t.youtube_url) {
      const match = t.youtube_url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (match) vid = match[1];
    }
    if (!vid) {
      vid = await youtubeAudio.resolveVideoId(t.title, t.artist);
    }
    if (vid) {
      setSourceType("youtube");
      const targetVol = typeof volumeRef.current === "number" && !isNaN(volumeRef.current) ? Math.max(0, Math.min(1, volumeRef.current)) : 0.85;
      youtubeAudio.setVolume(targetVol);
      if (mutedRef.current) youtubeAudio.mute();
      else youtubeAudio.unMute();
      const started = await youtubeAudio.play(vid);
      if (started) {
        if (startAt > 0) youtubeAudio.seekTo(startAt);
        if (!autoplay) youtubeAudio.pause();
        setLoading(false);
        setPlaying(autoplay);
        return true;
      }
    }
    setLoading(false);
    return false;
  }, []);

  const loadTrack = useCallback(
    async (t: Track, opts: { autoplay?: boolean; startAt?: number } = {}) => {
      const a = audioRef.current;
      if (!a) return;
      const { autoplay = true, startAt = 0 } = opts;
      userPausedRef.current = !autoplay;
      ensureGraph();
      pendingStart.current = startAt;
      loggedRef.current = false;
      setPosition(startAt);
      setDuration(t.duration || 0);
      setLoading(true);

      // Stop YouTube player if currently active
      if (youtubeAudio.isPlaying || youtubeAudio.activeVideoId) {
        youtubeAudio.stop();
      }
      if (keepaliveAudioRef.current) {
        try {
          keepaliveAudioRef.current.pause();
        } catch (_) {}
      }

      let directSuccess = false;
      const targetVol = typeof volumeRef.current === "number" && !isNaN(volumeRef.current) ? Math.max(0, Math.min(1, volumeRef.current)) : 0.85;
      const targetMuted = Boolean(mutedRef.current);

      // 0. Local file playback (Phone/Device audio or blob URLs)
      const isLocal = t.source === "local" || t.id.startsWith("local_") || (t.audioUrl && t.audioUrl.startsWith("blob:"));
      if (isLocal) {
        youtubeAudio.stop();
        let streamUrl = t.audioUrl || t.streamUrl;
        if ((!streamUrl || !streamUrl.startsWith("blob:")) && t.id.startsWith("local_")) {
          streamUrl = (await getLocalTrackAudioUrl(t.id)) || undefined;
        }

        if (streamUrl) {
          a.removeAttribute("crossorigin");
          a.src = streamUrl;
          a.volume = targetVol;
          a.muted = targetMuted;
          a.playbackRate = playbackRate;
          setSourceType(null);
          if (autoplay) {
            try {
              if (acRef.current?.state === "suspended") acRef.current.resume().catch(() => {});
              await a.play();
              a.volume = targetVol;
              a.muted = targetMuted;
              setPlaying(true);
              directSuccess = true;
            } catch (err: any) {
              if (err?.name !== "AbortError") {
                console.warn("Local audio playback note:", err);
              }
            }
          } else {
            setPlaying(false);
            setLoading(false);
            if (startAt > 0) a.currentTime = startAt;
            directSuccess = true;
          }
        }
      }

      // 1. Primary: Resolve direct JioSaavn 320kbps verified audio CDN stream
      if (!directSuccess) {
        try {
        let streamUrl = t.audioUrl || t.streamUrl;
        if (!streamUrl || streamUrl.includes("preview") || streamUrl.includes("itunes")) {
          streamUrl = await resolveAudioStream(t.title, t.artist);
        }

        if (streamUrl && (streamUrl.includes("saavncdn") || streamUrl.includes("jiosaavn") || streamUrl.startsWith("http"))) {
          if (a.crossOrigin !== "anonymous") a.crossOrigin = "anonymous";
          a.src = streamUrl;
          a.volume = targetVol;
          a.muted = targetMuted;
          a.playbackRate = playbackRate;
          setSourceType("saavn");
          if (autoplay) {
            try {
              if (acRef.current?.state === "suspended") acRef.current.resume().catch(() => {});
              await a.play();
              a.volume = targetVol;
              a.muted = targetMuted;
              setPlaying(true);
              directSuccess = true;
            } catch (err: any) {
              if (err?.name !== "AbortError") {
                console.warn("Direct audio play note:", err);
              }
            }
          } else {
            setPlaying(false);
            setLoading(false);
            if (startAt > 0) {
              a.currentTime = startAt;
            }
            directSuccess = true;
          }
        }
      } catch (_) {}
      }

      // 2. If direct 320k stream was unavailable or failed, stream the FULL song via YouTube engine!
      if (!directSuccess) {
        const ytSuccess = await playViaYouTube(t, autoplay, startAt);
        if (!ytSuccess && /^\d+$/.test(t.id)) {
          // 3. Fallback to Deezer preview if neither Saavn nor YouTube audio could be started
          setSourceType("deezer");
          if (a.crossOrigin !== "anonymous") a.crossOrigin = "anonymous";
          a.src = `/api/stream/${t.id}`;
          a.volume = targetVol;
          a.muted = targetMuted;
          if (autoplay) {
            a.play().catch((err) => {
              if (err?.name !== "AbortError") setPlaying(false);
            });
          } else {
            setPlaying(false);
            setLoading(false);
          }
        }
      }
    },
    [ensureGraph, playbackRate, playViaYouTube],
  );

  const lastSaveTimeRef = useRef(0);

  const saveLastTrackState = useCallback(() => {
    const cur = currentRef.current;
    if (!cur) return;
    const a = audioRef.current;
    const pos =
      sourceType === "youtube"
        ? Math.floor(youtubeAudio.getCurrentTime())
        : Math.floor(a?.currentTime || position || 0);
    const dur =
      sourceType === "youtube"
        ? Math.floor(youtubeAudio.getDuration())
        : Math.floor(a?.duration || duration || cur.duration || 0);

    const q = queueRef.current;
    const idx = indexRef.current;
    const startIdx = Math.max(0, idx - 10);
    const endIdx = idx + 40;
    const slicedQ = q.slice(startIdx, endIdx);
    const newIdx = Math.max(0, idx - startIdx);

    const state: LastTrackState = {
      track: cur,
      queue: slicedQ.length > 0 ? slicedQ : [cur],
      index: newIdx,
      position: Math.max(0, pos),
      duration: Math.max(0, dur),
      sourceType,
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem(LAST_TRACK_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [sourceType, position, duration]);

  // Restore the last played track and position on app launch
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current || !settingsLoaded) return;
    restoredRef.current = true;
    try {
      const lastStateStr = localStorage.getItem(LAST_TRACK_KEY);
      if (!lastStateStr) return;
      const last = JSON.parse(lastStateStr) as LastTrackState;
      if (last && last.track && last.track.id) {
        const q = Array.isArray(last.queue) && last.queue.length > 0 ? last.queue : [last.track];
        const idx = typeof last.index === "number" && last.index >= 0 && last.index < q.length ? last.index : 0;
        const pos = typeof last.position === "number" && last.position > 0 ? last.position : 0;
        const dur = typeof last.duration === "number" && last.duration > 0 ? last.duration : (last.track.duration || 0);

        queueRef.current = q;
        indexRef.current = idx;
        setQueue(q);
        setIndex(idx);
        setPosition(pos);
        setDuration(dur);

        // Preload/cue track at the exact position where user left from without auto-playing
        void loadTrack(last.track, { autoplay: false, startAt: pos });
      }
    } catch {
      /* ignore */
    }
  }, [settingsLoaded, loadTrack]);

  // Save last track on tab close, page hide, navigation, or visibility change
  useEffect(() => {
    const onExit = () => {
      saveLastTrackState();
    };
    window.addEventListener("beforeunload", onExit);
    window.addEventListener("pagehide", onExit);
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        saveLastTrackState();
        if (playingRef.current && !userPausedRef.current) {
          const a = audioRef.current;
          if (a && a.src && a.paused) {
            a.play().catch(() => {});
          }
          if (acRef.current && acRef.current.state === "suspended") {
            acRef.current.resume().catch(() => {});
          }
        }
      } else {
        if (playingRef.current && !userPausedRef.current) {
          const a = audioRef.current;
          if (a && a.src && a.paused) {
            a.play().catch(() => {});
          }
          if (acRef.current && acRef.current.state === "suspended") {
            acRef.current.resume().catch(() => {});
          }
          if (sourceTypeRef.current === "youtube") {
            youtubeAudio.resume();
          }
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("beforeunload", onExit);
      window.removeEventListener("pagehide", onExit);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [saveLastTrackState]);

  const playIndex = useCallback(
    (i: number) => {
      const t = queueRef.current[i];
      if (!t) return;
      userPausedRef.current = false;
      if (acRef.current?.state === "suspended") {
        acRef.current.resume().catch(() => {});
      }
      indexRef.current = i;
      setIndex(i);
      loadTrack(t);
    },
    [loadTrack],
  );

  const appendRadio = useCallback(async (seed: Track) => {
    if (radioBusy.current) return 0;
    radioBusy.current = true;
    try {
      const exclude = queueRef.current.slice(-60).map((t) => t.id).join(",");
      const r = await fetch(`/api/music/radio?id=${seed.id}&exclude=${exclude}`);
      const j = await r.json();
      const have = new Set(queueRef.current.map((t) => t.id));
      let fresh: Track[] = (j.tracks ?? []).filter((t: Track) => !have.has(t.id));
      if (shuffleRef.current === "smart") fresh = smartShuffle(fresh, affinityRef.current, seed);
      if (fresh.length) {
        const q = [...queueRef.current, ...fresh];
        if (origQueueRef.current) origQueueRef.current = [...origQueueRef.current, ...fresh];
        queueRef.current = q;
        setQueue(q);
      }
      return fresh.length;
    } catch {
      return 0;
    } finally {
      radioBusy.current = false;
    }
  }, []);

  const goNext = useCallback(
    async (auto: boolean) => {
      const q = queueRef.current;
      const i = indexRef.current;
      const a = audioRef.current;
      if (!q.length || !a) return;
      if (auto && repeatRef.current === "one") {
        a.currentTime = 0;
        loggedRef.current = false;
        a.play().catch(() => {});
        return;
      }
      if (i + 1 < q.length) return playIndex(i + 1);
      if (repeatRef.current === "all") return playIndex(0);
      if (radioRef.current && currentRef.current) {
        const added = await appendRadio(currentRef.current);
        if (added > 0) return playIndex(i + 1);
      }
      a.pause();
      a.currentTime = 0;
      setPosition(0);
    },
    [playIndex, appendRadio],
  );

  const goPrev = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    const i = indexRef.current;
    if (a.currentTime > 3 || i <= 0) {
      if (i <= 0 && repeatRef.current === "all" && a.currentTime <= 3 && queueRef.current.length > 1)
        return playIndex(queueRef.current.length - 1);
      a.currentTime = 0;
      return;
    }
    playIndex(i - 1);
  }, [playIndex]);

  const applyShuffleTo = useCallback((tracks: Track[], start: number, mode: ShuffleMode) => {
    if (mode === "off") {
      origQueueRef.current = null;
      return { q: tracks, i: start };
    }
    origQueueRef.current = tracks;
    const first = tracks[start];
    const rest = tracks.filter((_, k) => k !== start);
    const sh = mode === "smart" ? smartShuffle(rest, affinityRef.current, first) : fisherYates(rest);
    return { q: [first, ...sh], i: 0 };
  }, []);

  const playList = useCallback(
    (tracks: Track[], start = 0) => {
      if (blocked() || !tracks.length) return;
      userPausedRef.current = false;
      if (acRef.current?.state === "suspended") {
        acRef.current.resume().catch(() => {});
      }
      const { q, i } = applyShuffleTo(tracks, Math.min(start, tracks.length - 1), shuffleRef.current);
      setQ(q, i);
      loadTrack(q[i]);
    },
    [blocked, applyShuffleTo, setQ, loadTrack],
  );

  const setShuffle = useCallback(
    (mode: ShuffleMode) => {
      if (blocked()) return;
      shuffleRef.current = mode;
      setShuffleState(mode);
      const q = queueRef.current;
      const i = indexRef.current;
      if (!q.length || i < 0) {
        if (mode === "off") origQueueRef.current = null;
        return;
      }
      if (mode === "off") {
        const orig = origQueueRef.current;
        if (orig) {
          const cur = q[i];
          const inQ = new Set(q.map((t) => t.id));
          const origIds = new Set(orig.map((t) => t.id));
          const restored = [...orig.filter((t) => inQ.has(t.id)), ...q.filter((t) => !origIds.has(t.id))];
          setQ(restored, Math.max(0, restored.findIndex((t) => t.id === cur.id)));
          origQueueRef.current = null;
        }
        return;
      }
      if (!origQueueRef.current) origQueueRef.current = q.slice();
      const upcoming = q.slice(i + 1);
      const sh = mode === "smart" ? smartShuffle(upcoming, affinityRef.current, q[i]) : fisherYates(upcoming);
      setQ([...q.slice(0, i + 1), ...sh], i);
      toast(mode === "smart" ? "Smart shuffle: tuned to your taste" : "Shuffle on");
    },
    [blocked, setQ, toast],
  );

  const shufflePlay = useCallback(
    (tracks: Track[]) => {
      if (blocked() || !tracks.length) return;
      if (acRef.current?.state === "suspended") {
        acRef.current.resume().catch(() => {});
      }
      const mode: ShuffleMode = shuffleRef.current === "off" ? "smart" : shuffleRef.current;
      shuffleRef.current = mode;
      setShuffleState(mode);
      const { q, i } = applyShuffleTo(tracks, Math.floor(Math.random() * tracks.length), mode);
      setQ(q, i);
      loadTrack(q[i]);
    },
    [blocked, applyShuffleTo, setQ, loadTrack],
  );

  const playTrack = useCallback(
    (t: Track, context?: Track[]) => {
      if (blocked()) return;
      if (context?.length) {
        const i = context.findIndex((x) => x.id === t.id);
        playList(context, i >= 0 ? i : 0);
      } else {
        playList([t], 0);
      }
    },
    [blocked, playList],
  );

  /* -------------------------------- room (host push) ------------------------------- */
  const pushRoom = useCallback(() => {
    const r = roomRef.current;
    const code = roomCodeRef.current;
    const a = audioRef.current;
    if (!r || !r.isHost || !code) return;
    const q = queueRef.current;
    const pos = sourceType === "youtube" ? youtubeAudio.getCurrentTime() : a?.currentTime || 0;
    const isPlaying = sourceType === "youtube" ? youtubeAudio.isPlaying : !(a?.paused ?? true);
    fetch(`/api/rooms/${code}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        track: currentRef.current,
        queue: q.slice(0, 200),
        index: indexRef.current,
        position: pos,
        playing: isPlaying,
        seq: ++seqRef.current,
      }),
    }).catch(() => {});
  }, [sourceType]);

  const toggle = useCallback(() => {
    if (blocked() || !currentRef.current) return;
    ensureGraph();
    if (acRef.current?.state === "suspended") {
      acRef.current.resume().catch(() => {});
    }
    if (sourceType === "youtube" || (!audioRef.current?.src && youtubeAudio.activeVideoId)) {
      if (youtubeAudio.isPlaying) {
        userPausedRef.current = true;
        youtubeAudio.pause();
        if (keepaliveAudioRef.current) {
          try {
            keepaliveAudioRef.current.pause();
          } catch (_) {}
        }
      } else {
        userPausedRef.current = false;
        youtubeAudio.resume();
        if (keepaliveAudioRef.current) {
          try {
            keepaliveAudioRef.current.play().catch(() => {});
          } catch (_) {}
        }
      }
    } else {
      const a = audioRef.current;
      if (!a) return;
      if (a.paused) {
        userPausedRef.current = false;
        if (!a.src && currentRef.current) {
          void loadTrack(currentRef.current, { autoplay: true, startAt: position });
        } else {
          a.play().catch(() => {});
        }
      } else {
        userPausedRef.current = true;
        a.pause();
      }
    }
    if (roomRef.current?.isHost) {
      setTimeout(pushRoom, 40);
    }
  }, [blocked, ensureGraph, sourceType, loadTrack, position, pushRoom]);

  const next = useCallback(() => {
    if (blocked()) return;
    void goNext(false);
  }, [blocked, goNext]);
  const prev = useCallback(() => {
    if (blocked()) return;
    goPrev();
  }, [blocked, goPrev]);

  const seek = useCallback(
    (t: number) => {
      if (blocked()) return;
      if (sourceType === "youtube" || (!audioRef.current?.src && youtubeAudio.activeVideoId)) {
        youtubeAudio.seekTo(t);
        setPosition(t);
      } else {
        const a = audioRef.current;
        if (!a) return;
        const max = Number.isFinite(a.duration) ? a.duration : t;
        a.currentTime = Math.max(0, Math.min(max, t));
        setPosition(a.currentTime);
      }
      setTimeout(pushRoom, 50);
      saveLastTrackState();
    },
    [blocked, sourceType, pushRoom, saveLastTrackState],
  );

  const setVolume = useCallback((v: number) => {
    const c = Math.max(0, Math.min(1, v));
    volumeRef.current = c;
    setVolumeState(c);
    if (c > 0) {
      mutedRef.current = false;
      setMuted(false);
    }
    const a = audioRef.current;
    if (a) a.volume = c;
    youtubeAudio.setVolume(c);
  }, []);
  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      mutedRef.current = next;
      const a = audioRef.current;
      if (a) a.muted = next;
      if (next) youtubeAudio.mute();
      else youtubeAudio.unMute();
      return next;
    });
  }, []);

  useEffect(() => {
    volumeRef.current = volume;
    mutedRef.current = muted;
    const a = audioRef.current;
    if (a) {
      a.volume = typeof volume === "number" && !isNaN(volume) ? Math.max(0, Math.min(1, volume)) : 0.85;
      a.muted = muted;
    }
    youtubeAudio.setVolume(volume);
    if (muted) youtubeAudio.mute();
    else youtubeAudio.unMute();
  }, [volume, muted, settingsLoaded]);

  const cycleShuffle = useCallback(() => {
    setShuffle(shuffleRef.current === "off" ? "on" : shuffleRef.current === "on" ? "smart" : "off");
  }, [setShuffle]);
  const cycleRepeat = useCallback(() => {
    const n: RepeatMode = repeatRef.current === "off" ? "all" : repeatRef.current === "all" ? "one" : "off";
    repeatRef.current = n;
    setRepeatState(n);
  }, []);
  const setRadio = useCallback((v: boolean) => {
    radioRef.current = v;
    setRadioState(v);
  }, []);

  const enqueue = useCallback(
    (t: Track | Track[]) => {
      if (blocked()) return;
      const list = Array.isArray(t) ? t : [t];
      if (!queueRef.current.length) return playList(list, 0);
      const have = new Set(queueRef.current.map((x) => x.id));
      const fresh = list.filter((x) => !have.has(x.id));
      if (!fresh.length) return toast("Already in your queue");
      const q = [...queueRef.current, ...fresh];
      if (origQueueRef.current) origQueueRef.current = [...origQueueRef.current, ...fresh];
      queueRef.current = q;
      setQueue(q);
      toast(`Added ${fresh.length > 1 ? fresh.length + " tracks" : "“" + fresh[0].title + "”"} to queue`);
    },
    [blocked, playList, toast],
  );

  const playNext = useCallback(
    (t: Track) => {
      if (blocked()) return;
      if (!queueRef.current.length) return playList([t], 0);
      const q = queueRef.current.filter((x, k) => x.id !== t.id || k === indexRef.current);
      const cur = currentRef.current;
      const ci = cur ? q.findIndex((x) => x.id === cur.id) : indexRef.current;
      const nq = [...q.slice(0, ci + 1), t, ...q.slice(ci + 1)];
      setQ(nq, ci);
      toast(`“${t.title}” plays next`);
    },
    [blocked, playList, setQ, toast],
  );

  const removeFromQueue = useCallback(
    (i: number) => {
      if (blocked()) return;
      const q = queueRef.current.slice();
      if (i === indexRef.current) return toast("That's the current track", "err");
      q.splice(i, 1);
      setQ(q, i < indexRef.current ? indexRef.current - 1 : indexRef.current);
    },
    [blocked, setQ, toast],
  );

  const moveInQueue = useCallback(
    (i: number, dir: -1 | 1) => {
      if (blocked()) return;
      const j = i + dir;
      const q = queueRef.current.slice();
      if (j < 0 || j >= q.length) return;
      const cur = q[indexRef.current];
      [q[i], q[j]] = [q[j], q[i]];
      setQ(q, q.findIndex((t) => t.id === cur?.id));
    },
    [blocked, setQ],
  );

  const clearQueue = useCallback(() => {
    if (blocked()) return;
    const cur = currentRef.current;
    if (!cur) return;
    origQueueRef.current = null;
    setQ([cur], 0);
  }, [blocked, setQ]);

  const jumpTo = useCallback(
    (i: number) => {
      if (blocked()) return;
      playIndex(i);
    },
    [blocked, playIndex],
  );

  const smartReshuffle = useCallback(() => {
    if (blocked()) return;
    const q = queueRef.current;
    const i = indexRef.current;
    if (q.length < 3 || i < 0) return;
    if (!origQueueRef.current) origQueueRef.current = q.slice();
    const sh = smartShuffle(q.slice(i + 1), affinityRef.current, q[i]);
    shuffleRef.current = "smart";
    setShuffleState("smart");
    setQ([...q.slice(0, i + 1), ...sh], i);
    toast("Queue re-ordered with smart shuffle");
  }, [blocked, setQ, toast]);

  const setEq = useCallback((patch: Partial<EqState>) => setEqState((s) => ({ ...s, ...patch })), []);
  const setEqBand = useCallback(
    (i: number, v: number) =>
      setEqState((s) => {
        const gains = s.gains.slice();
        gains[i] = v;
        return { ...s, gains, preset: "Custom" };
      }),
    [],
  );
  const applyPreset = useCallback((name: string) => {
    const g = EQ_PRESETS[name];
    if (g) setEqState((s) => ({ ...s, gains: g.slice(), preset: name, enabled: true }));
  }, []);

  const lyricsOffset = current ? (offsets[current.id] ?? 0) : 0;
  const setLyricsOffset = useCallback((s: number) => {
    const cur = currentRef.current;
    if (!cur) return;
    const v = Math.max(-600, Math.min(600, Math.round(s * 100) / 100));
    setOffsets((o) => {
      const n = { ...o, [cur.id]: v };
      try {
        localStorage.setItem(OFFSETS_KEY, JSON.stringify(n));
      } catch {
        /* ignore */
      }
      return n;
    });
  }, []);

  const setSleepTimer = useCallback((minutes: number | null) => {
    if (sleepTimerIdRef.current) clearTimeout(sleepTimerIdRef.current);
    setSleepTimerState(minutes);
    if (minutes && minutes > 0) {
      toast(`Sleep timer set for ${minutes} minute${minutes > 1 ? "s" : ""}`);
      sleepTimerIdRef.current = setTimeout(() => {
        const a = audioRef.current;
        if (a) a.pause();
        youtubeAudio.pause();
        setPlaying(false);
        setSleepTimerState(null);
        toast("Sleep timer finished. Playback paused.");
      }, minutes * 60 * 1000);
    } else {
      toast("Sleep timer cancelled");
    }
  }, [toast]);

  const setPlaybackRate = useCallback((rate: number) => {
    setPlaybackRateState(rate);
    const a = audioRef.current;
    if (a) a.playbackRate = rate;
  }, []);

  const downloadTrack = useCallback(
    async (t: Track, quality = 320) => {
      try {
        const confetti = (await import("canvas-confetti")).default;
        confetti({ particleCount: 50, spread: 60, origin: { y: 0.85 } });
      } catch (_) {}

      const cleanTitle = (t.title || "Track").replace(/[/\\?%*:|"<>]/g, "_");
      const cleanArtist = (t.artist || "Artist").replace(/[/\\?%*:|"<>]/g, "_");
      let filename = `${cleanArtist} - ${cleanTitle} [${quality}k].m4a`;

      const params = new URLSearchParams({
        title: t.title,
        artist: t.artist,
        album: t.album || "",
        cover: t.coverBig || t.cover || "",
        duration: String(t.duration || 0),
        quality: String(quality),
      });

      if (t.audioUrl && t.audioUrl.startsWith("http")) {
        params.set("stream", t.audioUrl);
      } else if (t.streamUrl && t.streamUrl.startsWith("http")) {
        params.set("stream", t.streamUrl);
      }

      const downloadRelUrl = `/api/download/${encodeURIComponent(t.id)}?${params.toString()}`;
      const absoluteUrl =
        typeof window !== "undefined" && window.location?.origin
          ? `${window.location.origin}${downloadRelUrl}`
          : downloadRelUrl;

      toast(`Downloading “${t.title}”…`);

      // 1. Android Native App (if AndroidDownloader interface is injected into WebView)
      const androidDownloader = typeof window !== "undefined" ? (window as any).AndroidDownloader : null;
      if (androidDownloader && typeof androidDownloader.downloadFile === "function") {
        androidDownloader.downloadFile(absoluteUrl, filename, "audio/mp4");
        setTimeout(() => {
          toast(`“${t.title}” download complete!`, "ok");
        }, 3000);
        return;
      }

      // 2. Browser Download (Mobile & Desktop) via Blob
      try {
        const res = await fetch(downloadRelUrl);
        if (!res.ok) throw new Error(`Download request failed (${res.status})`);

        const disposition = res.headers.get("content-disposition");
        let serverFilename = "";
        if (disposition && disposition.includes("filename=")) {
          const match = disposition.match(/filename\*?=['"]?(?:UTF-\d['"]*)?([^;\r\n"']*)['"]?/i);
          if (match && match[1]) serverFilename = decodeURIComponent(match[1]);
        }
        const formatHeader = res.headers.get("x-audio-format");
        const isM4a = formatHeader === "m4a" || serverFilename.endsWith(".m4a");
        const ext = isM4a ? "m4a" : "mp3";
        const mimeType = isM4a ? "audio/mp4" : "audio/mpeg";
        filename = serverFilename || `${cleanArtist} - ${cleanTitle} [${quality}k].${ext}`;

        const blob = await res.blob();
        const cleanBlob = new Blob([blob], { type: mimeType });

        const blobUrl = URL.createObjectURL(cleanBlob);
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = filename;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();

        setTimeout(() => {
          URL.revokeObjectURL(blobUrl);
          a.remove();
        }, 5000);

        try {
          const confetti = (await import("canvas-confetti")).default;
          confetti({ particleCount: 60, spread: 70, origin: { y: 0.85 } });
        } catch (_) {}

        toast(`“${t.title}” download complete!`, "ok");

        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          try {
            new Notification("Download Complete", {
              body: `“${t.title}” downloaded with cover art & lyrics.`,
              icon: t.cover || "/icon-192.png",
            });
          } catch (_) {}
        }
      } catch (err: any) {
        console.error("Direct fetch download failed, falling back to browser navigation:", err);
        // Fallback: direct browser link click
        const a = document.createElement("a");
        a.href = downloadRelUrl;
        a.download = filename;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        setTimeout(() => a.remove(), 2500);
      }
    },
    [toast],
  );

  /* ------------------------------------ rooms ------------------------------------ */
  const createRoom = useCallback(async () => {
    if (!user) return toast("Sign in to host a room", "err");
    const r = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create" }),
    });
    const j = await r.json();
    if (!r.ok) return toast(j.error ?? "Couldn't create room", "err");
    ensureGraph();
    setRoomCode(j.code);
    toast(`Room ${j.code} is live. Share the code!`);
  }, [user, toast, ensureGraph]);

  const joinRoom = useCallback(
    async (code: string) => {
      if (!user) {
        toast("Sign in to join a room", "err");
        return false;
      }
      const r = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "join", code }),
      });
      const j = await r.json();
      if (!r.ok) {
        toast(j.error ?? "Couldn't join room", "err");
        return false;
      }
      ensureGraph();
      setRoomCode(j.code);
      toast(`Joined room ${j.code}`);
      return true;
    },
    [user, toast, ensureGraph],
  );

  const endRoom = useCallback(async () => {
    const code = roomCodeRef.current;
    setRoomCode(null);
    setRoom(null);
    roomRef.current = null;
    if (code) await fetch(`/api/rooms/${code}?action=end`, { method: "DELETE" }).catch(() => {});
    toast("Room ended");
  }, [toast]);

  const leaveRoom = useCallback(async () => {
    const code = roomCodeRef.current;
    const wasGuest = lockedRef.current;
    setRoomCode(null);
    setRoom(null);
    roomRef.current = null;
    if (wasGuest) audioRef.current?.pause();
    if (code) await fetch(`/api/rooms/${code}?action=leave`, { method: "DELETE" }).catch(() => {});
    toast("Left the room");
  }, [toast]);

  const transferHost = useCallback(
    async (newHostId: number | string) => {
      const code = roomCodeRef.current;
      if (!code) return false;
      try {
        const res = await fetch(`/api/rooms/${code}/transfer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ newHostId }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast(data.error || "Failed to transfer host", "err");
          return false;
        }
        toast(`Host transferred to ${data.hostName}`);
        return true;
      } catch {
        toast("Error transferring host", "err");
        return false;
      }
    },
    [toast],
  );

  // poll the room with RTT latency compensation & micro-drift rate tuning
  useEffect(() => {
    if (!roomCode) return;
    let stopped = false;
    let lastTrackId: string | null = null;
    let inFlight = false;

    const tick = async () => {
      if (inFlight) return;
      inFlight = true;
      const t0 = performance.now();
      try {
        const res = await fetch(`/api/rooms/${roomCode}`, { cache: "no-store" });
        const rtt = (performance.now() - t0) / 1000;
        if (stopped) return;
        if (res.status === 404 || res.status === 401) {
          setRoomCode(null);
          setRoom(null);
          roomRef.current = null;
          toast(res.status === 404 ? "The room has ended" : "Sign in to rejoin the room", "err");
          return;
        }
        const info: RoomInfo = await res.json();
        roomRef.current = info;
        setRoom((prev) => {
          const serverMsgs = Array.isArray(info.messages) ? info.messages : [];
          const pendingOptimistic = (prev?.messages || []).filter(
            (m) =>
              m.id.startsWith("opt-") &&
              Date.now() - m.timestamp < 10000 &&
              !serverMsgs.some((sm) => String(sm.userId) === String(m.userId) && sm.text === m.text)
          );
          return {
            ...info,
            messages: [...serverMsgs, ...pendingOptimistic],
          };
        });
        const st = info.state;
        const a = audioRef.current;
        if (info.isHost || !st?.track) return;

        // Latency compensation: server elapsed + network transit time estimate (RTT / 2)
        const serverElapsed = st.playing ? Math.max(0, (info.serverNow - info.updatedAt) / 1000) : 0;
        const networkTransit = st.playing ? Math.min(1.0, rtt / 2) : 0;
        let expected = st.position + serverElapsed + networkTransit;

        const curId = currentRef.current?.id;
        if (st.track.id !== curId || lastTrackId !== st.track.id) {
          lastTrackId = st.track.id;
          const q = st.queue.length ? st.queue : [st.track];
          setQ(q, Math.min(st.index, q.length - 1));
          loadTrack(st.track, { autoplay: st.playing, startAt: expected });
          return;
        }

        // keep the queue view in sync
        if (st.queue.length !== queueRef.current.length) setQ(st.queue, st.index);
        else if (st.index !== indexRef.current) {
          indexRef.current = st.index;
          setIndex(st.index);
        }

        // HTML5 Audio sync (HTML audio element)
        if (a && a.src && sourceType !== "youtube") {
          if (Number.isFinite(a.duration) && a.duration > 0) {
            expected = Math.min(expected, Math.max(0, a.duration - 0.2));
          }
          const curTime = a.currentTime;
          const diff = expected - curTime; // positive: listener is behind host

          if (a.readyState > 0) {
            if (Math.abs(diff) > 0.75) {
              // Large drift: seek immediately
              a.currentTime = expected;
              a.playbackRate = 1.0;
            } else if (diff > 0.08) {
              // Slightly behind (80ms to 750ms): gently speed up 5% to lock in phase
              a.playbackRate = 1.05;
            } else if (diff < -0.08) {
              // Slightly ahead (-80ms to -750ms): gently slow down 5%
              a.playbackRate = 0.95;
            } else {
              // In sync (within 80ms)
              a.playbackRate = 1.0;
            }
          }

          if (st.playing && a.paused) a.play().catch(() => {});
          if (!st.playing && !a.paused) {
            a.pause();
            a.playbackRate = 1.0;
          }
        }

        // YouTube Audio sync
        if (sourceType === "youtube" || youtubeAudio.activeVideoId) {
          const ytCur = youtubeAudio.getCurrentTime();
          const ytDiff = expected - ytCur;
          if (Math.abs(ytDiff) > 0.8) {
            youtubeAudio.seekTo(expected);
          }
          if (st.playing && !youtubeAudio.isPlaying) youtubeAudio.resume();
          if (!st.playing && youtubeAudio.isPlaying) youtubeAudio.pause();
        }
      } catch {
        /* transient network error */
      } finally {
        inFlight = false;
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => {
      stopped = true;
      clearInterval(id);
      if (audioRef.current) audioRef.current.playbackRate = 1.0;
    };
  }, [roomCode, toast, setQ, loadTrack, sourceType]);

  // host pushes on change + fast heartbeat
  const isHost = room?.isHost ?? false;
  useEffect(() => {
    if (!roomCode || !isHost) return;
    const t = setTimeout(pushRoom, 80);
    return () => clearTimeout(t);
  }, [roomCode, isHost, current?.id, playing, queue, pushRoom]);
  useEffect(() => {
    if (!roomCode || !isHost) return;
    const id = setInterval(pushRoom, 1200);
    return () => clearInterval(id);
  }, [roomCode, isHost, pushRoom]);

  // Wire YouTube audio callbacks
  useEffect(() => {
    youtubeAudio.setCallbacks({
      onPlaying: () => {
        setPlaying(true);
        setLoading(false);
        if (keepaliveAudioRef.current && keepaliveAudioRef.current.paused) {
          keepaliveAudioRef.current.play().catch(() => {});
        }
      },
      onPaused: () => {
        if (typeof document !== "undefined" && document.hidden && !userPausedRef.current) {
          // Ignore background pause triggered by Android minimizing the window
          return;
        }
        setPlaying(false);
        if (keepaliveAudioRef.current && !keepaliveAudioRef.current.paused) {
          keepaliveAudioRef.current.pause();
        }
        saveLastTrackState();
      },
      onBuffering: () => {
        setLoading(true);
      },
      onEnded: () => {
        if (keepaliveAudioRef.current) keepaliveAudioRef.current.pause();
        if (lockedRef.current) return;
        void goNext(true);
      },
      onTimeUpdate: (cur, dur) => {
        if (sourceTypeRef.current === "youtube") {
          setPosition(cur);
          if (dur > 0) setDuration(dur);
          const curTrack = currentRef.current;
          if (!loggedRef.current && curTrack && cur >= 10 && !lockedRef.current) {
            loggedRef.current = true;
            logPlayRef.current(curTrack, Math.round(cur));
          }
          const now = Date.now();
          if (now - lastSaveTimeRef.current > 2500) {
            lastSaveTimeRef.current = now;
            saveLastTrackState();
          }
        }
      },
      onError: () => {
        if (keepaliveAudioRef.current) keepaliveAudioRef.current.pause();
        setLoading(false);
        setPlaying(false);
      },
    });
  }, [goNext, saveLastTrackState]);

  /* ------------------------------ audio element events ------------------------------ */
  useEffect(() => {
    if (!audioRef.current) {
      const a = new Audio();
      a.crossOrigin = "anonymous";
      a.preload = "auto";
      audioRef.current = a;
    }
    const a = audioRef.current;
    if (a.crossOrigin !== "anonymous") {
      a.crossOrigin = "anonymous";
    }
    a.volume = typeof volume === "number" && !isNaN(volume) ? Math.max(0, Math.min(1, volume)) : 0.85;
    a.muted = Boolean(muted);

    const onPlay = () => {
      if (sourceTypeRef.current === "youtube") return;
      userPausedRef.current = false;
      a.volume = typeof volumeRef.current === "number" && !isNaN(volumeRef.current) ? Math.max(0, Math.min(1, volumeRef.current)) : 0.85;
      a.muted = Boolean(mutedRef.current);
      setPlaying(true);
    };
    const onPause = () => {
      if (sourceTypeRef.current === "youtube") return;
      // If the pause event fired while document is hidden and user didn't explicitly pause,
      // it was triggered by Android browser suspending background tabs. Auto-resume!
      if (typeof document !== "undefined" && document.hidden && !userPausedRef.current && playingRef.current) {
        const audio = audioRef.current;
        if (audio && audio.src) {
          audio.play().catch(() => {
            setPlaying(false);
            saveLastTrackState();
          });
          return;
        }
      }
      setPlaying(false);
      saveLastTrackState();
    };
    const onTime = () => {
      if (sourceTypeRef.current === "youtube") return;
      setPosition(a.currentTime);
      const cur = currentRef.current;
      if (!loggedRef.current && cur && a.currentTime >= 10 && !lockedRef.current) {
        loggedRef.current = true;
        logPlayRef.current(cur, Math.round(a.currentTime));
      }
      const now = Date.now();
      if (now - lastSaveTimeRef.current > 2500) {
        lastSaveTimeRef.current = now;
        saveLastTrackState();
      }
      if ("mediaSession" in navigator && Number.isFinite(a.duration) && Date.now() - lastPosState.current > 1000) {
        lastPosState.current = Date.now();
        try {
          navigator.mediaSession.setPositionState({
            duration: a.duration,
            position: Math.min(a.currentTime, a.duration),
            playbackRate: a.playbackRate,
          });
        } catch {
          /* ignore */
        }
      }
    };
    const onMeta = () => {
      if (sourceTypeRef.current === "youtube") return;
      setDuration(Number.isFinite(a.duration) ? a.duration : 0);
      if (pendingStart.current > 0) {
        a.currentTime = Math.min(pendingStart.current, Math.max(0, a.duration - 0.2));
        pendingStart.current = 0;
      }
    };
    const onCanPlay = () => {
      if (sourceTypeRef.current === "youtube") return;
      setLoading(false);
      errorStreak.current = 0;
    };
    const onWaiting = () => {
      if (sourceTypeRef.current === "youtube") return;
      setLoading(true);
    };
    const onEnded = () => {
      if (sourceTypeRef.current === "youtube") return;
      if (lockedRef.current) return;
      void goNext(true);
    };
    const onError = () => {
      if (sourceTypeRef.current === "youtube") return;
      if (!a.src || a.src === window.location.href) return;
      setLoading(false);
      const cur = currentRef.current;
      errorStreak.current += 1;
      toast(`Couldn't play${cur ? ` “${cur.title}”` : ""}`, "err");
      if (!lockedRef.current && errorStreak.current < 4 && indexRef.current + 1 < queueRef.current.length) {
        void goNext(false);
      }
    };
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("durationchange", onMeta);
    a.addEventListener("canplay", onCanPlay);
    a.addEventListener("playing", onCanPlay);
    a.addEventListener("waiting", onWaiting);
    a.addEventListener("ended", onEnded);
    a.addEventListener("error", onError);
    return () => {
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("durationchange", onMeta);
      a.removeEventListener("canplay", onCanPlay);
      a.removeEventListener("playing", onCanPlay);
      a.removeEventListener("waiting", onWaiting);
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("error", onError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goNext, toast]);

  // smart autoplay refill
  useEffect(() => {
    if (!current || locked) return;
    if (radio && repeat !== "all" && queue.length - index <= 2) void appendRadio(current);
  }, [current, index, queue.length, radio, repeat, locked, appendRadio]);

  /* ------------------------------ MediaSession / title ------------------------------ */
  useEffect(() => {
    document.title = current ? `${playing ? "▶ " : ""}${current.title} · ${current.artist} — 5ONG` : "5ONG — music, in sync";
    if (!("mediaSession" in navigator)) return;
    if (!current) {
      navigator.mediaSession.metadata = null;
      return;
    }
    const art = (u: string | undefined, s: string) => (u ? [{ src: u, sizes: s, type: "image/jpeg" }] : []);
    navigator.mediaSession.metadata = new MediaMetadata({
      title: current.title,
      artist: current.artist,
      album: current.album ?? "5ONG",
      artwork: [...art(current.cover, "250x250"), ...art(current.coverBig, "1000x1000")],
    });
  }, [current, playing]);

  useEffect(() => {
    if ("mediaSession" in navigator) navigator.mediaSession.playbackState = playing ? "playing" : "paused";
  }, [playing]);

  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    if (current && Number.isFinite(duration) && duration > 0) {
      try {
        navigator.mediaSession.setPositionState({
          duration: duration,
          position: Math.min(position, duration),
          playbackRate: playbackRate,
        });
      } catch {
        /* ignore */
      }
    }
  }, [current, duration, position, playbackRate]);

  const api = useRef({ toggle, next, prev, seek });
  api.current = { toggle, next, prev, seek };
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    const ms = navigator.mediaSession;
    const set = (action: MediaSessionAction, fn: MediaSessionActionHandler) => {
      try {
        ms.setActionHandler(action, fn);
      } catch {
        /* unsupported */
      }
    };
    const audio = () => audioRef.current;
    set("play", () => {
      userPausedRef.current = false;
      const a = audio();
      if (a?.paused) api.current.toggle();
    });
    set("pause", () => {
      userPausedRef.current = true;
      const a = audio();
      if (a && !a.paused) api.current.toggle();
    });
    set("previoustrack", () => api.current.prev());
    set("nexttrack", () => api.current.next());
    set("seekbackward", (d) => api.current.seek((audio()?.currentTime ?? 0) - (d.seekOffset ?? 10)));
    set("seekforward", (d) => api.current.seek((audio()?.currentTime ?? 0) + (d.seekOffset ?? 10)));
    set("seekto", (d) => {
      if (typeof d.seekTime === "number") api.current.seek(d.seekTime);
    });
    set("stop", () => {
      const a = audio();
      if (a && !a.paused) api.current.toggle();
    });
  }, []);

  /* ----------------------------------- keyboard ----------------------------------- */
  const kb = useRef({
    volume,
    muted,
    current,
    panel,
    vizMode,
    lyricsOffset,
    toggleLike,
    setLyricsOffset,
  });
  kb.current = { volume, muted, current, panel, vizMode, lyricsOffset, toggleLike, setLyricsOffset };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F11") {
        e.preventDefault();
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
        return;
      }
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable)) {
        if (e.key === "Escape") el.blur();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const s = kb.current;
      const a = audioRef.current;
      const k = e.key;
      const stop = () => e.preventDefault();
      const openTab = (t: Tab) => setPanel((p) => (p === t ? null : t));
      switch (k) {
        case " ":
        case "k":
        case "K":
          stop();
          api.current.toggle();
          break;
        case "ArrowRight":
          stop();
          if (e.shiftKey) api.current.next();
          else api.current.seek((a?.currentTime ?? 0) + 5);
          break;
        case "ArrowLeft":
          stop();
          if (e.shiftKey) api.current.prev();
          else api.current.seek((a?.currentTime ?? 0) - 5);
          break;
        case "ArrowUp":
          stop();
          setVolume(s.volume + 0.05);
          break;
        case "ArrowDown":
          stop();
          setVolume(s.volume - 0.05);
          break;
        case "n":
        case "N":
          api.current.next();
          break;
        case "p":
        case "P":
          api.current.prev();
          break;
        case "m":
        case "M":
          toggleMute();
          break;
        case "s":
        case "S":
          cycleShuffle();
          break;
        case "r":
        case "R":
          cycleRepeat();
          break;
        case "l":
        case "L":
          if (s.current) s.toggleLike(s.current);
          break;
        case "q":
        case "Q":
          openTab("queue");
          break;
        case "y":
        case "Y":
          openTab("lyrics");
          break;
        case "e":
        case "E":
          openTab("eq");
          break;
        case "f":
        case "F":
          openTab("player");
          break;
        case "v":
        case "V":
          setVizMode(VIZ_ORDER[(VIZ_ORDER.indexOf(s.vizMode) + 1) % VIZ_ORDER.length]);
          break;
        case "[":
          s.setLyricsOffset(s.lyricsOffset - 0.1);
          break;
        case "]":
          s.setLyricsOffset(s.lyricsOffset + 0.1);
          break;
        case "?":
          setHelpOpen((h) => !h);
          break;
        case "/":
          stop();
          document.getElementById("global-search")?.focus();
          break;
        case "Escape":
          setPanel(null);
          setHelpOpen(false);
          break;
        default:
          if (/^[0-9]$/.test(k) && a && Number.isFinite(a.duration)) {
            api.current.seek((Number(k) / 10) * a.duration);
          }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setVolume, toggleMute, cycleShuffle, cycleRepeat]);

  const value: PlayerCtx = {
    current,
    trackTheme,
    queue,
    index,
    playing,
    loading,
    position,
    duration,
    volume,
    muted,
    shuffle,
    repeat,
    radio,
    eq,
    lyricsOffset,
    panel,
    vizMode,
    helpOpen,
    room,
    roomCode,
    locked,
    setRoom,
    setPanel,
    setHelpOpen,
    setVizMode,
    getAnalyser,
    playList,
    shufflePlay,
    playTrack,
    toggle,
    next,
    prev,
    seek,
    setVolume,
    toggleMute,
    setShuffle,
    cycleShuffle,
    cycleRepeat,
    setRadio,
    enqueue,
    playNext,
    removeFromQueue,
    moveInQueue,
    clearQueue,
    jumpTo,
    smartReshuffle,
    setEq,
    setEqBand,
    applyPreset,
    setLyricsOffset,
    downloadTrack,
    sleepTimer,
    setSleepTimer,
    playbackRate,
    setPlaybackRate,
    sourceType,
    createRoom,
    joinRoom,
    leaveRoom,
    endRoom,
    transferHost,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
