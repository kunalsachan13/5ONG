"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie, Check, X, Shield, Settings2 } from "lucide-react";

export interface CookiePreferences {
  essential: boolean; // Always true
  analytics: boolean;
  preferences: boolean;
  decided: boolean;
}

const STORAGE_KEY = "5ong_cookie_consent_v1";

export function getStoredCookiePreferences(): CookiePreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveCookiePreferences(prefs: CookiePreferences) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    window.dispatchEvent(
      new CustomEvent("5ong_cookie_consent_updated", { detail: prefs })
    );
  } catch {
    // ignore
  }
}

export default function CookieConsent() {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [analyticsAllowed, setAnalyticsAllowed] = useState(true);
  const [preferencesAllowed, setPreferencesAllowed] = useState(true);

  useEffect(() => {
    setMounted(true);
    const existing = getStoredCookiePreferences();
    if (!existing || !existing.decided) {
      // Show banner after brief delay so it doesn't jarringly pop on initial render
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  // Listen for request to reopen modal from footer
  useEffect(() => {
    function handleOpen() {
      const existing = getStoredCookiePreferences();
      if (existing) {
        setAnalyticsAllowed(existing.analytics);
        setPreferencesAllowed(existing.preferences);
      }
      setShowDetails(true);
      setVisible(true);
    }
    window.addEventListener("5ong_reopen_cookie_banner", handleOpen);
    return () => window.removeEventListener("5ong_reopen_cookie_banner", handleOpen);
  }, []);

  if (!mounted || !visible) return null;

  const handleAcceptAll = () => {
    const prefs: CookiePreferences = {
      essential: true,
      analytics: true,
      preferences: true,
      decided: true,
    };
    saveCookiePreferences(prefs);
    setVisible(false);
  };

  const handleEssentialOnly = () => {
    const prefs: CookiePreferences = {
      essential: true,
      analytics: false,
      preferences: false,
      decided: true,
    };
    saveCookiePreferences(prefs);
    setVisible(false);
  };

  const handleSaveCustom = () => {
    const prefs: CookiePreferences = {
      essential: true,
      analytics: analyticsAllowed,
      preferences: preferencesAllowed,
      decided: true,
    };
    saveCookiePreferences(prefs);
    setVisible(false);
  };

  return (
    <aside
      role="region"
      aria-label="Cookie and privacy choices"
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-lg animate-in fade-in slide-in-from-bottom-5 duration-300 md:bottom-6 md:right-6 md:left-auto"
    >
      <div className="card rounded-3xl border border-white/20 dark:border-white/10 bg-white/95 dark:bg-[#120b22]/95 p-5 shadow-2xl backdrop-blur-2xl">
        <div className="flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-lilac/30 dark:bg-purple-500/20 text-lilac-deep dark:text-purple-300">
            <Cookie size={20} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-ink dark:text-white">Cookie &amp; Privacy Choices</h3>
              <button
                onClick={handleEssentialOnly}
                className="text-muted hover:text-ink dark:hover:text-white p-1"
                aria-label="Dismiss cookie notice with essential cookies only"
              >
                <X size={16} />
              </button>
            </div>
            <p className="mt-1 text-xs text-muted leading-relaxed">
              We use strictly necessary cookies to keep you signed in and preserve your listening queue. Optional cookies help us understand streaming performance and improve recommendations.
            </p>
          </div>
        </div>

        {showDetails && (
          <div className="mt-4 space-y-2.5 rounded-2xl border border-ink/5 dark:border-white/10 bg-black/5 dark:bg-white/5 p-3 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-ink dark:text-white">Essential Audio &amp; Auth</span>
                <p className="text-[11px] text-muted">Required for audio stream decoding, volume, and login.</p>
              </div>
              <span className="rounded-full bg-lilac/30 dark:bg-purple-500/20 px-2 py-0.5 text-[10px] font-black text-lilac-deep dark:text-purple-300">
                Always Active
              </span>
            </div>

            <div className="flex items-center justify-between border-t border-ink/5 dark:border-white/10 pt-2">
              <div>
                <span className="font-bold text-ink dark:text-white">Performance &amp; Analytics</span>
                <p className="text-[11px] text-muted">Anonymous playback reliability and crash metrics.</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={analyticsAllowed}
                  onChange={(e) => setAnalyticsAllowed(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="h-5 w-9 rounded-full bg-gray-300 dark:bg-white/20 peer-checked:bg-lilac-deep transition-colors after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all peer-checked:after:translate-x-full"></div>
              </label>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-ink/5 dark:border-white/10 pt-3">
          <div className="flex items-center gap-2 text-[11px] text-muted">
            <Link href="/privacy" className="hover:underline">Privacy</Link>
            <span>•</span>
            <Link href="/terms" className="hover:underline">Terms</Link>
            <span>•</span>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="inline-flex items-center gap-1 font-bold text-lilac-deep hover:underline"
            >
              <Settings2 size={12} />
              {showDetails ? "Fewer options" : "Customize"}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {showDetails ? (
              <button
                onClick={handleSaveCustom}
                className="btn btn-primary !py-1.5 !px-3 !text-xs font-black"
              >
                Save Preferences
              </button>
            ) : (
              <>
                <button
                  onClick={handleEssentialOnly}
                  className="btn btn-soft !py-1.5 !px-3 !text-xs font-bold"
                >
                  Essential Only
                </button>
                <button
                  onClick={handleAcceptAll}
                  className="btn btn-primary !py-1.5 !px-3 !text-xs font-black shadow-md hover:scale-105 transition-all"
                >
                  Accept All
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
