import { getSessionUser, toPublicUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const u = await getSessionUser();
  return Response.json({
    user: u ? toPublicUser(u) : null,
    providers: {
      google: Boolean(
        process.env.GOOGLE_CLIENT_ID ||
        process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
        process.env.GOOGLE_CLIENT_SECRET
      ),
      emailDelivery: Boolean(process.env.RESEND_API_KEY),
    },
  });
}
