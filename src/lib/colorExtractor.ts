/**
 * Dynamic color extraction and palette generation for 5ONG player.
 * Extracts dominant and accent colors from album covers via canvas sampling,
 * with deterministic procedural fallback for CORS-protected images.
 */

export interface TrackTheme {
  primary: string;       // Vibrant primary color (e.g. #e53935)
  accent: string;        // Contrasting accent/highlight (e.g. #fdd835)
  bgStart: string;       // Deep dark ambient background top (e.g. rgba(60, 10, 15, 0.92))
  bgEnd: string;         // Deep dark ambient background bottom (e.g. #0a0408)
  glow: string;          // Radiant bloom color for artwork shadow
  buttonBg: string;      // Background for primary action button (play/pause)
  buttonText: string;    // Text/icon color for primary button
}

// In-memory cache for fast palette lookups across track switches
const PALETTE_CACHE = new Map<string, TrackTheme>();

// Preset rich palettes for hash fallback
const FALLBACK_PALETTES: [string, string][] = [
  ["#e11d48", "#f43f5e"], // Rose / Crimson
  ["#8b5cf6", "#c084fc"], // Purple / Violet
  ["#f59e0b", "#fbbf24"], // Amber / Gold
  ["#10b981", "#34d399"], // Emerald / Mint
  ["#3b82f6", "#60a5fa"], // Sapphire / Sky
  ["#ec4899", "#f472b6"], // Pink / Fuchsia
  ["#d97706", "#f59e0b"], // Sunset / Orange
  ["#06b6d4", "#22d3ee"], // Cyan / Teal
  ["#6366f1", "#818cf8"], // Indigo / Electric
];

function generateHashPalette(seed: string): TrackTheme {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % FALLBACK_PALETTES.length;
  const [primary, accent] = FALLBACK_PALETTES[idx];

  // Convert hex to rgb components
  const r = parseInt(primary.slice(1, 3), 16);
  const g = parseInt(primary.slice(3, 5), 16);
  const b = parseInt(primary.slice(5, 7), 16);

  return {
    primary,
    accent,
    bgStart: `rgba(${Math.floor(r * 0.28)}, ${Math.floor(g * 0.28)}, ${Math.floor(b * 0.28)}, 0.94)`,
    bgEnd: `rgba(8, 5, 12, 0.98)`,
    glow: `rgba(${r}, ${g}, ${b}, 0.55)`,
    buttonBg: primary,
    buttonText: "#ffffff",
  };
}

export function extractThemeFromCover(
  imageUrl: string | undefined,
  fallbackSeed: string
): Promise<TrackTheme> {
  const fallback = generateHashPalette(fallbackSeed || "5ONG");
  if (!imageUrl || typeof window === "undefined") {
    return Promise.resolve(fallback);
  }

  const cached = PALETTE_CACHE.get(imageUrl);
  if (cached) return Promise.resolve(cached);

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    const timeout = setTimeout(() => {
      resolve(fallback);
    }, 1800);

    img.onload = () => {
      clearTimeout(timeout);
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return resolve(fallback);

        canvas.width = 24;
        canvas.height = 24;
        ctx.drawImage(img, 0, 0, 24, 24);

        const imgData = ctx.getImageData(0, 0, 24, 24).data;
        const colorCounts: { [key: string]: { r: number; g: number; b: number; count: number; sat: number; brightness: number } } = {};

        for (let i = 0; i < imgData.length; i += 4) {
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];
          const a = imgData[i + 3];

          if (a < 128) continue; // ignore transparent pixels

          // Calculate brightness and saturation
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const brightness = (max + min) / 2;
          const sat = max === min ? 0 : (max - min) / (brightness > 127 ? 510 - max - min : max + min);

          // Skip almost pure blacks, whites, and completely desaturated grays
          if (brightness < 30 || brightness > 235 || (sat < 0.15 && brightness < 200)) {
            continue;
          }

          // Quantize to 32 steps to cluster similar hues
          const qr = Math.floor(r / 32) * 32;
          const qg = Math.floor(g / 32) * 32;
          const qb = Math.floor(b / 32) * 32;
          const key = `${qr},${qg},${qb}`;

          if (!colorCounts[key]) {
            colorCounts[key] = { r: qr + 16, g: qg + 16, b: qb + 16, count: 0, sat, brightness };
          }
          colorCounts[key].count++;
        }

        const sorted = Object.values(colorCounts).sort((a, b) => {
          // Weight saturation heavily so we pick the vibrant colors rather than dull grays
          const scoreA = a.count * (1 + a.sat * 2);
          const scoreB = b.count * (1 + b.sat * 2);
          return scoreB - scoreA;
        });

        if (sorted.length === 0) return resolve(fallback);

        const primaryColor = sorted[0];
        // Find contrasting or secondary color for accent
        const secondaryColor = sorted.find((c) => {
          const dist = Math.abs(c.r - primaryColor.r) + Math.abs(c.g - primaryColor.g) + Math.abs(c.b - primaryColor.b);
          return dist > 70;
        }) || sorted[0];

        const primaryHex = `#${((1 << 24) + (primaryColor.r << 16) + (primaryColor.g << 8) + primaryColor.b).toString(16).slice(1)}`;
        const accentHex = `#${((1 << 24) + (secondaryColor.r << 16) + (secondaryColor.g << 8) + secondaryColor.b).toString(16).slice(1)}`;

        // Button text should be high-contrast against primary
        const isBright = primaryColor.r * 0.299 + primaryColor.g * 0.587 + primaryColor.b * 0.114 > 160;
        const buttonText = isBright ? "#0a0a0a" : "#ffffff";

        const theme: TrackTheme = {
          primary: primaryHex,
          accent: accentHex,
          bgStart: `rgba(${Math.floor(primaryColor.r * 0.35)}, ${Math.floor(primaryColor.g * 0.35)}, ${Math.floor(primaryColor.b * 0.35)}, 0.94)`,
          bgEnd: `rgba(10, 6, 14, 0.98)`,
          glow: `rgba(${primaryColor.r}, ${primaryColor.g}, ${primaryColor.b}, 0.55)`,
          buttonBg: primaryHex,
          buttonText,
        };

        PALETTE_CACHE.set(imageUrl, theme);
        resolve(theme);
      } catch {
        resolve(fallback);
      }
    };

    img.onerror = () => {
      clearTimeout(timeout);
      resolve(fallback);
    };

    img.src = imageUrl;
  });
}
