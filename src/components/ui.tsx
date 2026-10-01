"use client";

import { useState, useEffect, type CSSProperties } from "react";
import { Music2 } from "lucide-react";

export function Cover({
  src,
  size = 48,
  className = "",
  rounded = "rounded-xl",
}: {
  src?: string;
  size?: number;
  className?: string;
  rounded?: string;
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  return (
    <div
      className={`relative shrink-0 overflow-hidden bg-gradient-to-br from-lilac/30 via-pink/20 to-peach/30 ${rounded} ${className}`}
      style={{ width: size, height: size }}
    >
      {src && !failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition-opacity duration-200"
          draggable={false}
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="grid h-full w-full place-items-center bg-gradient-to-br from-lilac to-pink text-white/90">
          <Music2 size={Math.max(16, size / 2.5)} />
        </div>
      )}
    </div>
  );
}

export function Slider({
  value,
  min = 0,
  max,
  step = 0.01,
  onChange,
  label,
  className = "",
  style,
}: {
  value: number;
  min?: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  label: string;
  className?: string;
  style?: CSSProperties;
}) {
  const p = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <input
      type="range"
      aria-label={label}
      className={`range ${className}`}
      min={min}
      max={max}
      step={step}
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ ["--p" as string]: `${p}%`, ...style }}
    />
  );
}

export function Spinner({ size = 18 }: { size?: number }) {
  return (
    <span
      className="inline-block animate-spin rounded-full border-2 border-lilac-deep/30 border-t-lilac-deep"
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    />
  );
}

export function EmptyState({ icon, title, children }: { icon: React.ReactNode; title: string; children?: React.ReactNode }) {
  return (
    <div className="card mx-auto flex max-w-md flex-col items-center gap-3 px-6 py-10 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-lilac/60 to-pink/60 text-ink">
        {icon}
      </div>
      <h3 className="text-lg font-extrabold">{title}</h3>
      <div className="text-sm text-muted">{children}</div>
    </div>
  );
}

export const GRADIENTS = [
  "from-lilac to-pink",
  "from-sky to-mint",
  "from-peach to-pink",
  "from-mint to-butter",
  "from-pink to-sky",
  "from-butter to-peach",
  "from-lilac to-sky",
  "from-mint to-lilac",
];
