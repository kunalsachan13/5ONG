import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Lock, Eye, Database, Bell, UserCheck } from "lucide-react";
import Logo from "@/components/Logo";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Learn how 5ONG collects, uses, and safeguards your personal data when using our high-fidelity music streaming service.",
  alternates: {
    canonical: "/privacy",
  },
};

export default function PrivacyPolicyPage() {
  const lastUpdated = "April 2026";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:py-12">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="btn btn-soft inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider"
        >
          <ArrowLeft size={16} /> Back to Player
        </Link>
        <Logo size={32} showText={false} />
      </div>

      <div className="card border border-ink/5 dark:border-white/10 p-6 md:p-10 shadow-2xl backdrop-blur-xl">
        <div className="mb-8 border-b border-ink/10 dark:border-white/10 pb-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-lilac/30 dark:bg-purple-500/20 px-3 py-1 text-xs font-black text-lilac-deep dark:text-purple-300 mb-3">
            <ShieldCheck size={14} /> Trust & Transparency
          </div>
          <h1 className="text-3xl font-black md:text-5xl text-ink dark:text-white">Privacy Policy</h1>
          <p className="mt-2 text-sm text-muted">
            Last Updated: {lastUpdated} • Effective immediately for all visitors and listeners.
          </p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed text-ink/80 dark:text-white/80">
          <section>
            <h2 className="flex items-center gap-2 text-lg font-black text-ink dark:text-white mb-3">
              <Eye size={18} className="text-lilac-deep" /> 1. Overview & Information We Collect
            </h2>
            <p>
              At 5ONG, your privacy is a foundational priority. We believe in providing high-fidelity music streaming with zero unnecessary tracking or invasive data brokers. We collect only the information strictly necessary to provide, protect, and enhance your music listening experience:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1.5 text-muted dark:text-white/70">
              <li>
                <strong className="text-ink dark:text-white">Account Information:</strong> When you register or sign in using email, phone OTP, or Google Sign-In, we store your username, hashed credentials, email address, or verified Google profile identifier.
              </li>
              <li>
                <strong className="text-ink dark:text-white">Listening & Library Data:</strong> Songs you play, liked tracks, custom playlists, listening history, and audio preferences (such as volume levels and equalization).
              </li>
              <li>
                <strong className="text-ink dark:text-white">Collaborative Jam Rooms:</strong> Room sessions you join or host, temporary room chat messages, and synchronized playback events.
              </li>
              <li>
                <strong className="text-ink dark:text-white">Device & Technical Diagnostics:</strong> Browser type, operating system version, screen resolution, network connectivity indicators, and anonymized error crash dumps.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="flex items-center gap-2 text-lg font-black text-ink dark:text-white mb-3">
              <Database size={18} className="text-lilac-deep" /> 2. How We Use Your Data
            </h2>
            <p>We process your data exclusively for the following transparent purposes:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1.5 text-muted dark:text-white/70">
              <li>Streaming requested audio streams, decoding lossless streams, and managing audio playback queues.</li>
              <li>Generating personalized recommendations, genre suggestions, and rediscovery mixes based on your listening habits.</li>
              <li>Synchronizing collaborative listening rooms in real time between peers.</li>
              <li>Preventing malicious bot activity, credential stuffing, API abuse, and denial-of-service attempts.</li>
              <li>Delivering authentication verification codes (OTP) via transactional email or SMS when requested by you.</li>
            </ul>
          </section>

          <section>
            <h2 className="flex items-center gap-2 text-lg font-black text-ink dark:text-white mb-3">
              <Lock size={18} className="text-lilac-deep" /> 3. Cookies, Local Storage & Privacy Choices
            </h2>
            <p>
              5ONG utilizes local browser storage and strictly necessary session cookies to maintain your authentication state and remember playback configurations (e.g. dark/light theme, audio queue, volume):
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-ink/10 dark:border-white/10 bg-white/40 dark:bg-white/5 p-4">
                <h3 className="font-extrabold text-ink dark:text-white">Essential Cookies & Storage</h3>
                <p className="mt-1 text-xs text-muted">
                  Required for user login sessions, player queue persistence, audio state, and security authentication tokens. Cannot be disabled without breaking core playback.
                </p>
              </div>
              <div className="rounded-2xl border border-ink/10 dark:border-white/10 bg-white/40 dark:bg-white/5 p-4">
                <h3 className="font-extrabold text-ink dark:text-white">Analytics & Performance</h3>
                <p className="mt-1 text-xs text-muted">
                  Anonymous metrics to measure page load speeds, error rates, and track popularity trends. Subject to your explicit consent in our Cookie Consent banner.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="flex items-center gap-2 text-lg font-black text-ink dark:text-white mb-3">
              <Bell size={18} className="text-lilac-deep" /> 4. Third-Party Integrations & Content Delivery
            </h2>
            <p>
              To offer comprehensive catalogs and lightning-fast streaming, 5ONG interfaces with trusted infrastructure providers:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1.5 text-muted dark:text-white/70">
              <li><strong className="text-ink dark:text-white">Audio Streaming Providers:</strong> Audio streams and metadata may be resolved from authorized CDN endpoints, YouTube data sources, or Spotify public APIs.</li>
              <li><strong className="text-ink dark:text-white">Database & Serverless Infrastructure:</strong> Serverless PostgreSQL databases hosted on Neon with transport encryption (TLS 1.3).</li>
              <li><strong className="text-ink dark:text-white">Authentication:</strong> Google OAuth 2.0 and transactional email providers (Resend). We never receive your Google account password.</li>
            </ul>
          </section>

          <section>
            <h2 className="flex items-center gap-2 text-lg font-black text-ink dark:text-white mb-3">
              <UserCheck size={18} className="text-lilac-deep" /> 5. Your Rights (GDPR, CCPA & Data Deletion)
            </h2>
            <p>
              Regardless of your physical jurisdiction, 5ONG grants you complete sovereignty over your data:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1.5 text-muted dark:text-white/70">
              <li><strong>Right to Access:</strong> You can inspect all personal data tied to your account at any time.</li>
              <li><strong>Right to Rectification:</strong> You may update your username, avatar, and settings in real time.</li>
              <li><strong>Right to Erasure (Forget Me):</strong> You have the right to request immediate and complete deletion of your account, history, and playlists.</li>
              <li><strong>Right to Data Portability:</strong> You may export your custom playlists and saved tracks.</li>
            </ul>
            <p className="mt-3">
              To exercise any of these privacy rights, reach out directly to our privacy team at{" "}
              <a href="mailto:privacy@5ong.app" className="font-bold text-lilac-deep underline">
                privacy@5ong.app
              </a>.
            </p>
          </section>

          <section className="border-t border-ink/10 dark:border-white/10 pt-6">
            <h2 className="text-base font-black text-ink dark:text-white mb-2">6. Security Measures</h2>
            <p>
              All traffic between your client device and 5ONG servers is strictly transmitted over HTTPS with HTTP Strict Transport Security (HSTS). Passwords are never stored in plaintext and are salted and hashed using industry-standard bcrypt algorithms.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
