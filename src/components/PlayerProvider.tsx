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
import { EQ_BANDS, EQ_PRESETS } from "@/lib/eq";
import { buildAffinity, fisherYates, smartShuffle } from "@/lib/smartShuffle";
import { resolveAudioStream } from "@/lib/audioResolver";
import { youtubeAudio } from "@/lib/youtubeAudio";
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
  setRoom: (r: RoomInfo | null) => void;
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
const DEFAULT_EQ: EqState = { enabled: true, preamp: 0, gains: EQ_PRESETS.Flat.slice(), preset: "Flat" };
const VIZ_ORDER: VizMode[] = ["bars", "wave", "orbit", "mirror"];

export default function PlayerProvider({ children }: { children: ReactNode }) {
  const { toast, logPlay, toggleLike, likes, history, user } = useApp();

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

  const ensureGraph = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.crossOrigin !== "anonymous") {
      audio.crossOrigin = "anonymous";
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
    applyEq(eq);
  }, [eq, applyEq]);

  const getAnalyser = useCallback(() => analyserRef.current, []);

  /* ---------------------------------- playback ---------------------------------- */
  const playViaYouTube = useCallback(async (t: Track, autoplay = true, startAt = 0): Promise<boolean> => {
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.src = "";
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

      let directSuccess = false;
      const targetVol = typeof volumeRef.current === "number" && !isNaN(volumeRef.current) ? Math.max(0, Math.min(1, volumeRef.current)) : 0.85;
      const targetMuted = Boolean(mutedRef.current);

      // 1. Primary: Resolve direct JioSaavn 320kbps verified audio CDN stream
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
            directSuccess = true;
          }
        }
      } catch (_) {}

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
          }
        }
      }
    },
    [ensureGraph, playbackRate, playViaYouTube],
  );

  const playIndex = useCallback(
    (i: number) => {
      const t = queueRef.current[i];
      if (!t) return;
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

  const toggle = useCallback(() => {
    if (blocked() || !currentRef.current) return;
    ensureGraph();
    if (acRef.current?.state === "suspended") {
      acRef.current.resume().catch(() => {});
    }
    if (sourceType === "youtube" || (!audioRef.current?.src && youtubeAudio.activeVideoId)) {
      if (youtubeAudio.isPlaying) youtubeAudio.pause();
      else youtubeAudio.resume();
    } else {
      const a = audioRef.current;
      if (!a) return;
      if (a.paused) a.play().catch(() => {});
      else a.pause();
    }
  }, [blocked, ensureGraph, sourceType]);

  const next = useCallback(() => {
    if (blocked()) return;
    void goNext(false);
  }, [blocked, goNext]);
  const prev = useCallback(() => {
    if (blocked()) return;
    goPrev();
  }, [blocked, goPrev]);

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
    },
    [blocked, sourceType, pushRoom],
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

      const params = new URLSearchParams({
        title: t.title,
        artist: t.artist,
        album: t.album || "",
        cover: t.coverBig || t.cover || "",
        quality: String(quality),
      });

      const a = document.createElement("a");
      a.href = `/api/download/${t.id}?${params.toString()}`;
      a.download = `${t.artist} - ${t.title} [${quality}k].mp3`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast(`Downloading “${t.title}” (MP3 · 320 kbps ID3 tagged)`);
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

  const leaveRoom = useCallback(async () => {
    const code = roomCodeRef.current;
    const wasGuest = lockedRef.current;
    setRoomCode(null);
    setRoom(null);
    roomRef.current = null;
    if (wasGuest) audioRef.current?.pause();
    if (code) await fetch(`/api/rooms/${code}`, { method: "DELETE" }).catch(() => {});
    toast("Left the room");
  }, [toast]);

  // poll the room
  useEffect(() => {
    if (!roomCode) return;
    let stopped = false;
    let lastTrackId: string | null = null;
    const tick = async () => {
      try {
        const res = await fetch(`/api/rooms/${roomCode}`, { cache: "no-store" });
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
        setRoom(info);
        const st = info.state;
        const a = audioRef.current;
        if (info.isHost || !st?.track || !a) return;
        const elapsed = st.playing ? (info.serverNow - info.updatedAt) / 1000 : 0;
        let expected = st.position + elapsed;
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
        if (Number.isFinite(a.duration)) expected = Math.min(expected, Math.max(0, a.duration - 0.2));
        if (Math.abs(a.currentTime - expected) > 1.6 && a.readyState > 0) a.currentTime = expected;
        if (st.playing && a.paused) a.play().catch(() => {});
        if (!st.playing && !a.paused) a.pause();
      } catch {
        /* transient network error */
      }
    };
    tick();
    const id = setInterval(tick, 1200);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [roomCode, toast, setQ, loadTrack]);

  // host pushes on change + heartbeat
  const isHost = room?.isHost ?? false;
  useEffect(() => {
    if (!roomCode || !isHost) return;
    const t = setTimeout(pushRoom, 120);
    return () => clearTimeout(t);
  }, [roomCode, isHost, current?.id, playing, queue, pushRoom]);
  useEffect(() => {
    if (!roomCode || !isHost) return;
    const id = setInterval(pushRoom, 4000);
    return () => clearInterval(id);
  }, [roomCode, isHost, pushRoom]);

  // Wire YouTube audio callbacks
  useEffect(() => {
    youtubeAudio.setCallbacks({
      onPlaying: () => {
        setPlaying(true);
        setLoading(false);
      },
      onPaused: () => {
        setPlaying(false);
      },
      onBuffering: () => {
        setLoading(true);
      },
      onEnded: () => {
        if (lockedRef.current) return;
        void goNext(true);
      },
      onTimeUpdate: (cur, dur) => {
        if (youtubeAudio.isPlaying) {
          setPosition(cur);
          if (dur > 0) setDuration(dur);
          const curTrack = currentRef.current;
          if (!loggedRef.current && curTrack && cur >= 10 && !lockedRef.current) {
            loggedRef.current = true;
            logPlayRef.current(curTrack, Math.round(cur));
          }
        }
      },
      onError: () => {
        setLoading(false);
        setPlaying(false);
      },
    });
  }, [goNext]);

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
      a.volume = typeof volumeRef.current === "number" && !isNaN(volumeRef.current) ? Math.max(0, Math.min(1, volumeRef.current)) : 0.85;
      a.muted = Boolean(mutedRef.current);
      setPlaying(true);
    };
    const onPause = () => setPlaying(false);
    const onTime = () => {
      setPosition(a.currentTime);
      const cur = currentRef.current;
      if (!loggedRef.current && cur && a.currentTime >= 10 && !lockedRef.current) {
        loggedRef.current = true;
        logPlayRef.current(cur, Math.round(a.currentTime));
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
      setDuration(Number.isFinite(a.duration) ? a.duration : 0);
      if (pendingStart.current > 0) {
        a.currentTime = Math.min(pendingStart.current, Math.max(0, a.duration - 0.2));
        pendingStart.current = 0;
      }
    };
    const onCanPlay = () => {
      setLoading(false);
      errorStreak.current = 0;
    };
    const onWaiting = () => setLoading(true);
    const onEnded = () => {
      if (lockedRef.current) return;
      void goNext(true);
    };
    const onError = () => {
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
      const a = audio();
      if (a?.paused) api.current.toggle();
    });
    set("pause", () => {
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
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
