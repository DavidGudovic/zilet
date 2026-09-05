'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export function ModerationControls({
  id,
  status,
  userId,
  suspended,
}: {
  id: string;
  status: string;
  userId: string;
  suspended: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function act(endpoint: string, payload: object, method = 'POST') {
    setBusy(true);
    try {
      const r = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        setMessage('Promjena je sačuvana.');
        router.refresh();
      } else setMessage((await r.json()).error);
    } catch {
      setMessage('Promjena nije sačuvana. Pokušajte ponovo.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="moderation-controls">
      {status !== 'deleted' && (
        <button
          className="button secondary"
          disabled={busy}
          onClick={() =>
            act(
              `/api/comments/${id}`,
              { action: status === 'visible' ? 'remove' : 'restore' },
              'PATCH',
            )
          }
        >
          {status === 'visible' ? 'Ukloni' : status === 'pending' ? 'Objavi' : 'Vrati'}
        </button>
      )}
      <button
        className="text-button"
        disabled={busy}
        onClick={() => act('/api/moderation', { userId, suspended: !suspended })}
      >
        {suspended ? 'Vrati pristup čitaocu' : 'Obustavi komentarisanje'}
      </button>
      {message && <p role="status">{message}</p>}
    </div>
  );
}
