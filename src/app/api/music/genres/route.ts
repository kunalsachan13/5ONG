import { dz } from "@/lib/deezer";

export async function GET() {
  try {
    const data = await dz<{ data: { id: number; name: string; picture_medium: string }[] }>("/genre", 3600);
    return Response.json({
      genres: data.data
        .filter((g) => g.id !== 0)
        .map((g) => ({ id: String(g.id), name: g.name, picture: g.picture_medium })),
    });
  } catch {
    return Response.json({ genres: [] });
  }
}
