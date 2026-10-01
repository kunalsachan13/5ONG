import { firebaseDb } from "@/lib/firebaseDb";
import { errorResponse, HttpError, requireUser } from "@/lib/auth";
import type { Track } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const u = await requireUser();
    const { id } = await ctx.params;
    const playlist = await firebaseDb.getPlaylist(u.id, id);
    if (!playlist) throw new HttpError(404, "Playlist not found");
    return Response.json({
      playlist: { id: playlist.id, name: playlist.name },
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
