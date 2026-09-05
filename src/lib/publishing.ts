import { z } from 'zod';
import { bodySchema, bodyText, fold, rubrics } from './content';
export const revisionSchema = z
  .object({
    title: z.string().trim().min(1).max(240),
    intro: z.string().max(2000),
    authorId: z.string().min(1).max(100),
    type: z.enum(['poem', 'prose', 'gallery']),
    body: bodySchema,
    rubrics: z
      .array(z.string().refine((s) => rubrics.some(([key]) => key === s)))
      .min(1)
      .max(4),
    media: z
      .array(
        z.object({
          id: z.string().max(100),
          alt: z.string().max(500),
          caption: z.string().max(1000),
          credit: z.string().max(500),
          placement: z.enum(['above', 'beside', 'below']),
          focalX: z.number().min(0).max(100),
          focalY: z.number().min(0).max(100),
        }),
      )
      .max(20),
    commentsOpen: z.boolean(),
  })
  .strict()
  .refine((v) => v.type === v.body.kind, { message: 'Vrsta teksta i sadržaj moraju odgovarati.' });
export const slugify = (s: string) =>
  fold(s)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90) || 'tekst';
export const searchText = (content: z.infer<typeof revisionSchema>, author: string) =>
  fold(`Žilet ${content.title} ${author} ${content.intro} ${bodyText(content.body)}`);
