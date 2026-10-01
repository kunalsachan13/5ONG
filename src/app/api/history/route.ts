import { firebaseDb } from "@/lib/firebaseDb";
import { errorResponse, HttpError, requireUser } from "@/lib/auth";
import type { Track } from "@/lib/types";

export async function GET() {
  try {
    const u = await requireUser();
    const history = await firebaseDb.getHistory(u.id);
    return Response.json({ history });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const u = await requireUser();
    const body = await req.json().catch(() => ({}));
    const track = body.track as Track | undefined;
    if (!track?.id) throw new HttpError(400, "Missing track");
    const seconds = Math.max(0, Math.min(3600, Math.round(Number(body.seconds) || 0)));
    await firebaseDb.addHistory(u.id, track, seconds);
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
