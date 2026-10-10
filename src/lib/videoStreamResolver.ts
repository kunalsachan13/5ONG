/**
 * Direct Music Video Stream Resolver for 5ONG
 * Resolves direct MP4 video stream URLs without YouTube iframe embeds.
 */

const videoUrlCache = new Map<string, { url: string; expires: number }>();

export async function resolveDirectVideoUrl(videoId: string): Promise<string | null> {
  if (!videoId || videoId.length !== 11) return null;

  const now = Date.now();
  const cached = videoUrlCache.get(videoId);
  if (cached && cached.expires > now) {
    return cached.url;
  }

  const videoWatchUrl = `https://www.youtube.com/watch?v=${videoId}`;

  // 1. Try savenow.to API (720p / 360p)
  try {
    const startRes = await fetch(
      `https://p.savenow.to/ajax/download.php?format=720&url=${encodeURIComponent(videoWatchUrl)}`,
      {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        signal: AbortSignal.timeout(6000),
      }
    );

    if (startRes.ok) {
      const startData = (await startRes.json()) as any;
      if (startData?.success && startData?.id) {
        const jobId = startData.id;
        const progressEndpoint = `https://p.savenow.to/api/progress?id=${encodeURIComponent(jobId)}`;

        for (let i = 0; i < 15; i++) {
          await new Promise((r) => setTimeout(r, 1000));
          try {
            const pRes = await fetch(progressEndpoint, {
              headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
              signal: AbortSignal.timeout(5000),
            });
            if (pRes.ok) {
              const pData = (await pRes.json()) as any;
              if (pData?.success === 1 && pData?.download_url) {
                // Cache for 2 hours
                videoUrlCache.set(videoId, {
                  url: pData.download_url,
                  expires: now + 2 * 60 * 60 * 1000,
                });
                return pData.download_url;
              }
            }
          } catch (_) {}
        }
      }
    }
  } catch (_) {}

  // 2. Fallback: Try loader.to API
  try {
    const loaderRes = await fetch(
      `https://loader.to/ajax/download.php?format=720&url=${encodeURIComponent(videoWatchUrl)}`,
      {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        signal: AbortSignal.timeout(6000),
      }
    );

    if (loaderRes.ok) {
      const loaderData = (await loaderRes.json()) as any;
      if (loaderData?.success && loaderData?.id) {
        const jobId = loaderData.id;
        const progressUrl = `https://lto2.affadaffa.com/api/progress?id=${encodeURIComponent(jobId)}`;

        for (let i = 0; i < 15; i++) {
          await new Promise((r) => setTimeout(r, 1000));
          try {
            const pRes = await fetch(progressUrl, {
              headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
              signal: AbortSignal.timeout(5000),
            });
            if (pRes.ok) {
              const pData = (await pRes.json()) as any;
              if (pData?.success === 1 && pData?.download_url) {
                videoUrlCache.set(videoId, {
                  url: pData.download_url,
                  expires: now + 2 * 60 * 60 * 1000,
                });
                return pData.download_url;
              }
            }
          } catch (_) {}
        }
      }
    }
  } catch (_) {}

  return null;
}
