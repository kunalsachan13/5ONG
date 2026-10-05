import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Music Library",
  description: "Manage your liked tracks, playlists, playback history, and uploaded music on 5ONG.",
  alternates: { canonical: "/library" },
};

export default function LibraryLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
