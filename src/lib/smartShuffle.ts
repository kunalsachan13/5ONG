import type { Track } from "@/lib/types";

/** Artist affinity built from liked songs (x3) and listening history (x1). */
export function buildAffinity(likes: Track[], history: Track[]) {
  const map = new Map<string, number>();
  const bump = (t: Track, w: number) => map.set(t.artist, (map.get(t.artist) ?? 0) + w);
  likes.forEach((t) => bump(t, 3));
  history.forEach((t) => bump(t, 1));
  return map;
}

export function fisherYates<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Smart (taste-aware) shuffle:
 *  - Opens with tracks from artists you love, then gradually widens to discovery
 *  - Never plays the same artist back-to-back and spaces artists apart
 *  - Keeps randomness so every shuffle feels fresh
 */
export function smartShuffle(tracks: Track[], affinity: Map<string, number>, previous?: Track): Track[] {
  const pool = tracks.slice();
  const out: Track[] = [];
  const recent: string[] = previous ? [previous.artist] : [];
  const total = pool.length;
  const maxAff = Math.max(1, ...Array.from(affinity.values()));
  while (pool.length) {
    const progress = out.length / Math.max(1, total - 1); // 0 -> 1
    let best = -1;
    let bestScore = -Infinity;
    for (let i = 0; i < pool.length; i++) {
      const t = pool[i];
      const aff = (affinity.get(t.artist) ?? 0) / maxAff;
      const familiarity = aff * (1 - progress * 0.8) * 2.2;
      const discovery = aff === 0 ? progress * 0.9 : 0;
      const idx = recent.lastIndexOf(t.artist);
      const spacing = idx === -1 ? 0 : -3 / (recent.length - idx);
      const score = familiarity + discovery + spacing + Math.random() * 1.4;
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    }
    const [pick] = pool.splice(best, 1);
    out.push(pick);
    recent.push(pick.artist);
    if (recent.length > 4) recent.shift();
  }
  return out;
}
