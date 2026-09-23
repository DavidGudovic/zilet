import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getSchema } from '@tiptap/core';
import { EditorState, TextSelection, AllSelection, type Transaction } from '@tiptap/pm/state';
import type { Slice } from '@tiptap/pm/model';
import type { EditorView } from '@tiptap/pm/view';
import { docVerse, pastedVerse, verseDoc, type Verse } from '../src/lib/verse-edit';
import { verseClipboard, verseOptions, verseSlice } from '../src/lib/editor-tiptap';
import { bodySchema } from '../src/lib/body-schema';
import { canonicalRichNode, type RichNode } from '../src/lib/content';

const schema = getSchema(verseOptions.extensions!);
const exact = '  Śutnja\n\nСоба\tса прозором\n\\ ~\u200b\n';
const stanzas = '\n\n\na\n\n\n\nb';
// Canonical emphasis: bold before italic on the same words, ranges joined over line breaks.
const samples: Verse[] = [
  {
    text: exact,
    emphasis: [
      { from: 2, to: 8, style: 'bold' },
      { from: 2, to: 8, style: 'italic' },
      { from: 18, to: 28, style: 'italic' },
    ],
  },
  {
    text: stanzas,
    emphasis: [
      { from: 3, to: 9, style: 'italic' },
      { from: 8, to: 9, style: 'bold' },
    ],
  },
  ...['', '\n', ' ', '\t\u200b\u200c\ufeff', 'a\r\nb', '\n\n\n', 'Ćirilica i латиница\n'].map(
    (text) => ({
      text,
      emphasis: [],
    }),
  ),
];
const styleAt = ({ text, emphasis }: Verse) =>
  Array.from({ length: text.length }, (_, i) =>
    text[i] === '\n'
      ? ''
      : (['bold', 'italic'] as const)
          .filter((s) => emphasis.some((m) => m.style === s && m.from <= i && i < m.to))
          .join(),
  );
const inEditor = (verse: Verse) => schema.nodeFromJSON(verseDoc(verse));
const verseOf = (state: EditorState) => docVerse(state.doc.toJSON() as RichNode);

test('verse and the editor document convert both ways without changing a character', () => {
  assert.equal(samples[0].text.slice(18, 28), 'прозором\n\\');
  for (const verse of samples) {
    const doc = verseDoc(verse);
    assert.equal(doc.content?.length, verse.text.split('\n').length);
    assert.deepEqual(docVerse(doc), verse);
    // Tiptap's schema keeps whitespace and invisible characters, and its JSON matches ours,
    // so reopening a poem never looks like an edit.
    const json = canonicalRichNode(inEditor(verse).toJSON() as RichNode);
    assert.deepEqual(json, doc);
    assert.deepEqual(docVerse(json), verse);
    assert.ok(bodySchema.safeParse({ kind: 'poem', align: 'left', ...verse }).success);
  }
  assert.deepEqual(verseDoc({ text: stanzas, emphasis: [] }).content?.slice(0, 4), [
    { type: 'paragraph' },
    { type: 'paragraph' },
    { type: 'paragraph' },
    { type: 'paragraph', content: [{ type: 'text', text: 'a' }] },
  ]);
});

test('older emphasis keeps its look when reopened, and long italic stays one range', () => {
  const older: Verse = {
    text: exact,
    emphasis: [
      { from: 0, to: 12, style: 'italic' },
      { from: 4, to: 20, style: 'italic' },
      { from: 7, to: 30, style: 'bold' },
    ],
  };
  const reopened = docVerse(verseDoc(older));
  assert.equal(reopened.text, exact);
  assert.deepEqual(styleAt(reopened), styleAt(older));
  const long = Array.from({ length: 700 }, (_, i) => (i % 5 === 2 ? '' : `stih ${i}`)).join('\n');
  assert.deepEqual(
    docVerse(verseDoc({ text: long, emphasis: [{ from: 0, to: long.length, style: 'italic' }] }))
      .emphasis,
    [{ from: 0, to: long.length, style: 'italic' }],
  );
});

