// Explicit, additive owner import; deterministic IDs make retries safe.
import { readFile } from 'node:fs/promises';
import { db, sql } from '../src/db';
import { authors, media, posts, revisions, placements, user } from '../src/db/schema';
import { eq, sql as query } from 'drizzle-orm';
import { processImage } from '../src/lib/media-store';
import { revisionSchema, searchText } from '../src/lib/publishing';
import bio from '../fixtures/savka-bio.json';
import slike from '../fixtures/savka-slike.json';
import nestajanja from '../fixtures/savka-nestajanja.json';
const artworkId = '46a41a87-903f-4e46-b24d-b32500000001';
const credit = 'Nadežda Petrović · Breze · Javno dobro / Wikimedia Commons';
try {
  if (!process.argv.includes('--confirm-publication'))
    throw new Error('Potrebna je potvrda --confirm-publication.');
  const origin = new URL(process.env.APP_URL || '');
  if (origin.origin !== 'https://zilet.me' && !['localhost', '127.0.0.1'].includes(origin.hostname))
    throw new Error('Neočekivana instalacija.');
  const [actor] = await db.select().from(user).where(eq(user.email, 'editor1@zilet.me'));
  if (!actor || actor.suspended || !['editor', 'maintainer'].includes(actor.role))
    throw new Error('Najprije kreirajte potvrđeni urednički nalog.');
  const [existingMedia] = await db.select().from(media).where(eq(media.id, artworkId));
  const stored = existingMedia
    ? null
    : await processImage(await readFile('fixtures/breze.jpg'), artworkId);
  await db.transaction(async (tx) => {
    await tx.execute(query`select pg_advisory_xact_lock(90261003)`);
    await tx
      .insert(authors)
      .values([
        { id: 'savka-paradjina', slug: bio.slug, name: bio.name, bio: bio.bio, isEditor: true },
        {
          id: 'editor-dva',
          slug: 'editor-dva',
          name: 'Editor Dva',
          bio: 'Član redakcije časopisa Žilet. Biografija je u pripremi.',
          isEditor: true,
        },
        {
          id: 'nadezda-petrovic',
          slug: 'nadezda-petrovic',
          name: 'Nadežda Petrović',
          bio: 'Nadežda Petrović (1873–1915), slikarka. Na Žiletu predstavljamo njeno djelo „Breze”, dostupno u javnom dobru putem Wikimedia Commons.',
        },
      ])
      .onConflictDoNothing();
    if (stored)
      await tx
        .insert(media)
        .values({
          id: artworkId,
          ...stored,
          filename: 'breze.jpg',
          alt: 'Vitka stabla breza, njihove krošnje i sunčani predio naslikani slobodnim potezima.',
          caption: 'Breze',
          credit,
          createdBy: actor.id,
        })
        .onConflictDoNothing();
    const entries = [
      ...[slike, nestajanja].map((p) => ({
        id: `savka-${p.title.toLowerCase()}`,
        slug: `${p.title.toLowerCase()}-savka-paradjina`,
        title: p.title,
        authorId: 'savka-paradjina',
        type: 'poem',
        body: p.body,
        rubrics: ['poezija'],
        intro: '',
        media: [],
        commentsOpen: true,
      })),
      {
        id: 'nadezda-breze',
        slug: 'breze-nadezda-petrovic',
        title: 'Breze',
        authorId: 'nadezda-petrovic',
        type: 'gallery',
        rubrics: ['slikarstvo'],
        intro: 'Svjetlost između stabala. Predah u boji uz slikarstvo Nadežde Petrović.',
        commentsOpen: true,
        body: {
          kind: 'gallery',
          doc: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: 'Nadežda Petrović — Breze. Djelo je u javnom dobru. Reprodukcija: ',
                  },
                  {
                    type: 'text',
                    text: 'Wikimedia Commons',
                    marks: [
                      {
                        type: 'link',
                        attrs: {
                          href: 'https://commons.wikimedia.org/wiki/File:Nade%C5%BEda_Petrovi%C4%87_-_Breze.jpg',
                        },
                      },
                    ],
                  },
                  { type: 'text', text: '. Izaberite sliku da je pogledate u cjelini.' },
                ],
              },
            ],
          },
        },
        media: [
          {
            id: artworkId,
            alt: 'Vitka stabla breza, njihove krošnje i sunčani predio naslikani slobodnim potezima.',
            caption: 'Breze',
            credit,
            placement: 'above',
            focalX: 50,
            focalY: 50,
          },
        ],
      },
    ];
    for (const { id, slug, ...raw } of entries) {
      const [existing] = await tx.select({ id: posts.id }).from(posts).where(eq(posts.id, id));
      if (existing) continue;
      const content = revisionSchema.parse(raw);
      const revisionId = crypto.randomUUID();
      const [author] = await tx.select().from(authors).where(eq(authors.id, content.authorId));
      await tx.insert(posts).values({
        id,
        slug,
        status: 'published',
        createdBy: actor.id,
        publishedAt: new Date(),
        version: 1,
        searchText: searchText(content, author.name),
      });
      await tx
        .insert(revisions)
        .values({ id: revisionId, postId: id, content, createdBy: actor.id });
      await tx
        .update(posts)
        .set({ draftRevisionId: revisionId, publishedRevisionId: revisionId })
        .where(eq(posts.id, id));
      // Curate only on first import. Retries never reset later editorial selections.
      const slot = id === 'savka-slike' ? 'poem' : id === 'nadezda-breze' ? 'art' : null;
      if (slot)
        await tx
          .insert(placements)
          .values({ slot, postId: id })
          .onConflictDoUpdate({ target: placements.slot, set: { postId: id } });
    }
  });
  console.log(
    'Odobreni uvoz je završen: dvije pjesme, Breze i uredničke biografije. Postojeći radovi su sačuvani.',
  );
} finally {
  await sql.end();
}
