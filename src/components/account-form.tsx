'use client';
import { useState } from 'react';
export function AccountForm({
  returnTo,
  registration,
  mode = 'login',
}: {
  returnTo: string;
  registration: boolean;
  mode?: 'login' | 'register' | 'recover' | 'reset';
}) {
  const [view, setView] = useState(mode === 'login' ? 'login' : mode);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    const data = new FormData(event.currentTarget);
    let endpoint = 'sign-in/email';
    let payload: Record<string, unknown> = {
      email: data.get('email'),
      password: data.get('password'),
    };
    if (view === 'register') {
      endpoint = 'sign-up/email';
      payload = {
        ...payload,
        name: data.get('name'),
        callbackURL: `${location.origin}/nalog?verified=true&returnTo=${encodeURIComponent(returnTo)}`,
      };
    }
    if (view === 'recover') {
      endpoint = 'request-password-reset';
      payload = { email: data.get('email'), redirectTo: `${location.origin}/nova-lozinka` };
    }
    if (view === 'reset') {
      endpoint = 'reset-password';
      payload = {
        newPassword: data.get('password'),
        token: new URLSearchParams(location.search).get('token'),
      };
    }
    try {
      const res = await fetch(`/api/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) {
        setError(true);
        setMessage(
          view === 'login'
            ? 'Prijava nije uspjela. Provjerite podatke i potvrdu adrese.'
            : 'Zahtjev nije uspio. Provjerite podatke i pokušajte ponovo.',
        );
      } else {
        setError(false);
        if (view === 'login') {
          location.assign(returnTo);
          return;
        }
        setMessage(
          view === 'register'
            ? 'Poslali smo link za potvrdu. Otvorite ga iz poruke, pa se prijavite.'
            : view === 'recover'
              ? 'Ako je nalog registrovan, dobićete poruku sa linkom za obnovu lozinke.'
              : 'Lozinka je promijenjena. Sada se možete prijaviti.',
        );
      }
    } catch {
      setError(true);
      setMessage('Veza nije dostupna. Pokušajte ponovo.');
    } finally {
      setBusy(false);
    }
  }
  const title =
    view === 'login'
      ? 'Prijavite se'
      : view === 'register'
        ? 'Otvorite nalog'
        : view === 'recover'
          ? 'Obnovite lozinku'
          : 'Nova lozinka';
  const editorial = returnTo.startsWith('/redakcija');
  return (
    <section className="account-panel">
      <span className="eyebrow">{editorial ? 'Žilet / Redakcija' : 'Čitalački nalog'}</span>
      <h1>{title}</h1>
      <p>
        {view === 'login'
          ? editorial
            ? 'Dobro došli u redakciju. Prijavite se da pišete, dodajete fotografije i objavljujete tekstove.'
            : 'Nalog vam je potreban samo za komentarisanje. Čitanje je uvijek otvoreno.'
          : view === 'register'
            ? 'Vaša adresa e-pošte ostaje privatna. Uz komentar se prikazuje ime koje izaberete.'
            : view === 'reset'
              ? 'Izaberite novu lozinku za svoj nalog.'
              : 'Poslaćemo vam bezbjedan link za obnovu pristupa.'}
      </p>
      {view === 'login' && !editorial && (
        <div className="account-tabs">
          <button aria-pressed="true">Prijava</button>
          <button
            disabled={!registration}
            onClick={() => {
              setView('register');
              setMessage('');
            }}
          >
            Novi nalog
          </button>
        </div>
      )}
      {!registration && !editorial && (view === 'login' || view === 'register') && (
        <p className="notice">Otvaranje novih naloga trenutno nije dostupno.</p>
      )}
      <form onSubmit={submit}>
        {view === 'register' && (
          <label>
            Ime za prikaz
            <input name="name" required maxLength={80} autoComplete="nickname" />
          </label>
        )}
        {view !== 'reset' && (
          <label>
            Adresa e-pošte
            <input name="email" type="email" required autoComplete="email" maxLength={254} />
          </label>
        )}
        {view !== 'recover' && (
          <label>
            Lozinka
            <input
              name="password"
              type="password"
              required
              minLength={view === 'login' ? 1 : 12}
              maxLength={128}
              autoComplete={view === 'login' ? 'current-password' : 'new-password'}
            />
            {view !== 'login' && <span className="hint">Najmanje 12 znakova.</span>}
          </label>
        )}
        <button className="button" disabled={busy || (view === 'register' && !registration)}>
          {busy
            ? 'Sačekajte…'
            : view === 'login'
              ? 'Prijavi se'
              : view === 'register'
                ? 'Otvori nalog'
                : view === 'recover'
                  ? 'Pošalji link'
                  : 'Sačuvaj lozinku'}
        </button>
        {message && (
          <p className={error ? 'form-error' : 'form-success'} role="status">
            {message}
          </p>
        )}
      </form>
      <div className="account-links">
        {view === 'login' ? (
          <a href="/oporavak">Zaboravili ste lozinku?</a>
        ) : (
          <button
            onClick={() => {
              setView('login');
              setMessage('');
            }}
          >
            ← Nazad na prijavu
          </button>
        )}
      </div>
    </section>
  );
}
export function SignOut() {
  return (
    <button
      className="text-button"
      onClick={async () => {
        const r = await fetch('/api/auth/sign-out', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: '{}',
        });
        if (r.ok) {
          sessionStorage.clear();
          location.assign('/');
        }
      }}
    >
      Odjavi se ↗
    </button>
  );
}