test('pasted text keeps its lines exactly; formatting comes along only when the words match', () => {
  assert.deepEqual(pastedVerse('a\r\n\r\n\r\n  b\rc'), { text: 'a\n\n\n  b\nc', emphasis: [] });
  const word: Verse = {
    text: 'Prvi stih\u00a0Drugi  stih',
    emphasis: [
      { from: 5, to: 9, style: 'italic' },
      { from: 0, to: 9, style: 'bold' },
    ],
  };
  assert.deepEqual(pastedVerse('Prvi stih\r\n\r\n\tDrugi stih\r\n', word), {
    text: 'Prvi stih\n\n\tDrugi stih\n',
    emphasis: [
      { from: 0, to: 9, style: 'bold' },
      { from: 5, to: 9, style: 'italic' },
    ],
  });
  const facebook = { ...word, text: word.text + ' Prikaži više' };
  assert.deepEqual(pastedVerse('Prvi stih\n\nDrugi stih', facebook), {
    text: 'Prvi stih\n\nDrugi stih',
    emphasis: [],
  });
});

function paste(state: EditorState, plain: string, formatted?: Verse) {
  let next = state;
  const view = {
    state,
    dispatch: (tr: Transaction) => (next = state.apply(tr)),
  } as unknown as EditorView;
  const event = {
    clipboardData: { getData: (type: string) => (type === 'text/plain' ? plain : '') },
  } as unknown as ClipboardEvent;
  const slice: Slice = formatted
    ? verseSlice(schema, formatted)
    : verseClipboard.clipboardTextParser!(plain, state.selection.$from, false, view);
  assert.equal(verseClipboard.handlePaste!(view, event, slice), true);
  return next;
}

test('pasting into the verse editor inserts every line and blank line as copied', () => {
  const doc = inEditor({ text: 'xy', emphasis: [] });
  const cursor = EditorState.create({ schema, doc, selection: TextSelection.create(doc, 2) });
  assert.equal(verseOf(paste(cursor, 'a\n\n\nb')).text, 'xa\n\n\nby');
  const everything = EditorState.create({ schema, doc, selection: new AllSelection(doc) });
  assert.deepEqual(verseOf(paste(everything, exact)), { text: exact, emphasis: [] });
  assert.deepEqual(verseOf(paste(everything, stanzas)), { text: stanzas, emphasis: [] });
  const lines = inEditor({ text: 'ab\ncd', emphasis: [] });
  const across = EditorState.create({
    schema,
    doc: lines,
    selection: TextSelection.create(lines, 2, 6),
  });
  assert.equal(verseOf(paste(across, 'X\n\nY')).text, 'aX\n\nYd');
  const italic = inEditor({ text: 'stih', emphasis: [{ from: 0, to: 4, style: 'italic' }] });
  const inside = EditorState.create({
    schema,
    doc: italic,
    selection: TextSelection.create(italic, 3),
  });
  assert.deepEqual(verseOf(paste(inside, 'X')), {
    text: 'stXih',
    emphasis: [{ from: 0, to: 5, style: 'italic' }],
  });
  const word: Verse = { text: 'Prvi stih Drugi', emphasis: [{ from: 5, to: 9, style: 'bold' }] };
  assert.deepEqual(verseOf(paste(everything, '  Prvi stih\n\n Drugi', word)), {
    text: '  Prvi stih\n\n Drugi',
    emphasis: [{ from: 7, to: 11, style: 'bold' }],
  });
});

test('copying from the verse editor gives the lines as written', () => {
  const doc = inEditor(samples[0]);
  const copy = (from: number, to: number) =>
    verseClipboard.clipboardTextSerializer!(doc.slice(from, to), {} as EditorView);
  assert.equal(copy(0, doc.content.size), exact);
  assert.equal(copy(4, 16), exact.slice(3, 13));
});
