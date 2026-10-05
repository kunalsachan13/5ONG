"use client";

import { useEffect, useRef } from "react";
import { usePlayer } from "@/components/PlayerProvider";

const DEFAULT_COLORS = ["#cdb8ff", "#ffc4dd", "#ffdcbd", "#bdf0da", "#bcdcff"];

/**
 * High-performance, ultra-smooth audio visualizer with logarithmic frequency response,
 * asymmetric attack/decay smoothing, and silky ambient idle animation.
 */
export default function Visualizer({
  className = "",
  colors,
}: {
  className?: string;
  colors?: string[];
}) {
  const { getAnalyser, playing } = usePlayer();
  const ref = useRef<HTMLCanvasElement>(null);

  // Stable refs to prevent canvas animation loop teardowns on re-renders
  const colorsRef = useRef(colors);
  colorsRef.current = colors;

  const playingRef = useRef(playing);
  playingRef.current = playing;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let raf = 0;
    let freq: Uint8Array<ArrayBuffer> | null = null;
    const bins = 26; // Optimal bar count for aesthetic balance
    const smooth: number[] = new Array(bins).fill(0.04);
    let lastTime = performance.now();
    let animTime = 0;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const r = canvas.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return;
      canvas.width = Math.max(1, Math.floor(r.width * dpr));
      canvas.height = Math.max(1, Math.floor(r.height * dpr));
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);

      if (document.hidden) return;

      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      animTime += dt;

      const w = canvas.width;
      const h = canvas.height;
      if (w <= 0 || h <= 0) return;

      ctx.clearRect(0, 0, w, h);

      const an = getAnalyser();
      const isPlaying = playingRef.current;
      let hasLiveAudio = false;

      if (an && isPlaying) {
        if (!freq || freq.length !== an.frequencyBinCount) {
          freq = new Uint8Array(new ArrayBuffer(an.frequencyBinCount));
        }
        an.getByteFrequencyData(freq);
        hasLiveAudio = true;
      }

      const activeColors = colorsRef.current && colorsRef.current.length > 0 ? colorsRef.current : DEFAULT_COLORS;
      const grad = ctx.createLinearGradient(0, 0, w, 0);
      activeColors.forEach((c, idx) => {
        grad.addColorStop(idx / Math.max(1, activeColors.length - 1), c);
      });

      // Sample logarithmic audio frequencies or smooth idle wave
      const usableBins = freq ? Math.min(freq.length, 512) : 0;

      for (let i = 0; i < bins; i++) {
        let target = 0;

        if (hasLiveAudio && freq && usableBins > 0) {
          // Logarithmic bin distribution focusing on musical range (bass, mids, highs)
          const normIdx = i / (bins - 1);
          const startBin = Math.floor(Math.pow(normIdx, 2.0) * (usableBins - 12)) + 1;
          const endBin = Math.min(usableBins, Math.max(startBin + 1, Math.floor(Math.pow((i + 1) / (bins - 1), 2.0) * usableBins) + 2));

          let sum = 0;
          for (let k = startBin; k < endBin; k++) {
            sum += freq[k];
          }
          const raw = sum / (endBin - startBin) / 255;
          target = Math.pow(raw, 1.2) * 1.05; // slight curve for punchiness
        } else {
          // Smooth, organic ambient breathing wave when idle/paused
          const wave1 = Math.sin(animTime * 2.2 + i * 0.35) * 0.08;
          const wave2 = Math.cos(animTime * 1.5 - i * 0.25) * 0.04;
          target = 0.09 + wave1 + wave2;
        }

        // Asymmetric attack & decay: snappy response to beats, silky smooth glide down
        const cur = smooth[i] ?? 0;
        if (target > cur) {
          // Fast attack
          smooth[i] = cur + (target - cur) * (1 - Math.exp(-dt * 24));
        } else {
          // Gentle decay
          smooth[i] = cur + (target - cur) * (1 - Math.exp(-dt * 12));
        }
      }

      // Render bars
      const gap = w / bins;
      const bw = Math.max(2, gap * 0.62);
      ctx.fillStyle = grad;

      for (let i = 0; i < bins; i++) {
        const val = Math.max(0.04, Math.min(1, smooth[i]));
        const bh = Math.max(bw, val * h * 0.94);
        const x = i * gap + (gap - bw) / 2;
        const y = h - bh;
        const radius = bw / 2;

        ctx.beginPath();
        if (typeof ctx.roundRect === "function") {
          ctx.roundRect(x, y, bw, bh, [radius, radius, radius * 0.4, radius * 0.4]);
        } else {
          ctx.rect(x, y, bw, bh);
        }
        ctx.fill();
      }
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [getAnalyser]); // NO colors or playing dependency -> never teardown and stutter!

  return <canvas ref={ref} className={`h-full w-full ${className}`} aria-hidden />;
}
