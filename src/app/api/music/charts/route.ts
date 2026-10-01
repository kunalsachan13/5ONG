import { dz, normalizeTracks } from "@/lib/deezer";
import type { Track } from "@/lib/types";

export const dynamic = "force-dynamic";

async function getItunesTopHits(limit = 50): Promise<Track[]> {
  try {
    const res = await fetch(`https://itunes.apple.com/us/rss/topsongs/limit=${limit}/json`, {
      headers: { "User-Agent": "5ONG/2.0 (Music Charts)" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const entries = data?.feed?.entry || [];
    return entries.map((e: any, idx: number) => {
      const id = e.id?.attributes?.["im:id"] || `chart_${idx}`;
      const title = e["im:name"]?.label || "Unknown Title";
      const artist = e["im:artist"]?.label || "Unknown Artist";
      const images = e["im:image"] || [];
      const bestImg = images[images.length - 1]?.label || "";
      // Replace low-res 170x170 with crisp 600x600 high-res album artwork
      const cover = bestImg ? bestImg.replace(/\/\d+x\d+bb\./, "/600x600bb.") : "";
      const preview = e.link?.find?.((l: any) => l.attributes?.rel === "enclosure")?.attributes?.href || null;

      return {
        id: `itunes_${id}`,
        title,
        artist,
        album: e["im:collection"]?.["im:name"]?.label || title,
        cover,
        coverBig: cover,
        duration: 195,
        preview_url: preview,
        source: "itunes",
      };
    });
  } catch (e) {
    console.warn("iTunes RSS charts note:", e);
    return [];
  }
}

async function getSpotifyTopHits(limit = 50): Promise<Track[]> {
  try {
    const res = await fetch("https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!match) return [];
    const data = JSON.parse(match[1]);
    const entity = data?.props?.pageProps?.state?.data?.entity || {};
    const defaultCover =
      entity.coverArt?.sources?.[0]?.url ||
      entity.visualIdentity?.image?.[2]?.url ||
      entity.visualIdentity?.image?.[1]?.url ||
      "";
    const rawTracks = entity?.trackList || [];
    return rawTracks.slice(0, limit).map((item: any, idx: number) => {
      const trackId = item.uri ? item.uri.split(":").pop() : `sp_${idx}`;
      const cover = item.coverArt?.sources?.[0]?.url || defaultCover;
      return {
        id: `sp_${trackId}`,
        title: item.title || "Unknown Title",
        artist: item.subtitle || "Unknown Artist",
        album: "Today's Top Hits",
        cover,
        coverBig: cover,
        duration: Math.round((item.duration || 180000) / 1000),
        preview_url: item.audioPreview?.url || null,
        source: "spotify",
      };
    });
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const genre = searchParams.get("genre") ?? "0";
  const limit = Math.min(100, Number(searchParams.get("limit") ?? 50) || 50);

  if (!/^\d+$/.test(genre)) return Response.json({ error: "Bad genre" }, { status: 400 });

  // If specific genre chart requested (e.g. pop, rock, electronic) try Deezer
  if (genre !== "0") {
    try {
      const [tracks, info, artists] = await Promise.all([
        dz<{ data: unknown[] }>(`/chart/${genre}/tracks?limit=${limit}`, 600).catch(() => ({ data: [] })),
        dz<{ name: string }>(`/genre/${genre}`, 3600).catch(() => null),
        dz<{ data: { id: number; name: string; picture_medium: string }[] }>(`/genre/${genre}/artists`, 3600)
          .then((r) => r.data.slice(0, 12))
          .catch(() => []),
      ]);

      const normalized = normalizeTracks(tracks.data as never[]);
      if (normalized.length > 0) {
        return Response.json({
          name: info?.name ?? "Genre",
          tracks: normalized,
          artists: artists.map((a) => ({ id: String(a.id), name: a.name, picture: a.picture_medium })),
        });
      }
    } catch (_) {}
  }

  // 1. Primary Global Charts: Official Apple iTunes RSS High-Res Top Charts (guaranteed 600x600 cover artwork)
  const itunesTracks = await getItunesTopHits(limit);
  if (itunesTracks.length > 0) {
    return Response.json({
      name: "Global Top 50 Charts",
      tracks: itunesTracks,
      artists: [],
    });
  }

  // 2. Secondary Global Charts: Spotify Today's Top Hits
  const spTracks = await getSpotifyTopHits(limit);
  if (spTracks.length > 0) {
    return Response.json({
      name: "Today's Top Hits",
      tracks: spTracks,
      artists: [],
    });
  }

  // 3. Fallback to Deezer general chart
  try {
    const tracks = await dz<{ data: unknown[] }>(`/chart/0/tracks?limit=${limit}`, 600).catch(() => ({ data: [] }));
    const normalized = normalizeTracks(tracks.data as never[]);
    return Response.json({
      name: "Top Charts",
      tracks: normalized,
      artists: [],
    });
  } catch {
    return Response.json({ name: "Top Charts", tracks: [], artists: [] });
  }
}
