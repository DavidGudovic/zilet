import { test } from 'node:test';
import assert from 'node:assert/strict';
import poem from '../fixtures/poem.json';
import { bodySchema, bodyText, fold, safeReturn } from '../src/lib/content';
test('poetry preserves supplied zero-width characters, blank lines and final authored line', () => {
  const body = bodySchema.parse({ kind: 'poem', text: poem.text, emphasis: [], align: 'left' });
  assert.equal(bodyText(JSON.parse(JSON.stringify(body))), poem.text);
  assert.ok(poem.text.includes('rana, besprizorni'));
  assert.equal(poem.text.split('\n').filter(Boolean).length, 15);
});
test('whitespace and emphasis survive serialization without changing canonical text', () => {
  const text = '  Śuma\tŹora\n\n\nжена\n   kraj  ';
  const body = bodySchema.parse({
    kind: 'poem',
    text,
    align: 'left',
    emphasis: [{ from: 2, to: 6, style: 'italic' }],
  });
  assert.equal(bodyText(JSON.parse(JSON.stringify(body))), text);
  assert.throws(() =>
    bodySchema.parse({ ...body, emphasis: [{ from: 0, to: 999, style: 'italic' }] }),
  );
});
test('search folds diacritics without changing display text', () =>
  assert.equal(fold('Žilet Đurović Ś Ź'), 'zilet djurovic s z'));
test('account return paths stay on this site', () => {
  assert.equal(safeReturn('//evil.test'), '/');
  assert.equal(safeReturn('/tekst/pjesma'), '/tekst/pjesma');
});
