import { firebaseDb } from "@/lib/firebaseDb";
import { roomChatManager } from "@/lib/roomChatStore";
import { errorResponse, HttpError, requireUser } from "@/lib/auth";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function makeCode() {
  let s = "";
  for (let i = 0; i < 6; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

export async function POST(req: Request) {
  try {
    const u = await requireUser();
    const body = await req.json().catch(() => ({}));
    if (body.action === "create") {
      const code = makeCode();
      const initialRoom = {
        code,
        hostId: u.id,
        hostName: u.username,
        members: [{ userId: u.id, name: u.username, avatarUrl: u.avatarUrl || null, lastSeen: new Date().toISOString() }],
        messages: [
          {
            id: `sys-${Date.now()}`,
            userId: "system",
            userName: "System",
            text: "🎉 Room created! Share the code to listen together.",
            timestamp: Date.now(),
          },
        ],
        state: null,
        createdAt: new Date().toISOString(),
      };
      await firebaseDb.saveRoom(code, initialRoom);
      return Response.json({ code });
    }
    if (body.action === "join") {
      const code = String(body.code ?? "").trim().toUpperCase();
      const room = await firebaseDb.getRoom(code);
      if (!room) throw new HttpError(404, "No room with that invite code");
      const members = Array.isArray(room.members) ? room.members.filter((m: any) => String(m.userId) !== String(u.id)) : [];
      members.push({ userId: u.id, name: u.username, avatarUrl: u.avatarUrl || null, lastSeen: new Date().toISOString() });
      await firebaseDb.saveRoom(code, { members });
      await roomChatManager.addMessage(code, {
        userId: "system",
        userName: "System",
        text: `👋 ${u.username} joined the room.`,
      });
      return Response.json({ code });
    }
    throw new HttpError(400, "Unknown action");
  } catch (e) {
    return errorResponse(e);
  }
}
