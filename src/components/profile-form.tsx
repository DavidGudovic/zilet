'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export function ProfileForm({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <section className="account-panel password-panel">
      <h2>Podaci za prikaz</h2>
      <p className="hint">
        Ovo ime se prikazuje uz vaše komentare i nove radove. Adresa {email} ostaje privatna.
      </p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const value = String(new FormData(e.currentTarget).get('name') || '').trim();
          setBusy(true);
          setMessage('');
          try {
            const r = await fetch('/api/profile', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: value }),
            });
            const result = await r.json();
            if (!r.ok) throw new Error(result.error || 'Ime nije sačuvano.');
            setMessage('Ime je sačuvano.');
            router.refresh();
          } catch (e) {
            setMessage(e instanceof Error ? e.message : 'Veza nije dostupna.');
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Ime za prikaz
          <input name="name" defaultValue={name} required maxLength={80} autoComplete="nickname" />
        </label>
        <button className="button" disabled={busy}>
          {busy ? 'Čuvanje…' : 'Sačuvaj ime'}
        </button>
        <p role="status">{message}</p>
      </form>
    </section>
  );
}
