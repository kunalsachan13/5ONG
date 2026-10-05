/**
 * Lyrics fetching utility for player and audio tagging
 */

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

export async function fetchRawLyrics(
  rawTitle: string,
  rawArtist: string,
  album?: string,
  duration?: number
): Promise<{ syncedLyrics?: string; plainLyrics?: string } | null> {
  if (!rawTitle) return null;

  const cleanedTitle = cleanTitle(rawTitle);
  const artistCandidates = getArtistCandidates(rawArtist);
  const primaryArtist = artistCandidates[0] || rawArtist;
  const headers = { "User-Agent": "5ONG/1.0 (music player; github.com/5ong)" };

  // 1. Direct exact LRCLib get
  try {
    const p = new URLSearchParams({ track_name: rawTitle, artist_name: rawArtist });
    if (album) p.set("album_name", album);
    if (duration) p.set("duration", String(duration));
    const res = await fetch(`https://lrclib.net/api/get?${p}`, { headers, signal: AbortSignal.timeout(3500) });
    if (res.ok) {
      const data = await res.json();
      if (data?.syncedLyrics || data?.plainLyrics) {
        return { syncedLyrics: data.syncedLyrics, plainLyrics: data.plainLyrics };
      }
    }
  } catch {}

  // 2. Exact LRCLib get with cleaned title & primary artist
  try {
    const p = new URLSearchParams({ track_name: cleanedTitle, artist_name: primaryArtist });
    if (duration) p.set("duration", String(duration));
    const res = await fetch(`https://lrclib.net/api/get?${p}`, { headers, signal: AbortSignal.timeout(3500) });
    if (res.ok) {
      const data = await res.json();
      if (data?.syncedLyrics || data?.plainLyrics) {
        return { syncedLyrics: data.syncedLyrics, plainLyrics: data.plainLyrics };
      }
    }
  } catch {}

  // 3. Search query
  try {
    const query = `${cleanedTitle} ${primaryArtist}`.trim();
    const res = await fetch(`https://lrclib.net/api/search?q=${encodeURIComponent(query)}`, {
      headers,
      signal: AbortSignal.timeout(4000),
    });
    if (res.ok) {
      const list = (await res.json()) as { syncedLyrics?: string; plainLyrics?: string; duration?: number }[];
      if (Array.isArray(list) && list.length > 0) {
        const best =
          list
            .filter((x) => x.syncedLyrics)
            .sort((a, b) => Math.abs((a.duration ?? 0) - (duration ?? 0)) - Math.abs((b.duration ?? 0) - (duration ?? 0)))[0] ??
          list.find((x) => x.plainLyrics);
        if (best?.syncedLyrics || best?.plainLyrics) {
          return { syncedLyrics: best.syncedLyrics, plainLyrics: best.plainLyrics };
        }
      }
    }
  } catch {}

  return null;
}
