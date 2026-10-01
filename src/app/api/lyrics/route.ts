import type { LyricLine, LyricsResult } from "@/lib/types";

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

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const title = sp.get("title") ?? "";
  const artist = sp.get("artist") ?? "";
  const album = sp.get("album") ?? "";
  const duration = Number(sp.get("duration") ?? 0);
  if (!title) return Response.json({ synced: null, plain: null });
  const key = `${artist}|${title}|${duration}`.toLowerCase();
  const hit = cache.get(key);
  if (hit) return Response.json(hit);

  const headers = { "User-Agent": "5ONG/1.0 (music player)" };
  try {
    const p = new URLSearchParams({ track_name: title, artist_name: artist });
    if (album) p.set("album_name", album);
    if (duration) p.set("duration", String(duration));
    let res = await fetch(`https://lrclib.net/api/get?${p}`, { headers, signal: AbortSignal.timeout(7000) });
    let result: LyricsResult | null = null;
    if (res.ok) result = toResult(await res.json());
    if (!result || (!result.synced && !result.plain)) {
      res = await fetch(
        `https://lrclib.net/api/search?${new URLSearchParams({ track_name: title, artist_name: artist })}`,
        { headers, signal: AbortSignal.timeout(7000) },
      );
      if (res.ok) {
        const list = (await res.json()) as { syncedLyrics?: string; plainLyrics?: string; duration?: number }[];
        const best =
          list
            .filter((x) => x.syncedLyrics)
            .sort((a, b) => Math.abs((a.duration ?? 0) - duration) - Math.abs((b.duration ?? 0) - duration))[0] ??
          list.find((x) => x.plainLyrics);
        result = best ? toResult(best) : null;
      }
    }
    const final = result ?? { synced: null, plain: null };
    cache.set(key, final);
    return Response.json(final);
  } catch {
    return Response.json({ synced: null, plain: null });
  }
}
