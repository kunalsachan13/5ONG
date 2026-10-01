import { firebaseDb } from "@/lib/firebaseDb";
import { errorResponse, HttpError, requireUser } from "@/lib/auth";
import type { RoomInfo } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  try {
    const u = await requireUser();
    const code = (await ctx.params).code.toUpperCase();
    const room = await firebaseDb.getRoom(code);
    if (!room) throw new HttpError(404, "This room has ended");

    const rawMembers = Array.isArray(room.members) ? room.members : [];
    const members = rawMembers
      .filter((m: any) => Date.now() - new Date(m.lastSeen || 0).getTime() < 15_000)
      .map((m: any) => ({ userId: m.userId, name: m.name }));

    const info: RoomInfo = {
      code,
      hostId: room.hostId,
      hostName: room.hostName ?? "host",
      isHost: String(room.hostId) === String(u.id),
      members,
      state: room.state || null,
      updatedAt: room.stateUpdatedAt ? new Date(room.stateUpdatedAt).getTime() : Date.now(),
      serverNow: Date.now(),
    };
    return Response.json(info);
  } catch (e) {
    return errorResponse(e);
  }
}

export async function PUT(req: Request, ctx: { params: Promise<{ code: string }> }) {
  try {
    const u = await requireUser();
    const code = (await ctx.params).code.toUpperCase();
    const room = await firebaseDb.getRoom(code);
    if (!room) throw new HttpError(404, "This room has ended");
    if (String(room.hostId) !== String(u.id)) throw new HttpError(403, "Only the host controls playback");
    const body = (await req.json().catch(() => ({}))) as any;
    const state = {
      track: body.track ?? null,
      queue: Array.isArray(body.queue) ? body.queue.slice(0, 200) : [],
      index: Number(body.index) || 0,
      position: Math.max(0, Number(body.position) || 0),
      playing: Boolean(body.playing),
      seq: Number(body.seq) || 0,
    };
    await firebaseDb.saveRoom(code, { state, stateUpdatedAt: new Date().toISOString() });
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  try {
    const u = await requireUser();
    const code = (await ctx.params).code.toUpperCase();
    const room = await firebaseDb.getRoom(code);
    if (!room) return Response.json({ ok: true });
    if (String(room.hostId) === String(u.id)) {
      await firebaseDb.deleteRoom(code);
    } else {
      const rawMembers = Array.isArray(room.members) ? room.members : [];
      const updatedMembers = rawMembers.filter((m: any) => String(m.userId) !== String(u.id));
      await firebaseDb.saveRoom(code, { members: updatedMembers });
    }
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
