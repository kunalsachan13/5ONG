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
    const rawState = url.searchParams.get("state") || "";
    const [stateRandom, statePlatform, stateDesktopPort] = rawState.split(":");
    const jar = await cookies();
    const saved = jar.get("5ong_oauth_state")?.value;
    jar.delete("5ong_oauth_state");

    const platformCookie = jar.get("5ong_oauth_platform")?.value;
    const desktopPortCookie = jar.get("5ong_oauth_desktop_port")?.value;
    jar.delete("5ong_oauth_platform");
    jar.delete("5ong_oauth_desktop_port");

    const platform = platformCookie || statePlatform || "";
    const desktopPort = desktopPortCookie || (stateDesktopPort && stateDesktopPort !== "0" ? stateDesktopPort : "");

    if (!code) return fail("google_state");
    if (saved && stateRandom && stateRandom !== saved) {
      console.warn("[Google OAuth State Mismatch]:", { stateRandom, saved });
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
    const isDesktop = platform === "desktop" || Boolean(desktopPort);

    if (isAndroid || isDesktop) {
      const appUrl = `song://auth-callback?token=${encodeURIComponent(sessionToken)}`;
      const loopbackUrl = desktopPort
        ? `http://127.0.0.1:${desktopPort}/auth-callback?token=${encodeURIComponent(sessionToken)}`
        : "";

      const deviceLabel = isDesktop ? "5ONG Desktop App" : "5ONG Android App";

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
      max-width: 380px;
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
    <p>Opening ${deviceLabel}...</p>
    <a id="openBtn" href="${appUrl}" class="btn">Return to ${deviceLabel}</a>
    <a href="/" class="btn-sub">Or continue in Web Browser</a>
  </div>
  <script>
    // 1. If desktop port is active, immediately signal local Electron loopback
    if (${JSON.stringify(loopbackUrl)}) {
      try {
        fetch(${JSON.stringify(loopbackUrl)}, { mode: 'no-cors' }).catch(function(){});
      } catch (e) {}
    }
    // 2. Automatically trigger app switch via protocol
    window.location.href = "${appUrl}";
    // 3. Close tab after brief moment if opened in popup
    setTimeout(function() {
      try { window.close(); } catch (e) {}
    }, 3000);
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
