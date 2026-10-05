"use client";

import Link from "next/link";
import { GRADIENTS } from "@/components/ui";
import { useJson } from "@/lib/useJson";
import { HorizontalSlider } from "@/components/HorizontalSlider";

export default function GenreChips({
  title,
  className = "",
}: {
  title?: React.ReactNode;
  className?: string;
}) {
  const { data } = useJson<{ genres: { id: string; name: string; picture: string }[] }>("/api/music/genres");
  return (
    <HorizontalSlider
      title={title}
      className={className}
      containerClassName="gap-3"
      step={320}
    >
      {(data?.genres ?? Array.from({ length: 8 }, () => null)).map((g, i) => {
        if (!g) {
          return (
            <div
              key={i}
              aria-hidden="true"
              className={`relative flex h-24 w-40 shrink-0 items-end overflow-hidden rounded-2xl bg-gradient-to-br p-3 opacity-60 animate-pulse ${GRADIENTS[i % GRADIENTS.length]}`}
            />
          );
        }

        return (
          <Link
            key={g.id}
            href={`/genre/${g.id}`}
            className={`relative flex h-24 w-40 shrink-0 items-end overflow-hidden rounded-2xl bg-gradient-to-br p-3 text-sm font-black shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg text-[#1e1538] dark:text-[#18102e] ${GRADIENTS[i % GRADIENTS.length]}`}
          >
            {g.picture && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={g.picture} alt="" className="absolute -right-4 -top-2 h-20 w-20 rotate-12 rounded-xl object-cover opacity-70 shadow-md" />
            )}
            <span className="relative drop-shadow-[0_1px_1px_rgba(255,255,255,0.35)]">{g.name}</span>
          </Link>
        );
      })}
    </HorizontalSlider>
  );
}

