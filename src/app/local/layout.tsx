import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Local Music Player",
  description: "Play your local MP3, FLAC, AAC, and WAV audio tracks directly in your browser with 5ONG's modern lossless player.",
  alternates: { canonical: "/local" },
};

export default function LocalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
