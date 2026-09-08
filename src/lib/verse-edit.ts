import type { Body } from './content';
type Emphasis = Extract<Body, { kind: 'poem' }>['emphasis'];
export function toggleEmphasis(
  marks: Emphasis,
  from: number,
  to: number,
  style: 'italic' | 'bold',
): Emphasis {
  if (from >= to) return marks;
  const ranges = marks.filter((m) => m.style === style).sort((a, b) => a.from - b.from);
  let covered = from;
  for (const range of ranges) {
    if (range.from > covered) break;
    covered = Math.max(covered, range.to);
  }
  const remaining = marks.flatMap((m) => {
    if (m.style !== style || m.to <= from || m.from >= to) return [m];
    return [
      ...(m.from < from ? [{ ...m, to: from }] : []),
      ...(m.to > to ? [{ ...m, from: to }] : []),
    ];
  });
  return covered >= to ? remaining : [...remaining, { from, to, style }];
}
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
