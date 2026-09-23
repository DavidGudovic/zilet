import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';

// The runner applies a fixed list, so a migration file missing from it never runs.
test('every migration file is applied by the runner, once and only if it exists', async () => {
  const files = (await readdir('migrations')).filter((name) => name.endsWith('.sql')).sort();
  const listed = [
    ...(await readFile('scripts/migrate.ts', 'utf8')).matchAll(/'([^']+\.sql)'/g),
  ].map((match) => match[1]);
  assert.ok(files.length > 0);
  assert.equal(new Set(listed).size, listed.length, 'A migration is listed twice');
  assert.deepEqual([...listed].sort(), files);
});
