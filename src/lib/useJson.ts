"use client";

import { useCallback, useEffect, useState } from "react";

export function useJson<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(url));
  const [error, setError] = useState<string | null>(null);
  const [ticket, setTicket] = useState(0);

  const refetch = useCallback(() => {
    setTicket((t) => t + 1);
  }, []);

  useEffect(() => {
    const onAppRefresh = () => {
      setTicket((t) => t + 1);
    };
    window.addEventListener("app:refresh", onAppRefresh);
    return () => window.removeEventListener("app:refresh", onAppRefresh);
  }, []);

  useEffect(() => {
    if (!url) {
      setData(null);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    setError(null);

    const fetchUrl = ticket > 0
      ? (url.includes("?") ? `${url}&_t=${Date.now()}` : `${url}?_t=${Date.now()}`)
      : url;

    fetch(fetchUrl, ticket > 0 ? { cache: "no-store" } : undefined)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok && !alive) return;
        if (alive) {
          setData(j);
          if (!r.ok) setError(j.error ?? "Request failed");
        }
      })
      .catch(() => alive && setError("Network error"))
      .finally(() => alive && setLoading(false));

    return () => {
      alive = false;
    };
  }, [url, ticket]);

  return { data, loading, error, refetch, setData };
}
