import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live Jam Rooms - Listen Together",
  description: "Join real-time synchronized music rooms. Listen together with friends, vote on queue, and chat live on 5ONG.",
  alternates: { canonical: "/rooms" },
};

export default function RoomsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
