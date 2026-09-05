import { z } from 'zod';
import { assertOrigin, jsonBody } from '@/lib/security';
import { getPost } from '@/lib/data';
export async function POST(req: Request) {
  if (!process.env.UMAMI_URL || !process.env.UMAMI_WEBSITE_ID)
    return new Response(null, { status: 204 });
  try {
    assertOrigin(req);
    const input = z
      .object({
        path: z
          .string()
          .max(200)
          .regex(/^\/$|^\/(tekst|rubrika|autor)\/[a-z0-9-]+$|^\/(autori|o-casopisu)$/),
        referrer: z.string().max(300),
        screen: z.string().regex(/^\d{1,5}x\d{1,5}$/),
      })
      .strict()
      .parse(await jsonBody(req, 2000));
    let referrer = '';
    try {
      if (input.referrer) referrer = new URL(input.referrer).origin;
    } catch {}
    let title = 'Žilet';
    if (input.path.startsWith('/tekst/')) {
      const p = await getPost(input.path.split('/')[2]);
      if (!p) return new Response(null, { status: 204 });
      title = p.title;
    }
    await fetch(`${process.env.UMAMI_URL.replace(/\/$/, '')}/api/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': req.headers.get('user-agent') || '',
        'x-forwarded-for':
          process.env.TRUST_PROXY === 'true' ? req.headers.get('x-real-ip') || '' : '',
      },
      body: JSON.stringify({
        type: 'event',
        payload: {
          website: process.env.UMAMI_WEBSITE_ID,
          hostname: new URL(process.env.APP_URL!).hostname,
          screen: input.screen,
          language: 'cnr-Latn',
          url: input.path,
          title,
          referrer,
        },
      }),
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    /* Analytics must never interfere with reading; no private payload logging. */
  }
  return new Response(null, { status: 204 });
}
