import { takeLimit, assertOrigin, failure } from '@/lib/security';
import { auth, mailConfigured } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';
const handlers = toNextJsHandler(auth);
export const GET = handlers.GET;
export async function POST(req: Request) {
  try {
    assertOrigin(req);
    const address =
      process.env.TRUST_PROXY === 'true' ? req.headers.get('x-real-ip') || 'direct' : 'direct';
    await takeLimit(`auth:${address}`, 50, 60);
  } catch (e) {
    return failure(e);
  }
  const path = new URL(req.url).pathname;
  if (
    !mailConfigured() &&
    ['request-password-reset', 'send-verification-email', 'sign-up/email'].some((p) =>
      path.endsWith(p),
    )
  )
    return Response.json(
      { message: 'Otvaranje naloga i obnova lozinke trenutno nijesu dostupni.' },
      { status: 503 },
    );
  const response = await handlers.POST(req);
  return response;
}
