"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, Mail, UserPlus, LogIn } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { Spinner } from "@/components/ui";

type Mode = "signin" | "register" | "otp";

const ERRORS: Record<string, string> = {
  google_not_configured: "Google sign-in isn’t configured on this server yet.",
  google_state: "Google sign-in expired. Please try again.",
  google_token: "Google rejected the sign-in. Please try again.",
  google_profile: "Couldn’t read your Google profile.",
  google_email: "Your Google email isn’t verified.",
  google_create: "Couldn’t create your account.",
  google_failed: "Google sign-in failed. Please try again.",
};

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.3-.4-3.9z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.3-.4-3.9z" />
    </svg>
  );
}

function LoginInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const { user, setUser, providers, toast } = useApp();
  const [mode, setMode] = useState<Mode>("signin");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(ERRORS[sp.get("error") ?? ""] ?? null);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);

  useEffect(() => {
    if (user) router.replace("/");
  }, [user, router]);

  async function post(url: string, body: unknown) {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Something went wrong");
      return j;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "signin") {
      const j = await post("/api/auth/login", { identifier, password });
      if (j) {
        setUser(j.user);
        toast(`Welcome back, ${j.user.username}!`);
      }
    } else if (mode === "register") {
      const j = await post("/api/auth/register", { email, username, password });
      if (j) {
        setUser(j.user);
        toast(`Welcome to 5ONG, ${j.user.username}!`);
      }
    } else if (!otpSent) {
      const j = await post("/api/auth/otp/request", { email });
      if (j) {
        setOtpSent(true);
        setDevCode(j.devCode ?? null);
        toast(j.delivery === "email" ? "Code sent. Check your inbox." : "Code generated (demo mode)");
      }
    } else {
      const j = await post("/api/auth/otp/verify", { email, code });
      if (j) {
        setUser(j.user);
        toast(`Signed in as ${j.user.username}`);
      }
    }
  }

  const tab = (m: Mode, label: string, Icon: typeof Mail) => (
    <button
      type="button"
      role="tab"
      aria-selected={mode === m}
      className={`btn flex-1 !px-2 !py-2 !text-xs sm:!text-sm ${mode === m ? "btn-primary" : "btn-ghost"}`}
      onClick={() => {
        setMode(m);
        setError(null);
      }}
    >
      <Icon size={15} /> {label}
    </button>
  );

  return (
    <div className="mx-auto grid max-w-md gap-6 py-4 md:py-10">
      <div className="text-center">
        <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-3xl bg-gradient-to-br from-lilac via-pink to-peach text-3xl font-black shadow-lg shadow-lilac-deep/25">
          5
        </div>
        <h1 className="text-3xl font-black">Sign in to 5ONG</h1>
        <p className="text-sm text-muted">Save playlists, likes and join listening rooms.</p>
      </div>

      <div className="card flex flex-col gap-4 p-5 md:p-6">
        {providers.google ? (
          <a href="/api/auth/google" className="btn btn-soft !py-3">
            <GoogleIcon /> Continue with Google
          </a>
        ) : (
          <button className="btn btn-soft !py-3" disabled title="Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable">
            <GoogleIcon /> Continue with Google
            <span className="rounded-full bg-butter px-2 py-0.5 text-[10px] font-black">needs setup</span>
          </button>
        )}
        <div className="flex items-center gap-3 text-xs font-bold text-muted">
          <span className="h-px flex-1 bg-lilac/40" /> or <span className="h-px flex-1 bg-lilac/40" />
        </div>

        <div className="flex gap-1 rounded-full bg-lilac/20 p-1" role="tablist">
          {tab("signin", "Password", LogIn)}
          {tab("register", "Register", UserPlus)}
          {tab("otp", "Email code", KeyRound)}
        </div>

        <form className="flex flex-col gap-3" onSubmit={submit}>
          {mode === "signin" && (
            <>
              <input className="input" placeholder="Email or username" autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
              <input className="input" type="password" placeholder="Password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </>
          )}
          {mode === "register" && (
            <>
              <input className="input" type="email" placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <input className="input" placeholder="Username (letters, numbers, _ .)" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required minLength={3} maxLength={24} />
              <input className="input" type="password" placeholder="Password (8+ characters)" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
            </>
          )}
          {mode === "otp" && (
            <>
              <input className="input" type="email" placeholder="Email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={otpSent} />
              {otpSent && (
                <>
                  <input
                    className="input text-center font-mono text-2xl font-black tracking-[0.4em]"
                    inputMode="numeric"
                    placeholder="000000"
                    maxLength={6}
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                    aria-label="6-digit code"
                    autoFocus
                    required
                  />
                  {devCode && (
                    <p className="rounded-2xl bg-butter/70 p-3 text-center text-xs font-bold">
                      Email delivery isn’t configured on this server, so here’s your code:{" "}
                      <button type="button" className="font-mono text-base font-black underline" onClick={() => setCode(devCode)}>
                        {devCode}
                      </button>
                    </p>
                  )}
                  <button
                    type="button"
                    className="text-xs font-bold text-muted underline"
                    onClick={() => {
                      setOtpSent(false);
                      setCode("");
                      setDevCode(null);
                    }}
                  >
                    Use a different email / resend
                  </button>
                </>
              )}
            </>
          )}
          {error && (
            <p role="alert" className="rounded-2xl bg-pink/50 px-3 py-2 text-sm font-bold">
              {error}
            </p>
          )}
          <button className="btn btn-primary !py-3" disabled={busy}>
            {busy && <Spinner size={16} />}
            {mode === "signin" ? "Sign in" : mode === "register" ? "Create account" : otpSent ? "Verify & sign in" : "Send me a code"}
          </button>
        </form>
        <p className="text-center text-[11px] text-muted">Passwords are hashed with bcrypt. One-time codes expire in 10 minutes.</p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
