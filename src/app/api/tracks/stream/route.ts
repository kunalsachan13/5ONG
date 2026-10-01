import { resolveAudioStream } from '@/lib/audioResolver';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const title = searchParams.get('title') || '';
  const artist = searchParams.get('artist') || '';

  if (!title) {
    return Response.json({ error: 'Title required' }, { status: 400 });
  }

  try {
    const streamUrl = await resolveAudioStream(title, artist);
    if (streamUrl) {
      return Response.redirect(streamUrl, 307);
    }
    return Response.json({ error: 'Audio stream not found' }, { status: 404 });
  } catch (err: any) {
    return Response.json({ error: err?.message || 'Stream error' }, { status: 500 });
  }
}
