import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
test('production marks are true outlined vectors with no script, raster or font dependency', () => {
  for (const name of readdirSync('public/identity').filter((n) => n.endsWith('.svg'))) {
    const source = readFileSync(`public/identity/${name}`, 'utf8');
    assert.ok(source.includes('viewBox'));
    assert.ok(source.includes('<path'));
    assert.ok(!/<(script|image|text)|data:|url\(/.test(source), name);
  }
});
