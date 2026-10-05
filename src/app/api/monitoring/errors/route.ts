import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const userAgent = req.headers.get("user-agent") || "";
    // Filter noise from scrapers and bots
    if (/bot|spider|crawl|slurp/i.test(userAgent)) {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const report = await req.json().catch(() => ({}));
    
    // Server-side structured error log
    console.error("[Client Error Reported]", {
      message: report.message,
      pathname: report.pathname,
      digest: report.digest,
      timestamp: report.timestamp || new Date().toISOString(),
      userAgent: userAgent.slice(0, 120),
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
