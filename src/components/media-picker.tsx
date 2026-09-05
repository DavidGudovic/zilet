'use client';
import { useRef, useState } from 'react';
import type { ImageRef } from '@/db/schema';
export function MediaPicker({
  items,
  onChange,
}: {
  items: ImageRef[];
  onChange: (items: ImageRef[]) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
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
  function upload(file?: File) {
    if (!file) return;
    setMessage('');
    if (file.size > 12 * 1024 * 1024) {
      setMessage('Fotografija može imati najviše 12 MB.');
      return;
    }
    const form = new FormData();
    form.set('file', file);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/media');
    xhr.upload.onprogress = (e) =>
      setProgress(e.lengthComputable ? Math.round((e.loaded / e.total) * 100) : 0);
    xhr.onerror = () => {
      setMessage('Veza je prekinuta. Pokušajte ponovo.');
      setProgress(null);
    };
    xhr.onload = () => {
      setProgress(null);
      try {
        const result = JSON.parse(xhr.responseText);
        if (xhr.status >= 400) setMessage(result.error);
        else add(result);
      } catch {
        setMessage('Fotografija nije sačuvana.');
      }
    };
    setProgress(0);
    xhr.send(form);
  }
  return (
    <div className="media-picker">
      <div
        className="upload-zone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          upload(e.dataTransfer.files[0]);
        }}
      >
        <p>Fotografija je izbor, ne obaveza.</p>
        <div>
          <button
            type="button"
            className="button secondary"
            onClick={() => input.current?.click()}
            disabled={progress !== null}
          >
            Dodaj fotografiju ↑
          </button>
          <button
            type="button"
            onClick={async () => {
              const r = await fetch('/api/media');
              if (r.ok) setLibrary((await r.json()).items);
              else setMessage('Fotografije trenutno nijesu dostupne.');
            }}
          >
            Iz biblioteke
          </button>
        </div>
        <span className="hint">JPG, PNG ili WebP · do 12 MB. Možete prevući fajl ovdje.</span>
        <input
          ref={input}
          hidden
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => upload(e.target.files?.[0])}
        />
        {progress !== null && <p role="status">Slanje fotografije… {progress}%</p>}
        {message && (
          <p className="form-error" role="alert">
            {message}
          </p>
        )}
      </div>
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
            <label>
              Položaj slike
              <select
                value={m.placement}
                onChange={(e) =>
                  onChange(
                    items.map((x) =>
                      x.id === m.id
                        ? { ...x, placement: e.target.value as ImageRef['placement'] }
                        : x,
                    ),
                  )
                }
              >
                <option value="above">Iznad djela</option>
                <option value="beside">Uz pjesmu</option>
                <option value="below">Ispod djela</option>
              </select>
            </label>
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
