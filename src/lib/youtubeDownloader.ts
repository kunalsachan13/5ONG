/**
 * YouTube Audio Downloader for 5ONG
 * Converts and downloads full-length audio tracks via high-quality YouTube sources.
 */

export async function findYouTubeCandidateIds(title: string, artist: string = ""): Promise<string[]> {
  try {
    const q = `${title || ""} ${artist || ""} official audio`.trim();
    if (!q) return [];
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(6500),
    });
    if (!res.ok) return [];
    const html = await res.text();
    const dataMatch = html.match(/ytInitialData\s*=\s*({[\s\S]+?});<\/script>/);
    const candidates: Array<{ vid: string; title: string; channel: string }> = [];

    if (dataMatch) {
      try {
        const data = JSON.parse(dataMatch[1]);
        const contents =
          data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
        for (const section of contents) {
          const items = section.itemSectionRenderer?.contents || [];
          for (const it of items) {
            if (it.videoRenderer && it.videoRenderer.videoId) {
              candidates.push({
                vid: it.videoRenderer.videoId,
                title: it.videoRenderer.title?.runs?.[0]?.text || "",
                channel: it.videoRenderer.ownerText?.runs?.[0]?.text || "",
              });
            }
          }
        }
      } catch (_) {}
    }

    if (candidates.length > 0) {
      const qWords = q.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
      const scored = candidates.map((c) => {
        const titleL = c.title.toLowerCase();
        const chanL = c.channel.toLowerCase();
        if (
          titleL.includes("10 hour") ||
          titleL.includes("reaction") ||
          titleL.includes("tutorial") ||
          titleL.includes("cover")
        ) {
          return { ...c, score: -10 };
        }
        let score = 0;
        for (const w of qWords) {
          if (titleL.includes(w)) score += 3;
          if (chanL.includes(w)) score += 2;
        }
        // Topic channels convert the cleanest and highest fidelity
        if (chanL.includes("topic")) score += 6;
        if (titleL.includes("official audio") || titleL.includes("audio")) score += 4;
        if (chanL.includes("vevo")) score += 2;
        return { ...c, score };
      });
      scored.sort((a, b) => b.score - a.score);
      return scored.filter((c) => c.score > 0).map((c) => c.vid).slice(0, 5);
    }

    const regexMatches = [...html.matchAll(/\/watch\?v=([a-zA-Z0-9_-]{11})/g)].map((m) => m[1]);
    return [...new Set(regexMatches)].slice(0, 5);
  } catch (_) {
    return [];
  }
}

export async function resolveYouTubeAudioBuffer(videoId: string): Promise<Buffer | null> {
  if (!videoId || videoId.length !== 11) return null;
  try {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const startRes = await fetch(
      `https://p.savenow.to/ajax/download.php?format=mp3&url=${encodeURIComponent(url)}`,
      {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!startRes.ok) return null;
    const startData = (await startRes.json()) as any;
    if (!startData?.success || !startData?.id) return null;

    const jobId = startData.id;
    const progressEndpoint = `https://p.savenow.to/api/progress?id=${encodeURIComponent(jobId)}`;

    for (let i = 0; i < 22; i++) {
      await new Promise((r) => setTimeout(r, 1200));
      try {
        const pRes = await fetch(progressEndpoint, {
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
          signal: AbortSignal.timeout(6000),
        });
        if (!pRes.ok) continue;
        const pData = (await pRes.json()) as any;
        if (pData?.success === 1 && pData?.download_url) {
          const audioRes = await fetch(pData.download_url, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
            signal: AbortSignal.timeout(50000),
          });
          if (audioRes.ok) {
            const ab = await audioRes.arrayBuffer();
            if (ab.byteLength > 100000) {
              return Buffer.from(ab);
            }
          }
        }
      } catch (_) {}
    }
  } catch (_) {}
  return null;
}

export async function downloadYouTubeAudioForTrack(options: {
  videoId?: string;
  title: string;
  artist?: string;
}): Promise<{ buffer: Buffer; videoId: string } | null> {
  const { videoId, title, artist = "" } = options;

  // 1. Try provided videoId first if available
  if (videoId && videoId.length === 11) {
    const buf = await resolveYouTubeAudioBuffer(videoId);
    if (buf) {
      return { buffer: buf, videoId };
    }
  }

  // 2. Search YouTube candidates
  const candidates = await findYouTubeCandidateIds(title, artist);
  for (const candVid of candidates) {
    if (candVid === videoId) continue;
    const buf = await resolveYouTubeAudioBuffer(candVid);
    if (buf) {
      return { buffer: buf, videoId: candVid };
    }
  }

  return null;
}
