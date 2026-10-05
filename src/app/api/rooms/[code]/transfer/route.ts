import { firebaseDb } from "@/lib/firebaseDb";
import { roomChatManager } from "@/lib/roomChatStore";
import { errorResponse, HttpError, requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  try {
    const u = await requireUser();
    const code = (await ctx.params).code.toUpperCase();
    const room = await firebaseDb.getRoom(code);
    if (!room) throw new HttpError(404, "This room has ended");

    if (String(room.hostId) !== String(u.id)) {
      throw new HttpError(403, "Only the current host can transfer host status");
    }

    const body = await req.json().catch(() => ({}));
    const newHostId = body.newHostId;
    if (!newHostId) throw new HttpError(400, "Missing newHostId");

    const rawMembers: any[] = Array.isArray(room.members) ? room.members : [];
    const targetMember = rawMembers.find((m: any) => String(m.userId) === String(newHostId));
    if (!targetMember) {
      throw new HttpError(404, "User is not an active member in this room");
    }

    if (String(targetMember.userId) === String(u.id)) {
      throw new HttpError(400, "You are already the host");
    }

    await firebaseDb.saveRoom(code, {
      hostId: targetMember.userId,
      hostName: targetMember.name,
    });

    await roomChatManager.addMessage(code, {
      userId: "system",
      userName: "System",
      text: `👑 ${u.username} transferred host status to ${targetMember.name}.`,
    });

    return Response.json({
      ok: true,
      hostId: targetMember.userId,
      hostName: targetMember.name,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
