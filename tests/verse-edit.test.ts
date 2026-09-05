import { test } from 'node:test';
import assert from 'node:assert/strict';
import { remapEmphasis } from '../src/lib/verse-edit';
test('emphasis tracks a prefix insertion and remains exact on an unchanged poem', () => {
  const marks = [{ from: 2, to: 5, style: 'italic' as const }];
  assert.deepEqual(remapEmphasis('  abc', '  abc', marks), marks);
  assert.deepEqual(remapEmphasis('  abc', 'x  abc', marks), [{ from: 3, to: 6, style: 'italic' }]);
});
test('removing marked text drops only the now-empty mark', () => {
  assert.deepEqual(remapEmphasis('  abc', '  ', [{ from: 2, to: 5, style: 'bold' }]), []);
});
