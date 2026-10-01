import Link from "next/link";

interface LogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
  href?: string;
}

export function SongLogoIcon({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 drop-shadow-sm transition-transform hover:scale-105 ${className}`}
    >
      <defs>
        {/* Soft frosted glass background gradient */}
        <linearGradient id="bgGrad" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="50%" stopColor="#faf6ff" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#f3ecff" stopOpacity="0.9" />
        </linearGradient>

        {/* 5ONG signature pastel brand gradient */}
        <linearGradient id="brandGrad" x1="15" y1="15" x2="105" y2="105" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#a888f8" />
          <stop offset="45%" stopColor="#cdb8ff" />
          <stop offset="75%" stopColor="#ffb3d1" />
          <stop offset="100%" stopColor="#ffcfa8" />
        </linearGradient>

        {/* Subtle glow filter */}
        <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#9b7fe8" floodOpacity="0.25" />
        </filter>

        {/* Squircle glass border stroke */}
        <linearGradient id="strokeGrad" x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#cdb8ff" stopOpacity="0.5" />
        </linearGradient>
      </defs>

      {/* Rounded Squircle Badge */}
      <rect
        x="6"
        y="6"
        width="108"
        height="108"
        rx="32"
        fill="url(#bgGrad)"
        stroke="url(#strokeGrad)"
        strokeWidth="2.5"
        filter="url(#softGlow)"
      />

      {/* Stylized Modern 5 + Musical Note Shape */}
      <g transform="translate(18, 16)">
        {/* Top Flag & Stem of the 5 / Musical Note Beam */}
        <path
          d="M 12 18 L 62 18 C 66 18, 70 21, 72 25 L 72 44 C 72 52, 64 57, 56 57 C 48 57, 43 51, 43 45 C 43 38, 49 33, 56 33 C 58 33, 60 33.5, 62 34.5 L 62 26 L 24 26 L 20 45 C 23 43.5, 27 42.5, 31 42.5 C 47 42.5, 58 53, 58 68 C 58 83, 44 92, 28 92 C 15 92, 6 85, 4 75 C 3.5 72, 6 69, 9 69 C 12 69, 14 71, 15.5 73 C 18 78, 22.5 82, 28 82 C 38 82, 46 75, 46 67 C 46 59, 39 52, 29 52 C 23 52, 17 55, 13 58 C 11 59.5, 8 58, 8.5 55 L 12 18 Z"
          fill="url(#brandGrad)"
        />

        {/* Music Sound Ripples */}
        <path
          d="M 76 38 C 80 43, 80 50, 76 55"
          stroke="url(#brandGrad)"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
          opacity="0.85"
        />
        <path
          d="M 83 32 C 89 40, 89 53, 83 61"
          stroke="url(#brandGrad)"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
          opacity="0.6"
        />
      </g>
    </svg>
  );
}

export default function Logo({ size = 38, showText = true, className = "", href = "/" }: LogoProps) {
  const content = (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <SongLogoIcon size={size} />
      {showText && (
        <span className="text-xl font-black tracking-tight text-ink select-none flex items-center">
          5<span className="bg-gradient-to-r from-lilac-deep via-pink-deep to-peach bg-clip-text text-transparent">ONG</span>
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} aria-label="5ONG Home" className="inline-flex">
        {content}
      </Link>
    );
  }

  return content;
}
