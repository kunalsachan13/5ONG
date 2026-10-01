import { cookies } from "next/headers";
import { firebaseDb } from "@/lib/firebaseDb";
import { createSession, getOrigin, uniqueUsernameBase } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const origin = getOrigin(req);
  const fail = (code: string) => Response.redirect(`${origin}/login?error=${code}`, 302);
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const jar = await cookies();
    const saved = jar.get("5ong_oauth_state")?.value;
    jar.delete("5ong_oauth_state");
    if (!code || !state || state !== saved) return fail("google_state");

    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || "";

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${origin}/api/auth/google/callback`,
        grant_type: "authorization_code",
      }),
    });
    if (!tokenRes.ok) return fail("google_token");
    const { access_token } = await tokenRes.json();
    const infoRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    if (!infoRes.ok) return fail("google_profile");
    const info = await infoRes.json();
    if (!info.email || info.email_verified === false) return fail("google_email");
    const email = String(info.email).toLowerCase().trim();
    const googleId = String(info.sub);

    // Upsert user in Firebase Firestore
    let u = await firebaseDb.getUserByGoogleId(googleId);
    if (!u) {
      const existingByEmail = await firebaseDb.getUserByEmail(email);
      if (existingByEmail) {
        u = await firebaseDb.updateUser(existingByEmail.id, {
          googleId,
          avatarUrl: existingByEmail.avatarUrl ?? info.picture ?? null,
        });
      }
    }
    if (!u) {
      u = await firebaseDb.createUser({
        email,
        username: info.name || uniqueUsernameBase(email),
        googleId,
        avatarUrl: info.picture ?? null,
      });
    }

    await createSession(u.id, u);
    return Response.redirect(`${origin}/`, 302);
  } catch (e) {
    console.error(e);
    return fail("google_failed");
  }
}
