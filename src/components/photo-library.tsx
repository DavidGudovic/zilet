'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MediaPicker } from './media-picker';
import type { ImageRef } from '@/db/schema';
export function PhotoLibrary({
  items,
}: {
  items: { id: string; filename: string; width: number; height: number; inUse: boolean }[];
}) {
  const router = useRouter();
  useEffect(() => setLibraryItems(items), [items]);
  const [selected, setSelected] = useState<ImageRef[]>([]);
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
      <MediaPicker
        items={selected}
        onChange={(next) => {
          setSelected(next);
          if (next.some((m) => !libraryItems.some((item) => item.id === m.id))) router.refresh();
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
            />
            <figcaption>
              {m.filename} · {m.width} × {m.height}
              <br />
              {m.inUse ? 'U upotrebi' : 'Nije vezana za sadržaj'}
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
