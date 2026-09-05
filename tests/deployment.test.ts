import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

test('deployer rejects unapproved commits and restores the previous release after failed health', async () => {
  const root = await mkdtemp(join(tmpdir(), 'zilet-deploy-test-'));
  const sha = '0123456789abcdef0123456789abcdef01234567';
  const previous = 'abcdef0123456789abcdef0123456789abcdef01';
  const bin = join(root, 'bin');
  const state = join(root, '.deploy');
  try {
    await mkdir(bin);
    await mkdir(state);
    await mkdir(join(root, 'scripts'));
    const source = (await readFile('scripts/deploy.sh', 'utf8')).replace(
      'local root=/var/www/html/zilet',
      `local root=${root}`,
    );
    await writeFile(join(root, 'deploy.sh'), source);
    await writeFile(join(root, 'scripts/backup.sh'), 'echo backup >> "$MOCK_ROOT/calls"\n');
    await writeFile(join(state, 'current'), previous + '\n');
    const oldEnv = `ZILET_IMAGE=zilet/app:${previous}\nRELEASE_SHA=${previous}\n`;
    await writeFile(join(state, 'release.env'), oldEnv);
    const commands = {
      git: `case "$1" in
ls-remote) printf '%s\\trefs/heads/main\\n%s\\trefs/tags/deploy-ready\\n' "$MOCK_SHA" "$MOCK_READY";;
fetch) :;;
rev-parse) echo "$MOCK_SHA";;
reset) echo "reset $3" >> "$MOCK_ROOT/calls";;
*) exit 91;; esac`,
      curl: `case "$*" in
*SHA256SUMS*) (cd "$(dirname "${'${!#}'}")"; sha256sum zilet-image.tar.gz) > "${'${!#}'}";;
*zilet-image.tar.gz*) printf 'test image' > "${'${!#}'}";;
*api/health*) printf '{"status":"ok","release":"%s"}' "$MOCK_SHA";;
*) exit 92;; esac`,
      docker: `case "$1 $2" in
'load --input') echo load >> "$MOCK_ROOT/calls";;
'image inspect') echo "$MOCK_SHA";;
'image ls') :;;
compose*)
  if [[ "$*" == *'up -d'* ]]; then
    echo "start $(cat "$MOCK_ROOT/.deploy/release.env" | tail -1)" >> "$MOCK_ROOT/calls"
    if [[ "$MOCK_FAIL" == 1 ]] && grep -q "$MOCK_SHA" "$MOCK_ROOT/.deploy/release.env"; then exit 1; fi
  fi;;
*) exit 93;; esac`,
    };
    for (const [name, command] of Object.entries(commands))
      await writeFile(join(bin, name), '#!/bin/bash\nset -eu\n' + command + '\n', {
        mode: 0o755,
      });
    const run = (ready: string, fail: string) =>
      spawnSync('bash', [join(root, 'deploy.sh')], {
        cwd: root,
        encoding: 'utf8',
        env: {
          ...process.env,
          PATH: bin + ':' + process.env.PATH,
          MOCK_ROOT: root,
          MOCK_SHA: sha,
          MOCK_READY: ready,
          MOCK_FAIL: fail,
        },
      });
    assert.equal(run(previous, '0').status, 0);
    await assert.rejects(readFile(join(root, 'calls')));
    const failed = run(sha, '1');
    assert.equal(failed.status, 1, failed.stdout + failed.stderr);
    assert.equal(await readFile(join(state, 'release.env'), 'utf8'), oldEnv);
    assert.equal((await readFile(join(state, 'current'), 'utf8')).trim(), previous);
    assert.equal((await readFile(join(state, 'failed'), 'utf8')).trim(), sha);
    const calls = await readFile(join(root, 'calls'), 'utf8');
    assert.ok(calls.indexOf('backup') < calls.indexOf('reset ' + sha));
    assert.ok(calls.includes('reset ' + previous));
    assert.ok(calls.includes('start RELEASE_SHA=' + previous));
    await rm(join(state, 'failed'));
    const success = run(sha, '0');
    assert.equal(success.status, 0, success.stdout + success.stderr);
    assert.equal((await readFile(join(state, 'current'), 'utf8')).trim(), sha);
    assert.equal((await readFile(join(state, 'previous'), 'utf8')).trim(), previous);
    await assert.rejects(readFile(join(state, 'failed')));
    const before = await readFile(join(root, 'calls'), 'utf8');
    assert.equal(run(sha, '0').status, 0);
    assert.equal(await readFile(join(root, 'calls'), 'utf8'), before);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
