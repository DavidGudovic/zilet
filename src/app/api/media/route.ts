import { rm } from 'node:fs/promises';
import path from 'node:path';
import { db } from '@/db';
import { media } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { requireUser, assertOrigin, failure, takeLimit, HttpError } from '@/lib/security';
import { processImage, mediaRoot } from '@/lib/media-store';
export async function GET(req: Request) {
  try {
    await requireUser(req.headers, 'editor');
    const items = await db
      .select({
        id: media.id,
        filename: media.filename,
        width: media.width,
        height: media.height,
        alt: media.alt,
        caption: media.caption,
        credit: media.credit,
        createdAt: media.createdAt,
      })
      .from(media)
      .orderBy(desc(media.createdAt))
      .limit(100);
    return Response.json({ items }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  let pendingId: string | undefined;
  try {
    assertOrigin(req);
    const u = await requireUser(req.headers, 'editor');
    await takeLimit(`upload:${u.id}`, 20, 3600);
    if (Number(req.headers.get('content-length') || 0) > 13 * 1024 * 1024)
      throw new HttpError(413, 'Fotografija može imati najviše 12 MB.');
    const reader = req.body?.getReader();
    if (!reader) throw new HttpError(400, 'Izaberite fotografiju.');
    let size = 0;
    const chunks: Uint8Array[] = [];
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 13 * 1024 * 1024) {
        await reader.cancel();
        throw new HttpError(413, 'Fotografija je prevelika.');
      }
      chunks.push(value);
    }
    const bounded = new Request(req.url, {
      method: 'POST',
      headers: { 'content-type': req.headers.get('content-type') || '' },
      body: Buffer.concat(chunks),
    });
    const form = await bounded.formData();
    const file = form.get('file');
    if (!(file instanceof File)) throw new HttpError(400, 'Izaberite fotografiju.');
    const id = crypto.randomUUID();
    pendingId = id;
    const image = await processImage(Buffer.from(await file.arrayBuffer()), id);
    const filename = file.name.replace(/[^\p{L}\p{N}. _-]/gu, '').slice(0, 120) || 'fotografija';
    const [item] = await db
      .insert(media)
      .values({ id, filename, ...image, createdBy: u.id })
      .returning();
    pendingId = undefined;
    return Response.json(
      { id: item.id, url: `/media/${item.id}`, width: item.width, height: item.height },
      { status: 201 },
    );
  } catch (e) {
    if (pendingId)
      await rm(path.join(mediaRoot(), pendingId), { recursive: true, force: true }).catch(() => {});
    return failure(e);
  }
}
