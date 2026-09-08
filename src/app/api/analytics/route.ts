import { z } from 'zod';
import { assertOrigin, jsonBody } from '@/lib/security';
import { getPost } from '@/lib/data';

const trackedPath = /^\/$|^\/(tekst|rubrika|autor)\/[a-z0-9-]+$|^\/(autori|o-casopisu)$/;

export async function POST(req: Request) {
  if (!process.env.UMAMI_URL || !process.env.UMAMI_WEBSITE_ID)
    return new Response(null, { status: 204 });

  try {
    assertOrigin(req);
    const input = z
      .object({
        path: z.string().max(200).regex(trackedPath),
        referrer: z.string().max(300),
        screen: z.string().regex(/^\d{1,5}x\d{1,5}$/),
        language: z.string().min(2).max(35),
        cache: z.string().max(1000),
      })
      .strict()
      .parse(await jsonBody(req, 3000));
    let referrer = '';
    try {
      if (input.referrer) referrer = new URL(input.referrer).origin;
    } catch {
      // Referrers are optional and only their origin is retained.
    }
    let title = 'Žilet';
    if (input.path.startsWith('/tekst/')) {
      const post = await getPost(input.path.slice(7));
      if (!post) return new Response(null, { status: 204 });
      title = post.title;
    }
    const appUrl = new URL(process.env.APP_URL || req.url);
    const realIp = process.env.TRUST_PROXY === 'true' ? req.headers.get('x-real-ip') : null;
    const upstream = await fetch(`${process.env.UMAMI_URL.replace(/\/$/, '')}/api/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': req.headers.get('user-agent') || '',
        ...(realIp ? { 'x-forwarded-for': realIp } : {}),
        ...(input.cache ? { 'x-umami-cache': input.cache } : {}),
      },
      body: JSON.stringify({
        type: 'event',
        payload: {
          website: process.env.UMAMI_WEBSITE_ID,
          hostname: appUrl.hostname,
          screen: input.screen,
          language: input.language,
          url: input.path,
          title,
          referrer,
        },
      }),
      signal: AbortSignal.timeout(4000),
      cache: 'no-store',
    });
    if (!upstream.ok) return new Response(null, { status: 204 });
    const result = (await upstream.json()) as { cache?: unknown };
    return Response.json(
      { cache: typeof result.cache === 'string' ? result.cache : undefined },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    /* Analytics must never interfere with reading; no private payload logging. */
  }
  return new Response(null, { status: 204 });
}
