import crypto from "node:crypto";
import { cookies } from "next/headers";
import { firebaseDb } from "@/lib/firebaseDb";
import { createSession, getOrigin, toPublicUser, uniqueUsernameBase } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/auth/google -> Initiates standard OAuth2 redirect flow
export async function GET(req: Request) {
  const reqUrl = new URL(req.url);
  const platform = reqUrl.searchParams.get("platform") || "";
  const desktopPort = reqUrl.searchParams.get("desktop_port") || "";

  const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const origin = getOrigin(req);
  if (!clientId || !clientSecret) {
    return Response.redirect(`${origin}/login?error=google_not_configured`, 302);
  }
  const stateRandom = crypto.randomBytes(16).toString("hex");
  // Encode platform & port into state so it roundtrips through Google even if third-party cookies are blocked
  const state = platform ? `${stateRandom}:${platform}:${desktopPort || "0"}` : stateRandom;
  
  const jar = await cookies();
  jar.set("5ong_oauth_state", stateRandom, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
    secure: origin.startsWith("https"),
  });
  if (platform) {
    jar.set("5ong_oauth_platform", platform, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
      secure: origin.startsWith("https"),
    });
  }
  if (desktopPort) {
    jar.set("5ong_oauth_desktop_port", desktopPort, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
      secure: origin.startsWith("https"),
    });
  }
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${origin}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`, 302);
}

// POST /api/auth/google -> Handles direct token/credential verification from JF Player Google One Tap / SDK
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { credential, code, access_token, redirect_uri } = body || {};
    let googleUser: { email: string; name: string; avatar: string; googleId: string } | null = null;

    if (access_token) {
      const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (!userRes.ok) return Response.json({ error: "Invalid Google access token" }, { status: 400 });
      const payload = await userRes.json();
      if (!payload?.email) return Response.json({ error: "Missing email from Google profile" }, { status: 400 });
      googleUser = {
        email: String(payload.email).toLowerCase().trim(),
        name: payload.name || payload.given_name || "Google User",
        avatar: payload.picture || "",
        googleId: String(payload.sub),
      };
    } else if (credential) {
      const verifyRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential)}`);
      if (!verifyRes.ok) return Response.json({ error: "Invalid Google credential" }, { status: 400 });
      const payload = await verifyRes.json();
      if (!payload?.email) return Response.json({ error: "Missing email from credential" }, { status: 400 });
      googleUser = {
        email: String(payload.email).toLowerCase().trim(),
        name: payload.name || payload.given_name || "Google User",
        avatar: payload.picture || "",
        googleId: String(payload.sub),
      };
    } else if (code) {
      const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
      const origin = getOrigin(req);
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirect_uri || `${origin}/api/auth/google/callback`,
          grant_type: "authorization_code",
        }),
      });
      if (!tokenRes.ok) return Response.json({ error: "Failed to exchange authorization code" }, { status: 400 });
      const tokenData = await tokenRes.json();
      const userRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      if (!userRes.ok) return Response.json({ error: "Failed to fetch userinfo from Google" }, { status: 400 });
      const payload = await userRes.json();
      googleUser = {
        email: String(payload.email).toLowerCase().trim(),
        name: payload.name || payload.given_name || "Google User",
        avatar: payload.picture || "",
        googleId: String(payload.sub),
      };
    } else {
      return Response.json({ error: "Missing credential, access_token, or code" }, { status: 400 });
    }

    // Upsert user in Firebase Firestore
    let u = await firebaseDb.getUserByGoogleId(googleUser.googleId);
    if (!u) {
      const existingByEmail = await firebaseDb.getUserByEmail(googleUser.email);
      if (existingByEmail) {
        u = await firebaseDb.updateUser(existingByEmail.id, {
          googleId: googleUser.googleId,
          avatarUrl: existingByEmail.avatarUrl ?? googleUser.avatar ?? null,
        });
      }
    }
    if (!u) {
      u = await firebaseDb.createUser({
        email: googleUser.email,
        username: googleUser.name || uniqueUsernameBase(googleUser.email),
        googleId: googleUser.googleId,
        avatarUrl: googleUser.avatar || null,
      });
    }

    await createSession(u.id, u);
    return Response.json({ user: toPublicUser(u) });
  } catch (e: any) {
    console.error("Google auth post error:", e);
    return Response.json({ error: e?.message || "Google authentication failed" }, { status: 500 });
  }
}
