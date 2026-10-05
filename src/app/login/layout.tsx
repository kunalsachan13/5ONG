import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In & Create Account",
  description: "Sign in to 5ONG to sync your music library, customized playlists, and collaborative listening rooms across devices.",
  alternates: { canonical: "/login" },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
