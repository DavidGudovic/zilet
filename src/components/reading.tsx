'use client';
import { useRef, useState } from 'react';
import type { Body, MediaView, RichNode } from '@/lib/content';
import { safeHref } from '@/lib/content';
export function RichText({ node }: { node: RichNode }) {
  if (node.type === 'text') {
    let el: React.ReactNode = node.text;
    for (const [i, m] of (node.marks || []).entries()) {
      if (m.type === 'bold') el = <strong key={i}>{el}</strong>;
      if (m.type === 'italic') el = <em key={i}>{el}</em>;
      if (m.type === 'link' && safeHref(m.attrs?.href || ''))
        el = (
          <a key={i} href={safeHref(m.attrs!.href)} rel="noopener noreferrer">
            {el}
          </a>
        );
    }
    return <>{el}</>;
  }
  const children = node.content?.map((n, i) => <RichText key={i} node={n} />);
  switch (node.type) {
    case 'paragraph':
      return <p>{children || <br />}</p>;
    case 'heading':
      return node.attrs?.level === 3 ? <h3>{children}</h3> : <h2>{children}</h2>;
    case 'blockquote':
      return <blockquote>{children}</blockquote>;
    case 'hardBreak':
      return <br />;
    case 'bulletList':
      return <ul>{children}</ul>;
    case 'orderedList':
      return <ol start={node.attrs?.start || 1}>{children}</ol>;
    case 'listItem':
      return <li>{children}</li>;
    default:
      return <>{children}</>;
  }
}
export function Poem({ body }: { body: Extract<Body, { kind: 'poem' }> }) {
  const [original, setOriginal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const boundaries = [
    ...new Set([0, body.text.length, ...body.emphasis.flatMap((m) => [m.from, m.to])]),
  ].sort((a, b) => a - b);
  const runs = boundaries.slice(0, -1).map((start, i) => {
    const end = boundaries[i + 1];
    let text: React.ReactNode = body.text.slice(start, end);
    for (const m of body.emphasis.filter((m) => m.from <= start && m.to >= end))
      text = m.style === 'italic' ? <em>{text}</em> : <strong>{text}</strong>;
    return <span key={start}>{text}</span>;
  });
  return (
    <div className="poetry">
      <div className="poem-controls">
        <button aria-pressed={original} onClick={() => setOriginal(!original)}>
          Izvorni prelom <span aria-hidden="true">{original ? '−' : '+'}</span>
        </button>
        <button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(body.text);
              setCopied(true);
              setCopyError(false);
            } catch {
              setCopied(false);
              setCopyError(true);
            }
          }}
        >
          {copied ? 'Kopirano' : 'Kopiraj pjesmu'}
        </button>
      </div>
      {copyError && (
        <p className="hint" role="status">
          Kopiranje nije dostupno. Označite tekst pjesme i kopirajte ga iz menija pregledača.
        </p>
      )}
      {original && (
        <p className="hint" id="verse-help">
          Izvorni redovi se ne prelamaju. Duge redove pomjerajte unutar pjesme; izgled zavisi od
          slova i uređaja.
        </p>
      )}
      <div
        className={`verse ${original ? 'original' : ''}`}
        style={{ textAlign: body.align }}
        tabIndex={original ? 0 : undefined}
        aria-describedby={original ? 'verse-help' : undefined}
      >
        {runs}
      </div>
      <span className="endmark" aria-hidden="true">
        ▪
      </span>
    </div>
  );
}
export function Share() {
  const [label, setLabel] = useState('Kopiraj link');
  return (
    <button
      className="text-button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(location.href.split('#')[0]);
          setLabel('Link je kopiran');
        } catch {
          setLabel('Kopirajte adresu iz pregledača');
        }
      }}
    >
      {label} <span aria-hidden="true">↗</span>
    </button>
  );
}
export function Artwork({ items }: { items: MediaView[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState(0);
  if (!items.length) return null;
  const current = items[index];
  return (
    <>
      <div className="artworks">
        {items.map((m, i) => (
          <figure key={m.id}>
            <button
              className="art-open"
              aria-label={`Otvori cijelu sliku: ${m.alt}`}
              onClick={() => {
                setIndex(i);
                dialog.current?.showModal();
              }}
            >
              <img
                src={m.url}
                srcSet={`${m.url}${m.url.includes('?') ? '&' : '?'}size=small 640w, ${m.url} ${m.width}w`}
                sizes="(max-width: 767px) 100vw, 780px"
                width={m.width}
                height={m.height}
                alt={m.alt}
                loading="lazy"
              />
              <span aria-hidden="true">↗</span>
            </button>
            <figcaption>
              {m.caption}
              {m.credit && <span>{m.credit}</span>}
            </figcaption>
          </figure>
        ))}
      </div>
      <dialog
        ref={dialog}
        className="image-dialog"
        aria-label="Pregled slike"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current.close();
        }}
      >
        <div className="viewer-tools">
          <span>
            {index + 1} / {items.length}
          </span>
          <button onClick={() => dialog.current?.close()} autoFocus>
            Zatvori ×
          </button>
        </div>
        <img src={current.url} width={current.width} height={current.height} alt={current.alt} />
        <p>
          {current.caption} — {current.credit}
        </p>
        {items.length > 1 && (
          <div className="viewer-tools">
            <button disabled={index === 0} onClick={() => setIndex(index - 1)}>
              ← Prethodna
            </button>
            <button disabled={index === items.length - 1} onClick={() => setIndex(index + 1)}>
              Sljedeća →
            </button>
          </div>
        )}
      </dialog>
    </>
  );
}
