'use client';
import { useState } from 'react';
export function PasswordForm() {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <section className="account-panel password-panel">
      <h2>Promjena lozinke</h2>
      <p className="hint">Lozinku možete promijeniti ovdje, bez poruke e-poštom.</p>
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = new FormData(form);
          if (data.get('newPassword') !== data.get('confirmation')) {
            setMessage('Nove lozinke se ne poklapaju.');
            return;
          }
          setBusy(true);
          setMessage('');
          try {
            const response = await fetch('/api/auth/change-password', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                currentPassword: data.get('currentPassword'),
                newPassword: data.get('newPassword'),
                revokeOtherSessions: true,
              }),
            });
            if (!response.ok)
              throw new Error(
                'Lozinka nije promijenjena. Provjerite trenutnu lozinku i pokušajte ponovo.',
              );
            form.reset();
            setMessage('Lozinka je promijenjena. Ostale prijave su odjavljene.');
          } catch (e) {
            setMessage(e instanceof Error ? e.message : 'Veza nije dostupna.');
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Trenutna lozinka
          <input
            type="password"
            name="currentPassword"
            autoComplete="current-password"
            required
            maxLength={128}
          />
        </label>
        <label>
          Nova lozinka
          <input
            type="password"
            name="newPassword"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
          />
          <span className="hint">Najmanje 12 znakova.</span>
        </label>
        <label>
          Ponovite novu lozinku
          <input
            type="password"
            name="confirmation"
            autoComplete="new-password"
            required
            minLength={12}
            maxLength={128}
          />
        </label>
        <button className="button" disabled={busy}>
          {busy ? 'Čuvanje…' : 'Promijeni lozinku'}
        </button>
        <p role="status">{message}</p>
      </form>
    </section>
  );
}
