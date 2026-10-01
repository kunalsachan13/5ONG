import { getPreview } from "@/lib/deezer";
import { resolveAudioStream } from "@/lib/audioResolver";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const { searchParams } = new URL(req.url);
  const titleParam = searchParams.get("title");
  const artistParam = searchParams.get("artist") || "";

  // 1. If title and artist are passed directly in query, resolve JioSaavn 320kbps full stream
  if (titleParam) {
    try {
      const saavnStream = await resolveAudioStream(titleParam, artistParam);
      if (saavnStream) {
        return Response.redirect(saavnStream, 307);
      }
    } catch (_) {}
  }

  // 2. If id is numeric Deezer id
  if (/^\d+$/.test(id)) {
    const entry = await getPreview(id);
    if (entry) {
      // Try to resolve full 320kbps stream using Deezer track metadata!
      try {
        const metaTitle = entry.meta?.title_short || entry.meta?.title;
        const metaArtist = entry.meta?.artist?.name || "";
        if (metaTitle) {
          const saavnStream = await resolveAudioStream(metaTitle, metaArtist);
          if (saavnStream) {
            return Response.redirect(saavnStream, 307);
          }
        }
      } catch (_) {}

      // Fallback: stream Deezer preview with range support
      const range = req.headers.get("range");
      const upstream = await fetch(entry.url, { headers: range ? { range } : {}, cache: "no-store" });
      if (!upstream.ok && upstream.status !== 206) return new Response("Upstream error", { status: 502 });

      const headers = new Headers({
        "Content-Type": upstream.headers.get("content-type") || "audio/mpeg",
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, max-age=3600",
      });
      for (const h of ["content-length", "content-range"]) {
        const v = upstream.headers.get(h);
        if (v) headers.set(h, v);
      }
      return new Response(upstream.body, { status: upstream.status, headers });
    }
  }

  // 3. If id is custom (e.g. saavn_ or itunes_), try resolving from title/artist
  if (titleParam) {
    const saavnStream = await resolveAudioStream(titleParam, artistParam);
    if (saavnStream) {
      return Response.redirect(saavnStream, 307);
    }
  }

  return new Response("Not found", { status: 404 });
}
