import { readFile } from 'node:fs/promises';
export async function GET(req: Request) {
  if (process.env.NODE_ENV === 'production') return new Response(null, { status: 404 });
  return new Response(
    await readFile(
      new URL(req.url).searchParams.get('kind') === 'portrait'
        ? 'fixtures/portrait.jpg'
        : 'fixtures/strandgade.jpg',
    ),
    { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store' } },
  );
}
