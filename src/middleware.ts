import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const host = request.headers.get("host") || "";
  const proto = request.headers.get("x-forwarded-proto");

  // Force HTTPS redirect on production domains (skip localhost and local IPs)
  const isLocal =
    host.includes("localhost") ||
    host.includes("127.0.0.1") ||
    host.startsWith("192.168.") ||
    host.startsWith("10.");

  if (proto === "http" && !isLocal && process.env.NODE_ENV === "production") {
    const httpsUrl = new URL(request.url);
    httpsUrl.protocol = "https:";
    return NextResponse.redirect(httpsUrl, 301);
  }

  const response = NextResponse.next();

  // Enforce HSTS (Strict-Transport-Security) for 1 year including subdomains
  if (!isLocal) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  // Security Headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "SAMEORIGIN");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), browsing-topics=()"
  );

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api routes
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, logo.png, icon.png
     */
    "/((?!api/|_next/static|_next/image|favicon.ico|logo.png|icon.png).*)",
  ],
};
