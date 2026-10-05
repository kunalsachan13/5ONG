import { dz, normalizeTracks } from "@/lib/deezer";
import type { Track, PlaylistSummary } from "@/lib/types";

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

const SAAVN_APIS = [
  "https://jiosaavn-api-black.vercel.app/api",
  "https://saavn.dev/api",
];

async function searchSaavnSongs(q: string, limit = 30): Promise<Track[]> {
  for (const apiBase of SAAVN_APIS) {
    try {
      const endpoint = `${apiBase}/search/songs?query=${encodeURIComponent(q)}&limit=${limit}`;
      const res = await fetch(endpoint, {
        signal: AbortSignal.timeout(4500),
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
      // try next API
    }
  }
  return [];
}

async function searchSaavnPlaylists(q: string, limit = 15): Promise<PlaylistSummary[]> {
  for (const apiBase of SAAVN_APIS) {
    try {
      const endpoint = `${apiBase}/search/playlists?query=${encodeURIComponent(q)}&limit=${limit}`;
      const res = await fetch(endpoint, {
        signal: AbortSignal.timeout(4000),
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
        return {
          id: `saavn_${item.id}`,
          name: decodeHtml(item.name || item.title || "Playlist"),
          count: Number(item.songCount) || 0,
          covers: cover ? [cover] : [],
          source: "JioSaavn",
        };
      });
    } catch {
      // try next
    }
  }
  return [];
}

async function searchDeezerPlaylists(q: string, limit = 15): Promise<PlaylistSummary[]> {
  try {
    const res = await fetch(`https://api.deezer.com/search/playlist?q=${encodeURIComponent(q)}&limit=${limit}`, {
      signal: AbortSignal.timeout(3500),
      headers: { "User-Agent": "5ONG/2.0" },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const results: any[] = json.data || [];
    return results.map((item: any) => ({
      id: `dz_${item.id}`,
      name: item.title || "Playlist",
      count: Number(item.nb_tracks) || 0,
      covers: item.picture_big ? [item.picture_big] : item.picture_medium ? [item.picture_medium] : [],
      source: "Deezer",
    }));
  } catch {
    return [];
  }
}

async function searchYouTubeTracks(q: string, limit = 8): Promise<Track[]> {
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
    const response = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) return [];

    const html = await response.text();
    const dataMatch = html.match(/ytInitialData\s*=\s*({[\s\S]+?});<\/script>/);
    if (!dataMatch) return [];

    const data = JSON.parse(dataMatch[1]);
    const contents =
      data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
    const tracks: Track[] = [];

    for (const section of contents) {
      const items = section.itemSectionRenderer?.contents || [];
      for (const it of items) {
        const v = it.videoRenderer;
        if (v && v.videoId && tracks.length < limit) {
          const title = v.title?.runs?.[0]?.text || "";
          const artist = v.ownerText?.runs?.[0]?.text || "";
          const durStr = v.lengthText?.simpleText || "";
          const parts = durStr.split(":").map(Number);
          const duration =
            parts.length === 2
              ? parts[0] * 60 + parts[1]
              : parts.length === 3
              ? parts[0] * 3600 + parts[1] * 60 + parts[2]
              : 210;
          const thumbs = v.thumbnail?.thumbnails || [];
          const cover = thumbs.length > 0 ? thumbs[thumbs.length - 1].url : "";

          // Exclude extreme long mixes > 30 minutes
          if (duration > 0 && duration < 1800) {
            tracks.push({
              id: `yt-${v.videoId}`,
              title: decodeHtml(title),
              artist: decodeHtml(artist),
              cover,
              coverBig: cover,
              duration,
              source: "youtube",
            });
          }
        }
      }
    }
    return tracks;
  } catch {
    return [];
  }
}

async function searchItunes(q: string, limit = 25): Promise<Track[]> {
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&entity=song&limit=${limit}`,
      { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }, signal: AbortSignal.timeout(3500) }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((item: any) => {
      const cover = item.artworkUrl100
        ? item.artworkUrl100.replace("100x100bb", "600x600bb")
        : "";
      return {
        id: `itunes_${item.trackId}`,
        title: decodeHtml(item.trackName || "Unknown"),
        artist: decodeHtml(item.artistName || "Unknown"),
        album: item.collectionName ? decodeHtml(item.collectionName) : item.trackName,
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

import { searchSpotify, getSpotifyPlaylist } from "@/lib/spotapi";

function computeRelevanceScore(track: Track, query: string): number {
  const q = query.toLowerCase().trim();
  const qTokens = q.split(/\s+/).filter(Boolean);
  const title = (track.title || "").toLowerCase().trim();
  const artist = (track.artist || "").toLowerCase().trim();
  const album = (track.album || "").toLowerCase().trim();

  let score = 0;

  // Exact matches
  if (title === q) score += 220;
  else if (title.startsWith(q)) score += 130;
  else if (title.includes(q)) score += 75;

  if (artist === q) score += 170;
  else if (artist.startsWith(q)) score += 110;
  else if (artist.includes(q)) score += 65;

  // Token matching (e.g. "curos divine" or "arijit kesariya")
  let allTokensInTitle = true;
  let allTokensInArtist = true;
  let allTokensMatch = true;

  for (const token of qTokens) {
    const inTitle = title.includes(token);
    const inArtist = artist.includes(token);
    const inAlbum = album.includes(token);

    if (inTitle) score += 25;
    else allTokensInTitle = false;

    if (inArtist) score += 25;
    else allTokensInArtist = false;

    if (!inTitle && !inArtist && !inAlbum) allTokensMatch = false;
  }

  if (allTokensInTitle) score += 50;
  if (allTokensInArtist) score += 40;
  if (allTokensMatch && !allTokensInTitle && !allTokensInArtist) score += 30;

  // Source quality boost (SpotAPI prioritized first)
  if (track.source === "spotify") score += 60;
  if (track.source === "saavn" && (track.streamUrl || track.audioUrl)) score += 25;

  // Penalize junk / low-quality versions unless explicitly requested in query
  const isRemixQuery = /remix|slowed|reverb|mashup|unreleased|live|cover|lofi|ringtone/i.test(q);
  if (!isRemixQuery) {
    if (/ringtone|8d|bass boosted|instrumental cover|karaoke/i.test(title)) score -= 80;
    if (/slowed|reverb|sped up|remix/i.test(title)) score -= 30;
  }

  // Penalize weirdly short clips
  if (track.duration > 0 && track.duration < 50) score -= 50;
  if (track.duration > 1500 && !/mix|set|compilation|podcast/i.test(q)) score -= 50;

  return score;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") ?? "").trim();
  const artist = searchParams.get("artist");
  const name = (searchParams.get("name") ?? "").trim();
  const sourceParam = (searchParams.get("source") || "all").toLowerCase();

  const targetQuery = (q || name || (artist && isNaN(Number(artist)) ? artist : "")).trim();

  if (!targetQuery && !artist) return Response.json({ tracks: [], playlists: [], artists: [], source: sourceParam });

  const headers = { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" };

  // Check direct Spotify playlist URL or URI
  if (targetQuery) {
    const spPlaylistMatch = targetQuery.match(/open\.spotify\.com\/playlist\/([a-zA-Z0-9]+)/) || targetQuery.match(/spotify:playlist:([a-zA-Z0-9]+)/);
    if (spPlaylistMatch) {
      const plId = spPlaylistMatch[1];
      const spPl = await getSpotifyPlaylist(plId).catch(() => null);
      if (spPl) {
        return Response.json({
          tracks: spPl.tracks,
          playlists: [
            {
              id: `spotify_${plId}`,
              name: spPl.name,
              count: spPl.totalCount || spPl.tracks.length,
              covers: spPl.cover ? [spPl.cover] : [],
              source: "Spotify",
            },
          ],
          artists: [],
          source: "spotify",
        }, { headers });
      }
    }
  }

  try {
    // If specific numeric artist ID is passed, attempt Deezer lookup first
    if (artist && /^\d+$/.test(artist)) {
      try {
        const top = await dz<{ data: unknown[] }>(`/artist/${artist}/top?limit=50`, 600);
        const tracks = normalizeTracks(top.data as never[]);
        if (tracks.length > 0) {
          return Response.json({ tracks, playlists: [], artists: [], source: sourceParam }, { headers });
        }
      } catch (_) {}

      // If no name was provided, try searching iTunes with the ID
      if (!targetQuery) {
        const fallbackTracks = await searchItunes(artist, 40);
        return Response.json({ tracks: fallbackTracks, playlists: [], artists: [], source: sourceParam }, { headers });
      }
    }

    let allTracks: Track[] = [];
    let playlists: PlaylistSummary[] = [];
    let artists: { id: string; name: string; picture: string }[] = [];
    let switchedFrom: string | null = null;

    if (sourceParam === "spotify") {
      // 1. Prioritize Spotify
      const spData = await searchSpotify(targetQuery, 25).catch(() => ({ tracks: [], playlists: [] }));
      allTracks = spData.tracks;
      playlists = spData.playlists;

      if (allTracks.length === 0 && playlists.length === 0) {
        switchedFrom = "spotify";
        const [saavnT, saavnP, dzP] = await Promise.all([
          searchSaavnSongs(targetQuery, 25).catch(() => [] as Track[]),
          searchSaavnPlaylists(targetQuery, 15).catch(() => [] as PlaylistSummary[]),
          searchDeezerPlaylists(targetQuery, 12).catch(() => [] as PlaylistSummary[]),
        ]);
        allTracks = [...allTracks, ...saavnT];
        playlists = [...playlists, ...saavnP, ...dzP];
      }
    } else if (sourceParam === "saavn") {
      // 2. Prioritize JioSaavn
      const [saavnT, saavnP] = await Promise.all([
        searchSaavnSongs(targetQuery, 30).catch(() => [] as Track[]),
        searchSaavnPlaylists(targetQuery, 18).catch(() => [] as PlaylistSummary[]),
      ]);
      allTracks = saavnT;
      playlists = saavnP;

      if (allTracks.length < 3 && playlists.length === 0) {
        switchedFrom = "saavn";
        const spData = await searchSpotify(targetQuery, 15).catch(() => ({ tracks: [], playlists: [] }));
        const dzP = await searchDeezerPlaylists(targetQuery, 12).catch(() => [] as PlaylistSummary[]);
        allTracks = [...allTracks, ...spData.tracks];
        playlists = [...playlists, ...spData.playlists, ...dzP];
      }
    } else if (sourceParam === "deezer") {
      // 3. Prioritize Deezer
      const [dzTracksRes, dzP] = await Promise.all([
        dz<{ data: unknown[] }>(`/search?q=${encodeURIComponent(targetQuery)}&limit=30`, 120).catch(() => ({ data: [] })),
        searchDeezerPlaylists(targetQuery, 15).catch(() => [] as PlaylistSummary[]),
      ]);
      allTracks = normalizeTracks((dzTracksRes.data as never[]) || []);
      playlists = dzP;

      if (allTracks.length < 3 && playlists.length === 0) {
        switchedFrom = "deezer";
        const [spData, saavnT, saavnP] = await Promise.all([
          searchSpotify(targetQuery, 15).catch(() => ({ tracks: [] as Track[], playlists: [] as PlaylistSummary[] })),
          searchSaavnSongs(targetQuery, 25).catch(() => [] as Track[]),
          searchSaavnPlaylists(targetQuery, 12).catch(() => [] as PlaylistSummary[]),
        ]);
        allTracks = [...allTracks, ...spData.tracks, ...saavnT];
        playlists = [...playlists, ...spData.playlists, ...saavnP];
      }
    } else if (sourceParam === "youtube") {
      // 4. Prioritize YouTube
      allTracks = await searchYouTubeTracks(targetQuery, 20).catch(() => [] as Track[]);

      if (allTracks.length < 3) {
        switchedFrom = "youtube";
        const [spData, saavnT, saavnP] = await Promise.all([
          searchSpotify(targetQuery, 15).catch(() => ({ tracks: [] as Track[], playlists: [] as PlaylistSummary[] })),
          searchSaavnSongs(targetQuery, 20).catch(() => [] as Track[]),
          searchSaavnPlaylists(targetQuery, 10).catch(() => [] as PlaylistSummary[]),
        ]);
        allTracks = [...allTracks, ...spData.tracks, ...saavnT];
        playlists = [...playlists, ...spData.playlists, ...saavnP];
      }
    } else {
      // 5. "all" (SpotAPI FIRST, switch to other sources if not found on SpotAPI)
      const spData = await searchSpotify(targetQuery, 25).catch(() => ({ tracks: [] as Track[], playlists: [] as PlaylistSummary[] }));

      if (spData.tracks.length > 0) {
        // Found on SpotAPI! Prioritize SpotAPI songs
        allTracks = spData.tracks;
        playlists = spData.playlists;

        // If SpotAPI returned fewer than 5 tracks, fetch supplemental tracks from alternative sources to append
        if (allTracks.length < 5) {
          const [saavnT, dzRes] = await Promise.all([
            searchSaavnSongs(targetQuery, 20).catch(() => [] as Track[]),
            dz<{ data: unknown[] }>(`/search?q=${encodeURIComponent(targetQuery)}&limit=15`, 120).catch(() => ({ data: [] })),
          ]);
          const dzTracks = normalizeTracks((dzRes.data as never[]) || []);
          const seen = new Set(allTracks.map((t) => `${t.title.toLowerCase().replace(/[^a-z0-9]/g, "")}_${t.artist.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10)}`));

          for (const t of saavnT) {
            const key = `${t.title.toLowerCase().replace(/[^a-z0-9]/g, "")}_${t.artist.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10)}`;
            if (!seen.has(key)) {
              seen.add(key);
              allTracks.push(t);
            }
          }
          for (const t of dzTracks) {
            const key = `${t.title.toLowerCase().replace(/[^a-z0-9]/g, "")}_${t.artist.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10)}`;
            if (!seen.has(key)) {
              seen.add(key);
              allTracks.push(t);
            }
          }
        }
      } else {
        // Not found on SpotAPI! Switch to another sources (JioSaavn, Deezer, etc.)
        switchedFrom = "spotify";
        const [saavnTracks, saavnPlaylists, dzRes, dzPlaylists] = await Promise.all([
          searchSaavnSongs(targetQuery, 30).catch(() => [] as Track[]),
          searchSaavnPlaylists(targetQuery, 15).catch(() => [] as PlaylistSummary[]),
          Promise.all([
            dz<{ data: unknown[] }>(`/search?q=${encodeURIComponent(targetQuery)}&limit=25`, 120).catch(() => ({ data: [] })),
            dz<{ data: { id: number; name: string; picture_medium: string; nb_fan: number }[] }>(
              `/search/artist?q=${encodeURIComponent(targetQuery)}&limit=8`,
              120
            ).catch(() => ({ data: [] })),
          ]).catch(() => [{ data: [] }, { data: [] }]),
          searchDeezerPlaylists(targetQuery, 12).catch(() => [] as PlaylistSummary[]),
        ]);

        const dzTracks = normalizeTracks((dzRes[0]?.data as never[]) || []);
        artists = ((dzRes[1]?.data as any[]) || []).map((a) => ({
          id: String(a.id),
          name: a.name,
          picture: a.picture_medium,
        }));

        playlists = [...saavnPlaylists, ...dzPlaylists];

        const trackMap = new Map<string, { track: Track; score: number }>();
        const normalizeKey = (t: Track) =>
          `${t.title.toLowerCase().replace(/[^a-z0-9]/g, "")}_${t.artist.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 10)}`;

        const addWithScore = (t: Track) => {
          const key = normalizeKey(t);
          const score = computeRelevanceScore(t, targetQuery);
          const existing = trackMap.get(key);
          if (!existing || score > existing.score) {
            trackMap.set(key, { track: t, score });
          }
        };

        for (const t of saavnTracks) addWithScore(t);
        for (const t of dzTracks) addWithScore(t);

        allTracks = Array.from(trackMap.values())
          .sort((a, b) => b.score - a.score)
          .map((x) => x.track);
      }
    }

    // Universal Fallback: If still few tracks or remix query, search YouTube & iTunes
    if (allTracks.length < 5 || /remix|slowed|reverb|mashup|unreleased|live|cover/i.test(targetQuery)) {
      const [ytTracks, itunesTracks] = await Promise.all([
        searchYouTubeTracks(targetQuery, 10).catch(() => [] as Track[]),
        allTracks.length < 3 ? searchItunes(targetQuery, 15).catch(() => [] as Track[]) : Promise.resolve([] as Track[]),
      ]);

      const seen = new Set(allTracks.map((t) => `${t.title.toLowerCase().replace(/[^a-z0-9]/g, "")}`));
      for (const t of ytTracks) {
        const key = t.title.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (!seen.has(key)) {
          seen.add(key);
          allTracks.push(t);
        }
      }
      for (const t of itunesTracks) {
        const key = t.title.toLowerCase().replace(/[^a-z0-9]/g, "");
        if (!seen.has(key)) {
          seen.add(key);
          allTracks.push(t);
        }
      }
    }

    // Final relevance sort across all collected tracks
    allTracks.sort((a, b) => computeRelevanceScore(b, targetQuery) - computeRelevanceScore(a, targetQuery));

    return Response.json({
      tracks: allTracks,
      playlists,
      artists,
      source: sourceParam,
      switchedFrom,
    }, { headers });
  } catch (err: any) {
    const fallbackTracks = await searchSaavnSongs(targetQuery, 25).catch(() => searchItunes(targetQuery, 25));
    return Response.json({ tracks: fallbackTracks, playlists: [], artists: [], source: sourceParam }, { headers });
  }
}
