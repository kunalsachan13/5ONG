import crypto from "node:crypto";
import { errorResponse, hashCode, HttpError, rateLimit } from "@/lib/auth";

declare global {
  var __memoryOtpStore: Map<string, { code: string; codeHash: string; expiresAt: number; attempts: number; createdAt: number }> | undefined;
}

const memoryStore = (globalThis.__memoryOtpStore = globalThis.__memoryOtpStore || new Map());

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "Enter a valid email address");
    rateLimit(`otpreq:${email}`, 5, 10 * 60_000);

    const lastMem = memoryStore.get(email);
    if (lastMem && Date.now() - lastMem.createdAt < 30_000) {
      throw new HttpError(429, "Please wait 30 seconds before requesting another code");
    }

    const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
    const codeHash = hashCode(email, code);

    memoryStore.set(email, {
      code,
      codeHash,
      expiresAt: Date.now() + 10 * 60_000,
      attempts: 0,
      createdAt: Date.now(),
    });

    const key = process.env.RESEND_API_KEY;
    if (key) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || "5ONG <onboarding@resend.dev>",
          to: [email],
          subject: `Your 5ONG code: ${code}`,
          html: `<div style="font-family:system-ui;padding:24px"><h2>5ONG</h2><p>Your sign-in code is</p><p style="font-size:32px;letter-spacing:6px;font-weight:700">${code}</p><p>It expires in 10 minutes.</p></div>`,
        }),
      });
      if (!res.ok) throw new HttpError(502, "Could not send the email. Try again shortly.");
      return Response.json({ ok: true, delivery: "email" });
    }

    // No mail provider configured: surface the code so the flow still works in demo/dev setups.
    console.log(`[5ONG] OTP for ${email}: ${code}`);
    return Response.json({ ok: true, delivery: "demo", devCode: code });
  } catch (e) {
    return errorResponse(e);
  }
}
