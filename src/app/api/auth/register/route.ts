import bcrypt from "bcryptjs";
import { firebaseDb } from "@/lib/firebaseDb";
import { createSession, errorResponse, HttpError, rateLimit, toPublicUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "local";
    rateLimit(`reg:${ip}`, 10, 60_000);
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const username = String(body.username ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "Enter a valid email address");
    if (!/^[a-z0-9_.]{3,24}$/.test(username))
      throw new HttpError(400, "Username: 3–24 chars, letters, numbers, _ or .");
    if (password.length < 8) throw new HttpError(400, "Password must be at least 8 characters");

    // Check existing via Firebase
    const existing = await firebaseDb.getUserByEmail(email);
    if (existing) throw new HttpError(409, "That email is already registered");

    const passwordHash = await bcrypt.hash(password, 12);
    const u = await firebaseDb.createUser({ email, username, passwordHash });
    await createSession(u.id, u);
    return Response.json({ user: toPublicUser(u) });
  } catch (e) {
    return errorResponse(e);
  }
}
