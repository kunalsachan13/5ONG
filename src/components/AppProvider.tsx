"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { PlaylistSummary, PublicUser, Track } from "@/lib/types";

export type HistoryTrack = Track & { playedAt?: string };

interface Providers {
  google: boolean;
  emailDelivery: boolean;
}

interface AppCtx {
  user: PublicUser | null;
  ready: boolean;
  providers: Providers;
  setUser: (u: PublicUser | null) => void;
  logout: () => Promise<void>;
  likes: Track[];
  likedIds: Set<string>;
  history: HistoryTrack[];
  playlists: PlaylistSummary[];
  refreshLibrary: () => Promise<void>;
  toggleLike: (t: Track) => Promise<void>;
  createPlaylist: (name: string, tracks?: Track[]) => Promise<PlaylistSummary | null>;
  addToPlaylist: (playlistId: number | string, tracks: Track[]) => Promise<void>;
  logPlay: (t: Track, seconds: number) => void;
  toast: (msg: string, kind?: "ok" | "err") => void;
  toasts: { id: number; msg: string; kind: "ok" | "err" }[];
}

const Ctx = createContext<AppCtx | null>(null);

export function useApp() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp outside provider");
  return c;
}

const getStorageKey = (key: string, uid?: string | number | null) =>
  uid ? `5ong.${uid}.${key}.v2` : `5ong.guest.${key}.v2`;

export default function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [ready, setReady] = useState(false);
  const [providers, setProviders] = useState<Providers>({ google: true, emailDelivery: false });
  const [likes, setLikes] = useState<Track[]>([]);
  const [history, setHistory] = useState<HistoryTrack[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistSummary[]>([]);
  const [toasts, setToasts] = useState<AppCtx["toasts"]>([]);
  const toastId = useRef(0);

  const toast = useCallback((msg: string, kind: "ok" | "err" = "ok") => {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-3), { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const refreshLibrary = useCallback(async () => {
    try {
      const r = await fetch("/api/library", { cache: "no-store" });
      if (r.ok) {
        const j = await r.json();
        setLikes(j.likes ?? []);
        setHistory(j.history ?? []);
        setPlaylists(j.playlists ?? []);
        try {
          if (user?.id) {
            localStorage.setItem(getStorageKey("likes", user.id), JSON.stringify(j.likes ?? []));
            localStorage.setItem(getStorageKey("history", user.id), JSON.stringify(j.history ?? []));
            localStorage.setItem(getStorageKey("playlists", user.id), JSON.stringify(j.playlists ?? []));
          }
        } catch (_) {}
      }
    } catch {
      /* offline or network error: use local storage */
    }
  }, [user]);

  // Load user session on mount
  useEffect(() => {
    let alive = true;
    fetch("/api/auth/me", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        setUser(j.user);
        setProviders(j.providers);
        setReady(true);
      })
      .catch(() => alive && setReady(true));
    return () => {
      alive = false;
    };
  }, []);

  // Sync library when user state initializes or changes
  useEffect(() => {
    const uid = user?.id;
    try {
      const storedLikes = localStorage.getItem(getStorageKey("likes", uid));
      if (storedLikes) setLikes(JSON.parse(storedLikes));
      else if (!uid) setLikes([]);

      const storedHist = localStorage.getItem(getStorageKey("history", uid));
      if (storedHist) setHistory(JSON.parse(storedHist));
      else if (!uid) setHistory([]);

      const storedPl = localStorage.getItem(getStorageKey("playlists", uid));
      if (storedPl) setPlaylists(JSON.parse(storedPl));
      else if (!uid) setPlaylists([]);
    } catch (_) {}

    if (user) {
      void refreshLibrary();
    }
  }, [user, refreshLibrary]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setLikes([]);
    setHistory([]);
    setPlaylists([]);
    toast("Signed out");
  }, [toast]);

  const likedIds = useMemo(() => new Set(likes.map((l) => l.id)), [likes]);

  const toggleLike = useCallback(
    async (t: Track) => {
      const was = likedIds.has(t.id);
      const nextLikes = was ? likes.filter((x) => x.id !== t.id) : [t, ...likes];
      setLikes(nextLikes);
      try {
        localStorage.setItem(getStorageKey("likes", user?.id), JSON.stringify(nextLikes));
      } catch (_) {}

      if (!was) {
        try {
          const confetti = (await import("canvas-confetti")).default;
          confetti({ particleCount: 35, spread: 50, origin: { y: 0.9 } });
        } catch (_) {}
      }

      if (!user) {
        toast(was ? "Removed from Liked Songs" : "Added to Liked Songs (saved locally)");
        return;
      }

      const r = await fetch("/api/likes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ track: t }),
      });
      if (!r.ok) {
        refreshLibrary();
        toast("Couldn't update liked songs on server", "err");
      } else {
        toast(was ? "Removed from Liked Songs" : "Added to Liked Songs");
      }
    },
    [user, likedIds, likes, toast, refreshLibrary],
  );

  const createPlaylist = useCallback(
    async (name: string, tracks: Track[] = []) => {
      if (!user) {
        const newPl: PlaylistSummary = {
          id: -Date.now(),
          name,
          count: tracks.length,
          covers: tracks.slice(0, 4).map((t) => t.cover).filter(Boolean),
        };
        const updated = [newPl, ...playlists];
        setPlaylists(updated);
        try {
          localStorage.setItem(getStorageKey("playlists", null), JSON.stringify(updated));
        } catch (_) {}
        toast(`Created “${name}” (saved locally)`);
        return newPl;
      }

      const r = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, tracks }),
      });
      const j = await r.json();
      if (!r.ok) {
        toast(j.error ?? "Couldn't create playlist", "err");
        return null;
      }
      await refreshLibrary();
      toast(`Created “${name}”`);
      return j.playlist as PlaylistSummary;
    },
    [user, playlists, toast, refreshLibrary],
  );

  const addToPlaylist = useCallback(
    async (playlistId: number | string, tracks: Track[]) => {
      if ((typeof playlistId === "number" && playlistId < 0) || !user) {
        setPlaylists((prev) =>
          prev.map((pl) => {
            if (pl.id === playlistId) {
              return {
                ...pl,
                count: pl.count + tracks.length,
                covers: [...pl.covers, ...tracks.map((t) => t.cover)].slice(0, 4),
              };
            }
            return pl;
          })
        );
        toast(`Added ${tracks.length} track${tracks.length > 1 ? "s" : ""}`);
        return;
      }

      const r = await fetch(`/api/playlists/${playlistId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tracks }),
      });
      const j = await r.json();
      if (!r.ok) return toast(j.error ?? "Couldn't add", "err");
      toast(j.added ? `Added ${j.added} track${j.added > 1 ? "s" : ""}` : "Already in that playlist");
      refreshLibrary();
    },
    [user, toast, refreshLibrary],
  );

  const logPlay = useCallback(
    (t: Track, seconds: number) => {
      const item: HistoryTrack = { ...t, playedAt: new Date().toISOString() };
      setHistory((h) => {
        const next = [item, ...h.filter((x) => x.id !== t.id)].slice(0, 200);
        try {
          localStorage.setItem(getStorageKey("history", user?.id), JSON.stringify(next));
        } catch (_) {}
        return next;
      });

      if (!user) return;
      fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ track: t, seconds }),
      }).catch(() => {});
    },
    [user],
  );

  const value: AppCtx = {
    user,
    ready,
    providers,
    setUser,
    logout,
    likes,
    likedIds,
    history,
    playlists,
    refreshLibrary,
    toggleLike,
    createPlaylist,
    addToPlaylist,
    logPlay,
    toast,
    toasts,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
