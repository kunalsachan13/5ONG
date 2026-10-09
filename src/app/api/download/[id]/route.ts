import { getPreview } from "@/lib/deezer";
import { resolveAudioStream } from "@/lib/audioResolver";
import { tagM4a } from "@/lib/m4aMetadata";
import { fetchRawLyrics } from "@/lib/lyricsFetcher";
import { downloadYouTubeAudioForTrack } from "@/lib/youtubeDownloader";
import NodeID3 from "node-id3";

export const dynamic = "force-dynamic";

function safe(s: string) {
  return s.replace(/[\\/:*?"<>|]+/g, "").trim() || "track";
}

function isPreview(url: string): boolean {
  if (!url) return false;
  return (
    url.includes("preview") ||
    url.includes("dzcdn.net") ||
    url.includes("itunes.apple.com") ||
    url.includes("/api/stream/") ||
    url.includes("audio-ssl")
  );
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") || "";
  const artist = searchParams.get("artist") || "";
  const album = searchParams.get("album") || "";
  const coverUrl = searchParams.get("cover") || "";
  const streamParam = searchParams.get("stream") || "";
  const durationParam = searchParams.get("duration") || "";
  const videoIdParam = searchParams.get("videoId") || "";
  const wanted = Number(searchParams.get("quality") ?? 320);

  let targetTitle = title;
  let targetArtist = artist;
  let targetAlbum = album;
  let targetCover = coverUrl;
  const targetDuration = Number(durationParam) || 0;

  // 1. Direct stream passed from active playback (must be full-length, never a 30s preview)
  let audioUrl = "";
  if (
    streamParam &&
    streamParam.startsWith("http") &&
    !streamParam.includes("youtube.com") &&
    !streamParam.includes("youtu.be") &&
    !isPreview(streamParam)
  ) {
    audioUrl = streamParam;
  }

  // 2. If Deezer numeric id, get track metadata if title or cover not supplied
  if ((!targetTitle || !targetCover) && /^\d+$/.test(id)) {
    const entry = await getPreview(id);
    if (entry?.meta) {
      if (!targetTitle) targetTitle = entry.meta.title_short || entry.meta.title || "";
      if (!targetArtist) targetArtist = entry.meta.artist?.name || "";
      if (!targetAlbum) targetAlbum = entry.meta.album?.title || "";
      if (!targetCover) targetCover = entry.meta.album?.cover_xl || entry.meta.album?.cover_medium || "";
    }
  }

  // 3. Resolve full-length 320kbps audio stream from JioSaavn CDN
  if (!audioUrl && targetTitle) {
    try {
      const saavnUrl = await resolveAudioStream(targetTitle, targetArtist);
      if (saavnUrl && !isPreview(saavnUrl)) {
        audioUrl = saavnUrl;
      }
    } catch (_) {}
  }

  let audioBuf: Buffer | null = null;

  // 4. If JioSaavn did not have the song (e.g. "Official Stream" / international track),
  // download the FULL song via YouTube!
  let ytVideoId = videoIdParam.trim();
  if (!ytVideoId) {
    if (id.startsWith("yt-") || id.startsWith("yt_")) {
      ytVideoId = id.replace(/^yt[-_]/, "");
    } else if (streamParam && (streamParam.includes("youtu.be/") || streamParam.includes("watch?v="))) {
      const match = streamParam.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
      if (match) ytVideoId = match[1];
    }
  }

  if (!audioUrl) {
    const ytResult = await downloadYouTubeAudioForTrack({
      videoId: ytVideoId,
      title: targetTitle,
      artist: targetArtist,
    });
    if (ytResult?.buffer) {
      audioBuf = ytResult.buffer;
      audioUrl = "youtube-stream.mp3";
      if (!targetCover && ytResult.videoId) {
        targetCover = `https://i.ytimg.com/vi/${ytResult.videoId}/maxresdefault.jpg`;
      }
    }
  }

  // 5. Absolute last-ditch fallback only if full audio from both JioSaavn and YouTube failed
  if (!audioUrl && !audioBuf && /^\d+$/.test(id)) {
    const entry = await getPreview(id);
    if (entry?.url) {
      audioUrl = entry.url;
    }
  }

  // 6. Fallback cover art search via iTunes Search API if cover is still missing
  if (!targetCover && targetTitle) {
    try {
      const itunesRes = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(targetTitle + " " + targetArtist)}&entity=song&limit=1`,
        { signal: AbortSignal.timeout(3000) }
      );
      if (itunesRes.ok) {
        const j = await itunesRes.json();
        const art = j.results?.[0]?.artworkUrl100;
        if (art) {
          targetCover = art.replace("100x100bb", "1000x1000bb");
        }
      }
    } catch (_) {}
  }

  if (!audioUrl && !audioBuf) {
    return new Response("Audio stream not found", { status: 404 });
  }

  try {
    // Concurrently fetch audio (if not already downloaded), cover image, and lyrics for fastest response
    const [audioRes, imgRes, lyricsData] = await Promise.all([
      audioBuf ? Promise.resolve(null) : fetch(audioUrl, { cache: "no-store" }),
      targetCover
        ? fetch(targetCover, { signal: AbortSignal.timeout(4500) }).catch(() => null)
        : Promise.resolve(null),
      targetTitle
        ? fetchRawLyrics(targetTitle, targetArtist, targetAlbum, targetDuration).catch(() => null)
        : Promise.resolve(null),
    ]);

    if (!audioBuf) {
      if (!audioRes || !audioRes.ok) throw new Error("Failed to fetch upstream audio");
      audioBuf = Buffer.from(await audioRes.arrayBuffer());
    }

    let imageBuffer: Buffer | undefined;
    if (imgRes && imgRes.ok) {
      try {
        imageBuffer = Buffer.from(await imgRes.arrayBuffer());
      } catch (_) {}
    }

    // Secondary cover fallback: If targetCover failed to download, search iTunes
    if (!imageBuffer && targetTitle) {
      try {
        const itunesRes = await fetch(
          `https://itunes.apple.com/search?term=${encodeURIComponent(targetTitle + " " + targetArtist)}&entity=song&limit=1`,
          { signal: AbortSignal.timeout(3500) }
        );
        if (itunesRes.ok) {
          const j = await itunesRes.json();
          const art = j.results?.[0]?.artworkUrl100?.replace("100x100bb", "600x600bb");
          if (art) {
            const fallbackImgRes = await fetch(art, { signal: AbortSignal.timeout(3500) });
            if (fallbackImgRes.ok) {
              imageBuffer = Buffer.from(await fallbackImgRes.arrayBuffer());
            }
          }
        }
      } catch (_) {}
    }

    const lyricsText = lyricsData?.syncedLyrics || lyricsData?.plainLyrics || "";

    // Detect if upstream audio is MP4 / M4A container (standard for JioSaavn AAC streams)
    const isMp4 =
      (audioBuf.length > 8 &&
        audioBuf[4] === 0x66 && // 'f'
        audioBuf[5] === 0x74 && // 't'
        audioBuf[6] === 0x79 && // 'y'
        audioBuf[7] === 0x70) || // 'p'
      audioUrl.includes(".mp4") ||
      audioUrl.includes(".m4a");

    let finalBuffer: Uint8Array = audioBuf;
    const ext = isMp4 ? "m4a" : "mp3";

    if (isMp4) {
      // Clean MP4/M4A tagging via ISO BMFF atom manipulation:
      // Injects metadata (Title, Artist, Album, Cover Art 'covr', Lyrics '©lyr')
      // and recalculates stco/co64 chunk offsets so all media players read cover + lyrics cleanly.
      try {
        finalBuffer = tagM4a(audioBuf, {
          title: targetTitle || "Track",
          artist: targetArtist || "Artist",
          album: targetAlbum || "5ONG Single",
          cover: imageBuffer,
          lyrics: lyricsText || undefined,
        });
      } catch (m4aErr) {
        console.warn("M4A tagging warning:", m4aErr);
        finalBuffer = audioBuf;
      }
    } else {
      // MP3 tagging via standard ID3v2 tags (APIC for cover art, USLT for lyrics)
      try {
        const tags: NodeID3.Tags = {
          title: targetTitle || "Track",
          artist: targetArtist || "Artist",
          album: targetAlbum || "5ONG Single",
          image: imageBuffer
            ? {
                mime: "image/jpeg",
                type: { id: 3, name: "front cover" },
                description: "Cover",
                imageBuffer,
              }
            : undefined,
          unsynchronisedLyrics: lyricsText
            ? {
                language: "eng",
                text: lyricsText,
              }
            : undefined,
        };

        const tagged = NodeID3.write(tags, audioBuf as any);
        if (tagged) {
          finalBuffer = Buffer.from(tagged);
        }
      } catch (e) {
        console.warn("ID3 tagging warning:", e);
      }
    }

    const filename = `${safe(targetArtist || "Artist")} - ${safe(targetTitle || "Track")} [${wanted}k].${ext}`;

    return new Response(finalBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Content-Length": String(finalBuffer.length),
        "Cache-Control": "no-store",
        "X-Requested-Bitrate": String(wanted),
        "X-Delivered-Bitrate": audioUrl.includes("preview") ? "128" : "320",
        "X-Audio-Format": ext,
        "Access-Control-Expose-Headers": "Content-Disposition, X-Requested-Bitrate, X-Delivered-Bitrate, X-Audio-Format",
      },
    });
  } catch (err: any) {
    return new Response(`Download error: ${err?.message || "Unknown error"}`, { status: 502 });
  }
}
