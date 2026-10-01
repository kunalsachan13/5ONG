import { dz, normalizeTracks } from "@/lib/deezer";
import type { Track } from "@/lib/types";

// "AI radio": builds a similar-sounding queue from a seed track using artist
// top tracks, related artists and the genre chart as a discovery pad.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id") ?? "";
  const exclude = new Set((searchParams.get("exclude") ?? "").split(",").filter(Boolean));
  if (!/^\d+$/.test(id)) return Response.json({ tracks: [] });
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const seed = await dz<any>(`/track/${id}`, 3600);
    const artistId = seed.artist?.id;
    const out: Track[] = [];
    if (artistId) {
      const [related, own] = await Promise.all([
        dz<{ data: { id: number }[] }>(`/artist/${artistId}/related?limit=6`, 3600).catch(() => ({ data: [] })),
        dz<{ data: unknown[] }>(`/artist/${artistId}/top?limit=8`, 3600).catch(() => ({ data: [] })),
      ]);
      const tops = await Promise.all(
        related.data
          .slice(0, 5)
          .map((a) => dz<{ data: unknown[] }>(`/artist/${a.id}/top?limit=5`, 3600).catch(() => ({ data: [] }))),
      );
      const buckets = [normalizeTracks(own.data as never[]).slice(0, 3), ...tops.map((t) => normalizeTracks(t.data as never[]))];
      // interleave so artists alternate
      for (let i = 0; i < 8; i++) for (const b of buckets) if (b[i]) out.push(b[i]);
    }
    if (out.length < 8 && seed.album?.genre_id !== undefined) {
      const gid = seed.genre_id ?? seed.album?.genre_id ?? 0;
      const chart = await dz<{ data: unknown[] }>(`/chart/${gid}/tracks?limit=20`, 600).catch(() => ({ data: [] }));
      out.push(...normalizeTracks(chart.data as never[]));
    }
    const seen = new Set<string>();
    const tracks = out.filter((t) => {
      if (t.id === id || exclude.has(t.id) || seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
    return Response.json({ tracks: tracks.slice(0, 15) });
  } catch {
    return Response.json({ tracks: [] });
  }
}
