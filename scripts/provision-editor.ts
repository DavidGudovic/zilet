// Explicit owner maintenance, never startup. Password comes only from stdin.
import { hashPassword } from 'better-auth/crypto';
import { createLocalAccountIssuer } from '@better-auth/core/db';
import { db, sql } from '../src/db';
import { user, account } from '../src/db/schema';
import { eq } from 'drizzle-orm';
const args = process.argv.slice(2);
const value = (key: string) => args[args.indexOf(key) + 1];
try {
  if (
    !args.includes('--email') ||
    !args.includes('--name') ||
    !args.includes('--confirm-owner-verified')
  )
    throw new Error(
      'Potrebni su --email, --name i --confirm-owner-verified. Lozinka se čita sa standardnog ulaza.',
    );
  const email = value('--email').trim().toLowerCase(),
    name = value('--name').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name || name.length > 80)
    throw new Error('Neispravno ime ili adresa.');
  if ((await db.select({ id: user.id }).from(user).where(eq(user.email, email))).length)
    throw new Error('Nalog već postoji; lozinka i uloga nijesu mijenjane.');
  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk.toString();
    if (input.length > 256) throw new Error('Preduga lozinka.');
  }
  const password = input.replace(/\r?\n$/, '');
  // Owner may explicitly supply an 8-character starter; normal password changes still require 12.
  const min = args.includes('--starter-password') ? 8 : 12;
  if (password.length < min || password.length > 128)
    throw new Error(`Lozinka: ${min}–128 znakova.`);
  const hashed = await hashPassword(password);
  await db.transaction(async (tx) => {
    const id = crypto.randomUUID(),
      now = new Date();
    await tx.insert(user).values({ id, name, email, emailVerified: true, role: 'editor' });
    await tx.insert(account).values({
      id: crypto.randomUUID(),
      userId: id,
      accountId: id,
      providerId: 'credential',
      issuer: createLocalAccountIssuer('credential'),
      password: hashed,
      createdAt: now,
      updatedAt: now,
    });
  });
  console.log(`Urednički nalog je kreiran: ${email}.`);
} catch (e) {
  console.error(e instanceof Error ? e.message : 'Nalog nije kreiran.');
  process.exitCode = 1;
} finally {
  await sql.end();
}
