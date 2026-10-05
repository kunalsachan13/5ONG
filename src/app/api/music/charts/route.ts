import { dz, normalizeTracks } from "@/lib/deezer";
import { getSpotifyPlaylist } from "@/lib/spotapi";
import type { Track } from "@/lib/types";

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

const POPULAR_ARTISTS = [
  { id: "3830821", name: "Arijit Singh", picture: "https://c.saavncdn.com/artists/Arijit_Singh_004_20241118063717_500x500.jpg" },
  { id: "408101", name: "Pritam", picture: "https://cdn-images.dzcdn.net/images/artist/d4914ccd414067cd5e2c108867079a85/500x500-000000-80-0-0.jpg" },
  { id: "181717", name: "Shreya Ghoshal", picture: "https://cdn-images.dzcdn.net/images/artist/3bb832d37d10ff2affcfa9afdc7c68a0/500x500-000000-80-0-0.jpg" },
  { id: "12313", name: "A.R. Rahman", picture: "https://c.saavncdn.com/artists/AR_Rahman_002_20210120084455_500x500.jpg" },
  { id: "4248439", name: "Anirudh Ravichander", picture: "https://cdn-images.dzcdn.net/images/artist/9da0a547b39e99bc35c6a9724aef91bf/500x500-000000-80-0-0.jpg" },
  { id: "5197022", name: "Diljit Dosanjh", picture: "https://cdn-images.dzcdn.net/images/artist/79b85e695e0ca6529e56bf3b628e92bd/500x500-000000-80-0-0.jpg" },
  { id: "134267", name: "Atif Aslam", picture: "https://cdn-images.dzcdn.net/images/artist/0ea90444148fff9c11d77f06a344724e/500x500-000000-80-0-0.jpg" },
  { id: "5197018", name: "Badshah", picture: "https://cdn-images.dzcdn.net/images/artist/5b90b89299a7d42f81d79afa263a85d2/500x500-000000-80-0-0.jpg" },
  { id: "13484807", name: "Karan Aujla", picture: "https://cdn-images.dzcdn.net/images/artist/2342131131749544b2563ecad0068eef/500x500-000000-80-0-0.jpg" },
  { id: "12684949", name: "Sidhu Moose Wala", picture: "https://cdn-images.dzcdn.net/images/artist/f559ebe3851db26a6a47a76b1d95748f/500x500-000000-80-0-0.jpg" },
  { id: "1357662", name: "Yo Yo Honey Singh", picture: "https://cdn-images.dzcdn.net/images/artist/7859b461c10352f02a11368905f0903f/500x500-000000-80-0-0.jpg" },
];

// Official JioSaavn curated charts (Real-time live trending songs in India)
const TRENDING_PLAYLIST_IDS = [
  "47599074", // Now Trending (Official real-time chart)
  "1261305331", // Trending Songs
  "1265792743", // Trending New Releases
  "1269241159", // Trending on Reels
];

async function getOfficialTrendingSongs(
  limit = 50,
  preferredIndex = 0
): Promise<{ name?: string; tracks: Track[] }> {
  const rotatedIds = [
    ...TRENDING_PLAYLIST_IDS.slice(preferredIndex % TRENDING_PLAYLIST_IDS.length),
    ...TRENDING_PLAYLIST_IDS.slice(0, preferredIndex % TRENDING_PLAYLIST_IDS.length),
  ];

  for (const playlistId of rotatedIds) {
    try {
      const res = await fetch(
        `https://jiosaavn-api-black.vercel.app/api/playlists?id=${playlistId}&limit=${limit}&n=${limit}`,
        {
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(4500),
        }
      );
      if (!res.ok) continue;
      const json = await res.json();
      const songs: any[] = json.data?.songs || [];
      if (!Array.isArray(songs) || songs.length === 0) continue;

      const tracks = songs.slice(0, limit).map((s: any) => {
        const cover =
          s.image?.[2]?.url ||
          s.image?.[1]?.url ||
          s.image?.[0]?.url ||
          s.image ||
          "";
        const artist =
          s.artists?.primary?.map((a: any) => a.name).join(", ") ||
          s.artist ||
          "Unknown Artist";
        const downloadUrls = s.downloadUrl || [];
        const highQuality =
          downloadUrls.find((d: any) => d.quality === "320kbps") ||
          downloadUrls.find((d: any) => d.quality === "160kbps") ||
          downloadUrls[downloadUrls.length - 1];
        const streamUrl = highQuality?.url || s.media_url || "";

        return {
          id: `saavn_${s.id}`,
          title: decodeHtml(s.name || s.title || "Unknown Title"),
          artist: decodeHtml(artist),
          album: s.album?.name ? decodeHtml(s.album.name) : "Trending",
          cover,
          coverBig: cover,
          duration: Number(s.duration) || 180,
          streamUrl: streamUrl || undefined,
          audioUrl: streamUrl || undefined,
          source: "saavn",
        };
      });

      return {
        name: json.data?.name ? decodeHtml(json.data.name) : "Trending in India",
        tracks,
      };
    } catch {
      // try next playlist
    }
  }
  return { tracks: [] };
}

