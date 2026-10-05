"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Check,
  Copy,
  Crown,
  ListMusic,
  LogOut,
  MessageSquare,
  MicVocal,
  RotateCcw,
  Radio,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { usePlayer } from "@/components/PlayerProvider";
import { useTheme } from "@/components/ThemeProvider";
import { Cover, EmptyState, Slider, Spinner } from "@/components/ui";
import { EQ_BANDS, EQ_PRESETS, fmtHz, fmtTime } from "@/lib/eq";
import type { LyricsResult } from "@/lib/types";

import type { TrackTheme } from "@/lib/colorExtractor";

/* ---------------------------------- Lyrics ---------------------------------- */
export function LyricsPanel({ theme: propTheme }: { theme?: TrackTheme } = {}) {
  const { current, position, seek, playing } = usePlayer();
  const theme = propTheme;
  const [data, setData] = useState<LyricsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const id = current?.id;

  useEffect(() => {
    if (!current) return;
    let alive = true;
    setLoading(true);
    setData(null);
    const q = new URLSearchParams({
      title: current.title,
      artist: current.artist,
      album: current.album ?? "",
      duration: String(current.duration),
    });
    fetch(`/api/lyrics?${q}`)
      .then((r) => r.json())
      .then((j) => alive && setData(j))
      .catch(() => alive && setData({ synced: null, plain: null }))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const clock = position;
  const active = useMemo(() => {
    const s = data?.synced;
    if (!s?.length) return -1;
    let lo = 0;
    let hi = s.length - 1;
    let ans = -1;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      if (s[mid].t <= clock) {
        ans = mid;
        lo = mid + 1;
      } else hi = mid - 1;
    }
    return ans;
  }, [data, clock]);

  useEffect(() => {
    const el = lineRefs.current[active];
    const box = boxRef.current;
    if (el && box) {
      box.scrollTo({ top: el.offsetTop - box.clientHeight / 2 + el.clientHeight / 2, behavior: "smooth" });
    }
  }, [active]);

  if (!current) return <EmptyState icon={<MicVocal />} title="No song playing">Play something to see its lyrics here.</EmptyState>;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">

      {/* Main Lyrics Area */}
      <div ref={boxRef} className="no-scrollbar relative min-h-0 flex-1 overflow-y-auto rounded-3xl px-2 py-6 text-center">
        {loading && (
          <div className="grid h-full place-items-center">
            <Spinner size={28} />
          </div>
        )}
        {!loading && data?.instrumental && (
          <p className="grid h-full place-items-center text-lg font-bold text-white/60">♪ Instrumental ♪</p>
        )}
        {!loading && data?.synced && data.synced.length > 0 && (
          <div className="mx-auto flex max-w-2xl flex-col gap-2.5 py-[30vh]">
            {data.synced.map((l, i) => {
              const dist = Math.abs(i - active);
              const isActive = i === active;
              return (
                <button
                  key={i}
                  ref={(el) => {
                    lineRefs.current[i] = el;
                  }}
                  title="Jump to this line"
                  onClick={() => seek(l.t)}
                  className={`lyric-line rounded-2xl px-3 py-1.5 text-center font-extrabold leading-snug transition-all duration-300 ${
                    isActive
                      ? "scale-105 text-2xl sm:text-3xl md:text-4xl drop-shadow-md"
                      : "text-lg sm:text-xl md:text-2xl hover:text-white"
                  }`}
                  style={{
                    color: isActive ? (theme?.accent || "#cdb8ff") : "rgba(255, 255, 255, 0.55)",
                    opacity: isActive ? 1 : Math.max(0.18, 0.65 - dist * 0.12),
                    filter: isActive ? "none" : `blur(${Math.min(2, dist * 0.35)}px)`,
                    textShadow: isActive && theme ? `0 0 24px ${theme.glow}, 0 2px 10px rgba(0,0,0,0.7)` : "none",
                  }}
                >
                  {l.text || "♪"}
                </button>
              );
            })}
          </div>
        )}
        {!loading && !data?.synced && data?.plain && (
          <pre
            className="mx-auto max-w-2xl whitespace-pre-wrap font-sans text-lg font-bold leading-relaxed"
            style={{ color: "rgba(255, 255, 255, 0.85)" }}
          >
            {data.plain}
          </pre>
        )}
        {!loading && data && !data.synced && !data.plain && !data.instrumental && (
          <EmptyState icon={<MicVocal />} title="No lyrics found">We couldn’t find lyrics for this track.</EmptyState>
        )}
      </div>
    </div>
  );
}

