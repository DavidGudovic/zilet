import { test } from 'node:test';
import assert from 'node:assert/strict';
import { revisionSchema } from '../src/lib/publishing';
import poem from '../fixtures/poem.json';
test('revision rejects an unknown rubric, missing author and unsafe media metadata', () => {
  const valid = {
    title: poem.title,
    intro: '',
    authorId: 'zoran',
    type: 'poem',
    body: { kind: 'poem', text: poem.text, emphasis: [], align: 'left' },
    rubrics: ['poezija'],
    media: [],
    commentsOpen: true,
  };
  assert.equal(revisionSchema.parse(valid).body.kind, 'poem');
  assert.throws(() => revisionSchema.parse({ ...valid, rubrics: ['unknown'] }));
  assert.throws(() => revisionSchema.parse({ ...valid, type: 'prose' }));
});

test('editorial notes are optional, bounded plain text and cannot carry a forged signature', () => {
  const content = {
    title: 'Djelo',
    intro: '',
    authorId: 'autor',
    type: 'poem',
    body: { kind: 'poem', text: '  Stih\n\nDrugi stih', emphasis: [], align: 'left' },
    rubrics: ['poezija'],
    media: [],
    commentsOpen: true,
  };
  assert.equal(revisionSchema.parse(content).editorialNote, undefined);
  const note = 'Moj komentar.\n\nDrugi pasus.';
  const parsed = revisionSchema.parse({ ...content, editorialNote: note });
  assert.equal(parsed.editorialNote, note);
  assert.deepEqual(parsed.body, content.body);
  assert.throws(() => revisionSchema.parse({ ...content, editorialNote: 'x'.repeat(4001) }));
  assert.throws(() => revisionSchema.parse({ ...content, editorialNoteBy: 'another-editor' }));
});
