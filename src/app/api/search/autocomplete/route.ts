import type { Track } from "@/lib/types";
import { searchSpotify } from "@/lib/spotapi";

export const dynamic = "force-dynamic";

function decodeHtml(html: string = ""): string {
  return html
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}

async function fetchQuickTracksFromSpotify(q: string, limit = 5): Promise<Track[]> {
  try {
    const data = await searchSpotify(q, limit);
    return data.tracks.slice(0, limit);
  } catch {
    return [];
  }
}

async function fetchQuickTracksFromSaavn(q: string, limit = 5): Promise<Track[]> {
  try {
    const endpoint = `https://jiosaavn-api-black.vercel.app/api/search/songs?query=${encodeURIComponent(q)}&limit=${limit}`;
    const res = await fetch(endpoint, {
      signal: AbortSignal.timeout(2000),
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const results: any[] = json.data?.results || json.results || json.data || [];
    if (!Array.isArray(results)) return [];

    return results.slice(0, limit).map((item: any) => {
      const cover =
        item.image?.[2]?.url ||
        item.image?.[1]?.url ||
        item.image?.[0]?.url ||
        item.image ||
        "";
      const artist =
        item.artists?.primary?.map((a: any) => a.name).join(", ") ||
        item.artist ||
        item.singers ||
        "Unknown";
      const downloadUrls = item.downloadUrl || [];
      const highQuality =
        downloadUrls.find((d: any) => d.quality === "320kbps") ||
        downloadUrls.find((d: any) => d.quality === "160kbps") ||
        downloadUrls[downloadUrls.length - 1];

      return {
        id: `saavn_${item.id}`,
        title: decodeHtml(item.name || item.title || "Unknown"),
        artist: decodeHtml(artist),
        album: item.album?.name ? decodeHtml(item.album.name) : undefined,
        cover,
        coverBig: cover,
        duration: Number(item.duration) || 180,
        streamUrl: highQuality?.url || item.media_url || undefined,
        audioUrl: highQuality?.url || item.media_url || undefined,
        source: "saavn",
      };
    });
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  if (!q) return Response.json({ suggestions: [], tracks: [] });

  try {
    const [suggestRes, spotifyTracks] = await Promise.all([
      fetch(
        `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(q)}`,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
          signal: AbortSignal.timeout(2000),
        }
      ).catch(() => null),
      q.length >= 2 ? fetchQuickTracksFromSpotify(q, 5) : Promise.resolve([] as Track[]),
    ]);

    let suggestions: string[] = [];
    if (suggestRes && suggestRes.ok) {
      const data = await suggestRes.json();
      suggestions = Array.isArray(data[1]) ? data[1].slice(0, 7) : [];
    }

    let quickTracks: Track[] = spotifyTracks;

    // If SpotAPI returned nothing, fall back to JioSaavn for autocomplete tracks
    if (quickTracks.length === 0 && q.length >= 2) {
      quickTracks = await fetchQuickTracksFromSaavn(q, 5);
    }

    return Response.json(
      { suggestions, tracks: quickTracks },
      { headers: { "Cache-Control": "public, s-maxage=120, stale-while-revalidate=600" } }
    );
  } catch (_) {
    return Response.json({ suggestions: [], tracks: [] });
  }
}
