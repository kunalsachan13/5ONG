import { analyzeTaste, extractArtists } from "@/lib/tasteProfile";
import type { Track } from "@/lib/types";
import { searchSpotify } from "@/lib/spotapi";
import { dz, normalizeTracks } from "@/lib/deezer";

export const dynamic = "force-dynamic";

const SAAVN_APIS = [
  "https://jiosaavn-api-black.vercel.app/api",
];

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

async function fetchSaavnArtistOrQuery(query: string, limit = 15): Promise<Track[]> {
  for (const apiBase of SAAVN_APIS) {
    try {
      const endpoint = `${apiBase}/search/songs?query=${encodeURIComponent(query)}&limit=${limit}`;
      const res = await fetch(endpoint, {
        signal: AbortSignal.timeout(3500),
        headers: { Accept: "application/json" },
      });
      if (!res.ok) continue;
      const json = await res.json();
      const results: any[] = json.data?.results || json.results || json.data || [];
      if (!Array.isArray(results) || results.length === 0) continue;

      return results.map((item: any) => {
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
        const streamUrl = highQuality?.url || item.media_url || "";

        return {
          id: `saavn_${item.id}`,
          title: decodeHtml(item.name || item.title || "Unknown"),
          artist: decodeHtml(artist),
          album: item.album?.name ? decodeHtml(item.album.name) : undefined,
          cover,
          coverBig: cover,
          duration: Number(item.duration) || 180,
          streamUrl: streamUrl || undefined,
          audioUrl: streamUrl || undefined,
          source: "saavn",
        };
      });
    } catch {
      // try next
    }
  }
  return [];
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const history: (Track & { playedAt?: string })[] = Array.isArray(body.history) ? body.history : [];
    const likes: Track[] = Array.isArray(body.likes) ? body.likes : [];

    const profile = analyzeTaste(history, likes);

    // If no listening history or likes, return empty recommendations so UI falls back gracefully
    if (!profile.hasSufficientData) {
      return Response.json({
        recommended: [],
        spotlight: null,
        topTracks: [],
        hasTasteProfile: false,
      });
    }

    const playedIds = new Set([
      ...history.map((t) => t.id),
      ...likes.map((t) => t.id),
    ]);
    const playedTitles = new Set([
      ...history.map((t) => t.title.toLowerCase().replace(/[^a-z0-9]/g, "")),
      ...likes.map((t) => t.title.toLowerCase().replace(/[^a-z0-9]/g, "")),
    ]);

    const primaryArtist = profile.topArtists[0]?.name || "";
    const secondaryArtists = profile.topArtists.slice(1, 4).map((a) => a.name);

    // Parallel fetch recommendations based on user's top artists
    const fetchPromises: Promise<Track[]>[] = [];

    // 1. Primary Artist songs
    if (primaryArtist) {
      fetchPromises.push(
        fetchSaavnArtistOrQuery(primaryArtist, 20).catch(() => [] as Track[])
      );
      fetchPromises.push(
        searchSpotify(primaryArtist, 12).then((res) => res.tracks).catch(() => [] as Track[])
      );
    }

    // 2. Secondary Artists songs
    for (const sec of secondaryArtists) {
      fetchPromises.push(
        fetchSaavnArtistOrQuery(sec, 12).catch(() => [] as Track[])
      );
    }

    // 3. Most played track vibe
    const topPlayedTrack = profile.topTracks[0]?.track;
    if (topPlayedTrack) {
      const querySeed = `${topPlayedTrack.title} ${extractArtists(topPlayedTrack.artist)[0] || ""}`.trim();
      fetchPromises.push(
        fetchSaavnArtistOrQuery(querySeed, 10).catch(() => [] as Track[])
      );
    }

    const fetchedBatches = await Promise.all(fetchPromises);

    // Deduplicate and filter out songs already listened to
    const seenKeys = new Set<string>();
    const recommendedPool: Track[] = [];
    const spotlightPool: Track[] = [];

    const isSeen = (t: Track) => {
      const key = `${t.title.toLowerCase().replace(/[^a-z0-9]/g, "")}_${t.artist.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8)}`;
      if (seenKeys.has(key)) return true;
      seenKeys.add(key);
      return false;
    };

    // Primary artist batch is index 0 & 1
    const primaryBatches = [
      ...(fetchedBatches[0] || []),
      ...(fetchedBatches[1] || []),
    ];

    for (const t of primaryBatches) {
      if (!t || !t.id) continue;
      if (isSeen(t)) continue;

      const normTitle = t.title.toLowerCase().replace(/[^a-z0-9]/g, "");
      const isAlreadyListened = playedIds.has(t.id) || playedTitles.has(normTitle);

      // Collect into spotlight
      spotlightPool.push(t);

      // If not already in listening history, add to fresh recommendations
      if (!isAlreadyListened) {
        recommendedPool.push(t);
      }
    }

    // Secondary artist batches
    for (let i = 2; i < fetchedBatches.length; i++) {
      const batch = fetchedBatches[i] || [];
      for (const t of batch) {
        if (!t || !t.id) continue;
        if (isSeen(t)) continue;

        const normTitle = t.title.toLowerCase().replace(/[^a-z0-9]/g, "");
        const isAlreadyListened = playedIds.has(t.id) || playedTitles.has(normTitle);

        if (!isAlreadyListened) {
          recommendedPool.push(t);
        }
      }
    }

    // Shuffle and interleave recommendations
    const finalRecommended = recommendedPool
      .sort(() => Math.random() - 0.5)
      .slice(0, 25);

    const spotlight = primaryArtist && spotlightPool.length > 0 ? {
      artist: primaryArtist,
      tracks: spotlightPool.slice(0, 15),
    } : null;

    return Response.json({
      recommended: finalRecommended,
      spotlight,
      topTracks: profile.topTracks.slice(0, 10).map((x) => x.track),
      topArtists: profile.topArtists.slice(0, 6).map((a) => a.name),
      hasTasteProfile: true,
    }, {
      headers: { "Cache-Control": "private, max-age=60" },
    });
  } catch (err: any) {
    console.error("[Recommendations Error]:", err);
    return Response.json({
      recommended: [],
      spotlight: null,
      topTracks: [],
      hasTasteProfile: false,
    }, { status: 500 });
  }
}
