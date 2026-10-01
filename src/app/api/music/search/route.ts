import { dz, normalizeTracks } from "@/lib/deezer";
import type { Track } from "@/lib/types";

export const dynamic = "force-dynamic";

async function searchItunes(q: string, limit = 40): Promise<Track[]> {
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&entity=song&limit=${limit}`,
      { headers: { "User-Agent": "5ONG/2.0 (Music)" }, signal: AbortSignal.timeout(4000) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((item: any) => {
      const cover = item.artworkUrl100
        ? item.artworkUrl100.replace("100x100bb", "600x600bb")
        : "";
      return {
        id: `itunes_${item.trackId}`,
        title: item.trackName || "Unknown",
        artist: item.artistName || "Unknown",
        album: item.collectionName || item.trackName,
        cover,
        coverBig: cover,
        duration: Math.round((item.trackTimeMillis || 180000) / 1000),
        preview_url: item.previewUrl || null,
        source: "itunes",
      };
    });
  } catch {
    return [];
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const artist = searchParams.get("artist");
  if (!q && !artist) return Response.json({ tracks: [], artists: [] });

  try {
    if (artist && /^\d+$/.test(artist)) {
      try {
        const top = await dz<{ data: unknown[] }>(`/artist/${artist}/top?limit=50`, 600);
        const tracks = normalizeTracks(top.data as never[]);
        if (tracks.length > 0) {
          return Response.json({ tracks, artists: [] });
        }
      } catch (_) {}

      // Fallback: search artist by name on iTunes
      const fallbackTracks = await searchItunes(q || artist, 40);
      return Response.json({ tracks: fallbackTracks, artists: [] });
    }

    let tracks: Track[] = [];
    let artists: { id: string; name: string; picture: string }[] = [];

    try {
      const [dzTracks, dzArtists] = await Promise.all([
        dz<{ data: unknown[] }>(`/search?q=${encodeURIComponent(q)}&limit=40`, 120).catch(() => ({ data: [] })),
        dz<{ data: { id: number; name: string; picture_medium: string; nb_fan: number }[] }>(
          `/search/artist?q=${encodeURIComponent(q)}&limit=6`,
          120,
        ).catch(() => ({ data: [] })),
      ]);
      tracks = normalizeTracks(dzTracks.data as never[]);
      artists = (dzArtists.data || []).map((a) => ({ id: String(a.id), name: a.name, picture: a.picture_medium }));
    } catch (_) {}

    // If Deezer returned no tracks or was blocked, fall back to iTunes catalog
    if (!tracks.length) {
      tracks = await searchItunes(q, 40);
    }

    return Response.json({ tracks, artists });
  } catch {
    const fallbackTracks = await searchItunes(q, 40);
    return Response.json({ tracks: fallbackTracks, artists: [] });
  }
}
