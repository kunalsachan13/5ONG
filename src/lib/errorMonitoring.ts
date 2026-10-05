/**
 * Error Monitoring & Telemetry for 5ONG
 * Captures uncaught client errors, unhandled rejections, and audio player failures.
 */

export interface ErrorReport {
  message: string;
  stack?: string;
  name?: string;
  digest?: string;
  pathname?: string;
  userAgent?: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

export function reportError(error: unknown, context?: Record<string, unknown>) {
  if (typeof window === "undefined") return;

  try {
    const err = error instanceof Error ? error : new Error(String(error));
    const report: ErrorReport = {
      name: err.name || "Error",
      message: err.message || "Unknown error",
      stack: err.stack,
      digest: (err as unknown as { digest?: string }).digest,
      pathname: window.location.pathname,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      context,
    };

    console.error("[5ONG ErrorMonitor]", report.message, report);

    // Send error report to serverless logging endpoint
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/monitoring/errors", JSON.stringify(report));
    } else {
      fetch("/api/monitoring/errors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(report),
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Prevent recursive crash in error reporter
  }
}

/**
 * Initializes global browser error & unhandled promise rejection listeners
 */
export function initErrorMonitoring() {
  if (typeof window === "undefined" || (window as unknown as { __5ong_error_mon_init?: boolean }).__5ong_error_mon_init) {
    return;
  }
  (window as unknown as { __5ong_error_mon_init?: boolean }).__5ong_error_mon_init = true;

  window.addEventListener("error", (event) => {
    reportError(event.error || event.message, {
      source: "window.onerror",
      lineno: event.lineno,
      colno: event.colno,
      filename: event.filename,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    reportError(event.reason, {
      source: "unhandledrejection",
    });
  });
}
