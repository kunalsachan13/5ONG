"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";
import { reportError } from "@/lib/errorMonitoring";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, { component: "app/error.tsx" });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center p-6 text-center">
      <div className="card flex max-w-md flex-col items-center gap-4 p-8 shadow-xl">
        <div className="grid h-16 w-16 place-items-center rounded-3xl bg-pink/20 text-rose-500 dark:bg-rose-500/20">
          <AlertCircle size={36} />
        </div>
        <h2 className="text-2xl font-black text-ink dark:text-white">Something went wrong</h2>
        <p className="text-sm font-semibold text-muted">
          {error?.message || "An unexpected error occurred while loading this view."}
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <button
            onClick={() => reset()}
            className="btn btn-primary flex items-center gap-2"
          >
            <RotateCcw size={16} /> Try again
          </button>
          <Link href="/" className="btn btn-soft flex items-center gap-2">
            <Home size={16} /> Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
