import assert from 'node:assert/strict';
import { test } from 'node:test';
import { submissionBody, submissionSchema } from '../src/lib/submission-content';
import { bodyText } from '../src/lib/content';
import { screenSubmission } from '../src/lib/submission-screening';

test('submission conversion preserves exact whitespace and both scripts', () => {
  const text = '  Śutnja\n\n\nСоба\tса прозором\n\\ ~\u200b\n';
  for (const rubric of ['poezija', 'proza', 'slikarstvo'])
    assert.equal(bodyText(submissionBody(text, rubric)), text);
});
test('submission bounds and rubric/consent validation', () => {
  const valid = {
    title: 'Naslov',
    text: 'Rad',
    rubric: 'proza',
    consent: 'yes',
    alt: '',
    credit: '',
  };
  assert.ok(submissionSchema.safeParse(valid).success);
  for (const change of [
    { text: '  \n' },
    { text: 'a'.repeat(30001) },
    { rubric: 'citaoci' },
    { consent: 'no' },
    { rubric: 'invented' },
  ])
    assert.equal(submissionSchema.safeParse({ ...valid, ...change }).success, false);
});
test('Gemini screening blocks only recognized decisions and fails open to manual review', async () => {
  const fetchOriginal = globalThis.fetch,
    key = process.env.INTEL_KEY;
  try {
    delete process.env.INTEL_KEY;
    assert.equal((await screenSubmission('Naslov', 'tekst')).status, 'manual');
    process.env.INTEL_KEY = 'test-only-key';
    for (const [data, expected] of [
      [{ decision: 'allow', reason: 'none' }, 'passed'],
      [{ decision: 'block', reason: 'spam' }, 'blocked'],
      [{ decision: 'block', reason: 'language' }, 'blocked'],
      [{ decision: 'block', reason: 'abuse' }, 'blocked'],
      [{ decision: 'review', reason: 'language' }, 'manual'],
      [{ decision: 'block', reason: 'none' }, 'manual'],
      [{ decision: 'allow', reason: 'abuse' }, 'manual'],
      [{ decision: 'block', reason: 'invented' }, 'manual'],
    ] as const) {
      globalThis.fetch = async (url, init) => {
        assert.equal((init?.headers as Record<string, string>)['x-goog-api-key'], 'test-only-key');
        assert.equal(String(url).includes('test-only-key'), false);
        return Response.json({
          candidates: [{ content: { parts: [{ text: JSON.stringify(data) }] } }],
        });
      };
      assert.equal((await screenSubmission('Naslov', 'tekst')).status, expected);
    }
    for (const payload of [
      { promptFeedback: { blockReason: 'SAFETY' } },
      { candidates: [{ finishReason: 'SAFETY' }] },
      { candidates: [{ finishReason: 'PROHIBITED_CONTENT' }] },
    ]) {
      globalThis.fetch = async () => Response.json(payload);
      assert.equal((await screenSubmission('Naslov', 'tekst')).status, 'blocked');
    }
    globalThis.fetch = async () =>
      Response.json({
        candidates: [
          {
            finishReason: 'MAX_TOKENS',
            content: { parts: [{ text: '{"decision":"allow","reason":"none"}' }] },
          },
        ],
      });
    assert.equal((await screenSubmission('Naslov', 'tekst')).status, 'manual');
    globalThis.fetch = async () => new Response('', { status: 429 });
    assert.equal((await screenSubmission('Naslov', 'tekst')).status, 'manual');
    globalThis.fetch = async () => {
      throw new Error('network');
    };
    assert.equal((await screenSubmission('Naslov', 'tekst')).status, 'manual');
    globalThis.fetch = async () => Response.json({ candidates: [] });
    assert.equal((await screenSubmission('Naslov', 'tekst')).status, 'manual');
  } finally {
    globalThis.fetch = fetchOriginal;
    if (key === undefined) delete process.env.INTEL_KEY;
    else process.env.INTEL_KEY = key;
  }
});
