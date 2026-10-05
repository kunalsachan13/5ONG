"use client";

import { createContext, useContext, useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getStoredCookiePreferences } from "./CookieConsent";

interface AnalyticsContextType {
  trackEvent: (eventName: string, properties?: Record<string, unknown>) => void;
}

const AnalyticsContext = createContext<AnalyticsContextType>({
  trackEvent: () => {},
});

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const lastTrackedUrl = useRef<string | null>(null);

  const trackEvent = (eventName: string, properties?: Record<string, unknown>) => {
    try {
      const prefs = getStoredCookiePreferences();
      // If user explicitly rejected analytics, do not track
      if (prefs && prefs.decided && !prefs.analytics) {
        return;
      }

      const payload = {
        event: eventName,
        url: typeof window !== "undefined" ? window.location.pathname : "",
        timestamp: new Date().toISOString(),
        properties: properties || {},
      };

      // In production or when endpoint exists, send beacon
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon("/api/analytics", JSON.stringify(payload));
      } else {
        fetch("/api/analytics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true,
        }).catch(() => {});
      }
    } catch {
      // ignore errors in tracking
    }
  };

  useEffect(() => {
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
    if (url !== lastTrackedUrl.current) {
      lastTrackedUrl.current = url;
      trackEvent("page_view", { path: pathname });
    }
  }, [pathname, searchParams]);

  return (
    <AnalyticsContext.Provider value={{ trackEvent }}>
      {children}
    </AnalyticsContext.Provider>
  );
}

export function useAnalytics() {
  return useContext(AnalyticsContext);
}
