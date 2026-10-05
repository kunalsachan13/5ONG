"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Download,
  Monitor,
  Smartphone,
  Apple,
  X,
  CheckCircle2,
  Share,
  Sparkles,
  HelpCircle,
} from "lucide-react";

interface BIPEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function DownloadAppButton({ className = "" }: { className?: string }) {
  const [bipEvent, setBipEvent] = useState<BIPEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"windows" | "android" | "ios">("windows");

  useEffect(() => {
    // Detect standalone PWA mode or saved install state
    const checkInstalled = () => {
      const standalone =
        Boolean(window.matchMedia("(display-mode: standalone)").matches) ||
        Boolean(window.matchMedia("(display-mode: window-controls-overlay)").matches) ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes("android-app://") ||
        localStorage.getItem("5ong_pwa_installed") === "true";

      if (standalone) {
        setIsStandalone(true);
        setIsInstalled(true);
      }
    };

    checkInstalled();

    // Auto-detect OS for modal tab
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes("android")) {
      setActiveTab("android");
    } else if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) {
      setActiveTab("ios");
    } else {
      setActiveTab("windows");
    }

    // Check if early deferred prompt is already available
    if (typeof window !== "undefined" && (window as unknown as { __deferredPrompt?: BIPEvent }).__deferredPrompt) {
      setBipEvent((window as unknown as { __deferredPrompt?: BIPEvent }).__deferredPrompt || null);
    }

    const onPromptReady = () => {
      if (typeof window !== "undefined" && (window as unknown as { __deferredPrompt?: BIPEvent }).__deferredPrompt) {
        setBipEvent((window as unknown as { __deferredPrompt?: BIPEvent }).__deferredPrompt || null);
      }
    };

    const onBIP = (e: Event) => {
      e.preventDefault();
      (window as unknown as { __deferredPrompt?: Event }).__deferredPrompt = e;
      setBipEvent(e as BIPEvent);
    };

    const onAppInstalled = () => {
      localStorage.setItem("5ong_pwa_installed", "true");
      setIsInstalled(true);
      setIsStandalone(true);
      setBipEvent(null);
      if (typeof window !== "undefined") {
        (window as unknown as { __deferredPrompt?: Event | null }).__deferredPrompt = null;
      }
      setModalOpen(false);
      window.dispatchEvent(new CustomEvent("5ong-app-installed"));
    };

    const onCustomInstalled = () => {
      setIsInstalled(true);
      setIsStandalone(true);
      setModalOpen(false);
    };

    const onOpenModal = () => setModalOpen(true);
    window.addEventListener("open-download-app-modal", onOpenModal);
    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("app-install-prompt-ready", onPromptReady);
    window.addEventListener("appinstalled", onAppInstalled);
    window.addEventListener("5ong-app-installed", onCustomInstalled);

