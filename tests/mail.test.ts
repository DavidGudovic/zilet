import assert from 'node:assert/strict';
import { test } from 'node:test';
import { brandedMail } from '../src/lib/mail-template';

test('branded mail preserves plain text and escapes authored text and action attributes', () => {
  const text = 'Naslov: <img src=x onerror=alert(1)> & "Žilet"\n\nСоба\n  Śutnja';
  const action = { label: 'Otvori "prilog"', url: 'https://zilet.test/posalji?x=1&y=2' };
  const mail = brandedMail('Žilet — <odgovor>', text, 'https://zilet.test', action);
  assert.ok(mail.text.startsWith(text));
  assert.ok(mail.text.includes(action.url));
  assert.ok(mail.html.includes('&lt;img src=x onerror=alert(1)&gt;'));
  assert.ok(!mail.html.includes('<img src=x'));
  assert.ok(mail.html.includes('x=1&amp;y=2'));
  assert.ok(mail.html.includes('lang="cnr-Latn"'));
  assert.ok(mail.html.includes('alt="Žilet"'));
  assert.ok(mail.html.includes('max-width:560px'));
});
test('mail action only allows links to this installation', () => {
  for (const url of [
    'javascript:alert(1)',
    'https://foreign.test/',
    'https://zilet.test.evil.test/',
    'data:text/html,x',
  ])
    assert.throws(() =>
      brandedMail('Odgovor', 'Tekst', 'https://zilet.test', { label: 'Otvori', url }),
    );
  assert.throws(() => brandedMail('Odgovor', 'Tekst', 'javascript:alert(1)'));
  assert.doesNotThrow(() =>
    brandedMail('Lokalna poruka', 'Tekst', 'http://localhost:3000', {
      label: 'Otvori',
      url: 'http://localhost:3000/posalji',
    }),
  );
});
