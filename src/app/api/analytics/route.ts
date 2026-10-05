import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const userAgent = req.headers.get("user-agent") || "";
    // Filter obvious bot/spider crawlers from polluting analytics
    const isBot = /bot|spider|crawl|slurp|facebookexternalhit|bingbot|googlebot/i.test(userAgent);
    if (isBot) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const body = await req.json().catch(() => ({}));
    
    // In production, send to database, Cloudflare Analytics, or Prometheus/Log drain
    if (process.env.NODE_ENV === "development") {
      // Clean debug log
      console.log(`[Analytics] [${body.event || "event"}]:`, body.properties || body.url);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
