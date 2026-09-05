import type { Body } from './content';
type Emphasis = Extract<Body, { kind: 'poem' }>['emphasis'];
export function remapEmphasis(before: string, after: string, marks: Emphasis): Emphasis {
  let start = 0;
  while (start < before.length && start < after.length && before[start] === after[start]) start++;
  let end = before.length,
    nextEnd = after.length;
  while (end > start && nextEnd > start && before[end - 1] === after[nextEnd - 1]) {
    end--;
    nextEnd--;
  }
  const delta = after.length - before.length;
  return marks
    .map((m) => ({
      ...m,
      from: m.from <= start ? m.from : m.from >= end ? m.from + delta : start,
      to: m.to <= start ? m.to : m.to >= end ? m.to + delta : nextEnd,
    }))
    .filter((m) => m.to > m.from && m.to <= after.length);
}
