import { dz, normalizeTracks } from "@/lib/deezer";
import { errorResponse, HttpError } from "@/lib/auth";
import type { Track } from "@/lib/types";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

interface BasicTrackMeta {
  title: string;
  artist: string;
  duration?: number;
}

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

function norm(s: string) {
  return s
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, " ")
    .replace(/-.*(remaster|version|edit|mix|live).*$/i, " ")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function resolveTrack(t: BasicTrackMeta): Promise<Track | null> {
  const artist = t.artist.split(/,|&/)[0].trim();
  const queries = [
    `artist:"${artist}" track:"${t.title.replace(/"/g, "")}"`,
    `${t.title} ${artist}`,
  ];
  for (const q of queries) {
    try {
      const r = await dz<{ data: unknown[] }>(`/search?q=${encodeURIComponent(q)}&limit=5`, 3600);
      const cands = normalizeTracks(r.data as never[]);
      if (!cands.length) continue;
      const nt = norm(t.title);
      const ranked = cands
        .map((c) => {
          let score = 0;
          const ct = norm(c.title);
          if (ct === nt) score += 3;
          else if (ct.includes(nt) || nt.includes(ct)) score += 1.5;
          if (norm(c.artist) === norm(artist)) score += 2;
          else if (norm(c.artist).includes(norm(artist)) || norm(artist).includes(norm(c.artist))) score += 1;
          if (t.duration) score -= Math.min(1, Math.abs(c.duration - t.duration / 1000) / 60);
          return { c, score };
        })
        .sort((a, b) => b.score - a.score);
      if (ranked[0].score >= 2) return ranked[0].c;
      if (q === queries[1]) return ranked[0].score >= 1 ? ranked[0].c : null;
    } catch {
      /* try next query */
    }
  }
  return null;
}

// 1. Spotify
function parseSpotifyUrl(input: string) {
  const m =
    input.match(/open\.spotify\.com\/(?:intl-[a-z]+\/)?(playlist|album)\/([A-Za-z0-9]+)/) ||
    input.match(/spotify:(playlist|album):([A-Za-z0-9]+)/);
  if (!m) return null;
  return { kind: m[1], id: m[2] };
}

