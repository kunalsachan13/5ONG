import Link from "next/link";
import { Disc3, Home, Search, Compass, Music2 } from "lucide-react";
import Logo from "@/components/Logo";

export const metadata = {
  title: "404 - Track Not Found",
  description: "The music track or page you are looking for does not exist on 5ONG.",
};

export default function NotFound() {
  return (
    <div className="flex min-h-[75vh] w-full flex-col items-center justify-center px-4 py-12 text-center">
      <div className="relative mx-auto max-w-lg">
        {/* Glow ambient background circles */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full bg-lilac/30 dark:bg-purple-600/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 left-1/4 h-48 w-48 rounded-full bg-pink/30 dark:bg-pink-600/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 card border border-ink/5 dark:border-white/10 p-8 md:p-12 shadow-2xl backdrop-blur-2xl">
          <div className="mx-auto mb-6 grid h-24 w-24 place-items-center rounded-3xl bg-lilac/30 dark:bg-white/10 text-lilac-deep dark:text-purple-300 shadow-inner">
            <Disc3 size={54} className="animate-spin duration-[6000ms]" />
          </div>

          <span className="text-6xl md:text-7xl font-black tracking-tight text-ink dark:text-white">
            4<span className="text-transparent bg-clip-text bg-gradient-to-r from-lilac-deep to-pink-deep">0</span>4
          </span>

          <h1 className="mt-3 text-2xl md:text-3xl font-black text-ink dark:text-white">
            Lost in the Mix
          </h1>

          <p className="mt-2 text-sm text-muted leading-relaxed">
            The track, album, playlist, or page you were looking for has either drifted out of frequency, moved, or never existed in this realm.
          </p>

          {/* Quick Search Form */}
          <form
            action="/search"
            method="GET"
            className="mt-6 flex items-center gap-2 rounded-2xl border border-ink/10 dark:border-white/10 bg-white/50 dark:bg-white/5 p-1.5 shadow-inner"
          >
            <Search size={18} className="ml-3 text-muted shrink-0" />
            <input
              type="text"
              name="q"
              placeholder="Search for songs, artists, or genres..."
              className="w-full bg-transparent px-2 py-1 text-sm outline-none text-ink dark:text-white placeholder:text-muted"
            />
            <button
              type="submit"
              className="btn btn-primary !py-2 !px-4 !text-xs font-black shrink-0"
            >
              Search
            </button>
          </form>

          {/* Action buttons */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/"
              className="btn btn-primary inline-flex items-center gap-2 text-xs font-black shadow-md hover:scale-105 transition-all"
            >
              <Home size={15} /> Return Home
            </Link>
            <Link
              href="/search"
              className="btn btn-soft inline-flex items-center gap-2 text-xs font-bold"
            >
              <Compass size={15} /> Explore Charts
            </Link>
            <Link
              href="/library"
              className="btn btn-soft inline-flex items-center gap-2 text-xs font-bold"
            >
              <Music2 size={15} /> Your Library
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
