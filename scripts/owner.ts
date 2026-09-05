import { betterAuth } from 'better-auth';
import { auth, mailConfigured } from '../src/lib/auth';
import { db, sql } from '../src/db';
import { user } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import { randomBytes } from 'node:crypto';
const args = process.argv.slice(2);
const get = (key: string) => (args.includes(key) ? args[args.indexOf(key) + 1] : undefined);
const email = get('--email'),
  name = get('--name'),
  role = get('--role') || 'editor';
try {
  if (!email || !name || !['editor', 'maintainer'].includes(role) || !mailConfigured())
    throw new Error(
      'Koristite --email ADRESA --name IME --role editor|maintainer, uz podešenu poštu.',
    );
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Neispravna adresa.');
  const existing = await db.select().from(user).where(eq(user.email, email));
  if (existing.length)
    throw new Error('Nalog već postoji. Koristite vlasničku proceduru za promjenu uloge.');
  const ownerAuth = betterAuth({
    ...auth.options,
    emailAndPassword: { ...auth.options.emailAndPassword, enabled: true, disableSignUp: false },
  });
  const result = await ownerAuth.api.signUpEmail({
    body: {
      name,
      email,
      password: randomBytes(36).toString('base64url'),
      callbackURL: `${process.env.APP_URL}/nalog`,
    },
  });
  await db.update(user).set({ role }).where(eq(user.id, result.user.id));
  await ownerAuth.api.requestPasswordReset({
    body: { email, redirectTo: `${process.env.APP_URL}/nova-lozinka` },
  });
  console.log('Poziv je poslat. Primalac potvrđuje adresu i bira svoju lozinku.');
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
} finally {
  await sql.end();
}
