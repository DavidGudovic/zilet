import { z } from 'zod';
import type { RichMark, RichNode } from './content';
// Kept apart from content.ts, which client components import: zod would otherwise ship to
// every reader's browser.
const markSchema: z.ZodType<RichMark> = z
  .object({
    type: z.enum(['bold', 'italic', 'link']),
    attrs: z.object({ href: z.string().max(2000) }).optional(),
  })
  .strict();
const nodeSchema: z.ZodType<RichNode> = z.lazy(() =>
  z
    .object({
      type: z.enum([
        'doc',
        'paragraph',
        'text',
        'heading',
        'blockquote',
        'hardBreak',
        'bulletList',
        'orderedList',
        'listItem',
      ]),
      text: z.string().optional(),
      attrs: z
        .object({
          level: z.number().int().min(2).max(3).optional(),
          href: z.string().optional(),
          start: z.number().int().min(1).max(1000000).optional(),
        })
        .strict()
        .optional(),
      marks: z.array(markSchema).max(10).optional(),
      content: z.array(nodeSchema).max(2000).optional(),
    })
    .strict(),
);
export const bodySchema = z.discriminatedUnion('kind', [
  z
    .object({
      kind: z.literal('poem'),
      text: z.string().max(100000),
      align: z.enum(['left', 'center']),
      emphasis: z
        .array(
          z.object({
            from: z.number().int().min(0),
            to: z.number().int().min(1),
            style: z.enum(['italic', 'bold']),
          }),
        )
        .max(500),
    })
    .superRefine((v, c) => {
      for (const m of v.emphasis)
        if (m.to > v.text.length || m.from >= m.to)
          c.addIssue({ code: 'custom', message: 'Neispravan opseg naglašavanja.' });
    }),
  z.object({ kind: z.literal('prose'), doc: nodeSchema }),
  z.object({ kind: z.literal('gallery'), doc: nodeSchema }),
]);
export type Body = z.infer<typeof bodySchema>;
