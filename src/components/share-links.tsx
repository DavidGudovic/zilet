'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { Arrow, Chevron } from './arrow';

export const facebookShareUrl = (url: string) =>
  `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
// Viber's documented share link; it opens the installed phone or desktop app.
export const viberShareUrl = (url: string) => `viber://forward?text=${encodeURIComponent(url)}`;

// Facebook and Viber build the preview (title, description, first picture) from the page itself.
// Readers get one "Podijeli" button that opens the choices; editors see them directly.
export function ShareLinks({
  url,
  title,
  collapsed = false,
}: {
  url: string;
  title: string;
  collapsed?: boolean;
}) {
  const id = useId();
  const toggle = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(!collapsed);
  const [copy, setCopy] = useState<'idle' | 'done' | 'failed'>('idle');
  const [native, setNative] = useState(false);
  useEffect(() => setNative(typeof navigator.share === 'function'), []);
  useEffect(() => {
    if (copy !== 'done') return;
    const timer = setTimeout(() => setCopy('idle'), 2500);
    return () => clearTimeout(timer);
  }, [copy]);
  const choices = (
    <div id={id} className="share-links" role="group" aria-label="Podijelite tekst">
      {!collapsed && (
        <span className="share-label" aria-hidden="true">
          Podijelite
        </span>
      )}
      <a href={facebookShareUrl(url)} target="_blank" rel="noopener noreferrer">
        Facebook <Arrow />
        <span className="sr-only"> (otvara se u novom prozoru)</span>
      </a>
      <a href={viberShareUrl(url)}>
        Viber <Arrow />
      </a>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopy('done');
          } catch {
            setCopy('failed');
          }
        }}
      >
        {copy === 'done' ? 'Link je kopiran ✓' : 'Kopiraj link'}
      </button>
      {native && (
        <button type="button" onClick={() => navigator.share({ title, url }).catch(() => {})}>
          Ostale aplikacije…
        </button>
      )}
      {copy === 'failed' && (
        <p className="hint share-fallback" role="status">
          Kopirajte adresu: <span>{url}</span>
        </p>
      )}
      <span className="sr-only" role="status">
        {copy === 'done' ? 'Link je kopiran.' : ''}
      </span>
    </div>
  );
  if (!collapsed) return choices;
  return (
    <div
      className="share-menu"
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || !open) return;
        setOpen(false);
        toggle.current?.focus();
      }}
    >
      <button
        ref={toggle}
        type="button"
        className="share-toggle"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => setOpen(!open)}
      >
        Podijeli <Chevron open={open} />
      </button>
      {open && choices}
    </div>
  );
}
