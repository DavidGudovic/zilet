'use client';
import { useState } from 'react';
import { MediaPicker } from './media-picker';
import type { ImageRef } from '@/db/schema';
export function PhotoLibrary({
  items,
}: {
  items: { id: string; filename: string; width: number; height: number }[];
}) {
  const [selected, setSelected] = useState<ImageRef[]>([]);
  return (
    <>
      <MediaPicker items={selected} onChange={setSelected} />
      <p className="hint">
        Fotografije postaju javne tek kada ih objavite uz tekst. Opis i potpis dodaju se u tekstu.
      </p>
      <div className="photo-grid">
        {items.map((m) => (
          <figure key={m.id}>
            <img
              src={`/media/${m.id}?size=small`}
              width={m.width}
              height={m.height}
              alt={m.filename}
            />
            <figcaption>
              {m.filename} · {m.width} × {m.height}
            </figcaption>
          </figure>
        ))}
      </div>
    </>
  );
}
