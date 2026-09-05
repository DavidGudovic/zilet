import { sql } from '@/db';
export async function GET() {
  try {
    await sql`select 1`;
    return Response.json(
      { status: 'ok', release: process.env.RELEASE_SHA || 'local' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return Response.json({ status: 'unavailable' }, { status: 503 });
  }
}
