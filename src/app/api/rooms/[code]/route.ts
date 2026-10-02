import { firebaseDb } from "@/lib/firebaseDb";
import { roomChatManager } from "@/lib/roomChatStore";
import { errorResponse, HttpError, requireUser } from "@/lib/auth";
import type { RoomInfo } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  try {
    const u = await requireUser();
    const code = (await ctx.params).code.toUpperCase();
    const room = await firebaseDb.getRoom(code);
    if (!room) throw new HttpError(404, "This room has ended");

    const rawMembers: any[] = Array.isArray(room.members) ? room.members : [];
    const now = Date.now();
    let found = false;

    const updatedMembers = rawMembers.map((m: any) => {
      if (String(m.userId) === String(u.id)) {
        found = true;
        return {
          ...m,
          name: u.username,
          avatarUrl: u.avatarUrl || m.avatarUrl || null,
          lastSeen: new Date().toISOString(),
        };
      }
      return m;
    });

    if (!found) {
      updatedMembers.push({
        userId: u.id,
        name: u.username,
        avatarUrl: u.avatarUrl || null,
        lastSeen: new Date().toISOString(),
      });
    }

    // Active within last 30 seconds
    const activeMembers = updatedMembers.filter(
      (m: any) => now - new Date(m.lastSeen || 0).getTime() < 30_000
    );

    let hostId = room.hostId;
    let hostName = room.hostName ?? "host";

    // If current host has disconnected and is no longer active, reassign to a random active listener
    if (activeMembers.length > 0 && !activeMembers.some((m: any) => String(m.userId) === String(hostId))) {
      const randomMember = activeMembers[Math.floor(Math.random() * activeMembers.length)];
      hostId = randomMember.userId;
      hostName = randomMember.name;
      roomChatManager.addMessage(code, {
        userId: "system",
        userName: "System",
        text: `Previous host disconnected. ${hostName} is now the host.`,
      });
    }

    // Save active members and current host back so all users see current presence
    await firebaseDb.saveRoom(code, { hostId, hostName, members: activeMembers });

    const members = activeMembers.map((m: any) => ({
      userId: Number(m.userId),
      name: m.name,
      avatarUrl: m.avatarUrl || null,
    }));

    const info: RoomInfo = {
      code,
      hostId,
      hostName,
      isHost: String(hostId) === String(u.id),
      members,
      messages: roomChatManager.getMessages(code),
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

export async function DELETE(req: Request, ctx: { params: Promise<{ code: string }> }) {
  try {
    const u = await requireUser();
    const code = (await ctx.params).code.toUpperCase();
    const room = await firebaseDb.getRoom(code);
    if (!room) return Response.json({ ok: true });

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "leave";
    const isHost = String(room.hostId) === String(u.id);

    if (action === "end") {
      if (!isHost) throw new HttpError(403, "Only the host can end the room");
      await firebaseDb.deleteRoom(code);
      roomChatManager.deleteRoomChat(code);
      return Response.json({ ok: true, ended: true });
    }

    // User is leaving the room (action === "leave")
    const rawMembers: any[] = Array.isArray(room.members) ? room.members : [];
    const remainingMembers = rawMembers.filter((m: any) => String(m.userId) !== String(u.id));

    if (remainingMembers.length === 0) {
      // If nobody is left, delete room and clear chats
      await firebaseDb.deleteRoom(code);
      roomChatManager.deleteRoomChat(code);
      return Response.json({ ok: true, ended: true });
    }

    if (isHost) {
      // Host left without ending the room -> reassign host randomly among remaining listeners
      const randomHost = remainingMembers[Math.floor(Math.random() * remainingMembers.length)];
      await firebaseDb.saveRoom(code, {
        hostId: randomHost.userId,
        hostName: randomHost.name,
        members: remainingMembers,
      });
      roomChatManager.addMessage(code, {
        userId: "system",
        userName: "System",
        text: `${u.username} left the room. ${randomHost.name} is now the host.`,
      });
      return Response.json({ ok: true, transferredTo: randomHost.name });
    }

    // Regular listener left
    await firebaseDb.saveRoom(code, { members: remainingMembers });
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
