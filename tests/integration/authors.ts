import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { db, sql } from '../../src/db';
import { insertOrResolveAuthor } from '../../src/lib/author-service';

assert.equal(process.env.ZILET_DISPOSABLE_TEST, 'true');
const base = process.env.APP_URL || 'http://localhost:3000';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
assert.ok(['localhost', '127.0.0.1'].includes(new URL(process.env.DATABASE_URL!).hostname));
const rollback = new Error('ROLLBACK_AUTHOR_FIXTURE');
let mergedBiography = '';
try {
  try {
    await sql.begin(async (tx) => {
      await tx`CREATE SCHEMA zilet_author_migration_test`;
      await tx`SET LOCAL search_path TO zilet_author_migration_test`;
      for (const name of [
        '001_initial.sql',
        '002_auth_issuer.sql',
        '003_editor_profiles.sql',
        '004_editorial_notes.sql',
        '005_reader_submissions.sql',
      ]) {
        await tx.unsafe(await readFile(`migrations/${name}`, 'utf8'));
      }
      await tx`INSERT INTO "user"(id,name,email) VALUES ('editor','Editor','fixture@zilet.test')`;
      await tx`INSERT INTO authors(id,slug,name,bio,is_editor) VALUES ('caps','herman-old','HERMAN HESE','Prva biografija.',true),('mixed','herman-hese','Herman Hese','Druga biografija.',false),('accent','herman-hése','Herman Hése',null,false)`;
      const firstBio = 'Prva biografija. ' + 'č'.repeat(1900);
      const secondBio = 'Druga biografija. ' + 'ś'.repeat(1900);
      await tx`UPDATE authors SET bio=${firstBio},portrait_id='portrait-fixture' WHERE id='caps'`;
      await tx`UPDATE authors SET bio=${secondBio} WHERE id='mixed'`;
      await tx`INSERT INTO media(id,filename,original_path,path,small_path,width,height,created_by,alt,credit) VALUES ('portrait-fixture','fixture.png','fixture/master.webp','fixture/display.webp','fixture/small.webp',640,800,'editor','Razvojni portret','Razvojna provjera')`;
      await tx`INSERT INTO posts(id,slug,created_by,version) VALUES ('post','test','editor',7)`;
      const content = {
        authorId: 'caps',
        title: 'TITLE unchanged',
        body: { kind: 'poem', text: '  Ś\n\n\\ ~\u200b' },
        media: [],
      };
      await tx`INSERT INTO revisions(id,post_id,content,created_by) VALUES ('draft','post',${JSON.stringify(content)}::jsonb,'editor'),('live','post',${JSON.stringify(content)}::jsonb,'editor')`;
      await tx`UPDATE posts SET draft_revision_id='draft',published_revision_id='live',status='published' WHERE id='post'`;
      await tx.unsafe(await readFile('migrations/007_author_identity.sql', 'utf8'));
      const authors = await tx`SELECT * FROM authors ORDER BY id`;
      assert.equal(authors.length, 2, 'Accents remain separate identities');
      const merged = authors.find((a) => a.id === 'mixed')!;
      assert.equal(merged.name, 'Herman Hese');
      assert.equal(merged.is_editor, true);
      assert.ok(
        merged.bio.includes('Prva biografija.') && merged.bio.includes('Druga biografija.'),
      );
      assert.equal(merged.bio, secondBio + '\n\n' + firstBio);
      assert.equal(merged.portrait_id, 'portrait-fixture');
      assert.equal(
        (await tx`SELECT count(*)::int AS total FROM media WHERE id='portrait-fixture'`)[0].total,
        1,
      );
      mergedBiography = merged.bio;
      assert.ok(mergedBiography.length > 3000);
      assert.deepEqual((await tx`SELECT slug,author_id FROM author_redirects`)[0], {
        slug: 'herman-old',
        author_id: 'mixed',
      });
      for (const r of await tx`SELECT content FROM revisions`)
        assert.deepEqual(r.content, { ...content, authorId: 'mixed' });
      assert.equal((await tx`SELECT version FROM posts`)[0].version, 8);
      const [key] =
        await tx`SELECT zilet_author_key('  HERMAN' || chr(160) || E' HESE\t') = zilet_author_key('Herman Hese') AS equal`;
      assert.equal(key.equal, true);
      assert.equal(
        (
          await tx`INSERT INTO authors(id,slug,name) VALUES ('new','new',' herman   hese ') ON CONFLICT DO NOTHING RETURNING id`
        ).length,
        0,
      );
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
  console.log(
    'PASS Author migration preserves writing, biographies, editor status, historical references and old URLs; excludes diacritic differences',
  );

  try {
    await db.transaction(async (tx) => {
      const id = crypto.randomUUID();
      const profile = {
        id,
        slug: `import-fixture-${id}`,
        name: `Uvoz autora ${id}`,
        bio: 'Dostavljena biografija.',
        isEditor: true,
        portraitId: 'import-portrait-fixture',
      };
      const first = await insertOrResolveAuthor(tx, profile);
      assert.equal(first.created, true);
      assert.deepEqual(first.author, profile);
      const duplicate = await insertOrResolveAuthor(tx, {
        ...profile,
        id: crypto.randomUUID(),
        slug: `other-${id}`,
        name: profile.name.toUpperCase(),
        bio: 'Ne prepisivati postojeći profil.',
        isEditor: false,
      });
      assert.equal(duplicate.created, false);
      assert.deepEqual(duplicate.author, profile);
      const retry = await insertOrResolveAuthor(tx, profile);
      assert.equal(retry.created, false);
      assert.equal(retry.author.id, profile.id);
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback) throw error;
  }
  console.log(
    'PASS Imports resolve an existing case-equivalent identity, preserve supplied metadata and remain idempotent',
  );

  const credentials = JSON.parse(
    await readFile(`/tmp/zilet-browser-account-${new URL(base).port || '80'}.json`, 'utf8'),
  );
  const login = await fetch(base + '/api/auth/sign-in/email', {
    method: 'POST',
    headers: { Origin: base, 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  assert.equal(login.status, 200);
  const cookie = login.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ');
  const name = `Herman Hese provjera ${Date.now()}`;
  const replies = await Promise.all(
    [name, name.toUpperCase(), ` ${name.replaceAll(' ', '  ')} `].map(async (name) => {
      const r = await fetch(base + '/api/authors', {
        method: 'POST',
        headers: { Origin: base, Cookie: cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      assert.ok([200, 201].includes(r.status));
      return { status: r.status, author: await r.json() };
    }),
  );
  assert.equal(replies.filter((r) => r.status === 201).length, 1);
  assert.equal(new Set(replies.map((r) => r.author.id)).size, 1);
  console.log('PASS Concurrent case/whitespace author creation reuses one profile');
  const author = replies[0].author;
  const oldSlug = `old-${author.slug}`;
  try {
    await sql`UPDATE authors SET bio=${mergedBiography},is_editor=true WHERE id=${author.id}`;
    await sql`INSERT INTO author_redirects(slug,author_id) VALUES (${oldSlug},${author.id})`;
    const moved = await fetch(`${base}/autor/${oldSlug}?page=2`, { redirect: 'manual' });
    assert.equal(moved.status, 308);
    assert.equal(
      new URL(moved.headers.get('location')!, base).href,
      `${base}/autor/${author.slug}?page=2`,
    );
    const publicPage = await fetch(`${base}/autor/${author.slug}`);
    assert.equal(publicPage.status, 200);
    assert.ok((await publicPage.text()).includes('Prva biografija.'));
    async function updateBio(data: unknown) {
      return fetch(`${base}/api/authors/${author.id}`, {
        method: 'PUT',
        headers: { Origin: base, Cookie: cookie, 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    }
    const previousBioHash = createHash('sha256').update(mergedBiography).digest('hex');
    const saved = await updateBio({ bio: 'Sažeta biografija.', previousBioHash });
    assert.equal(saved.status, 200);
    assert.equal((await saved.json()).bio, 'Sažeta biografija.');
    assert.equal((await updateBio({ bio: 'Zastarjela izmjena.', previousBioHash })).status, 409);
    assert.equal(
      (await updateBio({ bio: 'Stari klijent.', previousBio: 'Sažeta biografija.' })).status,
      200,
    );
    const currentHash = createHash('sha256').update('Stari klijent.').digest('hex');
    const competing = await Promise.all(
      ['Prva izmjena.', 'Druga izmjena.'].map((bio) =>
        updateBio({ bio, previousBioHash: currentHash }),
      ),
    );
    assert.deepEqual(competing.map((response) => response.status).sort(), [200, 409]);
    console.log(
      'PASS Merged long bios can be shortened using a compact hash; stale and concurrent edits conflict; old author URLs redirect with pagination',
    );
  } finally {
    await sql`DELETE FROM author_redirects WHERE slug=${oldSlug}`;
    await sql`DELETE FROM authors WHERE id=${author.id}`;
  }
} finally {
  await sql.end();
}
