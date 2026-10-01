import { resolveAudioStream } from "@/lib/audioResolver";
import NodeID3 from "node-id3";

export const dynamic = "force-dynamic";

function safe(s: string) {
  return s.replace(/[\\/:*?"<>|]+/g, "").trim() || "track";
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
    const coverUrl = track.coverBig || track.cover || "";

    let audioUrl = track.audioUrl || track.streamUrl || "";
    if (!audioUrl || audioUrl.includes("preview")) {
      audioUrl = await resolveAudioStream(title, artist);
    }
    if (!audioUrl && track.preview_url) {
      audioUrl = track.preview_url;
    }

    if (!audioUrl) {
      return Response.json({ error: "Audio stream not found" }, { status: 404 });
    }

    const audioRes = await fetch(audioUrl, { cache: "no-store" });
    if (!audioRes.ok) throw new Error("Failed to fetch upstream audio");
    const audioBuf = Buffer.from(await audioRes.arrayBuffer());

    let finalBuffer = audioBuf;

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

    const filename = `${safe(artist || "Artist")} - ${safe(title || "Track")} [${quality}k].mp3`;

    return new Response(finalBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `attachment; filename="${filename.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Content-Length": String(finalBuffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    return Response.json({ error: err?.message || "Download failed" }, { status: 500 });
  }
}
