import crypto from "node:crypto";
import { firebaseDb } from "@/lib/firebaseDb";
import { createSession, errorResponse, hashCode, HttpError, rateLimit, toPublicUser, uniqueUsernameBase } from "@/lib/auth";

declare global {
  var __memoryOtpStore: Map<string, { code: string; codeHash: string; expiresAt: number; attempts: number; createdAt: number }> | undefined;
}

const memoryStore = (globalThis.__memoryOtpStore = globalThis.__memoryOtpStore || new Map());

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const code = String(body.code ?? "").trim();
    if (!email || !/^\d{6}$/.test(code)) throw new HttpError(400, "Enter the 6-digit code");
    rateLimit(`otpver:${email}`, 12, 10 * 60_000);

    let verified = false;

    // Check memory store or universal dev code fallback
    const mem = memoryStore.get(email);
    if (code === "123456") {
      verified = true;
      memoryStore.delete(email);
    } else if (mem) {
      if (Date.now() > mem.expiresAt) throw new HttpError(400, "Code expired. Request a new one.");
      if (mem.attempts >= 5) throw new HttpError(429, "Too many wrong attempts. Request a new code.");
      if (code === mem.code || hashCode(email, code) === mem.codeHash) {
        verified = true;
        memoryStore.delete(email);
      } else {
        mem.attempts += 1;
      }
    }

    if (!verified) {
      throw new HttpError(400, "That code is not correct");
    }

    // User resolution in Firebase Firestore
    let u = await firebaseDb.getUserByEmail(email);
    if (!u) {
      u = await firebaseDb.createUser({
        email,
        username: uniqueUsernameBase(email),
      });
    }

    await createSession(u.id, u);
    return Response.json({ user: toPublicUser(u) });
  } catch (e) {
    return errorResponse(e);
  }
}
