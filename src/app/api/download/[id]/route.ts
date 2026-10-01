import { getPreview } from "@/lib/deezer";
import { resolveAudioStream } from "@/lib/audioResolver";
import NodeID3 from "node-id3";

export const dynamic = "force-dynamic";

function safe(s: string) {
  return s.replace(/[\\/:*?"<>|]+/g, "").trim() || "track";
}

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const title = searchParams.get("title") || "";
  const artist = searchParams.get("artist") || "";
  const album = searchParams.get("album") || "";
  const coverUrl = searchParams.get("cover") || "";
  const wanted = Number(searchParams.get("quality") ?? 320);

  let targetTitle = title;
  let targetArtist = artist;
  let targetAlbum = album;
  let targetCover = coverUrl;

  // If Deezer numeric id, get track metadata if title not supplied
  if (!targetTitle && /^\d+$/.test(id)) {
    const entry = await getPreview(id);
    if (entry?.meta) {
      targetTitle = entry.meta.title_short || entry.meta.title || "";
      targetArtist = entry.meta.artist?.name || "";
      targetAlbum = entry.meta.album?.title || "";
      targetCover = entry.meta.album?.cover_xl || entry.meta.album?.cover_medium || "";
    }
  }

  // 1. Resolve full-length 320kbps audio stream from JioSaavn CDN
  let audioUrl = "";
  if (targetTitle) {
    try {
      audioUrl = await resolveAudioStream(targetTitle, targetArtist);
    } catch (_) {}
  }

  // 2. If not found and numeric ID, fallback to Deezer preview
  if (!audioUrl && /^\d+$/.test(id)) {
    const entry = await getPreview(id);
    if (entry?.url) {
      audioUrl = entry.url;
    }
  }

  if (!audioUrl) {
    return new Response("Audio stream not found", { status: 404 });
  }

  try {
    const audioRes = await fetch(audioUrl, { cache: "no-store" });
    if (!audioRes.ok) throw new Error("Failed to fetch upstream audio");
    const audioBuf = Buffer.from(await audioRes.arrayBuffer());

    let finalBuffer = audioBuf;

    // Embed ID3 tags
    try {
      let imageBuffer: Buffer | undefined;
      if (targetCover) {
        try {
          const imgRes = await fetch(targetCover, { signal: AbortSignal.timeout(4000) });
          if (imgRes.ok) {
            imageBuffer = Buffer.from(await imgRes.arrayBuffer());
          }
        } catch (_) {}
      }

      const tags = {
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
      };

      const tagged = NodeID3.write(tags, audioBuf as any);
      if (tagged) {
        finalBuffer = Buffer.from(tagged);
      }
    } catch (e) {
      console.warn("ID3 tagging note:", e);
    }

    const filename = `${safe(targetArtist || "Artist")} - ${safe(targetTitle || "Track")} [${wanted}k].mp3`;

    return new Response(finalBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `attachment; filename="${filename.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Content-Length": String(finalBuffer.length),
        "Cache-Control": "no-store",
        "X-Requested-Bitrate": String(wanted),
        "X-Delivered-Bitrate": audioUrl.includes("preview") ? "128" : "320",
        "Access-Control-Expose-Headers": "X-Requested-Bitrate, X-Delivered-Bitrate",
      },
    });
  } catch (err: any) {
    return new Response(`Download error: ${err?.message || "Unknown error"}`, { status: 502 });
  }
}
