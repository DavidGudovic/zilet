import { test } from 'node:test';
import assert from 'node:assert/strict';
import { remapEmphasis, toggleEmphasis } from '../src/lib/verse-edit';
test('emphasis tracks a prefix insertion and remains exact on an unchanged poem', () => {
  const marks = [{ from: 2, to: 5, style: 'italic' as const }];
  assert.deepEqual(remapEmphasis('  abc', '  abc', marks), marks);
  assert.deepEqual(remapEmphasis('  abc', 'x  abc', marks), [{ from: 3, to: 6, style: 'italic' }]);
});
test('removing marked text drops only the now-empty mark', () => {
  assert.deepEqual(remapEmphasis('  abc', '  ', [{ from: 2, to: 5, style: 'bold' }]), []);
});

test('formatting toggles a partial selection without changing neighbouring marks', () => {
  const marks = [
    { from: 0, to: 10, style: 'bold' as const },
    { from: 2, to: 8, style: 'italic' as const },
  ];
  assert.deepEqual(toggleEmphasis(marks, 3, 6, 'bold'), [
    { from: 0, to: 3, style: 'bold' },
    { from: 6, to: 10, style: 'bold' },
    { from: 2, to: 8, style: 'italic' },
  ]);
  assert.deepEqual(toggleEmphasis([], 0, 5, 'italic'), [{ from: 0, to: 5, style: 'italic' }]);
  assert.deepEqual(
    toggleEmphasis(
      [
        { from: 0, to: 2, style: 'bold' },
        { from: 2, to: 5, style: 'bold' },
      ],
      1,
      4,
      'bold',
    ),
    [
      { from: 0, to: 1, style: 'bold' },
      { from: 4, to: 5, style: 'bold' },
    ],
  );
});
