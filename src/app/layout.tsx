import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import AppProvider from "@/components/AppProvider";
import PlayerProvider from "@/components/PlayerProvider";
import Shell from "@/components/Shell";

export const metadata: Metadata = {
  title: "5ONG — music, in sync",
  description:
    "Stream with a live equalizer and visualizer, synced lyrics, smart shuffle, Spotify imports and listening rooms.",
  applicationName: "5ONG",
  appleWebApp: { capable: true, title: "5ONG", statusBarStyle: "default" },
  icons: { icon: "/icons/192", apple: "/icons/192" },
};

export const viewport: Viewport = {
  themeColor: "#cdb8ff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <AppProvider>
          <PlayerProvider>
            <Shell>{children}</Shell>
          </PlayerProvider>
        </AppProvider>
      </body>
    </html>
  );
}
