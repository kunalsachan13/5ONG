import type { Track } from "@/lib/types";

const BASE = "https://api.deezer.com";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Raw = any;

export function normalizeTrack(t: Raw, fallbackAlbum?: Raw): Track | null {
  if (!t || !t.id || t.readable === false) return null;
  const album = t.album ?? fallbackAlbum ?? {};
  return {
    id: String(t.id),
    title: t.title_short || t.title || "Unknown",
    artist: t.artist?.name ?? "Unknown artist",
    artistId: t.artist?.id ? String(t.artist.id) : undefined,
    album: album.title,
    cover: album.cover_medium || album.cover || t.artist?.picture_medium || "",
    coverBig: album.cover_xl || album.cover_big || album.cover_medium || "",
    duration: Number(t.duration) || 0,
    explicit: Boolean(t.explicit_lyrics),
  };
}

export function normalizeTracks(list: Raw[] | undefined, fallbackAlbum?: Raw): Track[] {
  const out: Track[] = [];
  const seen = new Set<string>();
  for (const raw of list ?? []) {
    const t = normalizeTrack(raw, fallbackAlbum);
    if (t && !seen.has(t.id)) {
      seen.add(t.id);
      out.push(t);
    }
  }
  return out;
}

export async function dz<T = Raw>(path: string, revalidate = 300): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    next: { revalidate },
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`Deezer ${res.status}`);
  const json = await res.json();
  if (json?.error) throw new Error(json.error.message || "Deezer error");
  return json as T;
}

const previewCache = new Map<string, { url: string; at: number; meta: Raw }>();

export async function getPreview(id: string) {
  const hit = previewCache.get(id);
  if (hit && Date.now() - hit.at < 4 * 60 * 1000) return hit;
  const res = await fetch(`${BASE}/track/${encodeURIComponent(id)}`, { cache: "no-store" });
  const meta = await res.json();
  if (!meta || meta.error || !meta.preview) return null;
  const entry = { url: String(meta.preview), at: Date.now(), meta };
  previewCache.set(id, entry);
  if (previewCache.size > 500) {
    const first = previewCache.keys().next().value;
    if (first) previewCache.delete(first);
  }
  return entry;
}
