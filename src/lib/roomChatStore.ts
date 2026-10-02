import type { RoomChatMessage } from "@/lib/types";

// In-memory ephemeral chat storage.
// Chats are never saved to disk or persistent DB.
// When the room ends or host closes it, the room's chat messages are instantly purged.
class RoomChatManager {
  private chats = new Map<string, RoomChatMessage[]>();

  getMessages(code: string): RoomChatMessage[] {
    const clean = code.toUpperCase().trim();
    return this.chats.get(clean) || [];
  }

  addMessage(
    code: string,
    msg: { userId: string | number; userName: string; userAvatar?: string | null; text: string }
  ): RoomChatMessage {
    const clean = code.toUpperCase().trim();
    const list = this.chats.get(clean) || [];
    const newMsg: RoomChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId: msg.userId,
      userName: msg.userName,
      userAvatar: msg.userAvatar || null,
      text: msg.text.trim().slice(0, 500),
      timestamp: Date.now(),
    };
    // Keep up to 100 recent messages per room
    const updated = [...list.slice(-99), newMsg];
    this.chats.set(clean, updated);
    return newMsg;
  }

  deleteRoomChat(code: string) {
    const clean = code.toUpperCase().trim();
    this.chats.delete(clean);
  }
}

const globalForChat = globalThis as unknown as { roomChatManager?: RoomChatManager };
export const roomChatManager = globalForChat.roomChatManager ?? new RoomChatManager();
if (process.env.NODE_ENV !== "production") globalForChat.roomChatManager = roomChatManager;
