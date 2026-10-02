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
        <span
          className="text-[21px] font-extrabold uppercase select-none tracking-[0.18em] flex items-center drop-shadow-[0_1px_1px_rgba(255,255,255,0.75)] transition-all"
          style={{ fontFamily: "'Outfit', 'Space Grotesk', system-ui, sans-serif" }}
        >
          <span className="bg-gradient-to-r from-[#3a3059] via-[#6d579f] to-[#aa83e6] bg-clip-text text-transparent">
            5ONG
          </span>
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
