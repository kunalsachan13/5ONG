"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Disc3,
  Download,
  Heart,
  HardDrive,
  House,
  Library,
  ListMusic,
  LogIn,
  LogOut,
  Plus,
  Play,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Users,
  X,
  Link2,
  Keyboard,
  AtSign,
  CheckCircle2,
  AlertCircle,
  Camera,
  Sun,
  Moon,
  Smartphone,
} from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { usePlayer } from "@/components/PlayerProvider";
import { useTheme } from "@/components/ThemeProvider";
import PlayerBar from "@/components/PlayerBar";
import NowPlaying from "@/components/NowPlaying";
import Logo from "@/components/Logo";
import EditAvatarModal from "@/components/EditAvatarModal";
import AndroidSetupModal from "@/components/AndroidSetupModal";
import ThemeToggle from "@/components/ThemeToggle";
import AppRefreshButton from "@/components/AppRefreshButton";
import DownloadAppButton from "@/components/DownloadAppButton";
import AppSplashScreen from "@/components/AppSplashScreen";
import ExitConfirmModal from "@/components/ExitConfirmModal";
import { registerBackHandler, executeBack } from "@/lib/backHandler";
import { parseAndSaveAudioFiles } from "@/lib/localAudio";
import type { Track } from "@/lib/types";

const NAV = [
  { href: "/", label: "Home", Icon: House },
  { href: "/search", label: "Search", Icon: Search },
  { href: "/library", label: "Library", Icon: Library },
  { href: "/library?tab=local", label: "Device Songs", Icon: HardDrive },
  { href: "/import", label: "Import", Icon: Link2 },
  { href: "/rooms", label: "Rooms", Icon: Users },
];

const SHORTCUTS: [string, string][] = [
  ["Space / K", "Play / pause"],
  ["← / →", "Seek −5s / +5s"],
  ["Shift + ← / →", "Previous / next track"],
  ["N / P", "Next / previous"],
  ["↑ / ↓", "Volume up / down"],
  ["M", "Mute"],
  ["S", "Cycle shuffle (off → on → smart)"],
  ["R", "Cycle repeat"],
  ["L", "Like current song"],
  ["Q / Y / E / F", "Queue / lyrics / equalizer / now playing"],
  ["V", "Change visualizer"],
  ["[ / ]", "Lyrics offset −0.1s / +0.1s"],
  ["0 – 9", "Jump to 0% – 90%"],
  ["/", "Focus search"],
  ["F11", "Toggle full-screen (hide title bar)"],
  ["Esc", "Close panels / exit full-screen"],
  ["?", "This help"],
];


function EditUsernameModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { user, setUser, toast } = useApp();
  const [newUsername, setNewUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<{ changesRemaining: number; changesThisMonth: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [avail, setAvail] = useState<{ checked: boolean; available: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      setNewUsername(user.username);
      setError(null);
      setAvail(null);
      fetch("/api/auth/username")
        .then((r) => r.json())
        .then((d) => setInfo(d))
        .catch(() => {});
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (!newUsername || newUsername.toLowerCase() === user?.username.toLowerCase() || newUsername.length < 3) {
      setAvail(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/auth/check-username?username=${encodeURIComponent(newUsername.toLowerCase())}`);
        const data = await res.json();
        setAvail({
          checked: true,
          available: Boolean(data.available),
          message: data.message || data.error || (data.available ? "Username available" : "Username taken"),
        });
      } catch {}
    }, 300);
    return () => clearTimeout(timer);
  }, [newUsername, user]);

  useEffect(() => {
    if (!isOpen) return;
    return registerBackHandler(() => {
      onClose();
      return true;
    });
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const clean = newUsername.trim().toLowerCase();
      const res = await fetch("/api/auth/username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newUsername: clean }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update username");
      setUser(data.user);
      toast(data.message || `Username updated to @${clean}!`);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to update username");
    } finally {
      setBusy(false);
    }
  }

  const remaining = info ? info.changesRemaining : 2;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="card w-full max-w-sm p-5 flex flex-col gap-4 shadow-2xl pop-in">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-extrabold flex items-center gap-2">
            <AtSign size={18} className="text-lilac-deep" /> Change Username
          </h3>
          <button type="button" onClick={onClose} className="rounded-full p-1 hover:bg-lilac/30">
            <X size={16} />
          </button>
        </div>

        <div className="rounded-2xl bg-lilac/20 p-3 text-xs flex flex-col gap-1">
          <p className="font-bold">
            Monthly limit: <span className="text-lilac-deep font-black">{remaining} of 2</span> changes left
          </p>
          <p className="text-muted text-[11px]">
            Users can change their unique username a maximum of 2 times per month. Usernames are automatically converted to lowercase.
          </p>
        </div>

        <form onSubmit={handleSave} className="flex flex-col gap-3">
          <div className="relative">
            <input
              className="input pr-8"
              value={newUsername}
              placeholder="new_username"
              onChange={(e) => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ""))}
              required
              minLength={3}
              maxLength={24}
              disabled={busy || remaining <= 0}
            />
            {avail && (
              <div className="absolute right-3 top-3 text-xs" title={avail.available ? "Username available" : "Username taken"}>
                {avail.available ? (
                  <CheckCircle2 size={16} className="text-emerald-500" />
                ) : (
                  <AlertCircle size={16} className="text-rose-500" />
                )}
              </div>
            )}
          </div>

          {avail && (
            <p className={`text-[11px] font-bold ${avail.available ? "text-emerald-600" : "text-rose-500"}`}>
              {avail.message}
            </p>
          )}

          {error && (
            <p className="rounded-xl bg-pink/50 p-2 text-xs font-bold text-rose-700">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn btn-ghost" disabled={busy}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={busy || remaining <= 0 || (avail && !avail.available) || newUsername.toLowerCase() === user.username.toLowerCase()}
            >
              {busy ? "Saving..." : "Save Username"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UserMenu({ onOpenAndroidSetup }: { onOpenAndroidSetup?: () => void }) {
  const { user, logout, ready, clearDataAndCache } = useApp();
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [editUsernameOpen, setEditUsernameOpen] = useState(false);
  const [editAvatarOpen, setEditAvatarOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    if (!open) return;
    return registerBackHandler(() => {
      setOpen(false);
      return true;
    });
  }, [open]);
  if (!ready) return <div className="h-10 w-10 animate-pulse rounded-full bg-white/60 dark:bg-white/10" />;
  if (!user)
    return (
      <Link href="/login" className="btn btn-primary">
        <LogIn size={16} /> Sign in
      </Link>
    );
  return (
    <div className="relative" ref={ref}>
      <button
        className="flex items-center gap-2 rounded-full bg-white/80 dark:bg-[#201938] border border-ink/5 dark:border-white/10 py-1 pl-1 pr-3 shadow-sm hover:scale-[1.02] active:scale-[0.98] transition"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={user.avatarUrl} alt="" className="h-8 w-8 rounded-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <span className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-lilac to-pink text-sm font-black text-white">
            {user.username[0]?.toUpperCase()}
          </span>
        )}
        <span className="hidden max-w-24 truncate text-sm font-bold sm:block">{user.username}</span>
      </button>
      {open && (
        <div className="pop-in glass absolute right-0 top-12 z-50 w-60 rounded-2xl p-1.5 shadow-xl" role="menu">
          <div className="px-3 py-2 border-b border-ink/5 dark:border-white/10 mb-1">
            <p className="text-sm font-extrabold flex items-center gap-1.5">
              <span>@{user.username}</span>
            </p>
            <p className="truncate text-xs text-muted">{user.email || user.phoneNumber || "5ONG user"}</p>
          </div>
          <button
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-lilac/30 dark:hover:bg-white/10 transition text-left"
            onClick={() => {
              setOpen(false);
              setEditAvatarOpen(true);
            }}
          >
            <Camera size={16} className="text-lilac-deep" /> Change profile photo
          </button>
          <button
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-lilac/30 dark:hover:bg-white/10 transition text-left"
            onClick={() => {
              setOpen(false);
              setEditUsernameOpen(true);
            }}
          >
            <AtSign size={16} /> Edit username
          </button>
          <Link href="/library" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-lilac/30 dark:hover:bg-white/10 transition" onClick={() => setOpen(false)}>
            <Library size={16} /> Your library
          </Link>
          <div className="my-1.5 px-3 py-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-muted mb-1.5 block">Theme</span>
            <div className="grid grid-cols-2 gap-1 rounded-xl bg-ink/5 dark:bg-white/5 p-1 border border-ink/5 dark:border-white/5">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`flex flex-col items-center gap-1 rounded-lg py-1.5 text-xs font-bold transition ${
                  theme === "light"
                    ? "bg-white text-ink shadow-xs"
                    : "text-muted hover:text-ink dark:hover:text-white"
                }`}
                title="Light mode"
              >
                <Sun size={14} className={theme === "light" ? "text-amber-500" : ""} />
                <span className="text-[10px]">Light</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`flex flex-col items-center gap-1 rounded-lg py-1.5 text-xs font-bold transition ${
                  theme === "dark"
                    ? "bg-white/20 text-white shadow-xs"
                    : "text-muted hover:text-ink dark:hover:text-white"
                }`}
                title="Classic Dark mode"
              >
                <Moon size={14} className={theme === "dark" ? "text-butter" : ""} />
                <span className="text-[10px]">Dark</span>
              </button>
            </div>
          </div>
          <div className="my-1 border-t border-ink/5 dark:border-white/10" />
          <button
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-lilac/30 dark:hover:bg-white/10 transition text-left text-ink dark:text-white"
            onClick={() => {
              setOpen(false);
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("open-download-app-modal"));
              }
            }}
          >
            <Download size={16} className="text-lilac-deep dark:text-purple-300" /> Download & Install App
          </button>
          <button
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-lilac/30 dark:hover:bg-white/10 transition text-left text-ink dark:text-white"
            onClick={() => {
              setOpen(false);
              onOpenAndroidSetup?.();
            }}
          >
            <Smartphone size={16} className="text-emerald-500" /> Android Setup & Permissions
          </button>
          <button
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-lilac/30 dark:hover:bg-white/10 transition text-left text-ink dark:text-white"
            onClick={async () => {
              if (window.confirm("Clear listening history, recommendation data, and temporary cache? (Your playlists and local songs will stay safe)")) {
                setOpen(false);
                await clearDataAndCache();
              }
            }}
          >
            <RotateCcw size={16} className="text-lilac-deep dark:text-purple-300" /> Clear data & cache
          </button>
          <button
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition text-left"
            onClick={() => {
              setOpen(false);
              logout();
            }}
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      )}
      <EditUsernameModal isOpen={editUsernameOpen} onClose={() => setEditUsernameOpen(false)} />
      <EditAvatarModal isOpen={editAvatarOpen} onClose={() => setEditAvatarOpen(false)} />
    </div>
  );
}

function SearchBox() {
  const router = useRouter();
  const path = usePathname();
  const { playList } = usePlayer();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [tracks, setTracks] = useState<Track[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (path !== "/search") setQ("");
    setOpen(false);
  }, [path]);

  useEffect(() => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setTracks([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/autocomplete?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          setSuggestions(Array.isArray(data.suggestions) ? data.suggestions : []);
          setTracks(Array.isArray(data.tracks) ? data.tracks : []);
        }
      } catch (_) {}
    }, 200);

    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const handleSelectQuery = (query: string) => {
    setQ(query);
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(query)}`);
  };

  const handlePlayInstant = (track: Track) => {
    setOpen(false);
    playList([track], 0);
  };

  const hasResults = suggestions.length > 0 || tracks.length > 0;

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) {
            setOpen(false);
            router.push(`/search?q=${encodeURIComponent(q.trim())}`);
          }
        }}
      >
        <Search size={16} className="pointer-events-none absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2 text-muted" />
        <input
          id="global-search"
          className="input !rounded-full !py-1.5 sm:!py-2.5 !pl-8.5 sm:!pl-10 !pr-8 sm:!pr-10 text-xs sm:text-sm font-semibold w-full"
          placeholder="Search songs, artists…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          aria-label="Search"
          autoComplete="off"
        />
        {q && (
          <button
            type="button"
            onClick={() => {
              setQ("");
              setOpen(false);
            }}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink dark:hover:text-white transition-colors"
            aria-label="Clear search"
          >
            <X size={16} />
          </button>
        )}
      </form>

      {/* Autocomplete Dropdown */}
      {open && q.trim().length >= 2 && hasResults && (
        <div className="absolute left-0 right-0 top-full mt-2 z-[80] overflow-hidden rounded-2xl bg-white/95 dark:bg-[#17102e]/95 backdrop-blur-xl border border-ink/10 dark:border-white/10 shadow-2xl p-2 animate-in fade-in zoom-in-95 duration-150">
          {/* Instant Songs */}
          {tracks.length > 0 && (
            <div className="mb-2">
              <p className="px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-muted">
                Instant Play
              </p>
              <div className="space-y-1">
                {tracks.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => handlePlayInstant(t)}
                    className="flex w-full items-center gap-2.5 rounded-xl p-1.5 text-left hover:bg-lilac/25 dark:hover:bg-white/10 transition group cursor-pointer"
                  >
                    <img
                      src={t.cover || "/logo.png"}
                      alt={t.title}
                      className="h-10 w-10 shrink-0 rounded-lg object-cover shadow-xs group-hover:scale-105 transition"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-black text-ink dark:text-white group-hover:text-lilac-deep">
                        {t.title}
                      </p>
                      <p className="truncate text-[11px] text-muted">{t.artist}</p>
                    </div>
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-lilac/30 dark:bg-purple-900/40 text-lilac-deep dark:text-purple-300 opacity-0 group-hover:opacity-100 transition shadow-xs">
                      <Play size={12} fill="currentColor" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Query Suggestions */}
          {suggestions.length > 0 && (
            <div>
              {tracks.length > 0 && (
                <div className="my-1 border-t border-ink/5 dark:border-white/10" />
              )}
              <p className="px-2.5 py-1 text-[11px] font-black uppercase tracking-wider text-muted">
                Suggestions
              </p>
              <div className="space-y-0.5">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectQuery(s)}
                    className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left text-xs font-bold text-ink/90 dark:text-white/90 hover:bg-lilac/20 dark:hover:bg-white/10 transition cursor-pointer"
                  >
                    <Search size={14} className="text-muted shrink-0" />
                    <span className="truncate">{s}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Toasts() {
  const { toasts } = useApp();
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[90] flex flex-col items-center gap-2 px-4" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pop-in glass pointer-events-auto max-w-md rounded-full px-4 py-2 text-sm font-bold shadow-lg ${
            t.kind === "err"
              ? "!bg-pink/90 text-rose-950 dark:!bg-rose-950 dark:!text-rose-100 dark:border dark:border-rose-800"
              : "!bg-white/95 text-ink dark:!bg-[#231b3e] dark:!text-white border border-ink/5 dark:border-white/10"
          }`}
        >
          {t.kind === "ok" ? "✓ " : "⚠ "}
          {t.msg}
        </div>
      ))}
    </div>
  );
}

function HelpModal() {
  const { helpOpen, setHelpOpen } = usePlayer();

  useEffect(() => {
    if (!helpOpen) return;
    return registerBackHandler(() => {
      setHelpOpen(false);
      return true;
    });
  }, [helpOpen, setHelpOpen]);

  if (!helpOpen) return null;
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/50 p-4 backdrop-blur-sm" onClick={() => setHelpOpen(false)}>
      <div className="pop-in card max-h-[85vh] w-full max-w-lg overflow-y-auto p-6" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Keyboard shortcuts">
        <div className="mb-4 flex items-center gap-2">
          <Keyboard size={20} />
          <h2 className="text-lg font-black">Keyboard shortcuts</h2>
          <button className="icon-btn ml-auto" aria-label="Close" onClick={() => setHelpOpen(false)}>
            <X size={18} />
          </button>
        </div>
        <dl className="grid gap-1.5">
          {SHORTCUTS.map(([k, d]) => (
            <div key={k} className="flex items-center justify-between gap-4 rounded-xl px-2 py-1.5 odd:bg-lilac/15">
              <dt className="text-sm text-muted">{d}</dt>
              <dd>
                <kbd className="rounded-lg bg-white/80 dark:bg-white/10 px-2 py-1 text-xs font-black shadow-sm text-ink dark:text-white border border-ink/10 dark:border-white/10">{k}</kbd>
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-muted">Hardware media keys, headset buttons and the OS lock-screen controls work too (MediaSession).</p>
      </div>
    </div>
  );
}

function Sidebar({
  isExpanded,
  onMouseEnter,
  onMouseLeave,
}: {
  isExpanded: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const path = usePathname();
  const { playlists, user, likes } = useApp();
  const { setHelpOpen } = usePlayer();
  return (
    <aside
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`hidden shrink-0 flex-col gap-1 p-3.5 md:flex transition-all duration-300 ease-in-out select-none border-r border-white/50 dark:border-white/10 bg-white/25 dark:bg-[#120d24]/60 backdrop-blur-md z-40 app-sidebar ${
        isExpanded ? "w-64" : "w-[76px]"
      }`}
    >
      <div className={`mb-4 flex items-center titlebar-drag ${isExpanded ? "px-2 justify-between" : "justify-center"}`}>
        <div className="titlebar-no-drag">
          <Logo size={36} showText={isExpanded} href="/" />
        </div>
      </div>

      <nav className="flex flex-col gap-1" aria-label="Main">
        {NAV.map(({ href, label, Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={!isExpanded ? label : undefined}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3.5 rounded-2xl py-2.5 text-sm font-extrabold transition-all duration-200 ${
                isExpanded ? "px-3.5" : "justify-center px-0"
              } ${
                active ? "bg-white dark:bg-white/15 shadow-sm text-ink dark:text-white" : "text-muted hover:bg-white/60 dark:hover:bg-white/10 hover:text-ink dark:hover:text-white"
              }`}
            >
              <Icon
                size={20}
                className={active ? "text-lilac-deep shrink-0" : "shrink-0"}
              />
              {isExpanded && <span className="truncate whitespace-nowrap animate-in fade-in duration-200">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Playlists & Library Divider */}
      <div className={`mt-5 flex items-center ${isExpanded ? "justify-between px-3.5" : "justify-center"}`}>
        {isExpanded ? (
          <>
            <span className="text-xs font-black uppercase tracking-wider text-muted">Playlists</span>
            <Link href="/library?new=1" className="icon-btn !h-7 !w-7" aria-label="New playlist" title="New playlist">
              <Plus size={15} />
            </Link>
          </>
        ) : (
          <div className="h-px w-8 bg-ink/10 dark:bg-white/10 my-1" />
        )}
      </div>

      <div className="no-scrollbar flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden">
        <Link
          href="/library"
          title={!isExpanded ? `Liked Songs (${likes.length})` : undefined}
          className={`flex items-center gap-3.5 rounded-xl py-2 text-sm font-bold text-muted hover:bg-white/60 dark:hover:bg-white/10 hover:text-ink dark:hover:text-white transition-all ${
            isExpanded ? "px-3.5" : "justify-center px-0"
          }`}
        >
          <Heart size={18} className="text-pink-deep shrink-0" fill="currentColor" />
          {isExpanded && (
            <>
              <span className="truncate">Liked Songs</span>
              {likes.length > 0 && <span className="ml-auto text-xs font-black">{likes.length}</span>}
            </>
          )}
        </Link>

        {isExpanded &&
          playlists.map((p) => (
            <Link
              key={p.id}
              href={`/playlist/${p.id}`}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-2 text-sm font-bold hover:bg-white/60 dark:hover:bg-white/10 hover:text-ink dark:hover:text-white transition-all ${
                path === `/playlist/${p.id}` ? "bg-white/70 dark:bg-white/15 text-ink dark:text-white" : "text-muted"
              }`}
            >
              <ListMusic size={16} className="shrink-0" />
              <span className="truncate">{p.name}</span>
            </Link>
          ))}

        {!isExpanded && playlists.length > 0 && (
          <Link
            href="/library"
            title="Your Playlists"
            className="flex items-center justify-center rounded-xl py-2 text-muted hover:bg-white/60 dark:hover:bg-white/10 hover:text-ink dark:hover:text-white"
          >
            <ListMusic size={18} className="shrink-0" />
          </Link>
        )}

        {isExpanded && !user && <p className="px-3.5 py-2 text-xs text-muted">Sign in to save playlists and liked songs.</p>}
      </div>

      <div className="mt-2 flex flex-col gap-1 text-xs text-muted">
        <button
          className={`flex items-center gap-2 rounded-xl py-2 font-bold hover:bg-white/60 dark:hover:bg-white/10 hover:text-ink dark:hover:text-white transition-all ${
            isExpanded ? "px-3.5" : "justify-center px-0"
          }`}
          onClick={() => setHelpOpen(true)}
          title={!isExpanded ? "Keyboard shortcuts (?)" : undefined}
        >
          <Keyboard size={18} className="shrink-0" />
          {isExpanded && (
            <>
              <span className="truncate">Shortcuts</span>
              <kbd className="ml-auto rounded bg-white dark:bg-white/15 px-1.5 py-0.5 text-[10px] font-black text-ink dark:text-white">?</kbd>
            </>
          )}
        </button>
        {isExpanded && <InstallButton />}
        {isExpanded && (
          <div className="flex items-center gap-2 px-3.5 pt-1 text-[11px] text-muted">
            <Link href="/privacy" className="hover:underline">Privacy</Link>
            <span>•</span>
            <Link href="/terms" className="hover:underline">Terms</Link>
          </div>
        )}
      </div>
    </aside>
  );
}

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
}
function InstallButton() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  useEffect(() => {
    if (typeof window !== "undefined" && (window as unknown as { __deferredPrompt?: BIPEvent }).__deferredPrompt) {
      setEvt((window as unknown as { __deferredPrompt?: BIPEvent }).__deferredPrompt || null);
    }
    const h = (e: Event) => {
      e.preventDefault();
      (window as unknown as { __deferredPrompt?: Event }).__deferredPrompt = e;
      setEvt(e as BIPEvent);
    };
    const onReady = () => {
      if (typeof window !== "undefined" && (window as unknown as { __deferredPrompt?: BIPEvent }).__deferredPrompt) {
        setEvt((window as unknown as { __deferredPrompt?: BIPEvent }).__deferredPrompt || null);
      }
    };
    window.addEventListener("beforeinstallprompt", h);
    window.addEventListener("app-install-prompt-ready", onReady);
    return () => {
      window.removeEventListener("beforeinstallprompt", h);
      window.removeEventListener("app-install-prompt-ready", onReady);
    };
  }, []);
  if (!evt) return null;
  return (
    <button
      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-mint to-sky dark:from-[#2e1d4d] dark:to-[#1e2a4d] px-3.5 py-2 font-extrabold text-ink dark:text-white border border-transparent dark:border-white/10 shadow-xs"
      onClick={async () => {
        await evt.prompt();
        setEvt(null);
      }}
    >
      <Download size={15} /> Install app (Windows / Android)
    </button>
  );
}

function MobileNav() {
  const path = usePathname();
  const { setPanel, panel } = usePlayer();

  return (
    <nav
      className="mx-2 mb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-around rounded-3xl px-1.5 py-1.5 shadow-2xl bg-white/95 dark:bg-[#120b22]/95 backdrop-blur-2xl border border-black/5 dark:border-white/10 md:hidden"
      aria-label="Main"
    >
      <Link
        href="/"
        onClick={() => setPanel(null)}
        className={`flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1 text-[11px] font-extrabold transition-transform active:scale-95 ${
          path === "/" && !panel ? "bg-white/80 dark:bg-white/15 text-ink dark:text-white shadow-xs" : "text-muted"
        }`}
      >
        <House size={20} className={path === "/" && !panel ? "text-lilac-deep" : ""} />
        Home
      </Link>
      <Link
        href="/library"
        onClick={() => setPanel(null)}
        className={`flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1 text-[11px] font-extrabold transition-transform active:scale-95 ${
          path.startsWith("/library") && !panel ? "bg-white/80 dark:bg-white/15 text-ink dark:text-white shadow-xs" : "text-muted"
        }`}
      >
        <Library size={20} className={path.startsWith("/library") && !panel ? "text-lilac-deep" : ""} />
        Library
      </Link>
      <Link
        href="/rooms"
        onClick={() => setPanel(null)}
        className={`flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1 text-[11px] font-extrabold transition-transform active:scale-95 ${
          path.startsWith("/rooms") && !panel ? "bg-white/80 dark:bg-white/15 text-ink dark:text-white shadow-xs" : "text-muted"
        }`}
      >
        <Users size={20} className={path.startsWith("/rooms") && !panel ? "text-lilac-deep" : ""} />
        Rooms
      </Link>
      <button
        onClick={() => setPanel(panel === "queue" ? null : "queue")}
        className={`flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1 text-[11px] font-extrabold transition-transform active:scale-95 ${
          panel === "queue" ? "bg-white/80 dark:bg-white/15 text-ink dark:text-white shadow-xs" : "text-muted"
        }`}
      >
        <ListMusic size={20} className={panel === "queue" ? "text-lilac-deep" : ""} />
        Queue
      </button>
      <Link
        href="/import"
        onClick={() => setPanel(null)}
        className={`flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1 text-[11px] font-extrabold transition-transform active:scale-95 ${
          path.startsWith("/import") && !panel ? "bg-white/80 dark:bg-white/15 text-ink dark:text-white shadow-xs" : "text-muted"
        }`}
      >
        <Link2 size={20} className={path.startsWith("/import") && !panel ? "text-lilac-deep" : ""} />
        Import
      </Link>
    </nav>
  );
}

export default function Shell({ children }: { children: ReactNode }) {
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showAndroidSetup, setShowAndroidSetup] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { playTrack, panel } = usePlayer();
  const { toast } = useApp();



  // Android back button popstate interception to guarantee exit confirmation popup
  useEffect(() => {
    if (typeof window === "undefined") return;

    if (!window.history.state?.isSongApp) {
      window.history.pushState({ isSongApp: true }, "");
    }

    const onPopState = () => {
      const handled = executeBack();
      if (handled) {
        window.history.pushState({ isSongApp: true }, "");
      } else {
        setShowExitModal(true);
        window.history.pushState({ isSongApp: true }, "");
      }
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // PWA File Handling API: Play local audio files opened from Android File Manager
  useEffect(() => {
    if (typeof window !== "undefined" && "launchQueue" in window) {
      (window as any).launchQueue.setConsumer(async (launchParams: any) => {
        if (!launchParams?.files?.length) return;
        try {
          const files: File[] = [];
          for (const handle of launchParams.files) {
            const file = await handle.getFile();
            files.push(file);
          }
          if (files.length > 0) {
            const tracks = await parseAndSaveAudioFiles(files);
            if (tracks.length > 0) {
              playTrack(tracks[0]);
              toast(`Playing ${tracks[0].title}`, "ok");
            }
          }
        } catch (e) {
          console.warn("Could not handle launched audio file:", e);
        }
      });
    }
  }, [playTrack, toast]);

  useEffect(() => {
    return registerBackHandler(() => {
      if (
        document.activeElement &&
        (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA")
      ) {
        (document.activeElement as HTMLElement).blur();
        return true;
      }

      if (pathname && pathname !== "/") {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
        } else {
          router.push("/");
        }
        return true;
      }

      // Root path reached: Show Android exit confirmation modal!
      setShowExitModal(true);
      return true;
    });
  }, [pathname, router]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return (
    <div className="relative flex h-dvh overflow-hidden">

      <AppSplashScreen />
      <Sidebar
        isExpanded={sidebarHovered}
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
      />
      <div
        className="relative z-10 flex min-w-0 flex-1 flex-col transition-all duration-300"
        onMouseEnter={() => setSidebarHovered(false)}
      >
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 px-3.5 pt-2.5 pb-1.5 sm:px-6 md:px-8 md:py-4 select-none titlebar-drag">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <div className="flex items-center gap-2 titlebar-no-drag shrink-0">
              <Logo className="md:hidden" size={32} />
            </div>
            <div className="flex sm:hidden items-center gap-1.5 shrink-0 titlebar-no-drag">
              <DownloadAppButton />
              <ThemeToggle />
              <UserMenu onOpenAndroidSetup={() => setShowAndroidSetup(true)} />
            </div>
          </div>
          <div className="w-full sm:flex-1 sm:max-w-xl sm:mx-2 min-w-0 titlebar-no-drag">
            <SearchBox />
          </div>
          <div className="hidden sm:flex items-center gap-1.5 sm:gap-2 shrink-0 titlebar-no-drag">
            <DownloadAppButton />
            <AppRefreshButton />
            <ThemeToggle />
            <UserMenu onOpenAndroidSetup={() => setShowAndroidSetup(true)} />
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto px-3.5 pb-56 sm:px-6 md:px-8 md:pb-28">
          {children}
        </main>
      </div>
      <NowPlaying />
      {!panel && (
        <div
          className={`fixed inset-x-0 bottom-0 z-50 transition-[left] duration-300 ease-in-out ${
            sidebarHovered ? "md:left-64" : "md:left-[76px]"
          }`}
        >
          <PlayerBar />
          <MobileNav />
        </div>
      )}
      <HelpModal />
      <ExitConfirmModal
        isOpen={showExitModal}
        onCancel={() => setShowExitModal(false)}
        onConfirmExit={() => {
          setShowExitModal(false);
          if (typeof window !== "undefined") {
            window.close();
            // Fallback for browsers that block window.close():
            window.location.href = "about:blank";
          }
        }}
      />
      <AndroidSetupModal
        forceOpen={showAndroidSetup}
        onClose={() => setShowAndroidSetup(false)}
      />
      <Toasts />
    </div>
  );
}

export { Sparkles, Disc3 };
