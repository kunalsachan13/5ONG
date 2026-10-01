import crypto from "node:crypto";
import { errorResponse, hashCode, HttpError, rateLimit } from "@/lib/auth";
import { firebaseDb } from "@/lib/firebaseDb";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawEmail = String(body.email ?? "").trim();
    const rawPhone = String(body.phoneNumber || body.phone || "").trim();

    if (!rawEmail && !rawPhone) {
      throw new HttpError(400, "Please provide an email address or phone number");
    }

    // ==========================================
    // 1. Email OTP Flow (Powered by Neon Auth)
    // ==========================================
    if (rawEmail) {
      const email = rawEmail.toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new HttpError(400, "Enter a valid email address");
      }
      rateLimit(`otpreq:email:${email}`, 5, 10 * 60_000);

      // Generate local fallback code stored in Neon DB
      const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
      const codeHash = hashCode(email, code);
      await firebaseDb.saveOtpCode({ target: email, codeHash, type: "email" });

      // Trigger Neon Auth's native shared email OTP
      const neonAuthUrl = process.env.NEON_AUTH_BASE_URL || "https://ep-still-cherry-b5przcz3.neonauth.c-7.us-east-2.aws.neon.tech/neondb/auth";
      let neonSent = false;
      try {
        const neonRes = await fetch(`${neonAuthUrl}/email-otp/send-verification-otp`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, type: "sign-in" }),
        });
        if (neonRes.ok) {
          const j = await neonRes.json().catch(() => ({}));
          if (j.success !== false) neonSent = true;
        }
      } catch (err) {
        console.warn("[Neon Auth] Email OTP send failed:", err);
      }

      if (neonSent) {
        return Response.json({
          ok: true,
          delivery: "neon-email",
          message: "Verification code sent to your email by Neon Auth.",
        });
      }

      // Check external mailer (Resend) if configured
      const resendKey = process.env.RESEND_API_KEY;
      if (resendKey) {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: process.env.RESEND_FROM || "5ONG <onboarding@resend.dev>",
            to: [email],
            subject: `Your 5ONG sign-in code: ${code}`,
            html: `<div style="font-family:system-ui;padding:24px"><h2>5ONG</h2><p>Your sign-in code is:</p><p style="font-size:32px;letter-spacing:6px;font-weight:700">${code}</p><p>It expires in 10 minutes.</p></div>`,
          }),
        });
        if (res.ok) {
          return Response.json({ ok: true, delivery: "email", message: "Verification code sent to your email." });
        }
      }

      // Dev / Demo fallback (e.g. if SMTP/Resend key not set)
      console.log(`[5ONG] Local OTP for ${email}: ${code}`);
      return Response.json({
        ok: true,
        delivery: "demo",
        devCode: code,
        message: "Code generated. Use the on-screen code to sign in.",
      });
    }

    // ==========================================
    // 2. Phone Number OTP Flow
    // ==========================================
    const phone = rawPhone.replace(/[\s\-()]/g, "");
    if (!/^\+?\d{8,15}$/.test(phone)) {
      throw new HttpError(400, "Enter a valid phone number (8-15 digits)");
    }
    rateLimit(`otpreq:phone:${phone}`, 5, 10 * 60_000);

    const code = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
    const codeHash = hashCode(phone, code);
    await firebaseDb.saveOtpCode({ target: phone, codeHash, type: "phone" });

    // In demo/cloud environment without paid SMS gateway:
    console.log(`[5ONG] Phone OTP for ${phone}: ${code}`);
    return Response.json({
      ok: true,
      delivery: "demo",
      devCode: code,
      message: `Code generated for ${phone}.`,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
