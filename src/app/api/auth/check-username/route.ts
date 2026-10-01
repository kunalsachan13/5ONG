import { firebaseDb } from "@/lib/firebaseDb";
import { errorResponse, HttpError } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawUsername = searchParams.get("username") ?? "";
    const username = rawUsername.trim().toLowerCase();

    if (!username) {
      return Response.json({ available: false, error: "Username is required" }, { status: 400 });
    }

    if (!/^[a-z0-9_.]{3,24}$/.test(username)) {
      return Response.json({
        available: false,
        username,
        error: "Username must be 3–24 characters (lowercase letters, numbers, _ or .)",
      });
    }

    const taken = await firebaseDb.isUsernameTaken(username);
    return Response.json({
      available: !taken,
      username,
      message: taken ? "Username is already taken" : "Username is available",
    });
  } catch (e) {
    return errorResponse(e);
  }
}