async function getSpotifyIndiaTopHits(limit = 50): Promise<Track[]> {
  try {
    const pl = await getSpotifyPlaylist("37i9dQZF1DX0XUfTFmZeMt", limit);
    if (pl && pl.tracks.length > 0) {
      return pl.tracks;
    }
  } catch {}
  return [];
}

async function getItunesIndiaTopHits(limit = 50): Promise<Track[]> {
  try {
    const res = await fetch(`https://itunes.apple.com/in/rss/topsongs/limit=${limit}/json`, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    const entries = data?.feed?.entry || [];
    if (!entries.length) return [];
    return entries.map((e: any, idx: number) => {
      const id = e.id?.attributes?.["im:id"] || `chart_${idx}`;
      const title = e["im:name"]?.label || "Unknown Title";
      const artist = e["im:artist"]?.label || "Unknown Artist";
      const images = e["im:image"] || [];
      const bestImg = images[images.length - 1]?.label || "";
      const cover = bestImg ? bestImg.replace(/\/\d+x\d+bb\./, "/600x600bb.") : "";
      const preview = e.link?.find?.((l: any) => l.attributes?.rel === "enclosure")?.attributes?.href || null;

      return {
        id: `itunes_${id}`,
        title: decodeHtml(title),
        artist: decodeHtml(artist),
        album: e["im:collection"]?.["im:name"]?.label ? decodeHtml(e["im:collection"]["im:name"].label) : title,
        cover,
        coverBig: cover,
        duration: 195,
        preview_url: preview,
        source: "itunes",
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
  const isRefresh = searchParams.get("refresh") === "1" || searchParams.has("_t");
  const playlistIndex = Math.max(0, Number(searchParams.get("playlist") ?? 0) || 0);

  if (!/^\d+$/.test(genre)) return Response.json({ error: "Bad genre" }, { status: 400 });

  const headers = {
    "Cache-Control": isRefresh
      ? "no-store, no-cache, must-revalidate, max-age=0"
      : "public, s-maxage=10, stale-while-revalidate=30",
  };

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
        return Response.json(
          {
            name: info?.name ?? "Genre",
            tracks: normalized,
            artists: artists.length > 0
              ? artists.map((a) => ({ id: String(a.id), name: a.name, picture: a.picture_medium }))
              : POPULAR_ARTISTS,
          },
          { headers }
        );
      }
    } catch (_) {}
  }

  // 1. Primary: Official Indian Trending Hits (Curated Hindi/Bollywood/Punjabi chart)
  const trendingResult = await getOfficialTrendingSongs(limit, playlistIndex);
  if (trendingResult.tracks.length > 0) {
    return Response.json(
      {
        name: trendingResult.name || "Trending in India",
        tracks: trendingResult.tracks,
        artists: POPULAR_ARTISTS,
      },
      { headers }
    );
  }

  // 2. Secondary: Spotify Top 50 - India (via SpotAPI)
  const spTracks = await getSpotifyIndiaTopHits(limit);
  if (spTracks.length > 0) {
    return Response.json(
      {
        name: "Trending in India",
        tracks: spTracks,
        artists: POPULAR_ARTISTS,
      },
      { headers }
    );
  }

  // 3. Apple iTunes Top Charts (Standard Browser UA)
  const itunesTracks = await getItunesIndiaTopHits(limit);
  if (itunesTracks.length > 0) {
    return Response.json(
      {
        name: "Trending in India",
        tracks: itunesTracks,
        artists: POPULAR_ARTISTS,
      },
      { headers }
    );
  }

  // 4. Fallback to Deezer general chart
  try {
    const tracks = await dz<{ data: unknown[] }>(`/chart/0/tracks?limit=${limit}`, 600).catch(() => ({ data: [] }));
    const normalized = normalizeTracks(tracks.data as never[]);
    return Response.json(
      {
        name: "Trending Songs",
        tracks: normalized,
        artists: POPULAR_ARTISTS,
      },
      { headers }
    );
  } catch {
    return Response.json({ name: "Trending Songs", tracks: [], artists: POPULAR_ARTISTS }, { headers });
  }
}
