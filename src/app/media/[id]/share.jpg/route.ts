import { failure } from '@/lib/security';
import { shareCard } from '@/lib/media-store';
import { servableMedia } from '@/lib/media-access';
// Link-preview image for Facebook, Viber and other apps: same access rules as the picture.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const m = await servableMedia((await params).id, req.headers);
    const bytes = await shareCard(m.id, m.path);
    return new Response(new Uint8Array(bytes), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Length': String(bytes.length),
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (e) {
    return failure(e);
  }
}
