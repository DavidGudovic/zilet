import { failure } from '@/lib/security';
import { readMedia } from '@/lib/media-store';
import { mediaResponse, servableMedia } from '@/lib/media-access';
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const m = await servableMedia((await params).id, req.headers);
    const small = new URL(req.url).searchParams.get('size') === 'small';
    return await mediaResponse(req, `${m.id}-${small ? 'small' : 'display'}`, 'image/webp', () =>
      readMedia(small ? m.smallPath : m.path),
    );
  } catch (e) {
    return failure(e);
  }
}
