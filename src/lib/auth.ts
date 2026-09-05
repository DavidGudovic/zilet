import { APIError } from 'better-auth/api';
import { eq } from 'drizzle-orm';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@/db';
import * as schema from '@/db/schema';
import nodemailer from 'nodemailer';
export const mailConfigured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
export const registrationEnabled = () =>
  process.env.REGISTRATION_ENABLED === 'true' && mailConfigured();
export async function sendMail(to: string, subject: string, text: string) {
  if (!mailConfigured()) throw new Error('Slanje pošte nije podešeno.');
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
    connectionTimeout: 10000,
  });
  await transport.sendMail({ from: process.env.SMTP_FROM, to, subject, text });
}
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
        `Za novu lozinku otvorite ovaj link:\n\n${url}\n\nAko nijeste tražili promjenu, zanemarite ovu poruku.`,
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
        `Potvrdite svoju adresu za komentarisanje:\n\n${url}\n\nAko nijeste otvorili nalog, zanemarite ovu poruku.`,
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
