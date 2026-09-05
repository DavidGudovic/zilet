import { readFile } from 'node:fs/promises';
export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (
    process.env.NODE_ENV === 'production' ||
    !/^literata-(latin|latin-ext|cyrillic|cyrillic-ext)-wght-(normal|italic)\.woff2$/.test(name)
  )
    return new Response(null, { status: 404 });
  try {
    return new Response(new Uint8Array(await readFile(`fixtures/fonts/${name}`)), {
      headers: { 'Content-Type': 'font/woff2' },
    });
  } catch {
    return new Response(null, { status: 404 });
  }
}
