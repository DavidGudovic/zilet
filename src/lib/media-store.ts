import sharp from 'sharp';
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { HttpError } from './security';
export const mediaRoot = () =>
  path.resolve(/* turbopackIgnore: true */ process.env.MEDIA_DIR || 'media');
export function mediaDirectory(id: string) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new HttpError(404, 'Fotografija nije pronađena.');
  // Uploaded files live in the runtime volume, never in the deployment bundle.
  return path.join(/* turbopackIgnore: true */ mediaRoot(), id);
}
export function storagePath(key: string) {
  if (!/^[a-f0-9-]+\/(original|display|small)\.(jpg|webp)$/.test(key))
    throw new HttpError(400, 'Neispravna putanja.');
  return path.join(/* turbopackIgnore: true */ mediaRoot(), key);
}
export async function processImage(bytes: Buffer, id: string) {
  const directory = mediaDirectory(id);
  if (bytes.length > 12 * 1024 * 1024)
    throw new HttpError(413, 'Fotografija može imati najviše 12 MB.');
  const image = sharp(bytes, { limitInputPixels: 40000000, animated: false, failOn: 'error' });
  let meta;
  try {
    meta = await image.metadata();
  } catch {
    throw new HttpError(400, 'Fajl nije ispravna fotografija.');
  }
  if (!['jpeg', 'png', 'webp'].includes(meta.format || '') || (meta.pages || 1) > 1)
    throw new HttpError(
      400,
      'Koristite JPG, PNG ili WebP fotografiju. SVG i animacije nijesu podržani.',
    );
  if (!meta.width || !meta.height) throw new HttpError(400, 'Nije moguće pročitati dimenzije.');
  const originalPath = `${id}/original.webp`;
  const displayPath = `${id}/display.webp`;
  const smallPath = `${id}/small.webp`;
  const original = await image.rotate().webp({ quality: 95 }).toBuffer();
  const display = await sharp(original)
    .resize({ width: 1800, height: 1800, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer({ resolveWithObject: true });
  const small = await sharp(original)
    .resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toBuffer();
  await mkdir(directory, { recursive: true });
  try {
    const writes = await Promise.allSettled([
      writeFile(storagePath(originalPath), original),
      writeFile(storagePath(displayPath), display.data),
      writeFile(storagePath(smallPath), small),
    ]);
    const failed = writes.find((result) => result.status === 'rejected');
    if (failed?.status === 'rejected') throw failed.reason;
  } catch (error) {
    await rm(directory, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
  return {
    originalPath,
    path: displayPath,
    smallPath,
    width: display.info.width,
    height: display.info.height,
  };
}
export const readMedia = (key: string) => readFile(storagePath(key));
