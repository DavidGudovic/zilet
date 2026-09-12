'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './submission-conversation.module.css';
export type ConversationMessage = {
  id: string;
  body: string;
  kind: 'question' | 'reply' | 'accepted' | 'rejected';
  deliveryStatus: 'pending' | 'sent' | 'failed' | 'unavailable';
  createdAt: string;
  sender: string;
};
const deliveryLabel = {
  pending: 'Poruka je sačuvana; slanje e-pošte još nije potvrđeno.',
  sent: 'Obavještenje je poslato e-poštom.',
  failed: 'Poruka je sačuvana, ali slanje e-pošte nije uspjelo.',
  unavailable: 'Poruka je sačuvana; slanje e-pošte trenutno nije dostupno.',
};
export function SubmissionConversation({
  id,
  version,
  pending,
  editor = false,
  messages,
}: {
  id: string;
  version: number;
  pending: boolean;
  editor?: boolean;
  messages: ConversationMessage[];
}) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  async function send(messageId?: string) {
    setBusy(true);
    setNotice('');
    try {
      const response = await fetch(
        `/api/submissions/${id}/messages${messageId ? `/${messageId}/retry` : ''}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          ...(!messageId ? { body: JSON.stringify({ version, body }) } : {}),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Poruka nije sačuvana.');
      if (!messageId) setBody('');
      setNotice(deliveryLabel[result.deliveryStatus as keyof typeof deliveryLabel]);
      router.refresh();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Veza nije dostupna.');
    } finally {
      setBusy(false);
    }
  }
  const canReply = pending && (editor || messages.some((m) => m.kind === 'question'));
  if (!messages.length && !canReply) return null;
  return (
    <section className={styles.thread} aria-label="Razgovor o prilogu">
      <h2>{editor ? 'Razgovor sa čitaocem' : 'Razgovor sa redakcijom'}</h2>
      {!!messages.length && (
        <ol className={styles.messages}>
          {messages.map((m) => (
            <li key={m.id} className={styles.message}>
              <p className={styles.meta}>
                {m.sender} ·{' '}
                {new Intl.DateTimeFormat('sr-Latn-ME', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                  timeZone: 'Europe/Podgorica',
                }).format(new Date(m.createdAt))}
              </p>
              <p className={styles.body}>
                {m.kind === 'accepted'
                  ? 'Rad je prihvaćen i priprema se za objavu.'
                  : m.kind === 'rejected'
                    ? `Rad ovog puta nije izabran za objavu.${m.body ? `\n\n${m.body}` : ''}`
                    : m.body}
              </p>
              {(editor || m.kind === 'reply') && (
                <>
                  <p className={styles.meta}>{deliveryLabel[m.deliveryStatus]}</p>
                  {m.deliveryStatus !== 'sent' && (
                    <button disabled={busy} onClick={() => send(m.id)}>
                      Pokušaj ponovo e-poštom
                    </button>
                  )}
                </>
              )}
            </li>
          ))}
        </ol>
      )}
      {canReply && (
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <label htmlFor={`message-${id}`}>
            {editor ? 'Pitanje ili zahtjev prije odluke' : 'Vaš odgovor redakciji'}
          </label>
          <textarea
            id={`message-${id}`}
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={4000}
            required
          />
          <p className="hint">
            {editor
              ? 'Poruka je privatna. Čitalac će dobiti obavještenje e-poštom i moći da odgovori ovdje. Prilog ostaje na pregledu.'
              : 'Odgovor vidi samo redakcija. Za izmjenu teksta dogovorite se sa urednikom u ovom razgovoru.'}
          </p>
          <button className="button" disabled={busy || !body.trim()}>
            {busy ? 'Sačekajte…' : editor ? 'Pošalji poruku čitaocu' : 'Pošalji odgovor'}
          </button>
        </form>
      )}
      <p role="status">{notice}</p>
    </section>
  );
}