/* --------------------------------- Equalizer --------------------------------- */
export function EqualizerPanel({ theme: propTheme }: { theme?: TrackTheme } = {}) {
  const { eq, setEq, setEqBand, applyPreset } = usePlayer();
  const theme = propTheme;

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl flex-col gap-4 overflow-y-auto">
      <div
        className="card flex flex-wrap items-center gap-3 p-4 transition-colors duration-500"
        style={theme ? { borderColor: `${theme.primary}35` } : undefined}
      >
        <div>
          <h3 className="font-extrabold" style={{ color: theme?.accent }}>10-band equalizer</h3>
          <p className="text-xs text-muted">Live Web Audio filters — changes apply instantly.</p>
        </div>
        <button
          className={`btn ml-auto ${eq.enabled ? "btn-primary" : "btn-soft"}`}
          style={eq.enabled && theme ? { background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})`, color: "#fff" } : undefined}
          aria-pressed={eq.enabled}
          onClick={() => setEq({ enabled: !eq.enabled })}
        >
          {eq.enabled ? "EQ on" : "EQ off"}
        </button>
        <button className="btn btn-soft" onClick={() => applyPreset("Flat")}>
          <RotateCcw size={14} /> Reset
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {Object.keys(EQ_PRESETS).map((name) => {
          const isActive = eq.preset === name;
          return (
            <button
              key={name}
              className={`btn !py-1.5 !text-xs ${isActive ? "btn-primary" : "btn-soft"}`}
              style={isActive && theme ? { background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})`, color: "#fff", borderColor: "transparent" } : undefined}
              onClick={() => applyPreset(name)}
            >
              {name}
            </button>
          );
        })}
        {eq.preset === "Custom" && (
          <span
            className="btn !py-1.5 !text-xs font-bold"
            style={theme ? { background: theme.accent, color: "#0c0918" } : undefined}
          >
            Custom
          </span>
        )}
      </div>

      <div
        className={`card p-4 transition-all duration-500 ${eq.enabled ? "" : "opacity-50"}`}
        style={theme ? { borderColor: `${theme.primary}35` } : undefined}
      >
        <div className="flex items-end justify-between gap-1 sm:gap-3">
          {EQ_BANDS.map((f, i) => (
            <div key={f} className="flex flex-1 flex-col items-center gap-2">
              <span
                className="text-[11px] font-black tabular-nums transition-colors duration-500"
                style={{ color: theme?.accent || undefined }}
              >
                {eq.gains[i] > 0 ? "+" : ""}
                {eq.gains[i].toFixed(0)}
              </span>
              <div className="relative h-40 w-8">
                <Slider
                  label={`${fmtHz(f)} Hz gain`}
                  value={eq.gains[i]}
                  min={-12}
                  max={12}
                  step={0.5}
                  onChange={(v) => setEqBand(i, v)}
                  className="absolute left-1/2 top-1/2 !w-40 origin-center -translate-x-1/2 -translate-y-1/2 -rotate-90"
                />
              </div>
              <span className="text-[11px] font-bold text-muted">{fmtHz(f)}</span>
            </div>
          ))}
        </div>
        <div
          className="mt-5 flex items-center gap-3 border-t pt-4 transition-colors duration-500"
          style={{ borderColor: theme ? `${theme.primary}30` : undefined }}
        >
          <span className="w-16 text-xs font-extrabold uppercase tracking-wide text-muted">Preamp</span>
          <Slider label="Preamp" value={eq.preamp} min={-12} max={12} step={0.5} onChange={(v) => setEq({ preamp: v })} />
          <span
            className="w-14 text-right text-sm font-black tabular-nums transition-colors duration-500"
            style={{ color: theme?.accent || undefined }}
          >
            {eq.preamp > 0 ? "+" : ""}
            {eq.preamp.toFixed(1)} dB
          </span>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------------- Queue ----------------------------------- */
