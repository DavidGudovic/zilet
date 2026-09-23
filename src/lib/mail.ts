import nodemailer from 'nodemailer';
import { brandedMail, type MailAction } from './mail-template';
export const mailConfigured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
// Without requireTLS a stripped STARTTLS offer silently sends the login in plaintext.
// Only the local sink (no login, not the submission port) may skip encryption.
export function smtpOptions(env: Record<string, string | undefined> = process.env) {
  const port = Number(env.SMTP_PORT || 587);
  const secure = env.SMTP_SECURE === 'true';
  return {
    host: env.SMTP_HOST,
    port,
    secure,
    requireTLS: !secure && (port === 587 || Boolean(env.SMTP_USER)),
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  };
}
export async function sendMail(
  to: string,
  subject: string,
  text: string,
  action?: MailAction,
  messageId?: string,
) {
  if (!mailConfigured()) throw new Error('Slanje pošte nije podešeno.');
  const transport = nodemailer.createTransport(smtpOptions());
  try {
    await transport.sendMail({
      from: process.env.SMTP_FROM,
      to,
      subject,
      ...brandedMail(subject, text, process.env.APP_URL || 'http://localhost:3000', action),
      ...(messageId
        ? {
            messageId: `<${messageId}@${new URL(process.env.APP_URL || 'http://localhost:3000').hostname}>`,
          }
        : {}),
    });
  } finally {
    transport.close();
  }
}
