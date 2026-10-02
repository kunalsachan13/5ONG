import { firebaseDb } from "@/lib/firebaseDb";
import { errorResponse, HttpError, requireUser } from "@/lib/auth";
import { normalizeTracks } from "@/lib/deezer";
import type { Track } from "@/lib/types";

export const dynamic = "force-dynamic";

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

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;

    // 1. JioSaavn catalog playlist
    if (id.startsWith("saavn_")) {
      const cleanId = id.replace("saavn_", "");
      try {
        const res = await fetch(`https://jiosaavn-api-black.vercel.app/api/playlists?id=${cleanId}`, {
          signal: AbortSignal.timeout(6000),
          headers: { Accept: "application/json" },
        });
        if (res.ok) {
          const json = await res.json();
          const pl = json.data || json;
          const rawSongs: any[] = pl.songs || pl.tracks || [];
          const tracks: Track[] = rawSongs.map((s: any) => {
            const cover = s.image?.[2]?.url || s.image?.[1]?.url || s.image?.[0]?.url || "";
            const artist =
              s.artists?.primary?.map((a: any) => a.name).join(", ") ||
              s.artist ||
              s.singers ||
              "Unknown";
            const downloadUrls = s.downloadUrl || [];
            const streamUrl =
              downloadUrls?.[4]?.url ||
              downloadUrls?.[3]?.url ||
              downloadUrls?.[0]?.url ||
              s.media_url ||
              "";
            return {
              id: `saavn_${s.id}`,
              title: decodeHtml(s.name || s.title || "Unknown"),
              artist: decodeHtml(artist),
              album: s.album?.name ? decodeHtml(s.album.name) : undefined,
              cover,
              coverBig: cover,
              duration: Number(s.duration) || 180,
              streamUrl: streamUrl || undefined,
              audioUrl: streamUrl || undefined,
              source: "saavn",
            };
          });

          return Response.json({
            playlist: {
              id,
              name: decodeHtml(pl.name || pl.title || "Playlist"),
              cover: pl.image?.[2]?.url || pl.image?.[0]?.url || "",
              isPublic: true,
              source: "JioSaavn",
            },
            tracks,
          });
        }
      } catch (_) {}
    }

    // 2. Deezer catalog playlist
    if (id.startsWith("dz_") || /^\d{7,}$/.test(id)) {
      const cleanId = id.replace("dz_", "");
      try {
        const res = await fetch(`https://api.deezer.com/playlist/${cleanId}`, {
          signal: AbortSignal.timeout(6000),
          headers: { "User-Agent": "5ONG/2.0" },
        });
        if (res.ok) {
          const pl = await res.json();
          if (pl && !pl.error) {
            const rawTracks = pl.tracks?.data || [];
            const tracks = normalizeTracks(rawTracks);
            return Response.json({
              playlist: {
                id,
                name: pl.title || "Playlist",
                cover: pl.picture_xl || pl.picture_big || pl.picture_medium || "",
                isPublic: true,
                source: "Deezer",
              },
              tracks,
            });
          }
        }
      } catch (_) {}
    }

    // 3. User custom playlist in database
    const u = await requireUser();
    const playlist = await firebaseDb.getPlaylist(u.id, id);
    if (!playlist) throw new HttpError(404, "Playlist not found");
    return Response.json({
      playlist: { id: playlist.id, name: playlist.name, isPublic: false },
      tracks: playlist.tracks || [],
    });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const u = await requireUser();
    const { id } = await ctx.params;
    if (id.startsWith("saavn_") || id.startsWith("dz_")) {
      throw new HttpError(403, "Cannot edit a catalog playlist");
    }
    const body = await req.json().catch(() => ({}));
    const name = String(body.name ?? "").trim().slice(0, 80);
    if (!name) throw new HttpError(400, "Name required");
    const pl = await firebaseDb.getPlaylist(u.id, id);
    if (!pl) throw new HttpError(404, "Playlist not found");
    await firebaseDb.updatePlaylist(u.id, id, { name });
    return Response.json({ ok: true, name });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const u = await requireUser();
    const { id } = await ctx.params;
    if (id.startsWith("saavn_") || id.startsWith("dz_")) {
      throw new HttpError(403, "Cannot delete a catalog playlist");
    }
    await firebaseDb.deletePlaylist(u.id, id);
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}

// Add tracks
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const u = await requireUser();
    const { id } = await ctx.params;
    if (id.startsWith("saavn_") || id.startsWith("dz_")) {
      throw new HttpError(403, "Cannot modify a catalog playlist directly. Clone it to your library first.");
    }
    const body = await req.json().catch(() => ({}));
    const incoming = (Array.isArray(body.tracks) ? body.tracks : body.track ? [body.track] : []) as Track[];
    if (!incoming.length) throw new HttpError(400, "No tracks");
    await firebaseDb.addTracksToPlaylist(u.id, id, incoming);
    return Response.json({ added: incoming.length });
  } catch (e) {
    return errorResponse(e);
  }
}

// Remove a track
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const u = await requireUser();
    const { id } = await ctx.params;
    if (id.startsWith("saavn_") || id.startsWith("dz_")) {
      throw new HttpError(403, "Cannot modify a catalog playlist");
    }
    const body = await req.json().catch(() => ({}));
    if (body.action === "remove" && body.trackId) {
      await firebaseDb.removeTrackFromPlaylist(u.id, id, body.trackId);
      return Response.json({ ok: true });
    }
    throw new HttpError(400, "Unknown action");
  } catch (e) {
    return errorResponse(e);
  }
}
