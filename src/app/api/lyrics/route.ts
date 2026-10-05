import type { LyricLine, LyricsResult } from "@/lib/types";

export const dynamic = "force-dynamic";

const cache = new Map<string, LyricsResult>();

function parseLrc(lrc: string): LyricLine[] {
  const lines: LyricLine[] = [];
  for (const raw of lrc.split(/\r?\n/)) {
    const stamps = [...raw.matchAll(/\[(\d+):(\d+(?:\.\d+)?)\]/g)];
    if (!stamps.length) continue;
    const text = raw.replace(/\[[^\]]*\]/g, "").trim();
    for (const m of stamps) lines.push({ t: Number(m[1]) * 60 + Number(m[2]), text });
  }
  return lines.sort((a, b) => a.t - b.t);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toResult(hit: any): LyricsResult {
  return {
    synced: hit?.syncedLyrics ? parseLrc(hit.syncedLyrics) : null,
    plain: hit?.plainLyrics ?? null,
    instrumental: Boolean(hit?.instrumental),
  };
}

function cleanTitle(raw: string): string {
  return raw
    .replace(/\s*[\(\[](From\s+[^)\]]+|Official[^)\]]*|Audio[^)\]]*|Video[^)\]]*|Lyric[^)\]]*|Lyrical[^)\]]*|feat\.?[^)\]]*|ft\.?[^)\]]*|with\s+[^)\]]*|Remix[^)\]]*|Slowed[^)\]]*)[\)\]]/gi, "")
    .replace(/\s*-\s*(From\s+.*|Official.*|Remaster.*)$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getArtistCandidates(raw: string): string[] {
  const split = raw
    .split(/[,&/|]|(?:\s+feat\.?\s+)|\s+ft\.?\s+|\s+and\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);
  return split.length > 0 ? split : [raw.trim()];
}

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const rawTitle = sp.get("title") ?? "";
  const rawArtist = sp.get("artist") ?? "";
  const album = sp.get("album") ?? "";
  const duration = Number(sp.get("duration") ?? 0);

  if (!rawTitle) return Response.json({ synced: null, plain: null });

  const cleanedTitle = cleanTitle(rawTitle);
  const artistCandidates = getArtistCandidates(rawArtist);
  const primaryArtist = artistCandidates[0] || rawArtist;

  const key = `${rawArtist}|${rawTitle}|${duration}`.toLowerCase();
  const hit = cache.get(key);
  if (hit) return Response.json(hit);

  const headers = { "User-Agent": "5ONG/1.0 (music player; github.com/5ong)" };

  let result: LyricsResult | null = null;

  // 1. Direct exact LRCLib get with raw parameters
  try {
    const p = new URLSearchParams({ track_name: rawTitle, artist_name: rawArtist });
    if (album) p.set("album_name", album);
    if (duration) p.set("duration", String(duration));
    const res = await fetch(`https://lrclib.net/api/get?${p}`, { headers, signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      if (data?.syncedLyrics || data?.plainLyrics) {
        result = toResult(data);
      }
    }
  } catch {}

  // 2. Exact LRCLib get with cleaned title & primary artist
  if (!result || (!result.synced && !result.plain)) {
    try {
      const p = new URLSearchParams({ track_name: cleanedTitle, artist_name: primaryArtist });
      if (duration) p.set("duration", String(duration));
      const res = await fetch(`https://lrclib.net/api/get?${p}`, { headers, signal: AbortSignal.timeout(4000) });
      if (res.ok) {
        const data = await res.json();
        if (data?.syncedLyrics || data?.plainLyrics) {
          result = toResult(data);
        }
      }
    } catch {}
  }

  // 3. Structured LRCLib search with cleaned params
  if (!result || (!result.synced && !result.plain)) {
    try {
      const res = await fetch(
        `https://lrclib.net/api/search?${new URLSearchParams({ track_name: cleanedTitle, artist_name: primaryArtist })}`,
        { headers, signal: AbortSignal.timeout(5000) }
      );
      if (res.ok) {
        const list = (await res.json()) as { syncedLyrics?: string; plainLyrics?: string; duration?: number }[];
        if (Array.isArray(list) && list.length > 0) {
          const best =
            list
              .filter((x) => x.syncedLyrics)
              .sort((a, b) => Math.abs((a.duration ?? 0) - duration) - Math.abs((b.duration ?? 0) - duration))[0] ??
            list.find((x) => x.plainLyrics);
          if (best) result = toResult(best);
        }
      }
    } catch {}
  }

  // 4. Broad LRCLib query search (e.g., "Kesariya Arijit Singh")
  if (!result || (!result.synced && !result.plain)) {
    try {
      const query = `${cleanedTitle} ${primaryArtist}`.trim();
      const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`, {
        headers,
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const list = (await res.json()) as {
          trackName?: string;
          artistName?: string;
          syncedLyrics?: string;
          plainLyrics?: string;
          duration?: number;
        }[];
        if (Array.isArray(list) && list.length > 0) {
          const best =
            list
              .filter((x) => x.syncedLyrics)
              .sort((a, b) => Math.abs((a.duration ?? 0) - duration) - Math.abs((b.duration ?? 0) - duration))[0] ??
            list.find((x) => x.plainLyrics);
          if (best) result = toResult(best);
        }
      }
    } catch {}
  }

  // 5. Fallback: Lyrics.ovh for plain lyrics
  if (!result || (!result.synced && !result.plain)) {
    try {
      const ovhRes = await fetch(
        `https://api.lyrics.ovh/v1/${encodeURIComponent(primaryArtist)}/${encodeURIComponent(cleanedTitle)}`,
        { signal: AbortSignal.timeout(4000) }
      );
      if (ovhRes.ok) {
        const ovhData = (await ovhRes.json()) as { lyrics?: string };
        if (ovhData?.lyrics) {
          result = {
            synced: null,
            plain: ovhData.lyrics.trim(),
            instrumental: false,
          };
        }
      }
    } catch {}
  }

  const final = result ?? { synced: null, plain: null, instrumental: false };
  cache.set(key, final);
  return Response.json(final);
}
