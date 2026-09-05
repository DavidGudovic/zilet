// Owner-authorized one-time launch import. Never called by startup or CI/CD.
import { sql } from '../src/db';
import { importContent } from './import-content';
try {
  if (process.env.APP_URL !== 'https://zilet.me' || !process.argv.includes('--confirm-publication'))
    throw new Error('Potreban je https://zilet.me i izričita potvrda --confirm-publication.');
  await importContent(true);
  console.log(
    'Odobreni tekstovi i potpisana ilustracija su objavljeni. Postojeći tekstovi nijesu mijenjani.',
  );
} finally {
  await sql.end();
}
