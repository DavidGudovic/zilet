import { failure } from '@/lib/security';
import { shareCard } from '@/lib/media-store';
import { mediaResponse, servableMedia } from '@/lib/media-access';
// Link-preview image for Facebook, Viber and other apps: same access rules as the picture.
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const m = await servableMedia((await params).id, req.headers);
    return await mediaResponse(req, `${m.id}-share`, 'image/jpeg', () => shareCard(m.id, m.path));
  } catch (e) {
    return failure(e);
  }
}
