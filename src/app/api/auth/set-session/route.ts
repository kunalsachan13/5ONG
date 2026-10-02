import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { SESSION_COOKIE } from "@/lib/auth";

export const dynamic = "force-dynamic";

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || "5ong-dev-secret-change-me-in-production-0123456789",
);

export async function POST(req: Request) {
  try {
    const { token } = await req.json();
    if (!token || typeof token !== "string") {
      return NextResponse.json({ error: "Missing or invalid token" }, { status: 400 });
    }

    const { payload } = await jwtVerify(token, secret);
    if (!payload?.uid) {
      return NextResponse.json({ error: "Invalid session token" }, { status: 401 });
    }

    const jar = await cookies();
    jar.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return NextResponse.json({ ok: true, uid: payload.uid });
  } catch (err: any) {
    console.error("[set-session] Error:", err?.message);
    return NextResponse.json({ error: "Failed to establish session" }, { status: 401 });
  }
}
