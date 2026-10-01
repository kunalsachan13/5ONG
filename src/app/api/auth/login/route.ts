import bcrypt from "bcryptjs";
import { firebaseDb } from "@/lib/firebaseDb";
import { createSession, errorResponse, HttpError, rateLimit, toPublicUser } from "@/lib/auth";

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
    await createSession(u.id, u);
    return Response.json({ user: toPublicUser(u) });
  } catch (e) {
    return errorResponse(e);
  }
}
