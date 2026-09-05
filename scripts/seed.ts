import { sql } from '../src/db';
import { importContent } from './import-content';
try {
  const host = new URL(process.env.APP_URL || '').hostname;
  if (process.env.ALLOW_DEMO_SEED !== 'true' || !['localhost', '127.0.0.1'].includes(host))
    throw new Error(
      'Razvojni materijal se učitava samo uz ALLOW_DEMO_SEED=true i lokalni APP_URL.',
    );
  await importContent();
  console.log('Dva dostavljena razvojna primjera su učitana. Nalozi urednika nijesu izmišljeni.');
} finally {
  await sql.end();
}
