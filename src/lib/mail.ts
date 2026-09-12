import nodemailer from 'nodemailer';
import { brandedMail, type MailAction } from './mail-template';
export const mailConfigured = () => Boolean(process.env.SMTP_HOST && process.env.SMTP_FROM);
export async function sendMail(
  to: string,
  subject: string,
  text: string,
  action?: MailAction,
  messageId?: string,
) {
  if (!mailConfigured()) throw new Error('Slanje pošte nije podešeno.');
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
      : undefined,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
  });
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
