'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

export function MediaUploader({
  onUploaded,
  children,
}: {
  onUploaded: (image: { id: string }) => void;
  children?: ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  const uploaded = useRef(onUploaded);
  useEffect(() => {
    uploaded.current = onUploaded;
  }, [onUploaded]);
  const busy = useRef(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  function upload(file?: File) {
    if (!file || busy.current) return;
    setMessage('');
    if (file.size > 12 * 1024 * 1024) {
      setMessage('Fotografija može imati najviše 12 MB.');
      return;
    }
    busy.current = true;
    setProgress(0);
    const form = new FormData();
    form.set('file', file);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/media');
    xhr.upload.onprogress = (e) =>
      setProgress(e.lengthComputable ? Math.round((e.loaded / e.total) * 100) : 0);
    const finish = () => {
      busy.current = false;
      setProgress(null);
      if (input.current) input.current.value = '';
    };
    xhr.onerror = () => {
      finish();
      setMessage('Veza je prekinuta. Pokušajte ponovo.');
    };
    xhr.onload = () => {
      finish();
      try {
        const result = JSON.parse(xhr.responseText);
        if (xhr.status < 200 || xhr.status >= 300 || typeof result.id !== 'string')
          throw new Error(result.error || 'Fotografija nije sačuvana.');
        uploaded.current(result);
        setMessage('Fotografija je sačuvana u biblioteci.');
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Fotografija nije sačuvana.');
      }
    };
    xhr.send(form);
  }

  return (
    <div
      className="upload-zone"
      aria-busy={progress !== null}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        upload(e.dataTransfer.files[0]);
      }}
    >
      <p>Dodajte fotografiju u biblioteku.</p>
      <div>
        <button
          type="button"
          className="button secondary"
          onClick={() => input.current?.click()}
          disabled={progress !== null}
        >
          Dodaj fotografiju ↑
        </button>
        {children}
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
      {message && <p role="status">{message}</p>}
    </div>
  );
}
