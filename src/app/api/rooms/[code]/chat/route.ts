import { roomChatManager } from "@/lib/roomChatStore";
import { firebaseDb } from "@/lib/firebaseDb";
import { errorResponse, HttpError, requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  try {
    await requireUser();
    const code = (await ctx.params).code.toUpperCase().trim();
    const room = await firebaseDb.getRoom(code);
    if (!room) throw new HttpError(404, "This room has ended");

    const messages = await roomChatManager.getMessages(code);
    return Response.json({ messages });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ code: string }> }) {
  try {
    const u = await requireUser();
    const code = (await ctx.params).code.toUpperCase().trim();
    const room = await firebaseDb.getRoom(code);
    if (!room) throw new HttpError(404, "This room has ended");

    const body = await req.json().catch(() => ({}));
    const text = String(body.text ?? "").trim();
    if (!text) throw new HttpError(400, "Message cannot be empty");

    const message = await roomChatManager.addMessage(code, {
      userId: u.id,
      userName: u.username,
      userAvatar: u.avatarUrl,
      text,
    });

    const messages = await roomChatManager.getMessages(code);
    return Response.json({ ok: true, message, messages });
  } catch (e) {
    return errorResponse(e);
  }
}
