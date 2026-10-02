/**
 * Database Adapter for 5ONG powered by Neon Serverless PostgreSQL
 * Provides true relational persistence & user isolation for Users, Playlists, Likes, History, and Rooms.
 */
import { db } from "@/db";
import { users, playlists, playlistTracks, likedTracks, listeningLogs, rooms, otpCodes, usernameChanges } from "@/db/schema";
import { eq, and, or, desc, asc, sql } from "drizzle-orm";

declare global {
  var __dbMemoryStore: {
    users: Map<string | number, any>;
    playlists: Map<string | number, any>;
    playlistTracks: Map<string | number, any[]>;
    likes: Map<string | number, any[]>;
    history: Map<string | number, any[]>;
    otps: Map<string, any>;
    rooms: Map<string, any>;
  } | undefined;
}

const memoryStore = (globalThis.__dbMemoryStore = globalThis.__dbMemoryStore || {
  users: new Map(),
  playlists: new Map(),
  playlistTracks: new Map(),
  likes: new Map(),
  history: new Map(),
  otps: new Map(),
  rooms: new Map(),
});

export const firebaseDb = {
  // ---------------- Users ----------------
  async getUserByEmail(email: string) {
    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail) return null;
    if (db) {
      try {
        const [u] = await db.select().from(users).where(eq(users.email, cleanEmail)).limit(1);
        if (u) return u;
      } catch (e) {
        console.error("[Neon DB] getUserByEmail error:", e);
      }
    }
    for (const u of memoryStore.users.values()) {
      if (u.email?.toLowerCase() === cleanEmail) return u;
    }
    return null;
  },

  async getUserByUsername(username: string) {
    const cleanUsername = username.toLowerCase().trim();
    if (!cleanUsername) return null;
    if (db) {
      try {
        const [u] = await db.select().from(users).where(sql`lower(${users.username}) = ${cleanUsername}`).limit(1);
        if (u) return u;
      } catch (e) {
        console.error("[Neon DB] getUserByUsername error:", e);
      }
    }
    for (const u of memoryStore.users.values()) {
      if (u.username?.toLowerCase() === cleanUsername) return u;
    }
    return null;
  },

  async getUserByPhone(phone: string) {
    const cleanPhone = phone.trim().replace(/[\s\-()]/g, "");
    if (!cleanPhone) return null;
    const altPhone = cleanPhone.startsWith("+") ? cleanPhone.slice(1) : `+${cleanPhone}`;
    if (db) {
      try {
        const [u] = await db.select().from(users).where(
          or(eq(users.phoneNumber, cleanPhone), eq(users.phoneNumber, altPhone))
        ).limit(1);
        if (u) return u;
      } catch (e) {
        console.error("[Neon DB] getUserByPhone error:", e);
      }
    }
    for (const u of memoryStore.users.values()) {
      if (u.phoneNumber === cleanPhone || u.phoneNumber === altPhone) return u;
    }
    return null;
  },

  async getUserByIdentifier(identifier: string) {
    const clean = identifier.trim();
    if (!clean) return null;
    // 1. If it looks like email
    if (clean.includes("@")) {
      const u = await this.getUserByEmail(clean);
      if (u) return u;
    }
    // 2. If it looks like phone number (digits with optional leading +)
    const digits = clean.replace(/\D/g, "");
    if (digits.length >= 8 && digits.length <= 15) {
      const u = await this.getUserByPhone(clean);
      if (u) return u;
    }
    // 3. Look up by username
    const byUsername = await this.getUserByUsername(clean);
    if (byUsername) return byUsername;

    // 4. Fallback lookup by email
    return await this.getUserByEmail(clean);
  },

  async isUsernameTaken(username: string, excludeUserId?: number | string): Promise<boolean> {
    const clean = username.trim().toLowerCase();
    if (!clean) return false;
    if (db) {
      try {
        const found = await db.select({ id: users.id }).from(users).where(sql`lower(${users.username}) = ${clean}`).limit(2);
        if (excludeUserId !== undefined && excludeUserId !== null) {
          return found.some((u) => String(u.id) !== String(excludeUserId));
        }
        return found.length > 0;
      } catch (e) {
        console.error("[Neon DB] isUsernameTaken error:", e);
      }
    }
    for (const u of memoryStore.users.values()) {
      if (u.username?.toLowerCase() === clean && (!excludeUserId || String(u.id) !== String(excludeUserId))) {
        return true;
      }
    }
    return false;
  },

  async isEmailTaken(email: string, excludeUserId?: number | string): Promise<boolean> {
    const clean = email.trim().toLowerCase();
    if (!clean) return false;
    if (db) {
      try {
        const found = await db.select({ id: users.id }).from(users).where(eq(users.email, clean)).limit(2);
        if (excludeUserId !== undefined && excludeUserId !== null) {
          return found.some((u) => String(u.id) !== String(excludeUserId));
        }
        return found.length > 0;
      } catch (e) {
        console.error("[Neon DB] isEmailTaken error:", e);
      }
    }
    for (const u of memoryStore.users.values()) {
      if (u.email?.toLowerCase() === clean && (!excludeUserId || String(u.id) !== String(excludeUserId))) {
        return true;
      }
    }
    return false;
  },

  async isPhoneTaken(phone: string, excludeUserId?: number | string): Promise<boolean> {
    const clean = phone.trim().replace(/[\s\-()]/g, "");
    if (!clean) return false;
    const altPhone = clean.startsWith("+") ? clean.slice(1) : `+${clean}`;
    if (db) {
      try {
        const found = await db.select({ id: users.id }).from(users).where(
          or(eq(users.phoneNumber, clean), eq(users.phoneNumber, altPhone))
        ).limit(2);
        if (excludeUserId !== undefined && excludeUserId !== null) {
          return found.some((u) => String(u.id) !== String(excludeUserId));
        }
        return found.length > 0;
      } catch (e) {
        console.error("[Neon DB] isPhoneTaken error:", e);
      }
    }
    for (const u of memoryStore.users.values()) {
      if ((u.phoneNumber === clean || u.phoneNumber === altPhone) && (!excludeUserId || String(u.id) !== String(excludeUserId))) {
        return true;
      }
    }
    return false;
  },

  async generateUniqueUsername(base: string): Promise<string> {
    let clean = base.toLowerCase().replace(/[^a-z0-9_.]/g, "").slice(0, 16);
    if (clean.length < 3) clean = `user_${clean || "fan"}`;
    let candidate = clean;
    let counter = 1;
    while (await this.isUsernameTaken(candidate)) {
      candidate = `${clean.slice(0, 14)}_${counter}`;
      counter++;
      if (counter > 100) {
        candidate = `${clean.slice(0, 12)}_${Math.floor(Math.random() * 8999 + 1000)}`;
        break;
      }
    }
    return candidate;
  },

  async getUserByGoogleId(googleId: string) {
    if (db) {
      try {
        const [u] = await db.select().from(users).where(eq(users.googleId, googleId)).limit(1);
        if (u) return u;
      } catch (e) {
        console.error("[Neon DB] getUserByGoogleId error:", e);
      }
    }
    for (const u of memoryStore.users.values()) {
      if (u.googleId === googleId) return u;
    }
    return null;
  },

  async getUserById(id: string | number) {
    const numId = Number(id);
    if (db && !isNaN(numId)) {
      try {
        const [u] = await db.select().from(users).where(eq(users.id, numId)).limit(1);
        if (u) return u;
      } catch (e) {
        console.error("[Neon DB] getUserById error:", e);
      }
    }
    const sId = String(id);
    return memoryStore.users.get(sId) || memoryStore.users.get(numId) || null;
  },

  async createUser(data: {
    email?: string | null;
    username: string;
    phoneNumber?: string | null;
    passwordHash?: string | null;
    googleId?: string | null;
    avatarUrl?: string | null;
  }) {
    const cleanEmail = data.email ? data.email.toLowerCase().trim() : null;
    const cleanUsername = data.username.trim().toLowerCase();
    const cleanPhone = data.phoneNumber ? data.phoneNumber.trim().replace(/[\s\-()]/g, "") : null;

    if (db) {
      try {
        const [newUser] = await db.insert(users).values({
          email: cleanEmail,
          username: cleanUsername,
          phoneNumber: cleanPhone,
          passwordHash: data.passwordHash || null,
          googleId: data.googleId || null,
          avatarUrl: data.avatarUrl || null,
        }).returning();
        return newUser;
      } catch (e) {
        console.error("[Neon DB] createUser error:", e);
        throw e;
      }
    }

    const id = Date.now();
    const payload = {
      id,
      email: cleanEmail,
      username: cleanUsername,
      phoneNumber: cleanPhone,
      passwordHash: data.passwordHash || null,
      googleId: data.googleId || null,
      avatarUrl: data.avatarUrl || null,
      createdAt: new Date(),
    };
    memoryStore.users.set(id, payload);
    return payload;
  },

  // ---------------- OTP Storage in Neon DB ----------------
  async saveOtpCode(params: { target: string; codeHash: string; type: "email" | "phone" }) {
    const expiresAt = new Date(Date.now() + 10 * 60_000);
    const cleanTarget = params.target.trim();

    if (db) {
      try {
        if (params.type === "email") {
          const lowerEmail = cleanTarget.toLowerCase();
          await db.delete(otpCodes).where(eq(otpCodes.email, lowerEmail));
          await db.insert(otpCodes).values({
            email: lowerEmail,
            phoneNumber: null,
            codeHash: params.codeHash,
            attempts: 0,
            expiresAt,
          });
        } else {
          const cleanPhone = cleanTarget.replace(/[\s\-()]/g, "");
          await db.delete(otpCodes).where(eq(otpCodes.phoneNumber, cleanPhone));
          await db.insert(otpCodes).values({
            email: null,
            phoneNumber: cleanPhone,
            codeHash: params.codeHash,
            attempts: 0,
            expiresAt,
          });
        }
        return true;
      } catch (e) {
        console.error("[Neon DB] saveOtpCode error:", e);
      }
    }

    // Memory fallback
    memoryStore.otps.set(cleanTarget.toLowerCase(), {
      codeHash: params.codeHash,
      expiresAt: expiresAt.getTime(),
      attempts: 0,
      createdAt: Date.now(),
    });
    return true;
  },

  async verifyOtpCode(params: { target: string; codeHash: string; type: "email" | "phone" }) {
    const cleanTarget = params.target.trim();

    if (db) {
      try {
        let rows;
        if (params.type === "email") {
          const lowerEmail = cleanTarget.toLowerCase();
          rows = await db.select().from(otpCodes).where(eq(otpCodes.email, lowerEmail)).limit(1);
        } else {
          const cleanPhone = cleanTarget.replace(/[\s\-()]/g, "");
          rows = await db.select().from(otpCodes).where(eq(otpCodes.phoneNumber, cleanPhone)).limit(1);
        }

        const otp = rows?.[0];
        if (!otp) return { valid: false, error: "No pending code found. Request a new one." };
        if (new Date() > otp.expiresAt) {
          if (params.type === "email") await db.delete(otpCodes).where(eq(otpCodes.email, cleanTarget.toLowerCase()));
          else await db.delete(otpCodes).where(eq(otpCodes.phoneNumber, cleanTarget.replace(/[\s\-()]/g, "")));
          return { valid: false, error: "Code expired. Request a new one." };
        }
        if (otp.attempts >= 5) {
          return { valid: false, error: "Too many wrong attempts. Request a new code." };
        }

        if (otp.codeHash !== params.codeHash) {
          await db.update(otpCodes).set({ attempts: otp.attempts + 1 }).where(eq(otpCodes.id, otp.id));
          return { valid: false, error: "That code is not correct" };
        }

        // Verified! Delete used code
        await db.delete(otpCodes).where(eq(otpCodes.id, otp.id));
        return { valid: true };
      } catch (e) {
        console.error("[Neon DB] verifyOtpCode error:", e);
      }
    }

    // Memory fallback
    const mem = memoryStore.otps.get(cleanTarget.toLowerCase());
    if (!mem) return { valid: false, error: "No pending code found. Request a new one." };
    if (Date.now() > mem.expiresAt) return { valid: false, error: "Code expired. Request a new one." };
    if (mem.attempts >= 5) return { valid: false, error: "Too many wrong attempts. Request a new code." };
    if (mem.codeHash !== params.codeHash) {
      mem.attempts += 1;
      return { valid: false, error: "That code is not correct" };
    }
    memoryStore.otps.delete(cleanTarget.toLowerCase());
    return { valid: true };
  },

  async updateUser(id: string | number, data: Partial<{ email: string; username: string; phoneNumber: string; passwordHash: string; googleId: string; avatarUrl: string }>) {
    const numId = Number(id);
    const updateData = { ...data };
    if (updateData.username) updateData.username = updateData.username.trim().toLowerCase();
    if (updateData.email) updateData.email = updateData.email.trim().toLowerCase();
    if (updateData.phoneNumber) updateData.phoneNumber = updateData.phoneNumber.trim().replace(/[\s\-()]/g, "");

    if (db && !isNaN(numId)) {
      try {
        const [updated] = await db.update(users).set(updateData).where(eq(users.id, numId)).returning();
        if (updated) return updated;
      } catch (e) {
        console.error("[Neon DB] updateUser error:", e);
      }
    }
    const cur = memoryStore.users.get(id) || {};
    const updated = { ...cur, ...updateData, id };
    memoryStore.users.set(id, updated);
    return updated;
  },

  async getUsernameChangesThisMonth(userId: number | string): Promise<number> {
    const numId = Number(userId);
    if (db && !isNaN(numId)) {
      try {
        const rows = await db
          .select({ count: sql<number>`count(*)` })
          .from(usernameChanges)
          .where(
            and(
              eq(usernameChanges.userId, numId),
              sql`${usernameChanges.changedAt} >= date_trunc('month', now())`
            )
          );
        return Number(rows[0]?.count ?? 0);
      } catch (e) {
        console.error("[Neon DB] getUsernameChangesThisMonth error:", e);
      }
    }
    const history = ((globalThis as any).__usernameChanges = (globalThis as any).__usernameChanges || []);
    const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
    return history.filter((h: any) => String(h.userId) === String(userId) && h.changedAt >= thisMonthStart).length;
  },

  async recordUsernameChange(userId: number | string, oldUsername: string, newUsername: string) {
    const numId = Number(userId);
    const cleanOld = oldUsername.toLowerCase().trim();
    const cleanNew = newUsername.toLowerCase().trim();
    if (db && !isNaN(numId)) {
      try {
        await db.insert(usernameChanges).values({
          userId: numId,
          oldUsername: cleanOld,
          newUsername: cleanNew,
        });
      } catch (e) {
        console.error("[Neon DB] recordUsernameChange error:", e);
      }
    }
    const history = ((globalThis as any).__usernameChanges = (globalThis as any).__usernameChanges || []);
    history.push({ userId: String(userId), oldUsername: cleanOld, newUsername: cleanNew, changedAt: Date.now() });
  },

  // ---------------- Likes (User Isolated) ----------------
  async getLikes(userId: string | number) {
    const numId = Number(userId);
    if (db && !isNaN(numId)) {
      try {
        const rows = await db
          .select()
          .from(likedTracks)
          .where(eq(likedTracks.userId, numId))
          .orderBy(desc(likedTracks.createdAt));
        return rows.map((r) => r.track).filter(Boolean);
      } catch (e) {
        console.error("[Neon DB] getLikes error:", e);
      }
    }
    return memoryStore.likes.get(String(userId)) || [];
  },

  async saveLike(userId: string | number, track: any) {
    const numId = Number(userId);
    const sTrackId = String(track.id);

    if (db && !isNaN(numId)) {
      try {
        const [existing] = await db
          .select({ id: likedTracks.id })
          .from(likedTracks)
          .where(and(eq(likedTracks.userId, numId), eq(likedTracks.trackId, sTrackId)))
          .limit(1);

        if (!existing) {
          await db.insert(likedTracks).values({
            userId: numId,
            trackId: sTrackId,
            track: track,
          });
        }
        return;
      } catch (e) {
        console.error("[Neon DB] saveLike error:", e);
      }
    }

    const sId = String(userId);
    const current = memoryStore.likes.get(sId) || [];
    if (!current.some((t: any) => String(t.id) === sTrackId)) {
      memoryStore.likes.set(sId, [track, ...current]);
    }
  },

  async removeLike(userId: string | number, trackId: string | number) {
    const numId = Number(userId);
    const sTrackId = String(trackId);

    if (db && !isNaN(numId)) {
      try {
        await db
          .delete(likedTracks)
          .where(and(eq(likedTracks.userId, numId), eq(likedTracks.trackId, sTrackId)));
        return;
      } catch (e) {
        console.error("[Neon DB] removeLike error:", e);
      }
    }

    const sId = String(userId);
    const current = memoryStore.likes.get(sId) || [];
    memoryStore.likes.set(sId, current.filter((t: any) => String(t.id) !== sTrackId));
  },

  // ---------------- Playlists (User Isolated) ----------------
  async getPlaylists(userId: string | number) {
    const numId = Number(userId);
    const database = db;
    if (database && !isNaN(numId)) {
      try {
        const userPlaylists = await database
          .select()
          .from(playlists)
          .where(eq(playlists.userId, numId))
          .orderBy(desc(playlists.createdAt));

        const summaries = await Promise.all(
          userPlaylists.map(async (p) => {
            const previewTracks = await database
              .select({ track: playlistTracks.track })
              .from(playlistTracks)
              .where(eq(playlistTracks.playlistId, p.id))
              .orderBy(asc(playlistTracks.position))
              .limit(4);

            const allTracks = await database
              .select({ id: playlistTracks.id })
              .from(playlistTracks)
              .where(eq(playlistTracks.playlistId, p.id));

            return {
              id: p.id,
              name: p.name,
              count: allTracks.length,
              covers: previewTracks.map((t) => (t.track as any)?.cover).filter(Boolean),
              isPublic: false,
            };
          })
        );
        return summaries;
      } catch (e) {
        console.error("[Neon DB] getPlaylists error:", e);
      }
    }

    const sId = String(userId);
    return (memoryStore.playlists.get(sId) || []).map((p: any) => {
      const tracks = memoryStore.playlistTracks.get(p.id) || [];
      return {
        id: p.id,
        name: p.name,
        count: tracks.length,
        covers: tracks.slice(0, 4).map((t: any) => t.cover).filter(Boolean),
        isPublic: false,
      };
    });
  },

  async createPlaylist(userId: string | number, name: string, initialTracks: any[] = []) {
    const numId = Number(userId);
    const cleanName = name.trim();

    if (db && !isNaN(numId)) {
      try {
        const [newPl] = await db
          .insert(playlists)
          .values({
            userId: numId,
            name: cleanName,
          })
          .returning();

        if (initialTracks.length > 0) {
          const trackRows = initialTracks.map((track, i) => ({
            playlistId: newPl.id,
            trackId: String(track.id),
            track: track,
            position: i,
          }));
          await db.insert(playlistTracks).values(trackRows);
        }

        return {
          id: newPl.id,
          name: newPl.name,
          count: initialTracks.length,
          covers: initialTracks.slice(0, 4).map((t: any) => t.cover).filter(Boolean),
        };
      } catch (e) {
        console.error("[Neon DB] createPlaylist error:", e);
      }
    }

    const id = Date.now();
    const pl = { id, name: cleanName, isPublic: false, createdAt: new Date() };
    const sId = String(userId);
    const cur = memoryStore.playlists.get(sId) || [];
    memoryStore.playlists.set(sId, [pl, ...cur]);
    memoryStore.playlistTracks.set(id, initialTracks.slice());

    return {
      id,
      name: cleanName,
      count: initialTracks.length,
      covers: initialTracks.slice(0, 4).map((t: any) => t.cover).filter(Boolean),
    };
  },

  async getPlaylist(userId: string | number, playlistId: string | number) {
    const numUserId = Number(userId);
    const numPlId = Number(playlistId);

    if (db && !isNaN(numUserId) && !isNaN(numPlId)) {
      try {
        const [pl] = await db
          .select()
          .from(playlists)
          .where(and(eq(playlists.id, numPlId), eq(playlists.userId, numUserId)))
          .limit(1);

        if (pl) {
          const rows = await db
            .select()
            .from(playlistTracks)
            .where(eq(playlistTracks.playlistId, pl.id))
            .orderBy(asc(playlistTracks.position));

          return {
            id: pl.id,
            name: pl.name,
            isPublic: false,
            tracks: rows.map((r) => r.track),
          };
        }
      } catch (e) {
        console.error("[Neon DB] getPlaylist error:", e);
      }
    }

    const sId = String(userId);
    const pId = String(playlistId);
    const playlistsList = memoryStore.playlists.get(sId) || [];
    const pl = playlistsList.find((p: any) => String(p.id) === pId);
    if (!pl) return null;
    return {
      id: pl.id,
      name: pl.name,
      isPublic: false,
      tracks: memoryStore.playlistTracks.get(pl.id) || [],
    };
  },

  async addTracksToPlaylist(userId: string | number, playlistId: string | number, tracks: any[]) {
    const numUserId = Number(userId);
    const numPlId = Number(playlistId);

    if (db && !isNaN(numUserId) && !isNaN(numPlId) && tracks.length > 0) {
      try {
        const [pl] = await db
          .select({ id: playlists.id })
          .from(playlists)
          .where(and(eq(playlists.id, numPlId), eq(playlists.userId, numUserId)))
          .limit(1);

        if (pl) {
          const existing = await db
            .select({ id: playlistTracks.id })
            .from(playlistTracks)
            .where(eq(playlistTracks.playlistId, numPlId));

          const startPos = existing.length;
          const rows = tracks.map((track, i) => ({
            playlistId: numPlId,
            trackId: String(track.id),
            track: track,
            position: startPos + i,
          }));

          await db.insert(playlistTracks).values(rows);
          return;
        }
      } catch (e) {
        console.error("[Neon DB] addTracksToPlaylist error:", e);
      }
    }

    const cur = memoryStore.playlistTracks.get(playlistId) || [];
    memoryStore.playlistTracks.set(playlistId, [...cur, ...tracks]);
  },

  async removeTrackFromPlaylist(userId: string | number, playlistId: string | number, trackId: string | number) {
    const numUserId = Number(userId);
    const numPlId = Number(playlistId);
    const sTrackId = String(trackId);

    if (db && !isNaN(numUserId) && !isNaN(numPlId)) {
      try {
        const [pl] = await db
          .select({ id: playlists.id })
          .from(playlists)
          .where(and(eq(playlists.id, numPlId), eq(playlists.userId, numUserId)))
          .limit(1);

        if (pl) {
          await db
            .delete(playlistTracks)
            .where(and(eq(playlistTracks.playlistId, numPlId), eq(playlistTracks.trackId, sTrackId)));
          return;
        }
      } catch (e) {
        console.error("[Neon DB] removeTrackFromPlaylist error:", e);
      }
    }

    const cur = memoryStore.playlistTracks.get(playlistId) || [];
    memoryStore.playlistTracks.set(playlistId, cur.filter((t: any) => String(t.id) !== sTrackId));
  },

  async updatePlaylist(userId: string | number, playlistId: string | number, data: { name?: string }) {
    const numUserId = Number(userId);
    const numPlId = Number(playlistId);

    if (db && !isNaN(numUserId) && !isNaN(numPlId)) {
      try {
        await db
          .update(playlists)
          .set(data)
          .where(and(eq(playlists.id, numPlId), eq(playlists.userId, numUserId)));
        return;
      } catch (e) {
        console.error("[Neon DB] updatePlaylist error:", e);
      }
    }

    const sId = String(userId);
    const pId = String(playlistId);
    const cur = memoryStore.playlists.get(sId) || [];
    const pl = cur.find((p: any) => String(p.id) === pId);
    if (pl && data.name) pl.name = data.name;
  },

  async deletePlaylist(userId: string | number, playlistId: string | number) {
    const numUserId = Number(userId);
    const numPlId = Number(playlistId);

    if (db && !isNaN(numUserId) && !isNaN(numPlId)) {
      try {
        await db
          .delete(playlists)
          .where(and(eq(playlists.id, numPlId), eq(playlists.userId, numUserId)));
        return;
      } catch (e) {
        console.error("[Neon DB] deletePlaylist error:", e);
      }
    }

    const sId = String(userId);
    const cur = memoryStore.playlists.get(sId) || [];
    memoryStore.playlists.set(sId, cur.filter((p: any) => String(p.id) !== String(playlistId)));
    memoryStore.playlistTracks.delete(playlistId);
  },

  // ---------------- History (User Isolated) ----------------
  async getHistory(userId: string | number, limit = 50) {
    const numId = Number(userId);
    if (db && !isNaN(numId)) {
      try {
        const rows = await db
          .select()
          .from(listeningLogs)
          .where(eq(listeningLogs.userId, numId))
          .orderBy(desc(listeningLogs.playedAt))
          .limit(limit);

        return rows.map((r) => ({
          track: r.track,
          playedAt: r.playedAt.toISOString(),
          secondsListened: r.secondsListened,
        }));
      } catch (e) {
        console.error("[Neon DB] getHistory error:", e);
      }
    }
    return (memoryStore.history.get(String(userId)) || []).slice(0, limit);
  },

  async addHistory(userId: string | number, track: any, playedSeconds = 0) {
    const numId = Number(userId);
    if (db && !isNaN(numId)) {
      try {
        await db.insert(listeningLogs).values({
          userId: numId,
          trackId: String(track.id),
          track: track,
          secondsListened: playedSeconds,
        });
        return;
      } catch (e) {
        console.error("[Neon DB] addHistory error:", e);
      }
    }

    const sId = String(userId);
    const item = {
      track,
      playedSeconds,
      playedAt: new Date().toISOString(),
    };
    const cur = memoryStore.history.get(sId) || [];
    memoryStore.history.set(sId, [item, ...cur.slice(0, 99)]);
  },

  // ---------------- Rooms ----------------
  async getRoom(code: string) {
    const cleanCode = code.toUpperCase().trim();
    if (db) {
      try {
        const [r] = await db.select().from(rooms).where(eq(rooms.code, cleanCode)).limit(1);
        if (r && r.state) {
          return { ...r.state, hostId: r.hostId, code: r.code };
        }
      } catch (e) {
        console.error("[Neon DB] getRoom error:", e);
      }
    }
    return memoryStore.rooms.get(cleanCode) || null;
  },

  async saveRoom(code: string, data: any) {
    const cleanCode = code.toUpperCase().trim();
    if (db) {
      try {
        const [existing] = await db.select().from(rooms).where(eq(rooms.code, cleanCode)).limit(1);
        if (existing) {
          const merged = { ...(typeof existing.state === "object" && existing.state ? existing.state : {}), ...data };
          await db
            .update(rooms)
            .set({ state: merged, stateUpdatedAt: new Date() })
            .where(eq(rooms.code, cleanCode));
        } else {
          await db.insert(rooms).values({
            code: cleanCode,
            hostId: Number(data.hostId) || 1,
            state: data,
          });
        }
        return;
      } catch (e) {
        console.error("[Neon DB] saveRoom error:", e);
      }
    }
    const cur = memoryStore.rooms.get(cleanCode) || {};
    memoryStore.rooms.set(cleanCode, { ...cur, ...data });
  },

  async deleteRoom(code: string) {
    const cleanCode = code.toUpperCase().trim();
    if (db) {
      try {
        await db.delete(rooms).where(eq(rooms.code, cleanCode));
        return;
      } catch (e) {
        console.error("[Neon DB] deleteRoom error:", e);
      }
    }
    memoryStore.rooms.delete(cleanCode);
  },
};
