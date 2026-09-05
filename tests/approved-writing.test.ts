import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import slike from '../fixtures/savka-slike.json';
import nestajanja from '../fixtures/savka-nestajanja.json';
import { bodySchema } from '../src/lib/content';
test('approved Savka poems retain source whitespace, stanza breaks and emphasis', () => {
  for (const [fixture, hash] of [
    [slike, '412e577e27f6ab86b85224c88643948ed69cb122bc3681b383b148ca93e71df6'],
    [nestajanja, '57d7bcb0c6d6fb9c5571b5e2b03966bd3f7aa71d763c47b25e2fb87275eb3a47'],
  ] as const) {
    bodySchema.parse(fixture.body);
    assert.equal(createHash('sha256').update(fixture.body.text).digest('hex'), hash);
    assert.deepEqual(fixture.body.emphasis, [
      { from: 0, to: fixture.body.text.length, style: 'italic' },
    ]);
  }
  assert.ok(nestajanja.body.text.includes('pjesmu\u00a0 pjevam.'));
});
