import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { mediumImage, storagePath } from '../src/lib/media-store';

test('the medium size is made once from the display picture and kept beside it', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'zilet-media-'));
  process.env.MEDIA_DIR = root;
  try {
    const id = '00000000-0000-4000-8000-000000000001';
    await mkdir(path.join(root, id));
    const display = await sharp({
      create: { width: 1800, height: 1200, channels: 3, background: '#173a2b' },
    })
      .webp()
      .toBuffer();
    await writeFile(path.join(root, id, 'display.webp'), display);
    const made = await sharp(await mediumImage(id, `${id}/display.webp`)).metadata();
    assert.deepEqual([made.format, made.width, made.height], ['webp', 1080, 720]);
    assert.deepEqual((await readdir(path.join(root, id))).sort(), ['display.webp', 'medium.webp']);
    // Later requests read the kept file instead of resizing again.
    await rm(path.join(root, id, 'display.webp'));
    assert.equal((await sharp(await mediumImage(id, `${id}/display.webp`)).metadata()).width, 1080);
  } finally {
    await rm(root, { recursive: true, force: true });
    delete process.env.MEDIA_DIR;
  }
});

test('storage keys name only known picture files', () => {
  for (const name of ['original.webp', 'display.webp', 'medium.webp', 'small.webp', 'share.jpg'])
    assert.doesNotThrow(() => storagePath(`abc-123/${name}`));
  for (const key of ['abc/large.webp', '../abc/medium.webp', 'abc/medium.png', 'abc/medium.webp/x'])
    assert.throws(() => storagePath(key), key);
});
