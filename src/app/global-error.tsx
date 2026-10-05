"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { reportError } from "@/lib/errorMonitoring";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, { component: "app/global-error.tsx" });
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body className="flex min-h-screen flex-col items-center justify-center bg-[#0c0918] p-6 text-white font-sans">
        <div className="flex max-w-md flex-col items-center gap-4 rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-2xl backdrop-blur-xl">
          <div className="grid h-16 w-16 place-items-center rounded-2xl bg-rose-500/20 text-rose-400">
            <AlertTriangle size={36} />
          </div>
          <h1 className="text-2xl font-black">Application Error</h1>
          <p className="text-sm text-gray-300">
            A critical error occurred while initializing the 5ONG audio engine.
          </p>
          {error?.digest && (
            <p className="rounded-lg bg-black/40 px-2 py-1 font-mono text-xs text-gray-400">
              Digest: {error.digest}
            </p>
          )}
          <button
            onClick={() => reset()}
            className="mt-2 inline-flex items-center gap-2 rounded-2xl bg-purple-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-purple-500 transition-all"
          >
            <RotateCcw size={16} /> Reload 5ONG
          </button>
        </div>
      </body>
    </html>
  );
}
