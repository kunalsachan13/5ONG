import { firebaseDb } from "@/lib/firebaseDb";
import type { RoomChatMessage } from "@/lib/types";

// Persistent Room Chat Store backed by Neon DB Postgres via firebaseDb.
// Messages are persisted across all Cloudflare Worker isolates worldwide,
// and automatically purged when the room ends.
class RoomChatManager {
  async getMessages(code: string): Promise<RoomChatMessage[]> {
    const clean = code.toUpperCase().trim();
    return (await firebaseDb.getRoomMessages(clean)) as RoomChatMessage[];
  }

  getCachedMessages(_code: string): RoomChatMessage[] {
    return [];
  }

  async addMessage(
    code: string,
    msg: { userId: string | number; userName: string; userAvatar?: string | null; text: string }
  ): Promise<RoomChatMessage> {
    const clean = code.toUpperCase().trim();
    const trimmedText = msg.text.trim().slice(0, 500);

    // Prevent duplicate consecutive system messages
    if (msg.userId === "system") {
      const existing = await this.getMessages(clean);
      const lastMsg = existing[existing.length - 1];
      if (lastMsg && String(lastMsg.userId) === "system" && lastMsg.text === trimmedText) {
        return lastMsg;
      }
    }

    return (await firebaseDb.addRoomMessage(clean, {
      userId: msg.userId,
      userName: msg.userName,
      userAvatar: msg.userAvatar,
      text: trimmedText,
    })) as RoomChatMessage;
  }

  async deleteRoomChat(code: string) {
    const clean = code.toUpperCase().trim();
    await firebaseDb.deleteRoomMessages(clean);
  }
}

const globalForChat = globalThis as unknown as { roomChatManager?: RoomChatManager };
export const roomChatManager = globalForChat.roomChatManager ?? new RoomChatManager();
globalForChat.roomChatManager = roomChatManager;
