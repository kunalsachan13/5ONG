import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import AppProvider from "@/components/AppProvider";
import PlayerProvider from "@/components/PlayerProvider";
import ThemeProvider from "@/components/ThemeProvider";
import Shell from "@/components/Shell";

export const metadata: Metadata = {
  title: "5ONG",
  applicationName: "5ONG",
  appleWebApp: { capable: true, title: "5ONG", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/logo.png?v=2", type: "image/png" },
      { url: "/icon.png?v=2", type: "image/png" },
      { url: "/favicon.ico?v=2", sizes: "any" },
    ],
    shortcut: "/logo.png?v=2",
    apple: "/logo.png?v=2",
  },
};

export const viewport: Viewport = {
  themeColor: "#cdb8ff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("5ong_theme");var d=t==="dark";if(d)document.documentElement.classList.add("dark");else document.documentElement.classList.remove("dark");}catch(e){}})();`,
          }}
        />
        <link rel="icon" type="image/png" href="/logo.png?v=2" />
        <link rel="shortcut icon" href="/logo.png?v=2" />
        <link rel="apple-touch-icon" href="/logo.png?v=2" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Outfit:wght@500;600;700;800;900&family=Space+Grotesk:wght@600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <ThemeProvider>
          <AppProvider>
            <PlayerProvider>
              <Shell>{children}</Shell>
            </PlayerProvider>
          </AppProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
