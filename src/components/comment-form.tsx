'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
export function CommentForm({
  postId,
  slug,
  userId,
  open,
}: {
  postId: string;
  slug: string;
  userId?: string;
  open: boolean;
}) {
  const [body, setBody] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const key = `zilet-comment:${postId}`;
  useEffect(() => {
    const pending = sessionStorage.getItem(key);
    if (pending) {
      setBody(pending);
      sessionStorage.removeItem(key);
    }
  }, [key]);
  if (!open) return <p>Komentari su zatvoreni za ovaj tekst.</p>;
  return (
    <form
      className="comment-form"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!userId) return;
        setBusy(true);
        try {
          const res = await fetch('/api/comments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postId, body }),
          });
          const result = await res.json();
          if (!res.ok) {
            setMessage(result.error);
            return;
          }
          setBody('');
          setMessage(
            result.status === 'pending'
              ? 'Komentar je poslat redakciji.'
              : 'Komentar je objavljen.',
          );
          router.refresh();
        } catch {
          setMessage('Komentar nije poslat. Tekst je ostao sačuvan u ovom prozoru.');
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        Napišite komentar
        <textarea
          rows={4}
          maxLength={4000}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Vaš osvrt na tekst…"
          required
        />
      </label>
      <div className="comment-submit">
        {userId ? (
          <button className="button" disabled={busy}>
            {busy ? 'Objavljivanje…' : 'Objavi komentar'}
          </button>
        ) : (
          <a
            className="button"
            href={`/nalog?returnTo=${encodeURIComponent(`/tekst/${slug}#komentari`)}`}
            onClick={() => {
              if (body) sessionStorage.setItem(key, body);
            }}
          >
            Prijavite se da ostavite komentar
          </a>
        )}
        <span>{body.length} / 4000</span>
      </div>
      {message && <p role="status">{message}</p>}
    </form>
  );
}
export function CommentDelete({ id }: { id: string }) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  return (
    <>
      <button
        className="text-button"
        onClick={async () => {
          const res = await fetch(`/api/comments/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'delete' }),
          });
          if (res.ok) router.refresh();
          else setMessage('Komentar nije izbrisan.');
        }}
      >
        Izbriši svoj komentar
      </button>
      {message && <span role="status">{message}</span>}
    </>
  );
}
