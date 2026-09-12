import { APIError } from 'better-auth/api';
import { eq } from 'drizzle-orm';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/db';
import * as schema from '@/db/schema';
import { mailConfigured, sendMail } from './mail';
export { mailConfigured, sendMail } from './mail';
export const registrationEnabled = () =>
  process.env.REGISTRATION_ENABLED === 'true' && mailConfigured();
export const auth = betterAuth({
  appName: 'Žilet',
  baseURL: process.env.APP_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: 'pg', schema }),
  databaseHooks: {
    user: {
      create: {
        before: async (u) => {
          if (!u.name.trim() || u.name.length > 80)
            throw new APIError('BAD_REQUEST', { message: 'Ime može imati najviše 80 znakova.' });
          return { data: { ...u, role: 'reader', suspended: false } };
        },
      },
      update: {
        before: async (u) => {
          if (u.name !== undefined && (!u.name.trim() || u.name.length > 80))
            throw new APIError('BAD_REQUEST', { message: 'Neispravno ime.' });
          return { data: u };
        },
      },
    },
    session: {
      create: {
        before: async (s) => {
          const [u] = await db.select().from(schema.user).where(eq(schema.user.id, s.userId));
          if (u?.suspended) throw new APIError('FORBIDDEN', { message: 'Prijava nije dostupna.' });
          return { data: s };
        },
      },
    },
  },
  trustedOrigins: [process.env.APP_URL || 'http://localhost:3000'],
  emailAndPassword: {
    enabled: true,
    disableSignUp: !registrationEnabled(),
    requireEmailVerification: true,
    minPasswordLength: 12,
    maxPasswordLength: 128,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      await sendMail(
        user.email,
        'Žilet — obnova lozinke',
        'Zatražili ste obnovu lozinke za svoj nalog na Žiletu.\n\nAko nijeste tražili promjenu, zanemarite ovu poruku.',
        { label: 'Postavi novu lozinku', url },
      );
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: false,
    sendVerificationEmail: async ({ user, url }) => {
      await sendMail(
        user.email,
        'Žilet — potvrdite adresu',
        'Dobro došli u Žilet. Potvrdite svoju adresu da biste komentarisali i slali radove redakciji.\n\nAko nijeste otvorili nalog, zanemarite ovu poruku.',
        { label: 'Potvrdi adresu', url },
      );
    },
  },
  user: {
    additionalFields: {
      role: { type: 'string', defaultValue: 'reader', input: false },
      suspended: { type: 'boolean', defaultValue: false, input: false },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: false },
  },
  rateLimit: {
    enabled: true,
    storage: 'database',
    window: 60,
    max: 60,
    customRules: {
      '/sign-in/email': { window: 60, max: 8 },
      '/sign-up/email': { window: 600, max: 5 },
      '/request-password-reset': { window: 600, max: 5 },
      '/send-verification-email': { window: 600, max: 5 },
    },
  },
  advanced: {
    useSecureCookies: process.env.APP_URL?.startsWith('https://'),
    ipAddress: { ipAddressHeaders: process.env.TRUST_PROXY === 'true' ? ['x-real-ip'] : [] },
  },
});
