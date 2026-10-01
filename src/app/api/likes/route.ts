import { firebaseDb } from "@/lib/firebaseDb";
import { errorResponse, HttpError, requireUser } from "@/lib/auth";
import type { Track } from "@/lib/types";

export async function GET() {
  try {
    const u = await requireUser();
    const likes = await firebaseDb.getLikes(u.id);
    return Response.json({ likes });
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

    const currentLikes = await firebaseDb.getLikes(u.id);
    const isLiked = currentLikes.some((t: any) => String(t.id) === String(track.id));

    if (isLiked) {
      await firebaseDb.removeLike(u.id, track.id);
      return Response.json({ liked: false });
    }

    await firebaseDb.saveLike(u.id, track);
    return Response.json({ liked: true });
  } catch (e) {
    return errorResponse(e);
  }
}
