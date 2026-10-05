import type { Track } from "@/lib/types";

export interface ArtistAffinity {
  name: string;
  count: number;
  weight: number;
  sampleTrack?: Track;
}

export interface TasteProfile {
  topArtists: ArtistAffinity[];
  topTracks: { track: Track; playCount: number }[];
  seedArtists: string[];
  seedTrackIds: string[];
  totalPlays: number;
  hasSufficientData: boolean;
}

/**
 * Normalizes artist names by splitting collaborations and trimming.
 * e.g., "Arijit Singh, Pritam" -> ["Arijit Singh", "Pritam"]
 */
export function extractArtists(artistString: string = ""): string[] {
  return artistString
    .split(/,|&|feat\.|ft\.|;|\|/i)
    .map((a) => a.trim())
    .filter((a) => a.length > 1 && !/unknown|various/i.test(a));
}

/**
 * Analyzes listening history and liked songs to compute the user's taste profile.
 * Tracks play frequency, recency, and explicit likes.
 */
export function analyzeTaste(
  history: (Track & { playedAt?: string })[] = [],
  likes: Track[] = []
): TasteProfile {
  const artistScores = new Map<string, { count: number; weight: number; sampleTrack?: Track }>();
  const trackPlayCounts = new Map<string, { track: Track; count: number; lastPlayed?: number }>();

  // 1. Process History (Frequency + Recency weighting)
  const now = Date.now();
  history.forEach((t, idx) => {
    if (!t || !t.id) return;

    // Track play counts
    const existingTrack = trackPlayCounts.get(t.id);
    const playedTimestamp = t.playedAt ? new Date(t.playedAt).getTime() : now - idx * 60000;
    if (existingTrack) {
      existingTrack.count += 1;
      if (playedTimestamp > (existingTrack.lastPlayed || 0)) {
        existingTrack.lastPlayed = playedTimestamp;
      }
    } else {
      trackPlayCounts.set(t.id, { track: t, count: 1, lastPlayed: playedTimestamp });
    }

    // Artist scoring: recency multiplier (more recent plays have higher weight)
    const ageDays = Math.max(0, (now - playedTimestamp) / (1000 * 60 * 60 * 24));
    const recencyMultiplier = ageDays < 1 ? 2.5 : ageDays < 3 ? 2.0 : ageDays < 7 ? 1.5 : 1.0;

    const artists = extractArtists(t.artist);
    artists.forEach((art) => {
      const key = art.toLowerCase();
      const cur = artistScores.get(key) || { count: 0, weight: 0, sampleTrack: t };
      cur.count += 1;
      cur.weight += 1.5 * recencyMultiplier;
      if (!cur.sampleTrack) cur.sampleTrack = t;
      artistScores.set(key, cur);
    });
  });

  // 2. Process Likes (Strong positive affinity)
  likes.forEach((t) => {
    if (!t || !t.id) return;
    const artists = extractArtists(t.artist);
    artists.forEach((art) => {
      const key = art.toLowerCase();
      const cur = artistScores.get(key) || { count: 0, weight: 0, sampleTrack: t };
      cur.weight += 4.0; // Likes carry strong weight
      if (!cur.sampleTrack) cur.sampleTrack = t;
      artistScores.set(key, cur);
    });
  });

  // 3. Sort Artists by weight
  const topArtists: ArtistAffinity[] = Array.from(artistScores.entries())
    .map(([_, val]) => ({
      name: val.sampleTrack ? extractArtists(val.sampleTrack.artist)[0] || _ : _,
      count: val.count,
      weight: val.weight,
      sampleTrack: val.sampleTrack,
    }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 10);

  // 4. Sort Tracks by play count
  const topTracks = Array.from(trackPlayCounts.values())
    .sort((a, b) => b.count - a.count || (b.lastPlayed || 0) - (a.lastPlayed || 0))
    .slice(0, 15)
    .map((item) => ({ track: item.track, playCount: item.count }));

  const seedArtists = topArtists.slice(0, 4).map((a) => a.name);
  const seedTrackIds = topTracks.slice(0, 5).map((t) => t.track.id);

  return {
    topArtists,
    topTracks,
    seedArtists,
    seedTrackIds,
    totalPlays: history.length,
    hasSufficientData: topArtists.length > 0 || topTracks.length > 0,
  };
}
