import { firebaseDb } from "@/lib/firebaseDb";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const u = await getSessionUser();
  if (!u) return Response.json({ likes: [], playlists: [], history: [] });

  try {
    const [likes, history, playlists] = await Promise.all([
      firebaseDb.getLikes(u.id),
      firebaseDb.getHistory(u.id, 100),
      firebaseDb.getPlaylists(u.id),
    ]);

    return Response.json({
      likes,
      history: history.map((h: any) => ({ ...h.track, playedAt: h.playedAt })),
      playlists,
    });
  } catch (err) {
    console.warn("[Library API] Note:", err);
    return Response.json({ likes: [], playlists: [], history: [] });
  }
}
