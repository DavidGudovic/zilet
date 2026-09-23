import { failure } from '@/lib/security';
import { mediumImage, readMedia } from '@/lib/media-store';
import { mediaResponse, servableMedia } from '@/lib/media-access';
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const m = await servableMedia((await params).id, req.headers);
    const size = new URL(req.url).searchParams.get('size');
    if (size === 'medium')
      return await mediaResponse(req, `${m.id}-medium`, 'image/webp', () =>
        mediumImage(m.id, m.path),
      );
    const small = size === 'small';
    return await mediaResponse(req, `${m.id}-${small ? 'small' : 'display'}`, 'image/webp', () =>
      readMedia(small ? m.smallPath : m.path),
    );
  } catch (e) {
    return failure(e);
  }
}
