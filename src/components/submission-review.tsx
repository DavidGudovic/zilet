'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export function SubmissionReview({ id, version }: { id: string; version: number }) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function review(action: 'accept' | 'reject') {
    if (action === 'accept' && !note.trim()) {
      setMessage('Napišite svoju bilješku uz rad.');
      document.getElementById('review-note')?.focus();
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch(`/api/submissions/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, version, note }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Pregled nije sačuvan.');
      if (result.postId && result.deliveryStatus === 'sent')
        router.push(`/redakcija/tekst/${result.postId}#radni-prostor`);
      else {
        setMessage(
          result.deliveryStatus === 'sent'
            ? 'Odluka je sačuvana. Čitalac je obaviješten e-poštom.'
            : 'Odluka je sačuvana, ali e-pošta nije poslata. Pokušajte ponovo iz razgovora.',
        );
        router.refresh();
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Veza nije dostupna.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="editor-fields review-actions">
      <h2>Vaša odluka</h2>
      <label htmlFor="review-note">Bilješka uz prihvaćeni rad ili odgovor čitaocu</label>
      <textarea
        id="review-note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={6}
        maxLength={4000}
      />
      <p className="hint">
        Uz prihvaćeni rad bilješka će biti javna i potpisana vašim imenom. Ako rad ne izaberete,
        poruku vidi samo čitalac. Fotografiju pregledajte prije objave.
      </p>
      <div className="account-links">
        <button className="button" disabled={busy} onClick={() => review('accept')}>
          {busy ? 'Sačekajte…' : 'Prihvati i otvori nacrt'}
        </button>
        <button disabled={busy} onClick={() => review('reject')}>
          Ne izaberi ovaj rad
        </button>
      </div>
      <p role="status">{message}</p>
    </section>
  );
}
