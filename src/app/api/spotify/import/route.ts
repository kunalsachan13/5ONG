import { POST as universalPost } from "@/app/api/import/route";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return universalPost(req);
}

