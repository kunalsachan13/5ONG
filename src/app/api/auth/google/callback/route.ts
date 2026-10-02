import { cookies } from "next/headers";
import { firebaseDb } from "@/lib/firebaseDb";
import { createSession, getOrigin, uniqueUsernameBase } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const origin = getOrigin(req);
  const fail = (code: string) => Response.redirect(`${origin}/login?error=${code}`, 302);
  try {
    const url = new URL(req.url);
    const googleErr = url.searchParams.get("error");
    if (googleErr) {
      console.error("[Google OAuth Callback Error]:", googleErr, url.searchParams.get("error_description"));
      return fail(googleErr);
    }

    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const jar = await cookies();
    const saved = jar.get("5ong_oauth_state")?.value;
    jar.delete("5ong_oauth_state");

    if (!code) return fail("google_state");
    if (saved && state && state !== saved) {
      console.warn("[Google OAuth State Mismatch]:", { state, saved });
      return fail("google_state");
    }

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
    if (!tokenRes.ok) {
      const errDetail = await tokenRes.text().catch(() => "");
      console.error("[Google OAuth Token Error]:", tokenRes.status, errDetail);
      return fail("google_token");
    }
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
      const candidateBase = (info.name || email.split("@")[0]).toLowerCase().replace(/[^a-z0-9_.]/g, "");
      const uniqueUsername = await firebaseDb.generateUniqueUsername(candidateBase || "user");
      u = await firebaseDb.createUser({
        email,
        username: uniqueUsername,
        googleId,
        avatarUrl: info.picture ?? null,
      });
    }

    const sessionToken = await createSession(u.id, u);

    const userAgent = req.headers.get("user-agent") || "";
    const isAndroid = /android/i.test(userAgent);

    if (isAndroid) {
      const appUrl = `song://auth-callback?token=${encodeURIComponent(sessionToken)}`;
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>5ONG - Signing in...</title>
  <style>
    body {
      background: #faf6ff;
      color: #1a1528;
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 24px;
      box-sizing: border-box;
      text-align: center;
    }
    .card {
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.9);
      border-radius: 28px;
      padding: 36px 24px;
      max-width: 360px;
      width: 100%;
      box-shadow: 0 10px 30px rgba(155, 127, 232, 0.15);
    }
    .logo {
      width: 80px;
      height: 80px;
      border-radius: 22px;
      margin-bottom: 16px;
      box-shadow: 0 6px 16px rgba(155, 127, 232, 0.2);
    }
    h1 {
      font-size: 22px;
      font-weight: 800;
      margin: 0 0 6px;
    }
    p {
      color: #716b82;
      font-size: 14px;
      margin: 0 0 24px;
      font-weight: 600;
    }
    .btn {
      display: block;
      background: linear-gradient(135deg, #cdb8ff, #ffc4dd, #ffdcbd);
      color: #1a1528;
      font-weight: 800;
      font-size: 15px;
      padding: 14px 20px;
      border-radius: 16px;
      text-decoration: none;
      box-shadow: 0 4px 14px rgba(205, 184, 255, 0.4);
      margin-bottom: 14px;
    }
    .btn-sub {
      color: #9b7fe8;
      font-size: 13px;
      font-weight: 700;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="card">
    <img src="/logo.png" alt="5ONG" class="logo" />
    <h1>Signed in as @${u.username}</h1>
    <p>Opening the 5ONG App...</p>
    <a id="openBtn" href="${appUrl}" class="btn">Return to 5ONG App</a>
    <a href="/" class="btn-sub">Or continue in Web Browser</a>
  </div>
  <script>
    // Automatically trigger app switch
    window.location.href = "${appUrl}";
  </script>
</body>
</html>`;
      return new Response(html, {
        headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }

    return Response.redirect(`${origin}/`, 302);
  } catch (e) {
    console.error(e);
    return fail("google_failed");
  }
}
