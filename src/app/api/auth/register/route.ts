import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { firebaseDb } from "@/lib/firebaseDb";
import { createSession, errorResponse, HttpError, rateLimit, SESSION_COOKIE, toPublicUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "local";
    rateLimit(`reg:${ip}`, 10, 60_000);
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    const rawUsername = String(body.username ?? "").trim().toLowerCase();
    const phone = String(body.phoneNumber || body.phone || "").trim().replace(/[\s\-()]/g, "");
    const password = String(body.password ?? "");

    // 1. Username validation & lowercase enforcement
    if (!rawUsername) throw new HttpError(400, "Please choose a username");
    const username = rawUsername.toLowerCase();
    if (!/^[a-z0-9_.]{3,24}$/.test(username)) {
      throw new HttpError(400, "Username must be 3–24 characters (letters, numbers, _ or .)");
    }

    // 2. Contact validation (email or phone required)
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new HttpError(400, "Enter a valid email address");
    }
    if (phone && !/^\+?\d{8,15}$/.test(phone)) {
      throw new HttpError(400, "Enter a valid phone number (8-15 digits)");
    }
    if (!email && !phone) {
      throw new HttpError(400, "Please provide an email address or phone number");
    }

    // 3. Password validation
    if (password.length < 8) {
      throw new HttpError(400, "Password must be at least 8 characters");
    }

    // 4. Strict Uniqueness Checks
    const isTaken = await firebaseDb.isUsernameTaken(username);
    if (isTaken) {
      throw new HttpError(409, "That username is already taken. Please choose another username.");
    }

    if (email) {
      const emailTaken = await firebaseDb.isEmailTaken(email);
      if (emailTaken) {
        throw new HttpError(409, "That email is already registered. Please sign in or use another email.");
      }
    }

    if (phone) {
      const phoneTaken = await firebaseDb.isPhoneTaken(phone);
      if (phoneTaken) {
        throw new HttpError(409, "That phone number is already registered.");
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const u = await firebaseDb.createUser({
      email: email || null,
      username,
      phoneNumber: phone || null,
      passwordHash,
    });
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
