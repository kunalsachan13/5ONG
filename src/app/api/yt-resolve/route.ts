export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';
  if (!q.trim()) {
    return Response.json({ error: 'Query parameter q is required' }, { status: 400 });
  }

  try {
    const cleanQ = q.trim();
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(cleanQ + ' official audio')}`;
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(6000),
    });

    const html = await response.text();
    const candidates: Array<{ vid: string; title: string; channel: string }> = [];

    // 1. Primary: Extract structured search results from ytInitialData
    const dataMatch = html.match(/ytInitialData\s*=\s*({[\s\S]+?});<\/script>/);
    if (dataMatch) {
      try {
        const data = JSON.parse(dataMatch[1]);
        const contents =
          data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

        for (const section of contents) {
          const items = section.itemSectionRenderer?.contents || [];
          for (const it of items) {
            if (it.videoRenderer && it.videoRenderer.videoId) {
              const vid = it.videoRenderer.videoId;
              const title = it.videoRenderer.title?.runs?.[0]?.text || '';
              const channel = it.videoRenderer.ownerText?.runs?.[0]?.text || '';
              candidates.push({ vid, title, channel });
            }
          }
        }
      } catch (_) {}
    }

    // 2. Score candidates to pick the best matching official song
    if (candidates.length > 0) {
      const qWords = cleanQ.toLowerCase().split(/\s+/).filter((w) => w.length > 1);

      let bestScore = -1;
      let bestVid = candidates[0].vid;

      for (const c of candidates) {
        const titleLower = c.title.toLowerCase();
        const chanLower = c.channel.toLowerCase();

        // Penalty for unwanted video types
        if (
          titleLower.includes('10 hour') ||
          titleLower.includes('reaction') ||
          titleLower.includes('tutorial') ||
          titleLower.includes('cover')
        ) {
          continue;
        }

        let score = 0;
        for (const w of qWords) {
          if (titleLower.includes(w)) score += 3;
          if (chanLower.includes(w)) score += 2;
        }

        if (titleLower.includes('official audio') || titleLower.includes('audio')) score += 4;
        if (titleLower.includes('official music video') || titleLower.includes('official video')) score += 3;
        if (chanLower.includes('topic') || chanLower.includes('vevo')) score += 3;

        if (score > bestScore) {
          bestScore = score;
          bestVid = c.vid;
        }
      }

      return Response.json({
        success: true,
        videoId: bestVid,
        allVideoIds: candidates.map((c) => c.vid).slice(0, 5),
      });
    }

    // 3. Fallback: targeted watch regex if ytInitialData was missing
    const watchRegex = /\/watch\?v=([a-zA-Z0-9_-]{11})/g;
    const matches: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = watchRegex.exec(html)) !== null) {
      matches.push(m[1]);
    }
    const uniqueIds = [...new Set(matches)];
    if (uniqueIds.length > 0) {
      return Response.json({
        success: true,
        videoId: uniqueIds[0],
        allVideoIds: uniqueIds.slice(0, 5),
      });
    }

    return Response.json({ error: 'No videoId found' }, { status: 404 });
  } catch (err: any) {
    return Response.json({ error: err?.message || 'Resolution error' }, { status: 500 });
  }
}
