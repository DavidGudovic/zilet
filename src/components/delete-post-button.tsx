'use client';

import { useState } from 'react';

export function DeletePostButton({
  id,
  version,
  returnTo = '/redakcija',
}: {
  id: string;
  version: number;
  returnTo?: string;
}) {
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);

  async function remove() {
    if (
      !window.confirm(
        'Trajno izbrisati ovaj tekst? Ova radnja uklanja sve njegove verzije i ne može se vratiti.',
      )
    )
      return;
    setPending(true);
    setMessage('');
    try {
      const response = await fetch(`/api/posts/${id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Tekst nije izbrisan.');
      window.location.assign(returnTo);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Tekst nije izbrisan.');
      setPending(false);
    }
  }

  return (
    <>
      <button type="button" className="text-button danger" onClick={remove} disabled={pending}>
        {pending ? 'Brisanje…' : 'Trajno izbriši tekst'}
      </button>
      {message && (
        <p className="form-error" role="alert">
          {message}
        </p>
      )}
    </>
  );
}
