"use client";

import Link from "next/link";
import { GRADIENTS } from "@/components/ui";
import { useJson } from "@/lib/useJson";

export default function GenreChips() {
  const { data } = useJson<{ genres: { id: string; name: string; picture: string }[] }>("/api/music/genres");
  return (
    <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 md:-mx-8 md:px-8">
      {(data?.genres ?? Array.from({ length: 8 }, () => null)).map((g, i) => (
        <Link
          key={g?.id ?? i}
          href={g ? `/genre/${g.id}` : "#"}
          className={`relative flex h-24 w-40 shrink-0 items-end overflow-hidden rounded-2xl bg-gradient-to-br p-3 text-sm font-black shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${GRADIENTS[i % GRADIENTS.length]}`}
        >
          {g?.picture && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={g.picture} alt="" className="absolute -right-4 -top-2 h-20 w-20 rotate-12 rounded-xl object-cover opacity-70 shadow-md" />
          )}
          <span className="relative">{g?.name ?? ""}</span>
        </Link>
      ))}
    </div>
  );
}
