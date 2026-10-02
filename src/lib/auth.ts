import { createHash } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { firebaseDb } from "@/lib/firebaseDb";
import type { PublicUser } from "@/lib/types";

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "5ong-dev-secret-change-me-in-production-0123456789",
);

export const SESSION_COOKIE = "5ong_session";

export function toPublicUser(u: any): PublicUser {
  return {
    id: u.id,
    email: u.email || null,
    username: u.username,
    phoneNumber: u.phoneNumber || u.phone_number || null,
    avatarUrl: u.avatarUrl || u.avatar_url || null,
  };
}

export async function createSession(userId: string | number, userMeta?: Partial<PublicUser>): Promise<string> {
  const token = await new SignJWT({
    uid: String(userId),
    user: userMeta ? { id: userId, ...userMeta } : undefined,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return token;
}

export async function clearSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<PublicUser | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    const uid = String(payload.uid || "");
    if (!uid) return null;

    // 1. Check Firebase Firestore database
    const fbUser = await firebaseDb.getUserById(uid);
    if (fbUser) return toPublicUser(fbUser);

    // 2. Check token session payload user
    if (payload.user && typeof payload.user === "object") {
      return payload.user as PublicUser;
    }
    return null;
  } catch {
    return null;
  }
}

export async function requireUser() {
  const u = await getSessionUser();
  if (!u) throw new HttpError(401, "Please sign in");
  return u;
}

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function errorResponse(e: unknown) {
  if (e instanceof HttpError) return Response.json({ error: e.message }, { status: e.status });
  console.error(e);
  return Response.json({ error: "Something went wrong" }, { status: 500 });
}

// Simple in-memory limiter (per process) for auth endpoints.
const hits = new Map<string, { n: number; reset: number }>();
export function rateLimit(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || h.reset < now) {
    hits.set(key, { n: 1, reset: now + windowMs });
    return;
  }
  h.n += 1;
  if (h.n > max) throw new HttpError(429, "Too many attempts. Try again in a moment.");
}

export function getOrigin(req: Request) {
  const h = req.headers;
  const host = h.get("x-forwarded-host") || h.get("host");
  const proto = h.get("x-forwarded-proto") || (host?.startsWith("localhost") ? "http" : "https");
  if (host) return `${proto}://${host}`;
  return new URL(req.url).origin;
}

export function uniqueUsernameBase(email: string) {
  const base = email.split("@")[0].toLowerCase().replace(/[^a-z0-9_.]/g, "");
  return (base.length >= 3 ? base : `user${base}`).slice(0, 18);
}

export function hashCode(email: string, code: string) {
  return createHash("sha256")
    .update(`${email}:${code}:${process.env.AUTH_SECRET ?? "5ong"}`)
    .digest("hex");
}
