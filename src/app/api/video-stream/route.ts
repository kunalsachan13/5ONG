import { NextRequest } from "next/server";
import { resolveDirectVideoUrl } from "@/lib/videoStreamResolver";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const videoId = searchParams.get("v") || searchParams.get("videoId");
  const play = searchParams.get("play") === "1" || searchParams.get("stream") === "1";

  if (!videoId || videoId.length !== 11) {
    return new Response(JSON.stringify({ error: "Valid videoId is required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // If client just wants metadata / stream URL
  if (!play) {
    return new Response(
      JSON.stringify({
        success: true,
        videoId,
        streamUrl: `/api/video-stream?v=${encodeURIComponent(videoId)}&play=1`,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // Resolve direct MP4 download/streaming URL
  const directUrl = await resolveDirectVideoUrl(videoId);
  if (!directUrl) {
    return new Response(JSON.stringify({ error: "Unable to resolve video stream" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Proxy the video stream with Range support and appropriate headers
  try {
    const rangeHeader = req.headers.get("range");
    const upstreamHeaders: Record<string, string> = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      Referer: "https://savenow.to/",
    };
    if (rangeHeader) {
      upstreamHeaders["Range"] = rangeHeader;
    }

    const upstreamRes = await fetch(directUrl, {
      headers: upstreamHeaders,
    });

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      return new Response(JSON.stringify({ error: "Upstream stream error" }), {
        status: upstreamRes.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    const responseHeaders = new Headers();
    responseHeaders.set("Content-Type", "video/mp4");
    responseHeaders.set("Accept-Ranges", "bytes");
    responseHeaders.set("Cache-Control", "public, max-age=3600");

    const contentRange = upstreamRes.headers.get("content-range");
    if (contentRange) responseHeaders.set("Content-Range", contentRange);

    const contentLength = upstreamRes.headers.get("content-length");
    if (contentLength) responseHeaders.set("Content-Length", contentLength);

    return new Response(upstreamRes.body, {
      status: upstreamRes.status === 206 ? 206 : 200,
      headers: responseHeaders,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "Streaming failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
