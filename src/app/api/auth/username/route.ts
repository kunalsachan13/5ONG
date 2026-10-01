import { createSession, errorResponse, HttpError, requireUser, toPublicUser } from "@/lib/auth";
import { firebaseDb } from "@/lib/firebaseDb";

export async function GET() {
  try {
    const u = await requireUser();
    const changesThisMonth = await firebaseDb.getUsernameChangesThisMonth(u.id);
    return Response.json({
      username: u.username,
      changesThisMonth,
      changesRemaining: Math.max(0, 2 - changesThisMonth),
      canChange: changesThisMonth < 2,
    });
  } catch (e) {
    return errorResponse(e);
  }
}

export async function POST(req: Request) {
  try {
    const u = await requireUser();
    const body = await req.json().catch(() => ({}));
    const rawUsername = String(body.newUsername ?? body.username ?? "").trim();
    if (!rawUsername) throw new HttpError(400, "Please enter a new username");

    // Automatically convert to lowercase
    const newUsername = rawUsername.toLowerCase();
    if (!/^[a-z0-9_.]{3,24}$/.test(newUsername)) {
      throw new HttpError(400, "Username must be 3–24 characters (lowercase letters, numbers, _ or .)");
    }

    if (newUsername === u.username.toLowerCase()) {
      return Response.json({
        ok: true,
        user: toPublicUser(u),
        message: "Username is already set to this",
      });
    }

    // Check monthly limit (max 2 changes per month)
    const changesThisMonth = await firebaseDb.getUsernameChangesThisMonth(u.id);
    if (changesThisMonth >= 2) {
      throw new HttpError(
        403,
        "You can only change your username 2 times a month. You have already reached the limit for this month."
      );
    }

    // Check uniqueness across all users
    const isTaken = await firebaseDb.isUsernameTaken(newUsername, u.id);
    if (isTaken) {
      throw new HttpError(409, "That username is already taken. Please choose another username.");
    }

    // Update username and record change history
    await firebaseDb.recordUsernameChange(u.id, u.username, newUsername);
    const updated = await firebaseDb.updateUser(u.id, { username: newUsername });
    await createSession(u.id, updated);

    return Response.json({
      ok: true,
      user: toPublicUser(updated),
      changesRemaining: Math.max(0, 2 - (changesThisMonth + 1)),
      message: `Username changed to @${newUsername}!`,
    });
  } catch (e) {
    return errorResponse(e);
  }
}
