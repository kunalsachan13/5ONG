export const EQ_BANDS = [32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

export const EQ_PRESETS: Record<string, number[]> = {
  Flat: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  "Bass Boost": [7, 6, 5, 3, 1, 0, 0, 0, 0, 0],
  "Treble Boost": [0, 0, 0, 0, 0, 1, 3, 5, 6, 7],
  Vocal: [-2, -2, -1, 1, 3, 4, 3, 1, 0, -1],
  Acoustic: [4, 3, 2, 1, 2, 2, 3, 3, 3, 2],
  Electronic: [5, 4, 1, 0, -2, 2, 1, 2, 4, 5],
  "Hip-Hop": [5, 5, 3, 3, -1, -1, 1, 0, 2, 3],
  Rock: [5, 4, 3, 1, -1, -1, 1, 3, 4, 5],
  Classical: [4, 3, 3, 2, -1, -1, 0, 2, 3, 4],
  Lounge: [-3, -2, -1, 1, 3, 3, 2, 1, 0, -1],
};

export function fmtHz(f: number) {
  return f >= 1000 ? `${f / 1000}k` : String(f);
}

export function fmtTime(s: number) {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}
