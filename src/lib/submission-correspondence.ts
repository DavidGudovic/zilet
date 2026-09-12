import { db } from '@/db';
import { submissionMessages, submissions, user } from '@/db/schema';
import { and, asc, desc, eq } from 'drizzle-orm';
import { HttpError } from './security';
import { mailConfigured, sendMail } from './mail';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type MessageKind = typeof submissionMessages.$inferInsert.kind;
export async function queueSubmissionMessage(
  tx: Transaction,
  submissionId: string,
  actorId: string,
  recipientId: string,
  kind: MessageKind,
  body: string,
) {
  const id = crypto.randomUUID();
  await tx
    .insert(submissionMessages)
    .values({ id, submissionId, actorId, recipientId, kind, body });
  return id;
}
export async function getSubmissionMessages(id: string) {
  return db
    .select({
      id: submissionMessages.id,
      body: submissionMessages.body,
      kind: submissionMessages.kind,
      deliveryStatus: submissionMessages.deliveryStatus,
      createdAt: submissionMessages.createdAt,
      sender: user.name,
    })
    .from(submissionMessages)
    .innerJoin(user, eq(submissionMessages.actorId, user.id))
    .where(eq(submissionMessages.submissionId, id))
    .orderBy(asc(submissionMessages.createdAt), asc(submissionMessages.id));
}
export async function addSubmissionMessage(
  id: string,
  actor: { id: string; role: string },
  version: number,
  body: string,
) {
  return db.transaction(async (tx) => {
    const [item] = await tx.select().from(submissions).where(eq(submissions.id, id)).for('update');
    const editor = ['editor', 'maintainer'].includes(actor.role);
    if (!item || (!editor && item.userId !== actor.id))
      throw new HttpError(404, 'Prilog nije pronađen.');
    if (item.version !== version || item.status !== 'pending')
      throw new HttpError(
        409,
        'Prilog je promijenjen ili je odluka već donijeta. Osvježite stranicu.',
      );
    if (!body.trim()) throw new HttpError(400, 'Napišite poruku.');
    const [question] = await tx
      .select()
      .from(submissionMessages)
      .where(and(eq(submissionMessages.submissionId, id), eq(submissionMessages.kind, 'question')))
      .orderBy(desc(submissionMessages.createdAt), desc(submissionMessages.id))
      .limit(1);
    if (!editor && !question)
      throw new HttpError(409, 'Odgovor možete poslati nakon pitanja redakcije.');
    const messageId = await queueSubmissionMessage(
      tx,
      id,
      actor.id,
      editor ? item.userId : question.actorId,
      editor ? 'question' : 'reply',
      body.trim(),
    );
    await tx
      .update(submissions)
      .set({ version: version + 1 })
      .where(eq(submissions.id, id));
    return { messageId, version: version + 1 };
  });
}
// A message row is also the durable delivery record. Keep the row locked during SMTP
// so simultaneous retries cannot both send a message. A process failure after SMTP
// accepts a message can still require a retry; its stable Message-ID aids deduplication.
export async function deliverSubmissionMessage(id: string) {
  return db.transaction(async (tx) => {
    const [message] = await tx
      .select()
      .from(submissionMessages)
      .where(eq(submissionMessages.id, id))
      .for('update');
    if (!message) throw new HttpError(404, 'Poruka nije pronađena.');
    if (message.deliveryStatus === 'sent') return 'sent' as const;
    const [recipient] = await tx.select().from(user).where(eq(user.id, message.recipientId));
    const [item] = await tx
      .select()
      .from(submissions)
      .where(eq(submissions.id, message.submissionId));
    if (!item || !recipient) throw new HttpError(404, 'Prilog nije pronađen.');
    const editorRecipient = message.kind === 'reply';
    let deliveryStatus: 'sent' | 'unavailable' | 'failed' = 'unavailable';
    if (
      mailConfigured() &&
      recipient.emailVerified &&
      !recipient.suspended &&
      (!editorRecipient || ['editor', 'maintainer'].includes(recipient.role))
    ) {
      const heading = {
        question: 'poruka redakcije',
        reply: 'odgovor čitaoca',
        accepted: 'vaš rad je prihvaćen',
        rejected: 'odluka o vašem radu',
      }[message.kind];
      const lead = {
        question: 'Prije odluke o vašem radu, redakcija vam šalje poruku.',
        reply: 'Čitalac je odgovorio na poruku redakcije.',
        accepted: 'Vaš rad je prihvaćen i priprema se za objavu. Hvala što pišete Žiletu.',
        rejected:
          'Hvala što ste svoj rad povjerili Žiletu. Redakcija ovog puta nije izabrala rad za objavu.',
      }[message.kind];
      const url = new URL(
        editorRecipient
          ? `/redakcija/prilozi/${item.id}#radni-prostor`
          : `/posalji?prilog=${item.id}#prilog-${item.id}`,
        process.env.APP_URL || 'http://localhost:3000',
      ).href;
      try {
        await sendMail(
          recipient.email,
          `Žilet — ${heading}`,
          `${lead}\n\nRad: ${item.title}${message.body ? `\n\n${message.body}` : ''}\n\n${message.kind === 'question' || editorRecipient ? 'Razgovor se nastavlja na stranici priloga. Odgovorite tamo, umjesto odgovora na ovu e-poruku.' : 'Status rada i odgovor redakcije možete pogledati na stranici svojih priloga.'}`,
          { label: editorRecipient ? 'Otvori razgovor' : 'Pogledaj svoj prilog', url },
          `submission-${message.id}`,
        );
        deliveryStatus = 'sent';
      } catch {
        deliveryStatus = 'failed';
      }
    }
    await tx
      .update(submissionMessages)
      .set({ deliveryStatus, sentAt: deliveryStatus === 'sent' ? new Date() : null })
      .where(eq(submissionMessages.id, id));
    return deliveryStatus;
  });
}

// Decisions and conversation entries are already committed at this point. Never
// tell the caller to repeat that mutation if the separate delivery step fails.
export async function attemptSubmissionDelivery(id: string) {
  try {
    return await deliverSubmissionMessage(id);
  } catch {
    console.error('Slanje obavještenja o prilogu nije potvrđeno; zapis ostaje za ponovni pokušaj.');
    return 'pending' as const;
  }
}
