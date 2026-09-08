import { z } from 'zod';
import { rubrics, type Body } from './content';
export const submissionSchema = z
  .object({
    title: z.string().trim().min(1).max(240),
    text: z
      .string()
      .min(1)
      .max(30000)
      .refine((s) => s.trim().length > 0),
    rubric: z
      .string()
      .refine((s) => rubrics.some(([key]) => key === s && key !== 'price' && key !== 'citaoci')),
    consent: z.literal('yes'),
    alt: z.string().trim().max(500),
    credit: z.string().trim().max(500),
  })
  .strict();
export function submissionBody(text: string, rubric: string): Body {
  if (rubric === 'poezija') return { kind: 'poem', text, align: 'left', emphasis: [] };
  return {
    kind: rubric === 'slikarstvo' ? 'gallery' : 'prose',
    doc: {
      type: 'doc',
      content: text.split('\n\n').map((p) => ({
        type: 'paragraph',
        content: p
          .split('\n')
          .flatMap((line, i) => [
            ...(i ? [{ type: 'hardBreak' }] : []),
            ...(line ? [{ type: 'text', text: line }] : []),
          ]),
      })),
    },
  };
}
export const screeningReasons = {
  spam: 'sadržaj izgleda kao neželjena reklama ili ponovljene besmislene poruke',
  language: 'tekst nije pretežno na crnogorskom, srpskom, hrvatskom ili bosanskom jeziku',
  abuse: 'sadržaj sadrži prijetnje, uznemiravanje, govor mržnje ili pretjerano uvredljiv govor',
} as const;
