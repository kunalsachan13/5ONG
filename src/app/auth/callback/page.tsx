"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { SongLogoIcon } from "@/components/Logo";
import { Loader2 } from "lucide-react";

function CallbackHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState("Completing sign-in...");

  useEffect(() => {
    const token = searchParams.get("token");
    const error = searchParams.get("error");

    if (error) {
      router.replace(`/login?error=${encodeURIComponent(error)}`);
      return;
    }

    if (!token) {
      router.replace("/");
      return;
    }

    fetch("/api/auth/set-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setStatus("Welcome to 5ONG! Redirecting...");
          window.location.href = "/";
        } else {
          router.replace("/login?error=google_token");
        }
      })
      .catch(() => {
        router.replace("/login?error=google_failed");
      });
  }, [searchParams, router]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-6 text-center">
      <div className="glass max-w-sm w-full rounded-3xl p-8 shadow-xl flex flex-col items-center gap-4">
        <SongLogoIcon size={56} className="animate-pulse" />
        <h2 className="text-xl font-black text-ink">5ONG</h2>
        <div className="flex items-center gap-2 text-sm font-bold text-muted">
          <Loader2 size={18} className="animate-spin text-lilac-deep" />
          <span>{status}</span>
        </div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 size={28} className="animate-spin text-lilac-deep" />
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  );
}
