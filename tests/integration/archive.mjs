import postgres from 'postgres';
import assert from 'node:assert/strict';
import { readFile, writeFile, unlink } from 'node:fs/promises';
const db = postgres(process.env.DATABASE_URL, { max: 1 });
const base = process.env.APP_URL || 'http://localhost:3000';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname), 'Local test only');
const record = '/tmp/zilet-archive-fixtures.json';
try {
  if (process.argv.includes('--cleanup')) {
    const { prefix, choices } = JSON.parse(await readFile(record, 'utf8'));
    await db.begin(async (tx) => {
      await tx`DELETE FROM placements WHERE post_id LIKE ${prefix + '%'}`;
      await tx`DELETE FROM posts WHERE id LIKE ${prefix + '%'}`;
      await tx`DELETE FROM authors WHERE id=${prefix}`;
      for (const p of choices)
        await tx`INSERT INTO placements (slot,post_id) VALUES (${p.slot},${p.post_id}) ON CONFLICT (slot) DO UPDATE SET post_id=excluded.post_id`;
    });
    await unlink(record);
    console.log('Removed only archive-check fixtures; restored editorial selections.');
  } else {
    const prefix = `archive-check-${Date.now()}`;
    const choices = await db`SELECT * FROM placements`;
    await writeFile(record, JSON.stringify({ prefix, choices }));
    await db.begin(async (tx) => {
      await tx`INSERT INTO authors (id,slug,name) VALUES (${prefix},${prefix},'Razvojna provjera arhive')`;
      for (let i = 0; i < 28; i++) {
        const id = `${prefix}-${i}`,
          rev = `${id}-r`,
          type = i === 27 ? 'gallery' : i % 3 === 0 ? 'poem' : 'prose';
        const body =
          type === 'poem'
            ? {
                kind: 'poem',
                text: 'Razvojni red, samo za provjeru.\n\n  Drugi red sa razmacima.',
                align: 'left',
                emphasis: [],
              }
            : {
                kind: type,
                doc: {
                  type: 'doc',
                  content: [
                    {
                      type: 'paragraph',
                      content: [
                        {
                          type: 'text',
                          text: 'Ovo je označeni razvojni primjer za provjeru rasporeda i paginacije.',
                        },
                      ],
                    },
                  ],
                },
              };
        const content = {
          title: `Razvojna provjera ${String(i).padStart(2, '0')}`,
          intro: '',
          authorId: prefix,
          type,
          body,
          rubrics: [type === 'poem' ? 'poezija' : type === 'gallery' ? 'slikarstvo' : 'eseji'],
          media:
            type === 'gallery'
              ? [
                  {
                    id: '6a5cd1e0-8425-40c2-9555-98d0c5000001',
                    alt: 'Razvojna ilustracija sobe',
                    caption: 'Razvojni primjer — Strandgade, Sunshine',
                    credit: 'Vilhelm Hammershøi · CMA · CC0',
                    placement: 'below',
                    focalX: 50,
                    focalY: 50,
                  },
                ]
              : [],
          commentsOpen: true,
        };
        await tx`INSERT INTO posts (id,slug,status,created_by,published_at,search_text,version) VALUES (${id},${id},'published','fixture-system',${new Date(Date.UTC(2026, 0, i + 1))},'razvojna provjera arhive',1)`;
        await tx`INSERT INTO revisions (id,post_id,content,created_by) VALUES (${rev},${id},${tx.json(content)},'fixture-system')`;
        await tx`UPDATE posts SET published_revision_id=${rev}, draft_revision_id=${rev} WHERE id=${id}`;
      }
      await tx`INSERT INTO placements (slot,post_id) VALUES ('poem',${prefix + '-0'}),('art',${prefix + '-27'}) ON CONFLICT (slot) DO UPDATE SET post_id=excluded.post_id`;
    });
    const front = await (await fetch(base)).text();
    assert.ok(
      front.includes('Razvojna provjera 00'),
      'Old explicit poetry selection survives recent-24 cutoff',
    );
    assert.ok(front.includes('front-art-feature'));
    assert.ok(front.includes('reading-groups'));
    const archive = await (await fetch(base + '/rubrika/eseji?page=2')).text();
    assert.ok(archive.includes('Razvojna provjera'));
    assert.ok(archive.includes('page=1'));
    const search = await (await fetch(base + '/pretraga?q=Djurovic')).text();
    assert.ok(search.includes('ŠTA JE PRAVA POEZIJA'));
    console.log(
      'PASS older homepage placements, art/group composition, archive page 2 and diacritic-free author search. Fixtures remain for browser inspection; run with --cleanup.',
    );
  }
} finally {
  await db.end();
}
