// Owner-only CLI. No public endpoint can attach a portrait or edit a biography.
import { readFile } from 'node:fs/promises';
import { db, sql } from '../src/db';
import { authors, media, user } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { processImage } from '../src/lib/media-store';
const args = process.argv.slice(2);
const value = (key: string) => (args.includes(key) ? args[args.indexOf(key) + 1] : undefined);
try {
  const slug = value('--slug');
  if (!slug)
    throw new Error(
      'Koristite --slug AUTOR [--bio-file FAJL] [--portrait-file FAJL --alt OPIS --credit POTPIS --actor-email ADRESA] [--remove-portrait].',
    );
  const [author] = await db.select().from(authors).where(eq(authors.slug, slug));
  if (!author) throw new Error('Autor nije pronađen.');
  const change: Partial<typeof authors.$inferInsert> = {};
  const bio = value('--bio-file');
  if (bio) {
    change.bio = (await readFile(bio, 'utf8')).trim();
    if (change.bio.length > 3000) throw new Error('Biografija može imati najviše 3000 znakova.');
  }
  const portrait = value('--portrait-file');
  if (portrait) {
    const alt = value('--alt'),
      credit = value('--credit'),
      email = value('--actor-email');
    if (!alt || !credit || !email || alt.length > 500 || credit.length > 500)
      throw new Error('Portret zahtijeva opis, izvor/prava i adresu vlasnika naloga.');
    const [actor] = await db.select().from(user).where(eq(user.email, email));
    if (!actor || actor.suspended || !['editor', 'maintainer'].includes(actor.role))
      throw new Error('Potreban je urednički nalog za evidenciju unosa.');
    const id = crypto.randomUUID();
    const stored = await processImage(await readFile(portrait), id);
    await db
      .insert(media)
      .values({ id, ...stored, filename: 'Odobreni portret', alt, credit, createdBy: actor.id });
    change.portraitId = id;
  }
  if (args.includes('--remove-portrait')) change.portraitId = null;
  if (!Object.keys(change).length) throw new Error('Nijedna izmjena nije navedena.');
  await db.update(authors).set(change).where(eq(authors.id, author.id));
  console.log('Odobreni podaci autora su sačuvani.');
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await sql.end();
}
