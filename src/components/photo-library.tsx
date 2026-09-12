'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MediaUploader } from './media-uploader';
export function PhotoLibrary({
  items,
}: {
  items: {
    id: string;
    filename: string;
    width: number;
    height: number;
    inUse: boolean;
    postId: string | null;
  }[];
}) {
  const router = useRouter();
  useEffect(() => setLibraryItems(items), [items]);
  const [libraryItems, setLibraryItems] = useState(items);
  const [message, setMessage] = useState('');
  const [removing, setRemoving] = useState<string | null>(null);

  async function remove(id: string, filename: string) {
    if (
      !window.confirm(
        `Trajno izbrisati fotografiju „${filename}”? Mogu se izbrisati samo fotografije koje nijesu vezane za tekst, autora ili prilog.`,
      )
    )
      return;
    setRemoving(id);
    setMessage('');
    try {
      const response = await fetch(`/api/media/${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Fotografija nije izbrisana.');
      setLibraryItems((current) => current.filter((item) => item.id !== id));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Fotografija nije izbrisana.');
    } finally {
      setRemoving(null);
    }
  }
  return (
    <>
      <MediaUploader
        onUploaded={() => {
          router.replace('/redakcija/fotografije');
          router.refresh();
        }}
      />
      <p className="hint">
        Fotografije postaju javne tek kada ih objavite uz tekst. Opis i potpis dodaju se u tekstu.
        Možete trajno izbrisati samo fotografiju koja nije vezana za sadržaj.
      </p>
      {message && (
        <p className="form-error" role="alert">
          {message}
        </p>
      )}
      <div className="photo-grid">
        {libraryItems.map((m) => (
          <figure key={m.id}>
            <img
              src={`/media/${m.id}?size=small`}
              width={m.width}
              height={m.height}
              alt={m.filename}
              loading="lazy"
              decoding="async"
            />
            <figcaption>
              {m.filename} · {m.width} × {m.height}
              <br />
              {m.inUse ? 'Vezana za sadržaj' : 'Nije vezana za sadržaj'}
              {m.postId && (
                <>
                  {' · '}
                  <Link href={`/redakcija/tekst/${m.postId}`}>Otvori tekst</Link>
                </>
              )}
            </figcaption>
            <button
              type="button"
              className="text-button danger"
              onClick={() => remove(m.id, m.filename)}
              disabled={m.inUse || removing === m.id}
            >
              {m.inUse ? 'U upotrebi' : removing === m.id ? 'Brisanje…' : 'Trajno izbriši'}
            </button>
          </figure>
        ))}
      </div>
    </>
  );
}
