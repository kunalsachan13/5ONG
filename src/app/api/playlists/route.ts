import { firebaseDb } from "@/lib/firebaseDb";
import { errorResponse, HttpError, requireUser } from "@/lib/auth";
import type { Track } from "@/lib/types";

export async function GET() {
  try {
    const u = await requireUser();
    const playlists = await firebaseDb.getPlaylists(u.id);
    return Response.json({ playlists });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const u = await requireUser();
    const body = await req.json().catch(() => ({}));
    const name = String(body.name ?? "").trim().slice(0, 80);
    if (!name) throw new HttpError(400, "Give your playlist a name");
    const tracks = (Array.isArray(body.tracks) ? body.tracks : []) as Track[];
    const playlist = await firebaseDb.createPlaylist(u.id, name, tracks);
    return Response.json({ playlist });
  } catch (e) {
    return errorResponse(e);
  }
}
