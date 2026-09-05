import { auth } from './auth';
import { db, sql } from '@/db';
import { user } from '@/db/schema';
import { eq } from 'drizzle-orm';
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function assertOrigin(request: Request) {
  const origin = request.headers.get('origin');
  if (origin !== new URL(process.env.APP_URL || 'http://localhost:3000').origin)
    throw new HttpError(403, 'Zahtjev nije dozvoljen.');
}
export async function requireUser(
  headers: Headers,
  role: 'reader' | 'editor' | 'maintainer' = 'reader',
) {
  const session = await auth.api.getSession({ headers });
  if (!session) throw new HttpError(401, 'Prijavite se.');
  const [u] = await db.select().from(user).where(eq(user.id, session.user.id));
  if (!u || u.suspended) throw new HttpError(403, 'Pristup nalogu je obustavljen.');
  if (!u.emailVerified) throw new HttpError(403, 'Potvrdite adresu e-pošte.');
  if (
    (role === 'editor' && !['editor', 'maintainer'].includes(u.role)) ||
    (role === 'maintainer' && u.role !== 'maintainer')
  )
    throw new HttpError(403, 'Nemate pristup redakciji.');
  return u;
}
export async function takeLimit(key: string, max: number, seconds: number) {
  const rows =
    await sql`INSERT INTO limits(key,count,reset_at) VALUES(${key},1,now()+${seconds}*interval '1 second') ON CONFLICT(key) DO UPDATE SET count=CASE WHEN limits.reset_at<now() THEN 1 ELSE limits.count+1 END, reset_at=CASE WHEN limits.reset_at<now() THEN now()+${seconds}*interval '1 second' ELSE limits.reset_at END RETURNING count`;
  if (rows[0].count > max)
    throw new HttpError(429, 'Previše pokušaja. Sačekajte malo pa pokušajte ponovo.');
}
export async function jsonBody(request: Request, max = 500000) {
  const length = Number(request.headers.get('content-length') || 0);
  if (length > max) throw new HttpError(413, 'Sadržaj je prevelik.');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, 'Nedostaje sadržaj.');
  let size = 0;
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel();
      throw new HttpError(413, 'Sadržaj je prevelik.');
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    throw new HttpError(400, 'Neispravan zahtjev.');
  }
}
export function failure(error: unknown) {
  if (error instanceof HttpError)
    return Response.json(
      { error: error.message },
      { status: error.status, headers: { 'Cache-Control': 'no-store' } },
    );
  if (error && typeof error === 'object' && 'issues' in error)
    return Response.json({ error: 'Provjerite unesene podatke.' }, { status: 400 });
  console.error('Zahtjev nije uspio', error instanceof Error ? error.message : 'unknown');
  return Response.json({ error: 'Promjena nije sačuvana. Pokušajte ponovo.' }, { status: 500 });
}
