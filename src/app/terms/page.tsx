import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileText, CheckCircle2, AlertTriangle, Scale, Globe, Mail } from "lucide-react";
import Logo from "@/components/Logo";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "Review the Terms and Conditions of Service governing your use of 5ONG's music streaming and listening room application.",
  alternates: {
    canonical: "/terms",
  },
};

export default function TermsPage() {
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
            <FileText size={14} /> Legal Agreement
          </div>
          <h1 className="text-3xl font-black md:text-5xl text-ink dark:text-white">Terms &amp; Conditions</h1>
          <p className="mt-2 text-sm text-muted">
            Last Updated: {lastUpdated} • Please read carefully before using the 5ONG platform.
          </p>
        </div>

        <div className="space-y-8 text-sm leading-relaxed text-ink/80 dark:text-white/80">
          <section>
            <h2 className="flex items-center gap-2 text-lg font-black text-ink dark:text-white mb-3">
              <CheckCircle2 size={18} className="text-lilac-deep" /> 1. Acceptance of Terms
            </h2>
            <p>
              By accessing, browsing, installing, or playing music on 5ONG (&quot;the Platform&quot;, &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), you acknowledge that you have read, understood, and agreed to be bound by these Terms and Conditions and our Privacy Policy. If you do not agree to these terms, you must discontinue your use of the Platform immediately.
            </p>
          </section>

          <section>
            <h2 className="flex items-center gap-2 text-lg font-black text-ink dark:text-white mb-3">
              <Globe size={18} className="text-lilac-deep" /> 2. Description of the Service
            </h2>
            <p>
              5ONG is a digital audio streaming, local media playback, and collaborative listening room client designed for personal, non-commercial enjoyment. Key features include:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1.5 text-muted dark:text-white/70">
              <li>High-fidelity audio stream resolution from public and authorized media networks.</li>
              <li>Local audio playback on Windows, Android, and web browsers with zero server upload of private files.</li>
              <li>Real-time peer listening rooms with collaborative playback controls and live chat.</li>
              <li>Playlist curation, taste discovery algorithms, and cloud playback synchronization.</li>
            </ul>
          </section>

          <section>
            <h2 className="flex items-center gap-2 text-lg font-black text-ink dark:text-white mb-3">
              <Scale size={18} className="text-lilac-deep" /> 3. Intellectual Property &amp; DMCA Copyright Policy
            </h2>
            <p>
              5ONG respects the intellectual property rights of artists, record labels, and content creators. Audio tracks played via 5ONG are indexed or streamed from third-party media sources or local files residing on the user&apos;s device.
            </p>
            <p className="mt-2">
              If you are a copyright owner or an agent thereof and believe that any content available via 5ONG infringes your copyright, you may submit a formal notification under the Digital Millennium Copyright Act (DMCA) with the following details:
            </p>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-muted dark:text-white/70">
              <li>Identification of the copyrighted work claimed to have been infringed.</li>
              <li>Identification of the material that is claimed to be infringing and information sufficient to permit us to locate the material.</li>
              <li>Your contact information (name, physical address, telephone number, and email address).</li>
              <li>A statement made under penalty of perjury that the information in the notification is accurate.</li>
            </ul>
            <p className="mt-2">
              Send copyright notices to our designated agent at:{" "}
              <a href="mailto:dmca@5ong.app" className="font-bold text-lilac-deep underline">
                dmca@5ong.app
              </a>.
            </p>
          </section>

          <section>
            <h2 className="flex items-center gap-2 text-lg font-black text-ink dark:text-white mb-3">
              <AlertTriangle size={18} className="text-lilac-deep" /> 4. Acceptable Use &amp; Community Guidelines
            </h2>
            <p>You agree not to:</p>
            <ul className="mt-2 list-disc pl-5 space-y-1.5 text-muted dark:text-white/70">
              <li>Use the Platform for any commercial broadcasting or public rebroadcasting without licensing.</li>
              <li>Engage in automated scraping, botting, bulk audio ripping, or distributed denial-of-service against our APIs.</li>
              <li>Post hateful, abusive, harassing, or sexually explicit messages or avatars in collaborative listening rooms.</li>
              <li>Attempt to reverse-engineer server security, bypass rate limits, or exploit authentication mechanisms.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-black text-ink dark:text-white mb-3">5. Disclaimer of Warranties &amp; Limitation of Liability</h2>
            <p className="text-muted dark:text-white/70">
              5ONG IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT AUDIO STREAMS WILL BE UNINTERRUPTED, LOSSLESS AT ALL TIMES, OR ERROR-FREE.
            </p>
            <p className="mt-2 text-muted dark:text-white/70">
              IN NO EVENT SHALL 5ONG, ITS CREATORS, OR CONTRIBUTORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING OUT OF YOUR USE OF THE SERVICE.
            </p>
          </section>

          <section className="border-t border-ink/10 dark:border-white/10 pt-6">
            <h2 className="flex items-center gap-2 text-base font-black text-ink dark:text-white mb-2">
              <Mail size={16} className="text-lilac-deep" /> 6. Inquiries &amp; Contact
            </h2>
            <p>
              For legal inquiries, feedback, or support questions regarding these terms, please contact us at{" "}
              <a href="mailto:legal@5ong.app" className="font-bold text-lilac-deep underline">
                legal@5ong.app
              </a>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
