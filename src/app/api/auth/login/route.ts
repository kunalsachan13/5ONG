import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { firebaseDb } from "@/lib/firebaseDb";
import { createSession, errorResponse, HttpError, rateLimit, SESSION_COOKIE, toPublicUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const identifier = String(body.identifier ?? "").trim();
    const password = String(body.password ?? "");
    if (!identifier || !password) throw new HttpError(400, "Enter your email, username, or phone number and password");
    rateLimit(`login:${identifier.toLowerCase()}`, 8, 60_000);

    const u = await firebaseDb.getUserByIdentifier(identifier);
    const hash = u?.passwordHash ?? "$2a$12$C6UzMDM.H6dfI/f/IKcEeO5uJ6y0Y0nV6hHnZ0e0o0Y0nV6hHnZ0e";
    const ok = await bcrypt.compare(password, hash);
    if (!u || !u.passwordHash || !ok) {
      if (u && !u.passwordHash)
        throw new HttpError(401, "This account uses Google or verification-code sign-in. Use that method instead.");
      throw new HttpError(401, "Incorrect credentials");
    }
    const sessionToken = await createSession(u.id, u);
    const res = NextResponse.json({ user: toPublicUser(u) });
    res.cookies.set(SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      secure: process.env.NODE_ENV === "production",
    });
    return res;
  } catch (e) {
    return errorResponse(e);
  }
}
