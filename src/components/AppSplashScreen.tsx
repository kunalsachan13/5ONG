"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function AppSplashScreen() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Check if splash was already shown in this tab/app session
    const hasShown = typeof window !== "undefined" ? sessionStorage.getItem("5ong_splash_played") : null;
    if (hasShown) {
      setVisible(false);
      return;
    }

    // Play splash animation for 1.4s, then fade out smoothly
    const fadeTimer = setTimeout(() => {
      setFading(true);
      try {
        sessionStorage.setItem("5ong_splash_played", "true");
      } catch (_) {}
    }, 1300);

    const removeTimer = setTimeout(() => {
      setVisible(false);
    }, 1900);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      onClick={() => setFading(true)}
      className={`fixed inset-0 z-[120] flex flex-col items-center justify-center bg-[#0c0918] select-none transition-all duration-600 ease-out cursor-pointer ${
        fading ? "opacity-0 pointer-events-none scale-105 blur-sm" : "opacity-100 scale-100"
      }`}
    >
      {/* Dynamic ambient background glow rings */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-gradient-to-tr from-purple-600/30 via-pink-500/25 to-indigo-500/20 blur-[75px] animate-pulse" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-60 h-60 rounded-full bg-lilac-deep/20 blur-[50px]" />
      </div>

      <div className="relative flex flex-col items-center gap-6 z-10">
        {/* Animated Glowing 5ONG Logo */}
        <div className="relative flex items-center justify-center">
          {/* Subtle pulsating outer ripple ring */}
          <div className="absolute -inset-4 rounded-full border border-purple-500/30 animate-ping opacity-25 [animation-duration:2.5s]" />
          <div className="absolute -inset-2 rounded-3xl bg-gradient-to-tr from-purple-500/40 via-pink-500/30 to-rose-400/20 blur-xl animate-pulse" />

          <div className="relative h-24 w-24 rounded-3xl overflow-hidden shadow-2xl shadow-purple-950/80 border border-white/15 bg-[#17122b] p-3 flex items-center justify-center transform transition-transform duration-700 hover:scale-105">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="5ONG"
              width={80}
              height={80}
              className="h-full w-full object-contain drop-shadow-[0_4px_16px_rgba(192,132,252,0.6)] animate-pulse [animation-duration:3s]"
            />
          </div>
        </div>

        {/* Animated Brand Name & Equalizer */}
        <div className="flex flex-col items-center gap-2.5 text-center">
          <h1
            className="text-4xl font-black tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-r from-white via-[#f0e6ff] to-[#c084fc] drop-shadow-[0_0_24px_rgba(192,132,252,0.6)]"
            style={{ fontFamily: "'Outfit', 'Space Grotesk', system-ui, sans-serif" }}
          >
            5ONG
          </h1>

          {/* Rhythmic dancing soundwave equalizer bars */}
          <div className="flex items-center gap-1.5 h-6 py-1">
            <span className="w-1 h-3 rounded-full bg-gradient-to-t from-purple-500 to-indigo-400 animate-[bounce_0.8s_ease-in-out_infinite]" />
            <span className="w-1 h-5 rounded-full bg-gradient-to-t from-pink-500 to-purple-400 animate-[bounce_0.8s_ease-in-out_0.2s_infinite]" />
            <span className="w-1 h-6 rounded-full bg-gradient-to-t from-rose-400 to-pink-400 animate-[bounce_0.8s_ease-in-out_0.4s_infinite]" />
            <span className="w-1 h-4 rounded-full bg-gradient-to-t from-purple-400 to-pink-500 animate-[bounce_0.8s_ease-in-out_0.15s_infinite]" />
            <span className="w-1 h-2 rounded-full bg-gradient-to-t from-indigo-400 to-purple-500 animate-[bounce_0.8s_ease-in-out_0.35s_infinite]" />
          </div>

          <p className="text-xs font-bold tracking-[0.2em] uppercase text-white/50">
            Feel The Rhythm
          </p>
        </div>

        {/* Indeterminate smooth gradient loading bar */}
        <div className="relative w-36 h-1 rounded-full bg-white/10 overflow-hidden mt-2">
          <div className="absolute inset-y-0 w-1/2 rounded-full bg-gradient-to-r from-purple-500 via-pink-400 to-indigo-400 animate-[shimmer_1.4s_infinite_linear]" />
        </div>
      </div>
    </div>
  );
}
