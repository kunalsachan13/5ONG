"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Disc3,
  Download,
  Heart,
  House,
  Library,
  ListMusic,
  LogIn,
  LogOut,
  Plus,
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
} from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { usePlayer } from "@/components/PlayerProvider";
import { useTheme } from "@/components/ThemeProvider";
import PlayerBar from "@/components/PlayerBar";
import NowPlaying from "@/components/NowPlaying";
import Logo from "@/components/Logo";
import EditAvatarModal from "@/components/EditAvatarModal";
import ThemeToggle from "@/components/ThemeToggle";
import AppSplashScreen from "@/components/AppSplashScreen";

const NAV = [
  { href: "/", label: "Home", Icon: House },
  { href: "/search", label: "Search", Icon: Search },
  { href: "/library", label: "Library", Icon: Library },
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
  ["Esc", "Close panels"],
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

function UserMenu() {
  const { user, logout, ready } = useApp();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [editUsernameOpen, setEditUsernameOpen] = useState(false);
  const [editAvatarOpen, setEditAvatarOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
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
        <div className="pop-in glass absolute right-0 top-12 z-50 w-56 rounded-2xl p-1.5 shadow-xl" role="menu">
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
          <button
            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm font-semibold hover:bg-lilac/30 dark:hover:bg-white/10 transition text-left"
            onClick={toggleTheme}
          >
            <span className="flex items-center gap-2">
              {resolvedTheme === "dark" ? <Sun size={16} className="text-butter" /> : <Moon size={16} className="text-lilac-deep" />}
              <span>Dark mode</span>
            </span>
            <span className="text-[11px] font-extrabold text-muted uppercase">
              {resolvedTheme === "dark" ? "On" : "Off"}
            </span>
          </button>
          <div className="my-1 border-t border-ink/5 dark:border-white/10" />
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
  const [q, setQ] = useState("");
  useEffect(() => {
    if (path !== "/search") setQ("");
  }, [path]);
  return (
    <form
      className="relative w-full"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
      }}
    >
      <Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
      <input
        id="global-search"
        className="input !rounded-full !py-2 sm:!py-2.5 !pl-10 !pr-10 text-sm font-semibold w-full"
        placeholder="Search songs, artists, albums…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        aria-label="Search"
      />
      {q && (
        <button
          type="button"
          onClick={() => setQ("")}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink dark:hover:text-white transition-colors"
          aria-label="Clear search"
        >
          <X size={16} />
        </button>
      )}
    </form>
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
      className={`hidden shrink-0 flex-col gap-1 p-3.5 md:flex transition-all duration-300 ease-in-out select-none border-r border-white/50 dark:border-white/10 bg-white/25 dark:bg-[#120d24]/60 backdrop-blur-md z-40 ${
        isExpanded ? "w-64" : "w-[76px]"
      }`}
    >
      <div className={`mb-4 flex items-center ${isExpanded ? "px-2 justify-between" : "justify-center"}`}>
        <Logo size={36} showText={isExpanded} href="/" />
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
              <Icon size={20} className={active ? "text-lilac-deep shrink-0" : "shrink-0"} />
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
    const h = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
    };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
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
  const items = [...NAV.slice(0, 3), NAV[4]];
  const { setPanel, panel } = usePlayer();
  return (
    <nav
      className="glass mx-2 mb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-around rounded-3xl px-1.5 py-1.5 shadow-lg shadow-lilac/15 md:hidden"
      aria-label="Main"
    >
      {items.map(({ href, label, Icon }) => {
        const active = href === "/" ? path === "/" : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setPanel(null)}
            className={`flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1 text-[11px] font-extrabold transition-transform active:scale-95 ${
              active && !panel ? "bg-white/80 dark:bg-white/15 text-ink dark:text-white shadow-xs" : "text-muted"
            }`}
          >
            <Icon size={20} className={active && !panel ? "text-lilac-deep" : ""} />
            {label}
          </Link>
        );
      })}
      <button
        className={`flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-1 text-[11px] font-extrabold transition-transform active:scale-95 ${
          panel === "eq" ? "bg-white/80 dark:bg-white/15 text-ink dark:text-white shadow-xs" : "text-muted"
        }`}
        onClick={() => setPanel(panel === "eq" ? null : "eq")}
      >
        <SlidersHorizontal size={20} className={panel === "eq" ? "text-lilac-deep" : ""} />
        EQ
      </button>
    </nav>
  );
}

export default function Shell({ children }: { children: ReactNode }) {
  const [sidebarHovered, setSidebarHovered] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return (
    <div className="flex h-dvh overflow-hidden">
      <AppSplashScreen />
      <Sidebar
        isExpanded={sidebarHovered}
        onMouseEnter={() => setSidebarHovered(true)}
        onMouseLeave={() => setSidebarHovered(false)}
      />
      <div
        className="flex min-w-0 flex-1 flex-col transition-all duration-300"
        onMouseEnter={() => setSidebarHovered(false)}
      >
        <header className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2.5 sm:flex-nowrap sm:gap-4 sm:px-6 md:px-8 md:py-4">
          <div className="flex items-center gap-2">
            <Logo className="md:hidden" size={32} />
          </div>
          <div className="order-3 w-full sm:order-2 sm:flex-1 sm:max-w-md min-w-0">
            <SearchBox />
          </div>
          <div className="order-2 sm:order-3 flex items-center gap-2 shrink-0">
            <ThemeToggle />
            <UserMenu />
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto px-3.5 pb-44 sm:px-6 md:px-8 md:pb-28">
          {children}
        </main>
      </div>
      <NowPlaying />
      <div
        className={`fixed inset-x-0 bottom-0 z-50 transition-[left] duration-300 ease-in-out ${
          sidebarHovered ? "md:left-64" : "md:left-[76px]"
        }`}
      >
        <PlayerBar />
        <MobileNav />
      </div>
      <HelpModal />
      <Toasts />
    </div>
  );
}

export { Sparkles, Disc3 };
