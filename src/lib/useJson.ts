"use client";

import { useEffect, useState } from "react";

export function useJson<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(url));
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!url) {
      setData(null);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    setError(null);
    fetch(url)
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
  }, [url]);
  return { data, loading, error };
}
