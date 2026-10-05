import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "5ONG",
    short_name: "5ONG",
    description: "Listen to high-definition music, stream charts, and play local audio from your device.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["fullscreen", "window-controls-overlay", "standalone", "minimal-ui"],
    orientation: "any",
    background_color: "#0c0918",
    theme_color: "#0c0918",
    categories: ["music", "entertainment"],
    icons: [
      { src: "/icons/192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Local Music",
        short_name: "Local Files",
        description: "Play music from your device storage",
        url: "/library?tab=local",
        icons: [{ src: "/icons/192", sizes: "192x192" }],
      },
      {
        name: "Search Songs",
        short_name: "Search",
        description: "Find your favorite songs & artists",
        url: "/search",
        icons: [{ src: "/icons/192", sizes: "192x192" }],
      },
    ],
    // PWA File Handling API - enables Android/Windows "Open With 5ONG" for audio files
    file_handlers: [
      {
        action: "/library?tab=local",
        name: "Audio Files",
        icons: [{ src: "/icons/192", sizes: "192x192", type: "image/png" }],
        accept: {
          "audio/*": [
            ".mp3",
            ".m4a",
            ".aac",
            ".flac",
            ".wav",
            ".ogg",
            ".opus",
            ".webm",
            ".wma",
          ],
        },
      },
    ],
  } as any;
}