async function importSpotify(input: string) {
  const parsed = parseSpotifyUrl(input);
  if (!parsed) throw new HttpError(400, "Invalid Spotify link. Paste a playlist or album link.");

  const res = await fetch(`https://open.spotify.com/embed/${parsed.kind}/${parsed.id}`, {
    headers: { "User-Agent": "Mozilla/5.0 (5ONG importer)", "Accept-Language": "en" },
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  if (!res.ok) throw new HttpError(404, "Couldn't open that Spotify link. Is the playlist public?");
  const html = await res.text();
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (!m) throw new HttpError(502, "Spotify returned an unexpected page");
  const entity = JSON.parse(m[1])?.props?.pageProps?.state?.data?.entity;
  const list: BasicTrackMeta[] = (entity?.trackList ?? [])
    .filter((t: { title?: string }) => t?.title)
    .map((t: { title: string; subtitle?: string; duration?: number }) => ({
      title: t.title,
      artist: t.subtitle ?? "",
      duration: t.duration,
    }));
  if (!list.length) throw new HttpError(404, "No tracks found. The playlist must be public.");

  const limited = list.slice(0, 100);
  const results: (Track | null)[] = new Array(limited.length).fill(null);
  let cursor = 0;
  const workers = Array.from({ length: 5 }, async () => {
    while (cursor < limited.length) {
      const i = cursor++;
      results[i] = await resolveTrack(limited[i]);
    }
  });
  await Promise.all(workers);

  const seen = new Set<string>();
  const tracks: Track[] = [];
  const missing: { title: string; artist: string }[] = [];
  results.forEach((t, i) => {
    if (t && !seen.has(t.id)) {
      seen.add(t.id);
      tracks.push(t);
    } else if (!t) {
      missing.push({ title: limited[i].title, artist: limited[i].artist });
    }
  });

  return {
    provider: "spotify",
    name: entity?.name || entity?.title || "Spotify Playlist",
    cover: entity?.coverArt?.sources?.[0]?.url ?? null,
    total: list.length,
    tracks,
    missing,
  };
}

// 2. YouTube & YouTube Music
function parseYouTubeUrl(input: string) {
  const isYt =
    input.includes("youtube.com") ||
    input.includes("youtu.be") ||
    input.includes("music.youtube.com");
  if (!isYt) return null;

  const listMatch = input.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  if (listMatch) return { type: "playlist", id: listMatch[1] };

  const vidMatch = input.match(/(?:watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (vidMatch) return { type: "video", id: vidMatch[1] };

  return null;
}

async function importYouTube(input: string) {
  const parsed = parseYouTubeUrl(input);
  if (!parsed) throw new HttpError(400, "Invalid YouTube or YouTube Music link.");

  const targetUrl =
    parsed.type === "playlist"
      ? `https://www.youtube.com/playlist?list=${parsed.id}`
      : `https://www.youtube.com/watch?v=${parsed.id}`;

  const res = await fetch(targetUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new HttpError(res.status, "Couldn't open that YouTube link.");
  const html = await res.text();
  const m = html.match(/ytInitialData\s*=\s*({[\s\S]+?});<\/script>/);
  if (!m) throw new HttpError(502, "Could not extract YouTube playlist data.");
  const d = JSON.parse(m[1]);

  const playlistTitle =
    d.metadata?.playlistMetadataRenderer?.title ||
    d.header?.playlistHeaderRenderer?.title?.runs?.[0]?.text ||
    "YouTube Music Playlist";

  const rawItems: any[] =
    d.contents?.twoColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents ||
    [];

  const tracks: Track[] = [];
  for (const item of rawItems) {
    if (item.lockupViewModel) {
      const vm = item.lockupViewModel;
      const vid = vm.contentId;
      if (!vid) continue;
      const songTitle = vm.metadata?.lockupMetadataViewModel?.title?.content || "YouTube Track";
      const rows = vm.metadata?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel?.metadataRows || [];
      let artist = "";
      if (rows[0]?.metadataParts) {
        artist = rows[0].metadataParts.map((p: any) => p.text?.content || "").filter(Boolean).join(" ");
      }
      tracks.push({
        id: `yt_${vid}`,
        title: decodeHtml(songTitle),
        artist: decodeHtml(artist || "YouTube Artist"),
        album: decodeHtml(playlistTitle),
        cover: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
        coverBig: `https://i.ytimg.com/vi/${vid}/maxresdefault.jpg`,
        duration: 180,
        youtube_url: `https://www.youtube.com/watch?v=${vid}`,
        source: "youtube",
      });
    } else if (item.playlistVideoRenderer) {
      const vr = item.playlistVideoRenderer;
      const vid = vr.videoId;
      if (!vid) continue;
      const songTitle = vr.title?.runs?.[0]?.text || "YouTube Track";
      const artist = vr.shortBylineText?.runs?.[0]?.text || "YouTube Artist";
      const duration = parseInt(vr.lengthSeconds, 10) || 180;
      tracks.push({
        id: `yt_${vid}`,
        title: decodeHtml(songTitle),
        artist: decodeHtml(artist),
        album: decodeHtml(playlistTitle),
        cover: `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
        coverBig: `https://i.ytimg.com/vi/${vid}/maxresdefault.jpg`,
        duration,
        youtube_url: `https://www.youtube.com/watch?v=${vid}`,
        source: "youtube",
      });
    }
  }

  if (!tracks.length) {
    throw new HttpError(404, "No videos found in that YouTube playlist. Make sure the playlist is public or unlisted.");
  }

  return {
    provider: "ytmusic",
    name: decodeHtml(playlistTitle),
    cover: tracks[0]?.cover || null,
    total: tracks.length,
    tracks,
    missing: [],
  };
}

// 3. JioSaavn
function parseJioSaavnUrl(input: string) {
  const isSaavn = input.includes("jiosaavn.com") || input.includes("saavn.com");
  return isSaavn ? input.trim() : null;
}

async function importJioSaavn(input: string) {
  const cleanUrl = parseJioSaavnUrl(input);
  if (!cleanUrl) throw new HttpError(400, "Invalid JioSaavn link.");

  const res = await fetch(cleanUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new HttpError(res.status, "Couldn't open that JioSaavn link. Please ensure it is public.");
  const html = await res.text();

  const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)];
  const scriptWithData = scripts.find((s) => s[1].includes("window.__INITIAL_DATA__"));
  if (!scriptWithData) throw new HttpError(502, "Could not extract JioSaavn playlist data.");

  const s = scriptWithData[1];
  const idx = s.indexOf("window.__INITIAL_DATA__ =");
  const jsStr = s.slice(idx + "window.__INITIAL_DATA__ =".length).trim().replace(/;$/, "");

  let data: any;
  try {
    data = new Function("return " + jsStr)();
  } catch (err: any) {
    throw new HttpError(502, "Failed to parse JioSaavn playlist state: " + err.message);
  }

  const entity = data.playlist?.playlist || data.albumView?.album || data.song?.song;
  if (!entity) throw new HttpError(404, "No playlist or album found on this JioSaavn page.");

  const title =
    typeof entity.title === "object"
      ? entity.title.text
      : entity.title || entity.name || "JioSaavn Playlist";

  const cover = Array.isArray(entity.image) ? entity.image[0] : entity.image || null;
  const rawList: any[] = entity.list || entity.songs || [];

  const tracks: Track[] = rawList.map((item) => {
    const songTitle =
      typeof item.title === "object" ? item.title.text : item.title || item.name || "Unknown Track";
    let artist = "";
    if (Array.isArray(item.subtitle)) {
      artist = item.subtitle.map((sub: any) => sub.text || "").filter(Boolean).join(", ");
    } else if (typeof item.subtitle === "object" && item.subtitle) {
      artist = item.subtitle.text || "";
    } else {
      artist = item.subtitle || item.artist || item.singers || "JioSaavn Artist";
    }

    const img = Array.isArray(item.image) ? item.image[0] : item.image || cover || "";
    const cleanImg = img ? img.replace(/150x150/, "500x500") : "";

    return {
      id: `saavn_${item.id}`,
      title: decodeHtml(songTitle),
      artist: decodeHtml(artist),
      album: typeof entity.title === "object" ? decodeHtml(entity.title.text) : decodeHtml(title),
      cover: cleanImg || cover || "",
      coverBig: cleanImg || cover || "",
      duration: Number(item.duration) || 180,
      source: "saavn",
    };
  });

  return {
    provider: "jiosaavn",
    name: decodeHtml(title),
    cover,
    total: tracks.length,
    tracks,
    missing: [],
  };
}

// 4. Amazon Music
function parseAmazonUrl(input: string) {
  const isAmazon = input.includes("music.amazon.") || input.includes("amazon.com/music");
  return isAmazon ? input.trim() : null;
}

async function importAmazon(input: string) {
  const cleanUrl = parseAmazonUrl(input);
  if (!cleanUrl) throw new HttpError(400, "Invalid Amazon Music link.");

  const res = await fetch(cleanUrl, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new HttpError(res.status, "Couldn't fetch Amazon Music page.");
  const text = await res.text();

  // Extract playlist name if possible
  const ogTitle = text.match(/<title>([^<]+)<\/title>/i);
  let name = ogTitle?.[1] ? ogTitle[1].replace(/on Amazon Music.*$/i, "").trim() : "Amazon Music Playlist";
  if (name.includes("Amazon Music |")) name = "Amazon Music Playlist";

  // Find all items with primary-text & secondary-text
  const matchedRows = [...text.matchAll(/<(?:music-[a-z-]+)[^>]*primary-text="([^"]+)"[^>]*secondary-text="([^"]+)"/g)];

  const rawMeta: BasicTrackMeta[] = [];
  const seenNames = new Set<string>();

  for (const m of matchedRows) {
    const title = decodeHtml(m[1].trim());
    const artist = decodeHtml(m[2].trim());
    const key = `${title}__${artist}`.toLowerCase();
    if (seenNames.has(key)) continue;
    seenNames.add(key);
    rawMeta.push({ title, artist });
  }

  if (!rawMeta.length) {
    throw new HttpError(
      404,
      "Couldn't extract tracks from this Amazon Music link. Tip: You can switch to the 'Text Tracklist' tab to paste your song list directly!"
    );
  }

  const limited = rawMeta.slice(0, 50);
  const results: (Track | null)[] = new Array(limited.length).fill(null);
  let cursor = 0;
  const workers = Array.from({ length: 5 }, async () => {
    while (cursor < limited.length) {
      const i = cursor++;
      results[i] = await resolveTrack(limited[i]);
    }
  });
  await Promise.all(workers);

  const tracks: Track[] = [];
  const missing: { title: string; artist: string }[] = [];
  const seenIds = new Set<string>();

  results.forEach((t, i) => {
    if (t && !seenIds.has(t.id)) {
      seenIds.add(t.id);
      tracks.push(t);
    } else if (!t) {
      missing.push({ title: limited[i].title, artist: limited[i].artist });
    }
  });

  return {
    provider: "amazon",
    name,
    cover: tracks[0]?.cover || null,
    total: rawMeta.length,
    tracks,
    missing,
  };
}

// 5. Plain Text Tracklist
async function importText(textInput: string) {
  const lines = textInput
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 1 && !/^(track|artist|title|#|\d+\.)/i.test(l));

  if (!lines.length) throw new HttpError(400, "Please paste at least one track title or 'Song - Artist' line.");

  const list: BasicTrackMeta[] = lines.slice(0, 50).map((line) => {
    // Check if format is "Title - Artist" or "Artist - Title"
    const parts = line.split(/\s*[-–—]\s*/);
    if (parts.length >= 2) {
      return { title: parts[0].trim(), artist: parts[1].trim() };
    }
    return { title: line.trim(), artist: "" };
  });

  const results: (Track | null)[] = new Array(list.length).fill(null);
  let cursor = 0;
  const workers = Array.from({ length: 5 }, async () => {
    while (cursor < list.length) {
      const i = cursor++;
      results[i] = await resolveTrack(list[i]);
    }
  });
  await Promise.all(workers);

  const tracks: Track[] = [];
  const missing: { title: string; artist: string }[] = [];
  const seenIds = new Set<string>();

  results.forEach((t, i) => {
    if (t && !seenIds.has(t.id)) {
      seenIds.add(t.id);
      tracks.push(t);
    } else if (!t) {
      missing.push({ title: list[i].title, artist: list[i].artist });
    }
  });

  return {
    provider: "text",
    name: "Custom Imported Playlist",
    cover: tracks[0]?.cover || null,
    total: list.length,
    tracks,
    missing,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawInput = String(body.url ?? body.text ?? "").trim();
    const explicitProvider = String(body.provider ?? "").toLowerCase();

    if (!rawInput) {
      throw new HttpError(400, "Please provide a playlist link or tracklist");
    }

    // Auto-detect or use explicit provider
    if (explicitProvider === "text" || body.text) {
      const result = await importText(rawInput);
      return Response.json(result);
    }

    if (parseSpotifyUrl(rawInput) || explicitProvider === "spotify") {
      const result = await importSpotify(rawInput);
      return Response.json(result);
    }

    if (parseYouTubeUrl(rawInput) || explicitProvider === "ytmusic" || explicitProvider === "youtube") {
      const result = await importYouTube(rawInput);
      return Response.json(result);
    }

    if (parseJioSaavnUrl(rawInput) || explicitProvider === "jiosaavn") {
      const result = await importJioSaavn(rawInput);
      return Response.json(result);
    }

    if (parseAmazonUrl(rawInput) || explicitProvider === "amazon") {
      const result = await importAmazon(rawInput);
      return Response.json(result);
    }

    // Fallback: Check if user pasted multi-line text
    if (rawInput.includes("\n")) {
      const result = await importText(rawInput);
      return Response.json(result);
    }

    throw new HttpError(
      400,
      "Unsupported link. Please paste a link from Spotify, YouTube Music, JioSaavn, or Amazon Music (or switch to Text Tracklist)."
    );
  } catch (e) {
    return errorResponse(e);
  }
}
