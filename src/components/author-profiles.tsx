'use client';
import { useState } from 'react';
import type { Author } from '@/lib/content';

function Profile({ author }: { author: Author }) {
  const [bio, setBio] = useState(author.bio || '');
  const [saved, setSaved] = useState(author.bio || '');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <form
      className="profile-form"
      onSubmit={async (event) => {
        event.preventDefault();
        setBusy(true);
        setMessage('');
        try {
          const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(saved));
          const previousBioHash = Array.from(new Uint8Array(digest), (byte) =>
            byte.toString(16).padStart(2, '0'),
          ).join('');
          const response = await fetch(`/api/authors/${author.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bio, previousBioHash }),
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || 'Biografija nije sačuvana.');
          setSaved(bio);
          setMessage('Biografija je sačuvana.');
        } catch (e) {
          setMessage(e instanceof Error ? e.message : 'Veza nije dostupna. Pokušajte ponovo.');
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="profile-form-heading">
        <h2>{author.name}</h2>
        {author.isEditor && <span className="eyebrow">Redakcija</span>}
      </div>
      <label>
        O autoru
        <textarea
          value={bio}
          rows={6}
          maxLength={3000}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Nekoliko rečenica o autoru i njegovom stvaralaštvu…"
        />
      </label>
      <div className="profile-actions">
        <button className="button" disabled={busy || bio === saved}>
          {busy ? 'Čuvanje…' : 'Sačuvaj biografiju'}
        </button>
        <a href={`/autor/${author.slug}`} target="_blank" rel="noopener noreferrer">
          Javna stranica ↗
        </a>
      </div>
      <p role="status">{message}</p>
    </form>
  );
}
export function AuthorProfiles({ authors }: { authors: Author[] }) {
  return (
    <div className="profile-list">
      {authors.map((author) => (
        <Profile key={author.id} author={author} />
      ))}
    </div>
  );
}
