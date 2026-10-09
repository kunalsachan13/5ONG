import { resolveAudioStream } from "@/lib/audioResolver";
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

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { track, quality = 320 } = body;
    if (!track || !track.title) {
      return Response.json({ error: "Track title required" }, { status: 400 });
    }

    const title = track.title;
    const artist = track.artist || "";
    const album = track.album || "";
    let coverUrl = track.coverBig || track.cover || "";

    let audioUrl = track.audioUrl || track.streamUrl || "";
    if (!audioUrl || isPreview(audioUrl)) {
      audioUrl = await resolveAudioStream(title, artist);
    }

    let audioBuf: Buffer | null = null;
    if (!audioUrl || isPreview(audioUrl)) {
      let vid = "";
      if (track.id?.startsWith("yt-")) {
        vid = track.id.replace("yt-", "");
      } else if (track.youtube_url) {
        const match = track.youtube_url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        if (match) vid = match[1];
      }
      const ytResult = await downloadYouTubeAudioForTrack({
        videoId: vid,
        title,
        artist,
      });
      if (ytResult?.buffer) {
        audioBuf = ytResult.buffer;
        audioUrl = "youtube-stream.mp3";
        if (!coverUrl && ytResult.videoId) {
          coverUrl = `https://i.ytimg.com/vi/${ytResult.videoId}/maxresdefault.jpg`;
        }
      }
    }

    if (!audioUrl && !audioBuf) {
      return Response.json({ error: "Audio stream not found" }, { status: 404 });
    }

    if (!audioBuf) {
      const audioRes = await fetch(audioUrl, { cache: "no-store" });
      if (!audioRes.ok) throw new Error("Failed to fetch upstream audio");
      audioBuf = Buffer.from(await audioRes.arrayBuffer());
    }

    // Detect if upstream audio is MP4 / M4A container (standard for JioSaavn AAC streams)
    const isMp4 =
      (audioBuf.length > 8 &&
        audioBuf[4] === 0x66 && // 'f'
        audioBuf[5] === 0x74 && // 't'
        audioBuf[6] === 0x79 && // 'y'
        audioBuf[7] === 0x70) || // 'p'
      audioUrl.includes(".mp4") ||
      audioUrl.includes(".m4a");

    let finalBuffer = audioBuf;
    const ext = isMp4 ? "m4a" : "mp3";
    const contentType = isMp4 ? "audio/mp4" : "audio/mpeg";

    // ONLY apply ID3 tagging if it is an actual MP3 file.
    // Calling NodeID3 on MP4/M4A files prepends ID3 tags in front of the 'ftyp' atom,
    // which completely breaks the container and causes "Unsupported file format / Unable to play" on mobile players!
    if (!isMp4) {
      try {
        let imageBuffer: Buffer | undefined;
        if (coverUrl) {
          try {
            const imgRes = await fetch(coverUrl, { signal: AbortSignal.timeout(4000) });
            if (imgRes.ok) imageBuffer = Buffer.from(await imgRes.arrayBuffer());
          } catch (_) {}
        }

        const tags = {
          title: title || "Track",
          artist: artist || "Artist",
          album: album || "5ONG Single",
          image: imageBuffer
            ? {
                mime: "image/jpeg",
                type: { id: 3, name: "front cover" },
                description: "Cover",
                imageBuffer,
              }
            : undefined,
        };

        const tagged = NodeID3.write(tags, audioBuf as any);
        if (tagged) finalBuffer = Buffer.from(tagged);
      } catch (e) {
        console.warn("ID3 tagging note:", e);
      }
    }

    const filename = `${safe(artist || "Artist")} - ${safe(title || "Track")} [${quality}k].${ext}`;

    return new Response(finalBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Content-Length": String(finalBuffer.length),
        "Cache-Control": "no-store",
        "X-Audio-Format": ext,
        "Access-Control-Expose-Headers": "Content-Disposition, X-Audio-Format",
      },
    });
  } catch (err: any) {
    return Response.json({ error: err?.message || "Download failed" }, { status: 500 });
  }
}
