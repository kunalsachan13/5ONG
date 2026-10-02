import Link from "next/link";

interface LogoProps {
  size?: number;
  showText?: boolean;
  className?: string;
  href?: string;
}

export function SongLogoIcon({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="5ONG Logo"
      width={size}
      height={size}
      className={`shrink-0 drop-shadow-md rounded-2xl object-contain transition-transform duration-300 hover:scale-105 ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    />
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
