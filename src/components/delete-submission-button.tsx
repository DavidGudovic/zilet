'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export function DeleteSubmissionButton({
  id,
  version,
  returnTo,
}: {
  id: string;
  version: number;
  returnTo?: string;
}) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <div>
      <button
        className="text-button danger"
        disabled={busy}
        onClick={async () => {
          if (
            !window.confirm(
              'Trajno izbrisati ovaj prilog i njegovu nekorišćenu fotografiju? Ova radnja se ne može vratiti.',
            )
          )
            return;
          setBusy(true);
          try {
            const r = await fetch(`/api/submissions/${id}`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ version }),
            });
            const data = await r.json();
            if (!r.ok) throw new Error(data.error || 'Prilog nije izbrisan.');
            if (returnTo) router.push(returnTo);
            else router.refresh();
          } catch (e) {
            setMessage(e instanceof Error ? e.message : 'Veza nije dostupna.');
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? 'Brisanje…' : 'Trajno izbriši prilog'}
      </button>
      <p role="status">{message}</p>
    </div>
  );
}
