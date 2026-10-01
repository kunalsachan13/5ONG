import { dz, normalizeTracks } from "@/lib/deezer";
import { errorResponse, HttpError } from "@/lib/auth";
import type { Track } from "@/lib/types";

export const maxDuration = 60;

interface SpTrack {
  title: string;
  subtitle: string;
  duration?: number;
}

function parseSpotifyUrl(input: string) {
  const m =
    input.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(playlist|album)\/([A-Za-z0-9]+)/) ||
    input.match(/spotify:(playlist|album):([A-Za-z0-9]+)/);
  if (!m) return null;
  return { kind: m[1], id: m[2] };
}

function norm(s: string) {
  return s
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, " ")
    .replace(/-.*(remaster|version|edit|mix|live).*$/i, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function resolve(t: SpTrack): Promise<Track | null> {
  const artist = t.subtitle.split(/,|&/)[0].trim();
  const queries = [
    `artist:"${artist}" track:"${t.title.replace(/"/g, "")}"`,
    `${t.title} ${artist}`,
  ];
  for (const q of queries) {
    try {
      const r = await dz<{ data: unknown[] }>(`/search?q=${encodeURIComponent(q)}&limit=5`, 3600);
      const cands = normalizeTracks(r.data as never[]);
      if (!cands.length) continue;
      const nt = norm(t.title);
      const ranked = cands
        .map((c) => {
          let score = 0;
          const ct = norm(c.title);
          if (ct === nt) score += 3;
          else if (ct.includes(nt) || nt.includes(ct)) score += 1.5;
          if (norm(c.artist) === norm(artist)) score += 2;
          else if (norm(c.artist).includes(norm(artist)) || norm(artist).includes(norm(c.artist))) score += 1;
          if (t.duration) score -= Math.min(1, Math.abs(c.duration - t.duration / 1000) / 60);
          return { c, score };
        })
        .sort((a, b) => b.score - a.score);
      if (ranked[0].score >= 2) return ranked[0].c;
      if (q === queries[1]) return ranked[0].score >= 1 ? ranked[0].c : null;
    } catch {
      /* try next query */
    }
  }
  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const parsed = parseSpotifyUrl(String(body.url ?? ""));
    if (!parsed) throw new HttpError(400, "Paste a Spotify playlist or album link");

    const res = await fetch(`https://open.spotify.com/embed/${parsed.kind}/${parsed.id}`, {
      headers: { "User-Agent": "Mozilla/5.0 (5ONG importer)", "Accept-Language": "en" },
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
    if (!res.ok) throw new HttpError(404, "Couldn't open that Spotify link. Is the playlist public?");
    const html = await res.text();
    const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!m) throw new HttpError(502, "Spotify returned an unexpected page");
    const entity = JSON.parse(m[1])?.props?.pageProps?.state?.data?.entity;
    const list: SpTrack[] = (entity?.trackList ?? [])
      .filter((t: { title?: string }) => t?.title)
      .map((t: SpTrack) => ({ title: t.title, subtitle: t.subtitle ?? "", duration: t.duration }));
    if (!list.length) throw new HttpError(404, "No tracks found. The playlist must be public.");

    const limited = list.slice(0, 100);
    const results: (Track | null)[] = new Array(limited.length).fill(null);
    let cursor = 0;
    const workers = Array.from({ length: 5 }, async () => {
      while (cursor < limited.length) {
        const i = cursor++;
        results[i] = await resolve(limited[i]);
      }
    });
    await Promise.all(workers);

    const seen = new Set<string>();
    const tracks: Track[] = [];
    const missing: { title: string; artist: string }[] = [];
    results.forEach((t, i) => {
      if (t && !seen.has(t.id)) {
        seen.add(t.id);
        tracks.push(t);
      } else if (!t) missing.push({ title: limited[i].title, artist: limited[i].subtitle });
    });

    return Response.json({
      name: entity?.name || entity?.title || "Imported playlist",
      cover: entity?.coverArt?.sources?.[0]?.url ?? null,
      total: list.length,
      tracks,
      missing,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
