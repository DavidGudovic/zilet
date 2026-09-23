import type { Body, RichNode } from './content';
import { emphasisRuns } from './verse-edit';
type Kind = Body['kind'];
type Poem = Extract<Body, { kind: 'poem' }>;
type Style = Poem['emphasis'][number]['style'];

// The rubric decides how a work is written and shown: verse keeps authored lines,
// everything else is a formatted text. The homepage also groups works by this kind.
export const kindForRubric = (rubric: string): Kind =>
  rubric === 'poezija' ? 'poem' : rubric === 'slikarstvo' ? 'gallery' : 'prose';

const styles = (marks: RichNode['marks']): Style[] =>
  (['bold', 'italic'] as const).filter((style) => marks?.some((m) => m.type === style));

// Verse → text: blank lines separate paragraphs and single line breaks stay line breaks,
// so the words and their bold/italic survive exactly.
function verseToDoc(poem: Poem): RichNode {
  const { text } = poem;
  const blocks: [number, number][] = [];
  let start = 0;
  for (const gap of text.matchAll(/\n(?:[ \t\u00a0]*\n)+/g)) {
    blocks.push([start, gap.index]);
    start = gap.index + gap[0].length;
  }
  blocks.push([start, text.length]);
  const paragraphs = blocks.map(([from, to]): RichNode => {
    const content: RichNode[] = [];
    let line = from;
    for (const part of text.slice(from, to).split('\n')) {
      if (line > from) content.push({ type: 'hardBreak' });
      if (part) content.push(...emphasisRuns(poem, line, line + part.length));
      line += part.length + 1;
    }
    return content.length ? { type: 'paragraph', content } : { type: 'paragraph' };
  });
  const written = paragraphs.filter((p) => p.content);
  return { type: 'doc', content: written.length ? written : [{ type: 'paragraph' }] };
}

// Text → verse: bold and italic survive; subheadings, quotes, lists and links become plain lines.
function docToVerse(doc: RichNode): { body: Poem; lossy: boolean } {
  let text = '';
  let lossy = false;
  const emphasis: Poem['emphasis'] = [];
  const blocks = ['doc', 'blockquote', 'bulletList', 'orderedList', 'listItem'];
  const walk = (node: RichNode) => {
    if (['heading', 'blockquote', 'bulletList', 'orderedList'].includes(node.type)) lossy = true;
    if (node.type === 'text') {
      const from = text.length;
      text += node.text || '';
      if (node.marks?.some((m) => m.type === 'link')) lossy = true;
      for (const style of styles(node.marks)) {
        const previous = emphasis.findLast((m) => m.style === style);
        if (previous?.to === from) previous.to = text.length;
        else if (text.length > from) emphasis.push({ from, to: text.length, style });
      }
    } else if (node.type === 'hardBreak') text += '\n';
    else
      (node.content || []).forEach((child, i) => {
        if (i && blocks.includes(node.type)) text += '\n\n';
        walk(child);
      });
  };
  walk(doc);
  if (emphasis.length > 500) lossy = true;
  return {
    body: { kind: 'poem', text, align: 'left', emphasis: emphasis.slice(0, 500) },
    lossy,
  };
}

export function convertBody(body: Body, kind: Kind): { body: Body; lossy: boolean } {
  if (body.kind === kind) return { body, lossy: false };
  if (body.kind === 'poem') return { body: { kind, doc: verseToDoc(body) } as Body, lossy: false };
  if (kind === 'poem') return docToVerse(body.doc);
  return { body: { kind, doc: body.doc }, lossy: false };
}
