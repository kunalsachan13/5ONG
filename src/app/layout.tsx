import type { Metadata, Viewport } from "next";
import { Suspense, type ReactNode } from "react";
import "./globals.css";
import AppProvider from "@/components/AppProvider";
import PlayerProvider from "@/components/PlayerProvider";
import ThemeProvider from "@/components/ThemeProvider";
import Shell from "@/components/Shell";
import CookieConsent from "@/components/CookieConsent";
import { AnalyticsProvider } from "@/components/AnalyticsProvider";
import ClientInit from "@/components/ClientInit";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://5ong.app";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "5ONG - High-Fidelity Music Streaming & Live Jamming",
    template: "%s | 5ONG",
  },
  description:
    "Stream millions of tracks in crystal-clear high fidelity, join real-time synchronized music rooms with friends, and discover your next favorite vibe with 5ONG.",
  keywords: [
    "5ONG",
    "music streaming",
    "free music",
    "high fidelity audio",
    "lossless music",
    "live jam rooms",
    "collaborative playlists",
    "web music player",
    "listen together",
  ],
  authors: [{ name: "5ONG Team" }],
  creator: "5ONG",
  publisher: "5ONG",
  applicationName: "5ONG",
  appleWebApp: {
    capable: true,
    title: "5ONG",
    statusBarStyle: "black-translucent",
  },
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.ico?v=3", sizes: "any" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
      { url: "/logo.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico?v=3",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "5ONG - High-Fidelity Music Streaming & Live Jamming",
    description:
      "Stream millions of songs in crystal-clear high fidelity, create collaborative playlists, and join live synchronized listening rooms.",
    url: APP_URL,
    siteName: "5ONG",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "5ONG High-Fidelity Music Streaming",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "5ONG - High-Fidelity Music Streaming",
    description:
      "Listen together in real-time jam rooms. Discover millions of tracks in high-fidelity audio.",
    images: ["/og-image.png"],
    creator: "@5ongapp",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "/",
  },
};

export const viewport: Viewport = {
  themeColor: "#0c0918",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("5ong_theme")||"dark";var isDark=t!=="light";var root=document.documentElement;if(isDark){root.classList.add("dark");}else{root.classList.remove("dark");}root.classList.remove("theme-adaptive");root.style.colorScheme="dark";var metas=document.querySelectorAll('meta[name="theme-color"]');var color=isDark?"#0c0918":"#faf6ff";if(metas.length>0){metas.forEach(function(m,i){if(i===0){m.removeAttribute("media");m.setAttribute("content",color);}else{m.remove();}});}else{var m=document.createElement("meta");m.name="theme-color";m.content=color;document.head.appendChild(m);}window.__deferredPrompt=null;window.addEventListener("beforeinstallprompt",function(e){e.preventDefault();window.__deferredPrompt=e;window.dispatchEvent(new Event("app-install-prompt-ready"));});}catch(e){}})();`,
          }}
        />
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico?v=3" />
        <link rel="shortcut icon" href="/favicon.ico?v=3" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Outfit:wght@500;600;700;800;900&family=Space+Grotesk:wght@600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased min-h-screen" suppressHydrationWarning>
        <ClientInit />
        <ThemeProvider>
          <AppProvider>
            <Suspense fallback={null}>
              <AnalyticsProvider>
                <PlayerProvider>
                  <Shell>{children}</Shell>
                  <CookieConsent />
                </PlayerProvider>
              </AnalyticsProvider>
            </Suspense>
          </AppProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
