import { createSession, errorResponse, HttpError, requireUser, toPublicUser } from "@/lib/auth";
import { firebaseDb } from "@/lib/firebaseDb";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const u = await requireUser();
    return Response.json({
      avatarUrl: u.avatarUrl || null,
      username: u.username,
    });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const u = await requireUser();
    const body = await req.json().catch(() => ({}));
    const rawAvatar = body.avatarUrl;

    if (rawAvatar !== null && typeof rawAvatar !== "string") {
      throw new HttpError(400, "Invalid avatar data");
    }

    let cleanAvatar: string | null = null;
    if (typeof rawAvatar === "string" && rawAvatar.trim()) {
      const trimmed = rawAvatar.trim();
      // Basic validation: must be data:image or http/https URL
      if (!trimmed.startsWith("data:image/") && !trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
        throw new HttpError(400, "Avatar must be a valid image URL or image data");
      }
      // Safety limit on length (max 2MB base64)
      if (trimmed.length > 2_000_000) {
        throw new HttpError(400, "Image is too large. Please select a smaller photo.");
      }
      cleanAvatar = trimmed;
    }

    const updated = await firebaseDb.updateUser(u.id, { avatarUrl: cleanAvatar ?? "" });
    // Keep session in sync
    await createSession(u.id, updated);

    return Response.json({
      ok: true,
      user: toPublicUser(updated),
      message: cleanAvatar ? "Profile picture updated!" : "Profile picture removed",
    });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function DELETE() {
  try {
    const u = await requireUser();
    const updated = await firebaseDb.updateUser(u.id, { avatarUrl: "" });
    await createSession(u.id, updated);
    return Response.json({
      ok: true,
      user: toPublicUser(updated),
      message: "Profile picture removed",
    });
  } catch (e) {
    return errorResponse(e);
  }
}
