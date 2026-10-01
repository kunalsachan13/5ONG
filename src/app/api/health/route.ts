export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    ok: true,
    service: "5ONG Music Platform",
    database: "neon",
    timestamp: new Date().toISOString(),
  });
}
