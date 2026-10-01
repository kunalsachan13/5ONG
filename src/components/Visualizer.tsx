"use client";

import { useEffect, useRef } from "react";
import { usePlayer, type VizMode } from "@/components/PlayerProvider";

const COLORS = ["#cdb8ff", "#ffc4dd", "#ffdcbd", "#bdf0da", "#bcdcff"];

export default function Visualizer({ mode, className = "" }: { mode?: VizMode; className?: string }) {
  const { getAnalyser, playing, vizMode } = usePlayer();
  const ref = useRef<HTMLCanvasElement>(null);
  const m = mode ?? vizMode;
  const playingRef = useRef(playing);
  playingRef.current = playing;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let raf = 0;
    let freq: Uint8Array<ArrayBuffer> | null = null;
    let wave: Uint8Array<ArrayBuffer> | null = null;
    const smooth: number[] = [];
    let t0 = 0;

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(r.width * dpr));
      canvas.height = Math.max(1, Math.floor(r.height * dpr));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const grad = (x0: number, y0: number, x1: number, y1: number) => {
      const g = ctx.createLinearGradient(x0, y0, x1, y1);
      COLORS.forEach((c, i) => g.addColorStop(i / (COLORS.length - 1), c));
      return g;
    };

    const draw = (ts: number) => {
      raf = requestAnimationFrame(draw);
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const an = getAnalyser();
      if (an) {
        if (!freq || freq.length !== an.frequencyBinCount) {
          freq = new Uint8Array(new ArrayBuffer(an.frequencyBinCount));
          wave = new Uint8Array(new ArrayBuffer(an.fftSize));
        }
        an.getByteFrequencyData(freq);
        an.getByteTimeDomainData(wave!);
      }
      const live = an && playingRef.current;
      if (!t0) t0 = ts;
      const tt = (ts - t0) / 1000;
      const bins = 64;
      const usable = freq ? Math.floor(freq.length * 0.62) : 0;
      for (let i = 0; i < bins; i++) {
        let v = 0;
        if (freq && live) {
          // logarithmic-ish bin mapping so bass doesn't dominate
          const a = Math.floor(Math.pow(i / bins, 1.7) * usable);
          const b = Math.max(a + 1, Math.floor(Math.pow((i + 1) / bins, 1.7) * usable));
          let s = 0;
          for (let k = a; k < b; k++) s += freq[k];
          v = s / (b - a) / 255;
        } else {
          v = 0.04 + 0.03 * Math.sin(tt * 1.6 + i * 0.35);
        }
        smooth[i] = (smooth[i] ?? 0) * 0.65 + v * 0.35;
      }

      if (m === "bars" || m === "mirror") {
        const gap = w / bins;
        const bw = gap * 0.62;
        ctx.fillStyle = grad(0, 0, w, 0);
        for (let i = 0; i < bins; i++) {
          const bh = Math.max(4, smooth[i] * h * (m === "mirror" ? 0.46 : 0.92));
          const x = i * gap + (gap - bw) / 2;
          ctx.beginPath();
          if (m === "mirror") ctx.roundRect(x, h / 2 - bh, bw, bh * 2, bw / 2);
          else ctx.roundRect(x, h - bh, bw, bh, [bw / 2, bw / 2, 0, 0]);
          ctx.fill();
        }
      } else if (m === "wave") {
        ctx.lineWidth = Math.max(2, h * 0.012);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = grad(0, 0, w, 0);
        ctx.beginPath();
        const n = 256;
        for (let i = 0; i < n; i++) {
          let y = 0;
          if (wave && live) y = (wave[Math.floor((i / n) * wave.length)] - 128) / 128;
          else y = Math.sin(tt * 2 + i * 0.08) * 0.04;
          const px = (i / (n - 1)) * w;
          const py = h / 2 + y * h * 0.42;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
        ctx.globalAlpha = 0.25;
        ctx.lineWidth *= 3;
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else {
        const cx = w / 2;
        const cy = h / 2;
        const base = Math.min(w, h) * 0.24;
        const rot = tt * 0.25;
        ctx.lineCap = "round";
        for (let i = 0; i < bins; i++) {
          const ang = (i / bins) * Math.PI * 2 + rot;
          const len = base * 0.12 + smooth[i] * base * 1.05;
          ctx.strokeStyle = COLORS[i % COLORS.length];
          ctx.lineWidth = Math.max(2, (Math.PI * 2 * base) / bins * 0.5);
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(ang) * base, cy + Math.sin(ang) * base);
          ctx.lineTo(cx + Math.cos(ang) * (base + len), cy + Math.sin(ang) * (base + len));
          ctx.stroke();
        }
        const bass = (smooth[1] + smooth[2] + smooth[3]) / 3;
        ctx.fillStyle = "rgba(205,184,255,0.35)";
        ctx.beginPath();
        ctx.arc(cx, cy, base * (0.82 + bass * 0.25), 0, Math.PI * 2);
        ctx.fill();
      }
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [m, getAnalyser]);

  return <canvas ref={ref} className={`h-full w-full ${className}`} aria-label="Audio visualizer" />;
}
