"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bell,
  CheckCircle2,
  FolderOpen,
  HelpCircle,
  Info,
  ShieldCheck,
  Smartphone,
  Upload,
  X,
} from "lucide-react";
import { useApp } from "./AppProvider";
import { parseAndSaveAudioFiles } from "@/lib/localAudio";

interface Props {
  forceOpen?: boolean;
  onClose?: () => void;
}

export default function AndroidSetupModal({ forceOpen = false, onClose }: Props) {
  const { toast } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [notifStatus, setNotifStatus] = useState<NotificationPermission>("default");
  const [songsImported, setSongsImported] = useState<number | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const isAndroid = /Android/i.test(navigator.userAgent);
    if (!isAndroid && !forceOpen) return;

    if (typeof Notification !== "undefined") {
      setNotifStatus(Notification.permission);
    }

    const alreadyShown = localStorage.getItem("5ong.android_onboarded.v1");
    if (!alreadyShown || forceOpen) {
      setIsOpen(true);
    }
  }, [forceOpen]);

  const handleRequestNotification = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      toast("Notifications not supported in this browser", "err");
      return;
    }

    try {
      const perm = await Notification.requestPermission();
      setNotifStatus(perm);
      if (perm === "granted") {
        toast("Notifications enabled for lock-screen controls!", "ok");
      } else {
        toast("Notification permission was dismissed or denied", "err");
      }
    } catch (e: any) {
      toast(e?.message || "Could not request notification permission", "err");
    }
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const audioFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (
        f.type.startsWith("audio/") ||
        /\.(mp3|m4a|aac|flac|wav|ogg|opus|webm|wma)$/i.test(f.name)
      ) {
        audioFiles.push(f);
      }
    }

    if (audioFiles.length === 0) {
      toast("No audio files found in selection", "err");
      return;
    }

    setIsImporting(true);
    try {
      const added = await parseAndSaveAudioFiles(audioFiles);
      setSongsImported(added.length);
      toast(`Successfully imported ${added.length} songs from your device!`, "ok");
    } catch (err: any) {
      toast("Error reading audio files: " + (err?.message || "Unknown error"), "err");
    } finally {
      setIsImporting(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleDismiss = () => {
    try {
      localStorage.setItem("5ong.android_onboarded.v1", "true");
    } catch {}
    setIsOpen(false);
    onClose?.();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="card w-full max-w-md max-h-[90vh] overflow-y-auto p-5 sm:p-6 flex flex-col gap-5 shadow-2xl border border-white/10 pop-in">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-lilac-deep text-white shadow-md shadow-lilac-deep/30">
              <Smartphone size={22} />
            </span>
            <div>
              <h2 className="text-lg font-black text-ink dark:text-white leading-tight">
                Android Setup & Permissions
              </h2>
              <p className="text-xs text-muted">
                Configure notifications & local device music access
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="rounded-full p-1 text-muted hover:bg-black/5 dark:hover:bg-white/10 transition"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Hidden File Picker */}
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.mp3,.m4a,.aac,.flac,.wav,.ogg,.opus,.webm,.wma"
          multiple
          className="hidden"
          onChange={handleFilesSelected}
        />

        <div className="flex flex-col gap-4">
          {/* STEP 1: Notification Permission */}
          <div className="card p-4 flex flex-col gap-2.5 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-extrabold text-sm text-ink dark:text-white">
                <Bell size={16} className="text-lilac-deep" />
                <span>1. Lock Screen & Background Playback</span>
              </div>
              {notifStatus === "granted" && (
                <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  <CheckCircle2 size={12} /> Allowed
                </span>
              )}
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Allows the music notification with pause, skip, and album art to stay active on your Samsung lock screen and status bar.
            </p>
            {notifStatus !== "granted" ? (
              <button
                className="btn btn-primary !py-2 text-xs font-bold w-full mt-1"
                onClick={handleRequestNotification}
              >
                Allow Notifications
              </button>
            ) : (
              <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                ✓ Notifications are granted for background playback.
              </p>
            )}
          </div>

          {/* STEP 2: Storage & Files Access (Samsung Download Folder Fix) */}
          <div className="card p-4 flex flex-col gap-2.5 bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-extrabold text-sm text-ink dark:text-white">
                <FolderOpen size={16} className="text-pink-500" />
                <span>2. Device Songs & Downloads Storage</span>
              </div>
              {songsImported !== null && (
                <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  <CheckCircle2 size={12} /> {songsImported} loaded
                </span>
              )}
            </div>

            {/* Samsung Privacy Notice */}
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-2.5 text-[11px] text-amber-800 dark:text-amber-200 flex items-start gap-2">
              <Info size={14} className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <p className="leading-snug">
                <strong>Samsung One UI Note:</strong> Samsung blocks folder-level access on the Download folder. Use <strong>&ldquo;Select Audio Files&rdquo;</strong> below to pick all songs directly from Downloads or Audio tab without any privacy restriction!
              </p>
            </div>

            <button
              className="btn btn-soft !py-2 text-xs font-bold w-full flex items-center justify-center gap-2 mt-1"
              disabled={isImporting}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={14} />
              {isImporting ? "Reading device songs..." : "Select Audio Files from Downloads/Music"}
            </button>
          </div>

          {/* STEP 3: Default Player Instructions */}
          <div className="card p-4 flex flex-col gap-2 bg-sky-500/10 border border-sky-500/20 text-xs">
            <div className="flex items-center gap-2 font-extrabold text-sky-800 dark:text-sky-300">
              <ShieldCheck size={16} />
              <span>3. How to Set as Default Player on Samsung:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-muted text-[11px] leading-relaxed">
              <li>
                Open Samsung <strong>My Files (मेरे फ़ाइलें)</strong> or Downloads app.
              </li>
              <li>
                Tap on any <code>.mp3</code> audio file.
              </li>
              <li>
                In the &ldquo;Open with&rdquo; popup, choose <strong>5ONG</strong> and tap <strong>&ldquo;Always&rdquo; (हमेशा)</strong>.
              </li>
            </ol>
            <p className="text-[10px] text-muted italic mt-0.5">
              (Note: Make sure you installed 5ONG using the &ldquo;Install App&rdquo; button so Android registers it with file extensions).
            </p>
          </div>
        </div>

        {/* Footer Action */}
        <div className="flex justify-end pt-1">
          <button className="btn btn-primary w-full" onClick={handleDismiss}>
            Continue to 5ONG
          </button>
        </div>
      </div>
    </div>
  );
}