export function QueuePanel({ theme: propTheme }: { theme?: TrackTheme } = {}) {
  const p = usePlayer();
  const theme = propTheme;

  return (
    <div className="mx-auto flex h-full w-full max-w-3xl min-h-0 flex-col gap-3">
      <div
        className="card flex flex-wrap items-center gap-2 p-3 transition-colors duration-500"
        style={theme ? { borderColor: `${theme.primary}35` } : undefined}
      >
        <div className="mr-auto">
          <h3 className="font-extrabold" style={{ color: theme?.accent }}>Up next</h3>
          <p className="text-xs text-muted">
            {p.queue.length} track{p.queue.length === 1 ? "" : "s"} · shuffle: {p.shuffle === "smart" ? "smart (AI)" : p.shuffle}
          </p>
        </div>
        <button
          className={`btn !py-1.5 !text-xs ${p.radio ? "btn-primary" : "btn-soft"}`}
          style={p.radio && theme ? { background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})`, color: "#fff" } : undefined}
          aria-pressed={p.radio}
          onClick={() => p.setRadio(!p.radio)}
          title="Keep the music going with similar tracks when the queue runs low"
        >
          <Radio size={14} /> Smart autoplay {p.radio ? "on" : "off"}
        </button>
        <button className="btn btn-soft !py-1.5 !text-xs" onClick={p.smartReshuffle} disabled={p.queue.length < 3}>
          <Sparkles size={14} /> Smart shuffle
        </button>
        <button className="btn btn-soft !py-1.5 !text-xs" onClick={p.clearQueue} disabled={p.queue.length < 2}>
          <Trash2 size={14} /> Clear
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {p.queue.length === 0 ? (
          <EmptyState icon={<ListMusic />} title="Your queue is empty">Play a song or add tracks with “Add to queue”.</EmptyState>
        ) : (
          p.queue.map((t, i) => {
            const cur = i === p.index;
            return (
              <div
                key={t.id + ":" + i}
                className={`group flex items-center gap-3 rounded-2xl px-2.5 py-2 transition-all ${
                  cur
                    ? "border shadow-xs"
                    : i < p.index
                    ? "opacity-55 hover:opacity-100"
                    : "hover:bg-white/70 dark:hover:bg-white/10"
                }`}
                style={
                  cur
                    ? {
                        backgroundColor: theme ? `${theme.primary}25` : "rgba(205, 184, 255, 0.35)",
                        borderColor: theme ? `${theme.accent}60` : "rgba(205, 184, 255, 0.5)",
                      }
                    : undefined
                }
              >
                <button className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={() => p.jumpTo(i)}>
                  <Cover src={t.cover} size={42} />
                  <span className="min-w-0">
                    <span
                      className="block truncate text-sm font-bold transition-colors"
                      style={{ color: cur && theme ? theme.accent : undefined }}
                    >
                      {t.title}
                    </span>
                    <span className="block truncate text-xs text-muted">{t.artist}</span>
                  </span>
                </button>
                <span className="hidden text-xs tabular-nums text-muted sm:block">{fmtTime(t.duration)}</span>
                <button className="icon-btn" aria-label="Move up" onClick={() => p.moveInQueue(i, -1)} disabled={i === 0}>
                  <ArrowUp size={16} />
                </button>
                <button className="icon-btn" aria-label="Move down" onClick={() => p.moveInQueue(i, 1)} disabled={i === p.queue.length - 1}>
                  <ArrowDown size={16} />
                </button>
                <button className="icon-btn" aria-label="Remove from queue" onClick={() => p.removeFromQueue(i)} disabled={cur}>
                  <X size={16} />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ------------------------------------ Room ------------------------------------ */
export function RoomPanel({ initialCode, theme: propTheme }: { initialCode?: string; theme?: TrackTheme } = {}) {
  const p = usePlayer();
  const theme = propTheme;
  const { user, toast } = useApp();
  const [code, setCode] = useState(initialCode ?? "");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const [chatDraft, setChatDraft] = useState("");
  const [sendingChat, setSendingChat] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const tried = useRef(false);

  const room = p.room;

  useEffect(() => {
    if (initialCode && user && !p.roomCode && !tried.current) {
      tried.current = true;
      void p.joinRoom(initialCode);
    }
  }, [initialCode, user, p]);

  // Fetch chat immediately on mount or roomCode change
  useEffect(() => {
    if (!p.roomCode) return;
    let alive = true;
    fetch(`/api/rooms/${p.roomCode}/chat`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d?.messages) {
          p.setRoom((prev) => (prev ? { ...prev, messages: d.messages } : prev));
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [p.roomCode, p.setRoom]);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [room?.messages?.length]);

  const copy = async (what: "code" | "link") => {
    if (!p.roomCode) return;
    const text = what === "code" ? p.roomCode : `${window.location.origin}/rooms?code=${p.roomCode}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      /* ignore */
    }
  };

  async function handleSendChat(e: React.FormEvent) {
    e.preventDefault();
    const text = chatDraft.trim();
    if (!text || !p.roomCode || sendingChat) return;
    setChatDraft("");
    setSendingChat(true);

    // Optimistically show message
    if (user && p.room) {
      const optimisticMsg = {
        id: `opt-${Date.now()}`,
        userId: user.id,
        userName: user.username,
        userAvatar: user.avatarUrl || null,
        text,
        timestamp: Date.now(),
      };
      p.setRoom((prev) =>
        prev
          ? {
              ...prev,
              messages: [...(prev.messages || []), optimisticMsg],
            }
          : prev
      );
    }

    try {
      const res = await fetch(`/api/rooms/${p.roomCode}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.messages) {
          p.setRoom((prev) => (prev ? { ...prev, messages: data.messages } : prev));
        }
      } else {
        const err = await res.json().catch(() => ({}));
        toast(err.error || "Failed to send message", "err");
      }
    } catch {
      toast("Couldn't send message, network error", "err");
    } finally {
      setSendingChat(false);
    }
  }

  if (!user) {
    return (
      <EmptyState icon={<Users />} title="Listen together">
        <a className="font-bold underline" style={{ color: theme?.accent }} href="/login">Sign in</a> to host or join a synchronized listening room.
      </EmptyState>
    );
  }

  if (!p.roomCode) {
    return (
      <div className="grid w-full gap-4 transition-all duration-300 md:grid-cols-2">
        <div className="card flex flex-col gap-3 p-6" style={theme ? { borderColor: `${theme.primary}35` } : undefined}>
          <div
            className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-lilac to-pink"
            style={theme ? { background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})`, color: "#fff" } : undefined}
          >
            <Crown size={22} />
          </div>
          <h3 className="text-lg font-extrabold" style={{ color: theme?.accent }}>Host a room</h3>
          <p className="text-sm text-muted">Start a room, share the invite code, and everyone hears what you play — in sync.</p>
          <button
            className="btn btn-primary mt-auto"
            style={theme ? { background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})`, color: theme.buttonText } : undefined}
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await p.createRoom();
              setBusy(false);
            }}
          >
            Create room
          </button>
        </div>
        <form
          className="card flex flex-col gap-3 p-6"
          style={theme ? { borderColor: `${theme.primary}35` } : undefined}
          onSubmit={async (e) => {
            e.preventDefault();
            if (code.trim().length < 4) return;
            setBusy(true);
            await p.joinRoom(code.trim());
            setBusy(false);
          }}
        >
          <div
            className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-mint to-sky"
            style={theme ? { background: `linear-gradient(135deg, ${theme.accent}, ${theme.glow})`, color: "#0c0918" } : undefined}
          >
            <Users size={22} />
          </div>
          <h3 className="text-lg font-extrabold" style={{ color: theme?.accent }}>Join with a code</h3>
          <input
            className="input text-center font-mono text-2xl font-black uppercase tracking-[0.35em]"
            placeholder="ABC123"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
            aria-label="Invite code"
          />
          <button
            className="btn btn-primary mt-auto"
            style={theme ? { background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})`, color: theme.buttonText } : undefined}
            disabled={busy || code.length < 4}
          >
            Join room
          </button>
        </form>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="card flex flex-col items-center justify-center gap-3 p-12 text-center" style={theme ? { borderColor: `${theme.primary}35` } : undefined}>
        <Spinner size={32} />
        <p className="text-sm font-bold text-muted">Connecting to room {p.roomCode}…</p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col gap-4 transition-all duration-300">
      <div className="card flex flex-col items-center gap-3 p-6 text-center" style={theme ? { borderColor: `${theme.primary}35` } : undefined}>
        <span
          className="flex items-center gap-2 rounded-full px-3 py-1 text-xs font-black border"
          style={
            theme
              ? { backgroundColor: `${theme.primary}25`, color: theme.accent, borderColor: `${theme.accent}60` }
              : { backgroundColor: "var(--color-mint)", color: "var(--color-ink)" }
          }
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          LIVE · {room?.isHost ? "You’re the host" : `Hosted by ${room?.hostName ?? "…"}`}
        </span>
        <p className="font-mono text-5xl font-black tracking-[0.3em] transition-colors duration-500" style={{ color: theme?.accent }}>
          {p.roomCode}
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <button className="btn btn-soft" onClick={() => copy("code")}>
            {copied === "code" ? <Check size={14} /> : <Copy size={14} />} Copy code
          </button>
          <button className="btn btn-soft" onClick={() => copy("link")}>
            {copied === "link" ? <Check size={14} /> : <Copy size={14} />} Copy invite link
          </button>
          {room?.isHost ? (
            <>
              <button
                className="btn btn-soft text-ink dark:text-white"
                onClick={p.leaveRoom}
                title="Leave room (Host role will be assigned to a random listener)"
              >
                <LogOut size={14} /> Leave room
              </button>
              <button
                className="btn !bg-rose-500 hover:!bg-rose-600 !text-white shadow-xs"
                onClick={p.endRoom}
                title="End room for everyone and delete chat"
              >
                <Trash2 size={14} /> End room
              </button>
            </>
          ) : (
            <button className="btn btn-primary" onClick={p.leaveRoom}>
              <LogOut size={14} /> Leave
            </button>
          )}
        </div>
        <p className="max-w-md text-xs text-muted">
          {room?.isHost
            ? "Play, pause, seek and skip — everyone follows you. If you leave, another listener randomly becomes host. Click 'End room' to delete room & chats."
            : "Playback follows the host. Volume and EQ stay yours. Leaving keeps the chat safe for remaining listeners."}
        </p>
      </div>

      {/* Listening Now with Avatars */}
      <div className="card p-4">
        <h4 className="mb-3 flex items-center gap-2 text-sm font-extrabold">
          <Users size={16} /> Listening now ({room?.members.length ?? 1})
        </h4>
        <div className="flex flex-wrap gap-2.5">
          {(room?.members ?? []).map((m, idx) => {
            const isMe = user && String(user.id) === String(m?.userId);
            const isHost = m?.userId === room?.hostId;
            const displayName = m?.name || (isMe ? (user.username || "You") : "Guest");
            const initial = (displayName[0] || "U").toUpperCase();
            return (
              <span
                key={m?.userId ?? idx}
                className="flex items-center gap-2 rounded-full bg-white dark:bg-white/10 pl-1.5 pr-3 py-1 text-sm font-bold shadow-xs text-ink dark:text-white border border-ink/5 dark:border-white/10"
              >
                {m?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.avatarUrl}
                    alt={displayName}
                    className="h-7 w-7 rounded-full object-cover ring-2 ring-lilac-deep/30"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-lilac to-pink text-xs font-black text-white">
                    {initial}
                  </span>
                )}
                <span className="truncate max-w-[120px]">{displayName}</span>
                {isHost && (
                  <span title="Host">
                    <Crown size={13} className="text-amber-500 fill-current shrink-0" />
                  </span>
                )}
                {isMe && !isHost && (
                  <span className="rounded-full bg-lilac/30 dark:bg-white/15 px-1.5 py-0.2 text-[10px] font-black text-lilac-deep dark:text-white">
                    You
                  </span>
                )}
                {room?.isHost && !isMe && !isHost && (
                  <button
                    onClick={() => p.transferHost(m.userId)}
                    title={`Transfer host to ${displayName}`}
                    className="ml-1 flex items-center gap-1 rounded-full bg-lilac/30 hover:bg-lilac/60 dark:bg-white/15 dark:hover:bg-white/25 px-2 py-0.5 text-[10px] font-black text-lilac-deep dark:text-amber-300 transition-all cursor-pointer"
                  >
                    <Crown size={10} /> Make host
                  </button>
                )}
              </span>
            );
          })}
        </div>
      </div>

      {/* Ephemeral Room Chat */}
      <div className="card flex flex-col overflow-hidden border border-ink/5 dark:border-white/10 shadow-sm">
        {/* Chat Header */}
        <div className="flex items-center justify-between border-b border-ink/5 dark:border-white/10 px-4 py-3 bg-white/40 dark:bg-white/5">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-lilac/30 dark:bg-white/10 text-lilac-deep">
              <MessageSquare size={16} />
            </div>
            <div>
              <h4 className="text-sm font-extrabold leading-none">Room Chat</h4>
              <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-muted">
                <ShieldCheck size={12} className="text-emerald-500" /> Temporary · Auto-deleted only when host ends room
              </p>
            </div>
          </div>
          <span className="rounded-full bg-lilac/20 dark:bg-white/10 px-2.5 py-0.5 text-[11px] font-black text-lilac-deep dark:text-white">
            {room?.messages?.length ?? 0} messages
          </span>
        </div>

        {/* Messages Stream */}
        <div
          ref={chatScrollRef}
          className="flex flex-col gap-3 p-4 overflow-y-auto max-h-72 min-h-[160px]"
        >
          {(!room?.messages || room.messages.length === 0) ? (
            <div className="m-auto flex flex-col items-center justify-center py-6 text-center text-muted">
              <MessageSquare size={28} className="mb-2 opacity-30 text-lilac-deep" />
              <p className="text-xs font-bold">No messages yet</p>
              <p className="text-[11px]">Chat with everyone in the room! Messages are private & temporary.</p>
            </div>
          ) : (
            (room?.messages ?? []).map((msg, idx) => {
              if (msg?.userId === "system" || msg?.userName === "System") {
                return (
                  <div key={msg?.id ?? idx} className="my-1 flex justify-center">
                    <span
                      className="rounded-full px-3 py-1 text-[11px] font-bold border shadow-xs text-center max-w-[90%]"
                      style={
                        theme
                          ? { backgroundColor: `${theme.primary}25`, color: theme.accent, borderColor: `${theme.accent}40` }
                          : undefined
                      }
                    >
                      {msg.text}
                    </span>
                  </div>
                );
              }
              const isMe = user && String(user.id) === String(msg?.userId);
              const isMsgHost = msg?.userId === room.hostId;
              const senderName = msg?.userName || (isMe ? (user?.username || "You") : "Guest");
              const initial = (senderName[0] || "U").toUpperCase();
              let time = "";
              try {
                if (msg?.timestamp) {
                  time = new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                }
              } catch {}
              return (
                <div
                  key={msg?.id ?? idx}
                  className={`flex items-start gap-2.5 ${isMe ? "flex-row-reverse" : "flex-row"}`}
                >
                  {msg?.userAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={msg.userAvatar}
                      alt={senderName}
                      className="h-7 w-7 shrink-0 rounded-full object-cover ring-1 ring-white/20 mt-0.5"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-black text-white mt-0.5"
                      style={
                        theme
                          ? { background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})` }
                          : { background: "linear-gradient(135deg, #cdb8ff, #ffc4dd)" }
                      }
                    >
                      {initial}
                    </span>
                  )}
                  <div className={`flex flex-col max-w-[80%] ${isMe ? "items-end" : "items-start"}`}>
                    <div className="flex items-center gap-1.5 mb-0.5 text-[11px] text-muted">
                      <span className="font-extrabold text-ink dark:text-white/90">
                        {isMe ? "You" : senderName}
                      </span>
                      {isMsgHost && (
                        <span title="Host">
                          <Crown size={11} className="text-amber-500 fill-current" />
                        </span>
                      )}
                      {time && (
                        <>
                          <span>·</span>
                          <span className="text-[10px]">{time}</span>
                        </>
                      )}
                    </div>
                    <div
                      className={`rounded-2xl px-3.5 py-2 text-sm font-semibold break-words leading-relaxed ${
                        isMe
                          ? "rounded-tr-xs shadow-xs text-white"
                          : "bg-white dark:bg-white/10 text-ink dark:text-white rounded-tl-xs border border-ink/5 dark:border-white/10 shadow-xs"
                      }`}
                      style={
                        isMe
                          ? { backgroundColor: theme?.primary || "var(--color-lilac-deep)", color: theme?.buttonText || "#ffffff" }
                          : undefined
                      }
                    >
                      {msg.text}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Chat Input Form */}
        <form onSubmit={handleSendChat} className="flex items-center gap-2 border-t border-ink/5 dark:border-white/10 p-2.5 bg-white/30 dark:bg-white/5">
          <input
            className="input !rounded-full !py-2 !px-4 text-xs font-semibold flex-1"
            placeholder="Type a message to the room…"
            value={chatDraft}
            onChange={(e) => setChatDraft(e.target.value)}
            maxLength={300}
          />
          <button
            type="submit"
            disabled={!chatDraft.trim() || sendingChat}
            className="btn btn-primary !rounded-full !p-2 shrink-0 aspect-square"
            style={
              theme
                ? { background: `linear-gradient(135deg, ${theme.primary}, ${theme.accent})`, color: theme.buttonText }
                : undefined
            }
            aria-label="Send message"
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}
