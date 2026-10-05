import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search Music & Artists",
  description: "Search millions of songs, albums, artists, and playlists in crystal-clear audio on 5ONG.",
  alternates: { canonical: "/search" },
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
