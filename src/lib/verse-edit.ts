import type { Body, RichNode } from './content';
type Poem = Extract<Body, { kind: 'poem' }>;
export type Verse = Pick<Poem, 'text' | 'emphasis'>;
type Emphasis = Verse['emphasis'];
const styles = ['bold', 'italic'] as const;

// Text nodes for text[from, to), split wherever bold or italic starts or ends.
export function emphasisRuns({ text, emphasis }: Verse, from = 0, to = text.length): RichNode[] {
  const cuts = [...new Set([from, to, ...emphasis.flatMap((m) => [m.from, m.to])])]
    .filter((at) => at >= from && at <= to)
    .sort((a, b) => a - b);
  return cuts.slice(0, -1).map((start, i) => {
    const end = cuts[i + 1];
    const marks = styles
      .filter((style) => emphasis.some((m) => m.style === style && m.from <= start && m.to >= end))
      .map((type) => ({ type }));
    return { type: 'text', text: text.slice(start, end), ...(marks.length ? { marks } : {}) };
  });
}

// In the verse editor every line is a paragraph and an empty paragraph is a blank line,
// so the editor holds exactly the stored text: spaces, tabs and invisible characters included.
export function verseDoc(verse: Verse): RichNode {
  let start = 0;
  return {
    type: 'doc',
    content: verse.text.split('\n').map((line) => {
      const content = emphasisRuns(verse, start, start + line.length);
      start += line.length + 1;
      return content.length ? { type: 'paragraph', content } : { type: 'paragraph' };
    }),
  };
}

export function docVerse(doc: RichNode): Verse {
  let text = '';
  const emphasis: Emphasis = [];
  (doc.content || []).forEach((line, i) => {
    if (i) text += '\n';
    for (const run of line.content || []) {
      if (!run.text) continue;
      const from = text.length;
      text += run.text;
      for (const style of styles) {
        if (!run.marks?.some((m) => m.type === style)) continue;
        const previous = emphasis.findLast((m) => m.style === style);
        // Emphasis that goes on over line breaks stays one range, as a selection stored it,
        // so a long italic poem stays within the limit on ranges.
        if (previous && /^\n*$/.test(text.slice(previous.to, from))) previous.to = text.length;
        else emphasis.push({ from, to: text.length, style });
      }
    }
  });
  return { text, emphasis };
}

// Pasted verse keeps the lines, spaces and letters of the plain-text copy exactly. Bold and
// italic from the formatted copy (Word, a web page, this editor) come along only when it
// shows the same visible characters in the same order; its own spacing is never used.
export function pastedVerse(plain: string, rich?: Verse): Verse {
  const text = plain.replace(/\r\n?/g, '\n');
  const shown = (s: string) => Array.from(s.matchAll(/\S/g), (m) => m.index);
  const at = shown(text);
  const source = rich ? shown(rich.text) : [];
  if (
    !rich?.emphasis.length ||
    source.length !== at.length ||
    at.some((i, n) => text[i] !== rich.text[source[n]])
  )
    return { text, emphasis: [] };
  const emphasis: Emphasis = [];
  for (const style of styles) {
    const marked = new Uint8Array(rich.text.length);
    for (const m of rich.emphasis) if (m.style === style) marked.fill(1, m.from, m.to);
    let open: Emphasis[number] | undefined;
    at.forEach((i, n) => {
      if (!marked[source[n]]) open = undefined;
      else if (open) open.to = i + 1;
      else emphasis.push((open = { from: i, to: i + 1, style }));
    });
  }
  return { text, emphasis };
}