    return () => {
      window.removeEventListener("open-download-app-modal", onOpenModal);
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("app-install-prompt-ready", onPromptReady);
      window.removeEventListener("appinstalled", onAppInstalled);
      window.removeEventListener("5ong-app-installed", onCustomInstalled);
    };
  }, []);

  const triggerDirectInstall = useCallback(async () => {
    const promptEvent =
      bipEvent ||
      (typeof window !== "undefined"
        ? (window as unknown as { __deferredPrompt?: BIPEvent }).__deferredPrompt
        : null);

    if (promptEvent) {
      try {
        await promptEvent.prompt();
        const choice = await promptEvent.userChoice;
        if (choice && choice.outcome === "accepted") {
          setBipEvent(null);
          if (typeof window !== "undefined") {
            (window as unknown as { __deferredPrompt?: Event | null }).__deferredPrompt = null;
          }
          localStorage.setItem("5ong_pwa_installed", "true");
          setIsInstalled(true);
          setIsStandalone(true);
          setModalOpen(false);
          window.dispatchEvent(new CustomEvent("5ong-app-installed"));
          return;
        }
      } catch (err) {
        console.error("Install prompt error:", err);
      }
    }

    // If browser prompt is not supported directly (e.g. iOS Safari) or was dismissed, open the guide modal
    setModalOpen(true);
  }, [bipEvent]);

  // Once installed or running inside the standalone app, the button completely disappears
  if (isStandalone || isInstalled) {
    return null;
  }

  return (
    <>
      <div
        className={`inline-flex items-center rounded-full bg-gradient-to-r from-lilac to-pink dark:from-[#a855f7] dark:to-[#ec4899] p-0.5 shadow-xs hover:shadow-md transition-all ${className}`}
      >
        {/* Direct Browser Install Button */}
        <button
          type="button"
          onClick={triggerDirectInstall}
          title="Install 5ONG app directly from browser"
          aria-label="Install 5ONG app"
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black text-ink dark:text-white hover:opacity-95 active:scale-95 transition cursor-pointer"
        >
          <Download size={13} className="stroke-[2.5]" />
          <span>Download App</span>
        </button>

        {/* Instructions / Help trigger button */}
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          title="Installation instructions"
          aria-label="Installation instructions"
          className="grid h-7 w-7 place-items-center rounded-full text-ink/75 dark:text-white/80 hover:bg-black/10 dark:hover:bg-white/20 active:scale-90 transition cursor-pointer"
        >
          <HelpCircle size={14} className="stroke-[2.5]" />
        </button>
      </div>

      {/* Direct Browser Install Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-3xl bg-cream dark:bg-[#150f28] border border-ink/10 dark:border-white/10 p-6 shadow-2xl transition-all"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setModalOpen(false)}
              className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-black/5 dark:bg-white/10 text-muted hover:text-ink dark:hover:text-white transition cursor-pointer"
              aria-label="Close dialog"
            >
              <X size={16} />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-lilac to-pink dark:from-purple-600 dark:to-pink-600 text-white shadow-md">
                <Download size={22} />
              </div>
              <div>
                <h3 className="text-lg font-black text-ink dark:text-white">Install 5ONG App</h3>
                <p className="text-xs text-muted">Direct browser installation</p>
              </div>
            </div>

            {/* Direct One-Click Button */}
            <div className="mb-5 rounded-2xl bg-lilac/20 dark:bg-purple-900/30 p-3.5 border border-lilac-deep/20 text-center">
              <p className="text-xs font-bold mb-2.5 text-ink dark:text-purple-200">
                Click below to install directly to your device:
              </p>
              <button
                type="button"
                onClick={triggerDirectInstall}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-lilac-deep hover:bg-purple-600 text-white py-2.5 text-xs font-black shadow-md transition hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                <Sparkles size={15} /> Install 5ONG Directly
              </button>
            </div>

            {/* OS Selection Tabs */}
            <div className="flex rounded-2xl bg-black/5 dark:bg-white/5 p-1 mb-4">
              <button
                type="button"
                onClick={() => setActiveTab("windows")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                  activeTab === "windows"
                    ? "bg-white dark:bg-[#251b44] text-ink dark:text-white shadow-sm"
                    : "text-muted hover:text-ink dark:hover:text-white"
                }`}
              >
                <Monitor size={14} /> Windows / PC
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("android")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                  activeTab === "android"
                    ? "bg-white dark:bg-[#251b44] text-ink dark:text-white shadow-sm"
                    : "text-muted hover:text-ink dark:hover:text-white"
                }`}
              >
                <Smartphone size={14} /> Android
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("ios")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-extrabold transition cursor-pointer ${
                  activeTab === "ios"
                    ? "bg-white dark:bg-[#251b44] text-ink dark:text-white shadow-sm"
                    : "text-muted hover:text-ink dark:hover:text-white"
                }`}
              >
                <Apple size={14} /> iOS
              </button>
            </div>

            {/* Tab Instructions */}
            <div className="space-y-2.5 text-xs text-ink/80 dark:text-gray-300">
              {activeTab === "windows" && (
                <>
                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.03]">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-lilac/30 dark:bg-purple-500/20 text-[11px] font-black text-lilac-deep dark:text-purple-300">
                      1
                    </span>
                    <p>
                      Look at the <strong>right side of your browser&apos;s address bar</strong> for the <strong>Install icon</strong> (computer with down arrow or ⊕ symbol).
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.03]">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-lilac/30 dark:bg-purple-500/20 text-[11px] font-black text-lilac-deep dark:text-purple-300">
                      2
                    </span>
                    <p>
                      <strong>Alternatively</strong>: Click browser menu (<strong>⋮</strong> or <strong>≡</strong>) &rarr; <strong>&quot;Install 5ONG&quot;</strong> (or <em>&quot;Save and share&quot; &rarr; &quot;Install page as app&quot;</em> in Chrome/Brave).
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.03]">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-lilac/30 dark:bg-purple-500/20 text-[11px] font-black text-lilac-deep dark:text-purple-300">
                      3
                    </span>
                    <p>
                      Click <strong>Install</strong>. 5ONG will immediately open in its own clean desktop window with native media key support!
                    </p>
                  </div>
                </>
              )}

              {activeTab === "android" && (
                <>
                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.03]">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-lilac/30 dark:bg-purple-500/20 text-[11px] font-black text-lilac-deep dark:text-purple-300">
                      1
                    </span>
                    <p>
                      In Chrome, Brave, or Samsung Internet on Android, tap the <strong>three dots (⋮)</strong> menu in the top right.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.03]">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-lilac/30 dark:bg-purple-500/20 text-[11px] font-black text-lilac-deep dark:text-purple-300">
                      2
                    </span>
                    <p>
                      Tap <strong>&quot;Install app&quot;</strong> (or <strong>&quot;Add to Home screen&quot;</strong>).
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.03]">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-lilac/30 dark:bg-purple-500/20 text-[11px] font-black text-lilac-deep dark:text-purple-300">
                      3
                    </span>
                    <p>
                      Tap <strong>Install</strong>. 5ONG will be added to your home screen and app drawer with full standalone playback and lockscreen controls!
                    </p>
                  </div>
                </>
              )}

              {activeTab === "ios" && (
                <>
                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.03]">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-lilac/30 dark:bg-purple-500/20 text-[11px] font-black text-lilac-deep dark:text-purple-300">
                      1
                    </span>
                    <p className="flex items-center gap-1.5">
                      Tap the <strong>Share button</strong> (<Share size={13} />) at the bottom of Safari.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.03]">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-lilac/30 dark:bg-purple-500/20 text-[11px] font-black text-lilac-deep dark:text-purple-300">
                      2
                    </span>
                    <p>
                      Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2.5 p-2 rounded-xl bg-black/[0.02] dark:bg-white/[0.03]">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-lilac/30 dark:bg-purple-500/20 text-[11px] font-black text-lilac-deep dark:text-purple-300">
                      3
                    </span>
                    <p>
                      Tap <strong>Add</strong> in the top right corner.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Features checkmarks */}
            <div className="mt-4 pt-3 border-t border-ink/5 dark:border-white/10 grid grid-cols-2 gap-2 text-[11px] text-muted">
              <span className="flex items-center gap-1">
                <CheckCircle2 size={13} className="text-mint" /> 320k HD Audio
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 size={13} className="text-mint" /> Media Key Support
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 size={13} className="text-mint" /> Background Play
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle2 size={13} className="text-mint" /> 0% Browser Bloat
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default DownloadAppButton;
