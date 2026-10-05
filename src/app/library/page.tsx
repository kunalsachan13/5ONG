"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Clock,
  FolderOpen,
  FolderPlus,
  HardDrive,
  Heart,
  Info,
  Library,
  ListMusic,
  LogIn,
  Music,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { usePlayer } from "@/components/PlayerProvider";
import { PlayAllButtons, TrackList } from "@/components/TrackList";
import { EmptyState, Spinner } from "@/components/ui";
import type { Track } from "@/lib/types";
import {
  clearAllLocalTracks,
  deleteLocalTrack,
  getStoredLocalTracks,
  parseAndSaveAudioFiles,
} from "@/lib/localAudio";

type Tab = "liked" | "playlists" | "history" | "local";

function timeAgo(iso?: string) {
  if (!iso) return "";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function LibraryInner() {
  const { user, ready, likes, playlists, history, createPlaylist, toast } = useApp();
  const { playTrack, playList } = usePlayer();
  const sp = useSearchParams();

  const initialTab: Tab = sp.get("tab") === "local" ? "local" : sp.get("new") ? "playlists" : "liked";
  const [tab, setTab] = useState<Tab>(initialTab);
  const [creating, setCreating] = useState(Boolean(sp.get("new")));
  const [name, setName] = useState("");

  // Local storage state
  const [localTracks, setLocalTracks] = useState<Track[]>([]);
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Load stored local tracks on mount
  useEffect(() => {
    let active = true;
    setLoadingLocal(true);
    getStoredLocalTracks()
      .then((tracks) => {
        if (active) setLocalTracks(tracks);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingLocal(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (sp.get("tab") === "local") {
      setTab("local");
    } else if (sp.get("new")) {
      setTab("playlists");
      setCreating(true);
    }
  }, [sp]);

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const audioFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (f.type.startsWith("audio/") || /\.(mp3|m4a|aac|flac|wav|ogg|opus|webm|wma)$/i.test(f.name)) {
        audioFiles.push(f);
      }
    }

    if (audioFiles.length === 0) {
      toast("No supported audio files found", "err");
      return;
    }

    setImportProgress({ done: 0, total: audioFiles.length });
    try {
      const added = await parseAndSaveAudioFiles(audioFiles, (done, total) => {
        setImportProgress({ done, total });
      });

      const updated = await getStoredLocalTracks();
      setLocalTracks(updated);
      toast(`Added ${added.length} songs from device!`, "ok");

      if (added.length === 1) {
        playTrack(added[0]);
      }
    } catch (err: any) {
      toast("Could not import audio files: " + (err?.message || "Unknown error"), "err");
    } finally {
      setImportProgress(null);
      if (e.target) e.target.value = "";
    }
  };

  const handleDeleteLocal = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await deleteLocalTrack(id);
    setLocalTracks((prev) => prev.filter((t) => t.id !== id));
    toast("Song removed from local library", "ok");
  };

  const handleClearAll = async () => {
    if (!window.confirm("Remove all imported local songs from 5ONG?")) return;
    await clearAllLocalTracks();
    setLocalTracks([]);
    toast("Cleared local music library", "ok");
  };

  const tabs: { id: Tab; label: string; Icon: typeof Heart; n: number }[] = [
    { id: "liked", label: "Liked songs", Icon: Heart, n: likes.length },
    { id: "playlists", label: "Playlists", Icon: ListMusic, n: playlists.length },
    { id: "history", label: "Listening log", Icon: Clock, n: history.length },
    { id: "local", label: "Device Audio", Icon: HardDrive, n: localTracks.length },
  ];

  return (
    <div className="w-full flex flex-col gap-6 transition-all duration-300">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black">Your library</h1>
        {!user && (
          <Link href="/login" className="btn btn-soft !py-1.5 !text-xs">
            <LogIn size={14} /> Sign in to sync
          </Link>
        )}
      </div>

      <div className="flex flex-wrap gap-2" role="tablist">
        {tabs.map(({ id, label, Icon, n }) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            className={`btn ${tab === id ? "btn-primary" : "btn-soft"}`}
            onClick={() => setTab(id)}
          >
            <Icon size={16} /> {label} <span className="text-xs opacity-70">{n}</span>
          </button>
        ))}
      </div>

      {/* LIKED SONGS */}
      {tab === "liked" && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-pink to-lilac">
                <Heart fill="currentColor" className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black">Liked Songs</h2>
                <p className="text-xs text-muted">{likes.length} songs</p>
              </div>
            </div>
            <PlayAllButtons tracks={likes} />
          </div>
          <TrackList
            tracks={likes}
            empty={<EmptyState icon={<Heart />} title="No liked songs yet">Tap the heart on any track (or press L while playing).</EmptyState>}
          />
        </section>
      )}

      {/* PLAYLISTS */}
      {tab === "playlists" && (
        <section className="flex flex-col gap-4">
          {creating ? (
            <form
              className="card flex flex-wrap items-center gap-2 p-3"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!name.trim()) return;
                const p = await createPlaylist(name.trim());
                if (p) {
                  setName("");
                  setCreating(false);
                }
              }}
            >
              <input
                autoFocus
                className="input !w-auto min-w-0 flex-1"
                placeholder="Playlist name"
                value={name}
                maxLength={80}
                onChange={(e) => setName(e.target.value)}
              />
              <button className="btn btn-primary">Create</button>
              <button type="button" className="btn btn-ghost" onClick={() => setCreating(false)}>
                Cancel
              </button>
            </form>
          ) : (
            <div>
              <button className="btn btn-primary" onClick={() => setCreating(true)}>
                <Plus size={16} /> New playlist
              </button>
            </div>
          )}
          {playlists.length === 0 ? (
            <EmptyState icon={<ListMusic />} title="No playlists yet">
              Create one, or <Link className="font-bold text-lilac-deep underline" href="/import">import a playlist</Link>.
            </EmptyState>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {playlists.map((p) => (
                <Link key={p.id} href={`/playlist/${p.id}`} className="card group p-3 transition hover:-translate-y-1 hover:shadow-lg">
                  <div className="grid aspect-square grid-cols-2 grid-rows-2 gap-0.5 overflow-hidden rounded-xl bg-gradient-to-br from-lilac to-pink">
                    {[0, 1, 2, 3].map((i) =>
                      p.covers[i] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={i} src={p.covers[i]} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div key={i} className="bg-white/20" />
                      ),
                    )}
                  </div>
                  <p className="mt-2 truncate text-sm font-extrabold">{p.name}</p>
                  <p className="text-xs text-muted">{p.count} tracks</p>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {/* LISTENING LOG / HISTORY */}
      {tab === "history" && (
        <section className="flex flex-col gap-2">
          {history.length === 0 ? (
            <EmptyState icon={<Clock />} title="Nothing logged yet">Songs you listen to for 10+ seconds show up here.</EmptyState>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted">Your last {history.length} plays</p>
                <PlayAllButtons tracks={history as Track[]} />
              </div>
              <TrackList tracks={history as Track[]} />
            </>
          )}
        </section>
      )}

      {/* LOCAL FILES / DEVICE AUDIO */}
      {tab === "local" && (
        <section className="flex flex-col gap-5">
          {/* Hidden file inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.mp3,.m4a,.aac,.flac,.wav,.ogg,.opus,.webm,.wma"
            multiple
            className="hidden"
            onChange={handleFilesSelected}
          />
          <input
            ref={folderInputRef}
            type="file"
            {...({ webkitdirectory: "", directory: "" } as any)}
            multiple
            className="hidden"
            onChange={handleFilesSelected}
          />

          {/* Action Header Card */}
          <div className="card flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-gradient-to-r from-lilac/20 via-pink/15 to-transparent dark:from-purple-950/30 dark:via-pink-950/20 dark:to-transparent border border-lilac-deep/20 dark:border-purple-500/20">
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-lilac-deep text-white shadow-lg shadow-lilac-deep/30">
                <HardDrive size={26} />
              </div>
              <div>
                <h2 className="text-xl font-black">Device Audio & Local Songs</h2>
                <p className="text-xs text-muted">
                  Play your phone&apos;s downloaded songs offline with complete equalizer, background playback & lock screen controls.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                className="btn btn-primary shadow-md hover:scale-105"
                disabled={Boolean(importProgress)}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={16} /> Choose Songs
              </button>
              <button
                className="btn btn-soft"
                disabled={Boolean(importProgress)}
                onClick={() => folderInputRef.current?.click()}
              >
                <FolderPlus size={16} /> Add Folder
              </button>
              {localTracks.length > 0 && (
                <button
                  className="btn btn-ghost text-red-500 hover:bg-red-500/10"
                  onClick={handleClearAll}
                  title="Clear local files"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Progress bar during file import */}
          {importProgress && (
            <div className="card p-4 flex flex-col gap-2">
              <div className="flex justify-between text-xs font-bold">
                <span>Reading audio files & album art...</span>
                <span>
                  {importProgress.done} / {importProgress.total}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                <div
                  className="h-full bg-lilac-deep transition-all duration-200"
                  style={{ width: `${(importProgress.done / importProgress.total) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Android Default Player Instruction Banner */}
          <div className="flex items-start gap-3 rounded-2xl bg-sky/15 dark:bg-sky-950/20 p-4 border border-sky/30 dark:border-sky-500/20 text-xs">
            <Info size={18} className="text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-1">
              <p className="font-extrabold text-ink dark:text-white">
                How to set 5ONG as your default music player on Android:
              </p>
              <p className="text-muted leading-relaxed">
                Open your Android <strong>Files / File Manager</strong> app, tap on any <code>.mp3</code> song, select{" "}
                <strong>5ONG</strong> from the list, and tap <strong>&ldquo;Always&rdquo;</strong>. Now all your local songs will open automatically in 5ONG!
              </p>
            </div>
          </div>

          {/* Local Tracks List */}
          {loadingLocal && !localTracks.length ? (
            <div className="grid place-items-center py-12">
              <Spinner size={28} />
            </div>
          ) : localTracks.length === 0 ? (
            <EmptyState
              icon={<FolderOpen size={36} />}
              title="No device songs added yet"
            >
              Tap <strong>&ldquo;Choose Songs&rdquo;</strong> to select audio files (.mp3, .m4a, .flac, .wav) from your phone or PC storage.
            </EmptyState>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-muted">{localTracks.length} local songs available</span>
                <PlayAllButtons tracks={localTracks} />
              </div>

              <div className="flex flex-col divide-y divide-black/5 dark:divide-white/5 card overflow-hidden p-1">
                {localTracks.map((t, idx) => (
                  <div
                    key={t.id}
                    className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
                    onClick={() => playList(localTracks, idx)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={t.cover}
                        alt=""
                        className="h-11 w-11 shrink-0 rounded-lg object-cover bg-black/10 shadow"
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold">{t.title}</p>
                        <p className="truncate text-xs text-muted">
                          {t.artist} {t.album && `• ${t.album}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-muted font-mono hidden sm:inline">
                        {Math.floor(t.duration / 60)}:
                        {String(Math.floor(t.duration % 60)).padStart(2, "0")}
                      </span>
                      <button
                        className="btn btn-ghost !p-2 text-muted hover:text-red-500 opacity-60 group-hover:opacity-100 transition"
                        title="Remove from 5ONG"
                        onClick={(e) => handleDeleteLocal(t.id, e)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default function LibraryPage() {
  return (
    <Suspense fallback={null}>
      <LibraryInner />
    </Suspense>
  );
}
