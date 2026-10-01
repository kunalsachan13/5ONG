const SAAVN_APIS = [
  'https://jiosaavn-api-black.vercel.app/api/search/songs?query=',
  'https://jiosaavn-api-privatecvc2.vercel.app/search/songs?query=',
];

const STREAM_CACHE = new Map<string, { url: string; ts: number }>();
const STREAM_CACHE_TTL = 1000 * 60 * 60 * 6; // 6 hours

export function isTitleMatch(targetTitle: string, resultTitle: string): boolean {
  if (!targetTitle || !resultTitle) return false;
  const clean = (s: string) =>
    s
      .toLowerCase()
      .replace(/\([^)]*\)/g, '')
      .replace(/\[[^\]]*\]/g, '')
      .replace(/[^a-z0-9\s]/g, '')
      .trim();

  const cTarget = clean(targetTitle);
  const cResult = clean(resultTitle);

  if (!cTarget || !cResult) return false;
  if (cTarget === cResult) return true;
  if (cTarget.includes(cResult) || cResult.includes(cTarget)) return true;

  const targetWords = cTarget.split(/\s+/).filter((w) => w.length > 2);
  const resultWords = new Set(cResult.split(/\s+/).filter((w) => w.length > 2));
  if (targetWords.length === 0) return false;

  const matchCount = targetWords.filter((w) => resultWords.has(w)).length;
  return matchCount / targetWords.length >= 0.5;
}

/**
 * Resolve full-length 320kbps audio stream URL for a track using verified JioSaavn catalog matching.
 * Returns empty string if no verified match is found so the player can fall back to the exact YouTube audio.
 */
export async function resolveAudioStream(title: string, artist: string = ''): Promise<string> {
  if (!title) return '';
  const cacheKey = `${title.toLowerCase()}_${artist.toLowerCase()}`.trim();
  const cached = STREAM_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.ts < STREAM_CACHE_TTL) {
    return cached.url;
  }

  // Check localStorage cache on client
  if (typeof window !== 'undefined') {
    try {
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

  const query = `${title} ${artist}`.trim();

  // Try direct JioSaavn search APIs
  for (const api of SAAVN_APIS) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);
      const res = await fetch(api + encodeURIComponent(query), {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        const results = data.data?.results || data.results || data.data;
        if (Array.isArray(results) && results.length > 0) {
          const song = results.find((s: any) => isTitleMatch(title, s.name || s.title || ''));
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

  return '';
}
