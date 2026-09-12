'use client';
import { useState } from 'react';
import { MediaUploader } from './media-uploader';
import { SelectField } from './select-field';
import type { ImageRef } from '@/db/schema';
export function MediaPicker({
  items,
  onChange,
}: {
  items: ImageRef[];
  onChange: (items: ImageRef[]) => void;
}) {
  const [message, setMessage] = useState('');
  const [library, setLibrary] = useState<
    { id: string; filename: string; alt: string; caption: string; credit: string }[] | null
  >(null);
  function add(m: { id: string; alt?: string; caption?: string; credit?: string }) {
    if (items.some((x) => x.id === m.id)) return;
    onChange([
      ...items,
      {
        id: m.id,
        alt: m.alt || '',
        caption: m.caption || '',
        credit: m.credit || '',
        placement: 'below',
        focalX: 50,
        focalY: 50,
      },
    ]);
    setLibrary(null);
  }
  return (
    <div className="media-picker">
      <MediaUploader onUploaded={add}>
        <button
          type="button"
          onClick={async () => {
            try {
              const r = await fetch('/api/media');
              if (!r.ok) throw new Error();
              setLibrary((await r.json()).items);
            } catch {
              setMessage('Fotografije trenutno nijesu dostupne.');
            }
          }}
        >
          Iz biblioteke
        </button>
      </MediaUploader>
      {message && (
        <p className="form-error" role="alert">
          {message}
        </p>
      )}
      {library && (
        <div className="media-library">
          <button type="button" onClick={() => setLibrary(null)}>
            Zatvori izbor ×
          </button>
          {!library.length && <p>Još nema fotografija.</p>}
          {library.map((m) => (
            <button type="button" key={m.id} onClick={() => add(m)}>
              <img
                src={`/media/${m.id}?size=small`}
                width="160"
                height="120"
                alt={m.alt || m.filename}
              />
              <span>{m.filename}</span>
            </button>
          ))}
        </div>
      )}
      {items.map((m, i) => (
        <div className="selected-media" key={m.id}>
          <img
            src={`/media/${m.id}?size=small`}
            alt={m.alt || 'Izabrana fotografija'}
            width="250"
            height="180"
          />
          <div>
            {(['alt', 'caption', 'credit'] as const).map((key) => (
              <label key={key}>
                {key === 'alt'
                  ? 'Opis slike za čitače ekrana'
                  : key === 'caption'
                    ? 'Legenda (opciono)'
                    : 'Autor fotografije / izvor i prava'}
                <input
                  value={m[key]}
                  maxLength={key === 'caption' ? 1000 : 500}
                  onChange={(e) =>
                    onChange(
                      items.map((x) => (x.id === m.id ? { ...x, [key]: e.target.value } : x)),
                    )
                  }
                />
                {key === 'alt' && (
                  <span className="hint">Ukratko opišite ono što je važno na slici.</span>
                )}
              </label>
            ))}
            <SelectField
              label="Položaj slike"
              value={m.placement}
              onChange={(placement) =>
                onChange(
                  items.map((x) =>
                    x.id === m.id ? { ...x, placement: placement as ImageRef['placement'] } : x,
                  ),
                )
              }
              options={[
                { value: 'above', label: 'Iznad djela' },
                { value: 'beside', label: 'Uz pjesmu' },
                { value: 'below', label: 'Ispod djela' },
              ]}
            />
            <div className="media-actions">
              <button
                type="button"
                disabled={i === 0}
                onClick={() => {
                  const next = [...items];
                  [next[i - 1], next[i]] = [next[i], next[i - 1]];
                  onChange(next);
                }}
              >
                Pomjeri ranije ↑
              </button>
              <button type="button" onClick={() => onChange(items.filter((x) => x.id !== m.id))}>
                Ukloni iz teksta
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
