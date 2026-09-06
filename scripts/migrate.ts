import { readFile } from 'node:fs/promises';
import { sql } from '../src/db';
try {
  await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(90261001)`;
    await tx`CREATE TABLE IF NOT EXISTS zilet_migrations(name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
    for (const name of [
      '001_initial.sql',
      '002_auth_issuer.sql',
      '003_editor_profiles.sql',
      '004_editorial_notes.sql',
    ]) {
      const exists = await tx`SELECT name FROM zilet_migrations WHERE name=${name}`;
      if (!exists.length) {
        await tx.unsafe(await readFile(`migrations/${name}`, 'utf8'));
        await tx`INSERT INTO zilet_migrations(name) VALUES(${name})`;
        console.log(`Migracija: ${name}`);
      }
    }
  });
} finally {
  await sql.end();
}
