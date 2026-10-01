export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    ok: true,
    service: "5ONG Music Platform",
    database: "firebase",
    timestamp: new Date().toISOString(),
  });
}
