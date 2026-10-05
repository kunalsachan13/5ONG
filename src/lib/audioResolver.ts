const SAAVN_APIS = [
  'https://jiosaavn-api-black.vercel.app/api/search/songs?query=',
  'https://saavn.dev/api/search/songs?query=',
];

const STREAM_CACHE = new Map<string, { url: string; ts: number }>();
const STREAM_CACHE_TTL = 1000 * 60 * 60 * 6; // 6 hours

/**
 * Strips video tags, metadata annotations, and extraneous stream markers
 * such as "Full Length Official Song Stream", "Official Video", etc.
 */
export function cleanSongTitle(title: string): string {
  if (!title) return '';
  return title
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/&quot;/g, '')
    .replace(/&#039;/g, '')
    .replace(/&apos;/g, '')
    .replace(/&amp;/g, '&')
    .replace(/full\s+length\s+official\s+song\s+stream/gi, '')
    .replace(/full\s+length\s+song/gi, '')
    .replace(/official\s+(music\s+)?video(\s+song)?/gi, '')
    .replace(/official\s+(song\s+)?(stream|audio)/gi, '')
    .replace(/full\s+(song|video|length)/gi, '')
    .replace(/lyric(al)?(\s+video)?/gi, '')
    .replace(/audio(\s+stream)?/gi, '')
    .replace(/video\s+song/gi, '')
    .replace(/visualizer/gi, '')
    .replace(/remaster(ed)?/gi, '')
    .replace(/slowed\s*(\+|\&|\band\b)\s*reverb/gi, '')
    .replace(/lofi(\s+flip|\s+remix)?/gi, '')
    .replace(/\b(4k|hd|hq|1080p|720p)\b/gi, '')
    .replace(/[-|–—:/]+/g, ' ')
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isArtistMatch(targetArtist: string = '', resultArtist: string = ''): boolean {
  const cTarget = cleanSongTitle(targetArtist).toLowerCase().trim();
  const cResult = cleanSongTitle(resultArtist).toLowerCase().trim();

  // If no target artist was requested, allow anything
  if (!cTarget) return true;
  // If target artist was specified but result has none, reject
  if (!cResult) return false;

  if (cTarget === cResult) return true;
  if (cResult.includes(cTarget) || cTarget.includes(cResult)) return true;

  // Split into artist words, discarding common joiners / fillers
  const stopWords = new Set([
    'feat', 'ft', 'and', 'with', 'the', 'by', 'official', 'music', 'records', 'prod', 'produced', 'dj', 'presents', 'original', 'soundtrack', 'artist'
  ]);
  const targetWords = cTarget.split(/\s+/).filter((w) => w.length >= 2 && !stopWords.has(w));
  const resultWords = new Set(cResult.split(/\s+/).filter((w) => w.length >= 2 && !stopWords.has(w)));

  if (targetWords.length === 0) return true;

  // For single-word target artist (like "Curos", "Adele", "Drake", "DIVINE"):
  if (targetWords.length === 1) {
    const single = targetWords[0];
    return resultWords.has(single) || cResult.split(/[\s,;&/]+/).includes(single);
  }

  // Multi-word target artist: at least one substantial word (>= 3 chars) or 50% of words must match
  const matchCount = targetWords.filter((w) => resultWords.has(w) || cResult.includes(w)).length;
  return matchCount >= 1;
}

export function isTitleMatch(
  targetTitle: string,
  resultTitle: string,
  targetArtist: string = '',
  resultArtist: string = ''
): boolean {
  if (!targetTitle || !resultTitle) return false;

  // 1. Strict artist check FIRST if targetArtist is provided!
  if (targetArtist) {
    if (!resultArtist || !isArtistMatch(targetArtist, resultArtist)) {
      return false;
    }
  }

  const cTarget = cleanSongTitle(targetTitle).toLowerCase().trim();
  const cResult = cleanSongTitle(resultTitle).toLowerCase().trim();

  if (!cTarget || !cResult) return false;

  if (cTarget === cResult) return true;

  const targetWords = cTarget.split(/\s+/).filter((w) => w.length > 0);
  const resultWords = cResult.split(/\s+/).filter((w) => w.length > 0);

  // Single-word title (e.g. "Divine", "Stay", "Love") must be present as a full word
  if (targetWords.length === 1) {
    return resultWords.includes(targetWords[0]);
  }

  // Exact substring containment
  if (cResult.includes(cTarget) || cTarget.includes(cResult)) return true;

  // Word overlap for multi-word titles
  const targetSet = new Set(targetWords.filter((w) => w.length > 1));
  const resultSet = new Set(resultWords.filter((w) => w.length > 1));
  if (targetSet.size > 0) {
    const matchCount = Array.from(targetSet).filter((w) => resultSet.has(w)).length;
    if (matchCount / targetSet.size >= 0.5) {
      return true;
    }
  }

  return false;
}

/**
 * Resolve full-length 320kbps audio stream URL for a track using verified JioSaavn catalog matching.
 * Returns empty string if no verified match is found so the player can fall back to the exact YouTube audio.
 */
export async function resolveAudioStream(title: string, artist: string = ''): Promise<string> {
  if (!title) return '';
  const cacheKey = `v4_${title.toLowerCase()}_${artist.toLowerCase()}`.trim();
  const cached = STREAM_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.ts < STREAM_CACHE_TTL) {
    return cached.url;
  }

  // Check localStorage cache on client and purge stale/corrupted legacy keys
  if (typeof window !== 'undefined') {
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('5ong_stream_v1_') || k.startsWith('5ong_stream_v2_') || k.startsWith('5ong_stream_v3_'))) {
          localStorage.removeItem(k);
        }
      }
      const stored = localStorage.getItem(`5ong_stream_${cacheKey}`);
      if (stored) {
        const item = JSON.parse(stored);
        if (item.url && Date.now() - item.ts < STREAM_CACHE_TTL) {
          STREAM_CACHE.set(cacheKey, item);
          return item.url;
        }
      }
    } catch (_) {}
  }

  const cleanedTitle = cleanSongTitle(title);
  const cleanedArtist = cleanSongTitle(artist);
  const primaryArtist = artist ? cleanSongTitle(artist.split(/[,&/]|feat\.?|ft\.?/i)[0]) : '';
  const queries: string[] = [];
  if (cleanedTitle && cleanedArtist) {
    queries.push(`${cleanedTitle} ${cleanedArtist}`);
  }
  if (primaryArtist && primaryArtist !== cleanedArtist && cleanedTitle) {
    queries.push(`${cleanedTitle} ${primaryArtist}`);
  }
  if (title && artist && `${title} ${artist}`.toLowerCase() !== `${cleanedTitle} ${cleanedArtist}`.toLowerCase()) {
    queries.push(`${title} ${artist}`.trim());
  }
  // CRITICAL: NEVER query title alone if artist is known!
  // Querying title alone on JioSaavn causes cross-artist collisions (e.g. "Divine" -> Punjabi song).
  if (!cleanedArtist && cleanedTitle) {
    queries.push(cleanedTitle);
  }

  // Try direct JioSaavn search APIs
  for (const query of queries) {
    for (const api of SAAVN_APIS) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const res = await fetch(api + encodeURIComponent(query), {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const results = data.data?.results || data.results || data.data;
          if (Array.isArray(results) && results.length > 0) {
            const song = results.find((s: any) => {
              const resArtist =
                s.artists?.primary?.map((a: any) => a.name).join(' ') ||
                s.artist ||
                s.singers ||
                '';
              return isTitleMatch(title, s.name || s.title || '', artist, resArtist);
            });
            if (!song) continue;

            let audioUrl = '';
            if (Array.isArray(song.downloadUrl) && song.downloadUrl.length > 0) {
              const high =
                song.downloadUrl.find((d: any) => d.quality === '320kbps') ||
                song.downloadUrl.find((d: any) => d.quality === '160kbps') ||
                song.downloadUrl[song.downloadUrl.length - 1];
              audioUrl = high?.url || song.downloadUrl[0]?.url || '';
            } else if (typeof song.downloadUrl === 'string' && song.downloadUrl) {
              audioUrl = song.downloadUrl;
            }

            if (audioUrl) {
              const entry = { url: audioUrl, ts: Date.now() };
              STREAM_CACHE.set(cacheKey, entry);
              if (typeof window !== 'undefined') {
                try {
                  localStorage.setItem(`5ong_stream_${cacheKey}`, JSON.stringify(entry));
                } catch (_) {}
              }
              return audioUrl;
            }
          }
        }
      } catch (_) {
        continue;
      }
    }
  }

  return '';
}
