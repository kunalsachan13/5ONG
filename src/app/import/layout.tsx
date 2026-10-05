import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Import Playlists from Spotify, YouTube Music, JioSaavn & Amazon Music",
  description: "Seamlessly import your public playlists from Spotify, YouTube Music, JioSaavn, and Amazon Music into 5ONG for instant high-fidelity playback.",
  alternates: { canonical: "/import" },
};

export default function ImportLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
