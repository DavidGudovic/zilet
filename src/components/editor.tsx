'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { RevisionContent } from '@/db/schema';
import { rubrics, type Author } from '@/lib/content';
import { MediaPicker } from './media-picker';
import { remapEmphasis } from '@/lib/verse-edit';
const RichEditor = dynamic(() => import('./rich-editor').then((m) => m.RichEditor), {
  ssr: false,
  loading: () => <p>Otvaranje prostora za pisanje…</p>,
});
const blank = (kind: RevisionContent['type'], authorId: string): RevisionContent => ({
  title: '',
  intro: '',
  authorId,
  type: kind,
  body:
    kind === 'poem'
      ? { kind: 'poem', text: '', emphasis: [], align: 'left' }
      : { kind, doc: { type: 'doc', content: [{ type: 'paragraph' }] } },
  rubrics: [kind === 'poem' ? 'poezija' : kind === 'gallery' ? 'slikarstvo' : 'proza'],
  media: [],
  commentsOpen: true,
});
type PostState = { id: string; version: number; status: string; slug: string };
export function Editor({
  authors: initialAuthors,
  initial,
  post: initialPost,
}: {
  authors: Author[];
  initial?: RevisionContent;
  post?: PostState;
}) {
  const [authors, setAuthors] = useState(initialAuthors);
  const [content, setContent] = useState(initial || blank('poem', ''));
  const data = useRef(content);
  data.current = content;
  const [post, setPost] = useState(initialPost);
  const postRef = useRef(initialPost);
  const saved = useRef(initial ? JSON.stringify(initial) : '');
  const flight = useRef<Promise<PostState | undefined> | null>(null);
  const [status, setStatus] = useState(initial ? 'Sačuvano' : 'Novi nacrt');
  const [message, setMessage] = useState('');
  const [blocked, setBlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [slot, setSlot] = useState('');
  const [history, setHistory] = useState<{ id: string; createdAt: string }[] | null>(null);
  const [newAuthor, setNewAuthor] = useState(false);
  const [authorName, setAuthorName] = useState('');
  const verse = useRef<HTMLTextAreaElement>(null);
  const dirty = JSON.stringify(content) !== saved.current;
  function change(update: Partial<RevisionContent>) {
    setContent((c) => ({ ...c, ...update }));
    setMessage('');
  }
  const save = useCallback(async (): Promise<PostState | undefined> => {
    if (flight.current) await flight.current;
    if (blocked) return undefined;
    const snapshot = data.current;
    if (!snapshot.title.trim() || !snapshot.authorId) {
      setStatus('Dodajte naslov i autora');
      return undefined;
    }
    const serial = JSON.stringify(snapshot);
    if (serial === saved.current) return postRef.current;
    setStatus('Čuvanje…');
    const work = (async () => {
      try {
        const current = postRef.current;
        const res = await fetch(current ? `/api/posts/${current.id}` : '/api/posts', {
          method: current ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(
            current ? { version: current.version, content: snapshot } : snapshot,
          ),
        });
        const result = await res.json();
        if (!res.ok) {
          if (res.status === 409) setBlocked(true);
          throw new Error(result.error || 'Nacrt nije sačuvan.');
        }
        const next = {
          id: result.id,
          version: result.version,
          status: result.status,
          slug: result.slug,
        };
        postRef.current = next;
        setPost(next);
        saved.current = serial;
        setStatus('Sačuvano');
        if (!current) window.history.replaceState(null, '', `/redakcija/tekst/${result.id}`);
        return next;
      } catch (e) {
        setStatus('Nije sačuvano');
        setMessage(
          e instanceof Error ? e.message : 'Veza je prekinuta. Vaš tekst je ostao u ovom prozoru.',
        );
        return undefined;
      }
    })();
    flight.current = work;
    const result = await work;
    flight.current = null;
    return result;
  }, [blocked]);
  useEffect(() => {
    if (!dirty || blocked || status === 'Nije sačuvano') return;
    const timer = setTimeout(() => void save(), 1200);
    return () => clearTimeout(timer);
  }, [content, dirty, blocked, save, status]);
  useEffect(() => {
    function before(e: BeforeUnloadEvent) {
      if (JSON.stringify(data.current) !== saved.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', before);
    return () => window.removeEventListener('beforeunload', before);
  }, []);
  async function ensureSaved() {
    let current = await save();
    if (current && JSON.stringify(data.current) !== saved.current) current = await save();
    return current;
  }
  async function publish() {
    setBusy(true);
    setMessage('');
    try {
      const current = await ensureSaved();
      if (!current) return;
      const res = await fetch(`/api/posts/${current.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: current.version, slot }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      const next = { ...current, version: result.version, status: 'published', slug: result.slug };
      postRef.current = next;
      setPost(next);
      setMessage('Tekst je objavljen.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Objava nije uspjela.');
    } finally {
      setBusy(false);
    }
  }
  function mark(style: 'italic' | 'bold') {
    if (content.body.kind !== 'poem' || !verse.current) return;
    const from = verse.current.selectionStart,
      to = verse.current.selectionEnd;
    if (from === to) {
      setMessage('Najprije označite riječi u pjesmi.');
      return;
    }
    const same = content.body.emphasis.some(
      (m) => m.from === from && m.to === to && m.style === style,
    );
    change({
      body: {
        ...content.body,
        emphasis: same
          ? content.body.emphasis.filter(
              (m) => !(m.from === from && m.to === to && m.style === style),
            )
          : [...content.body.emphasis, { from, to, style }],
      },
    });
    verse.current.focus();
  }
  return (
    <div className="editing-desk">
      <div className="editor-heading">
        <a href="/redakcija">← Tekstovi</a>
        <span className={status === 'Nije sačuvano' ? 'form-error' : 'save-state'} role="status">
          {status}
        </span>
        <div>
          <button type="button" onClick={() => void save()} disabled={busy || blocked}>
            Sačuvaj
          </button>
          <button
            type="button"
            onClick={async () => {
              setBusy(true);
              const current = await ensureSaved();
              if (current)
                window.open(`/redakcija/pregled/${current.id}`, '_blank', 'noopener,noreferrer');
              setBusy(false);
            }}
            disabled={busy || blocked}
          >
            Pregled ↗
          </button>
          <button type="button" className="button" onClick={publish} disabled={busy || blocked}>
            {busy ? 'Sačekajte…' : post?.status === 'published' ? 'Objavi izmjene' : 'Objavi'}
          </button>
        </div>
      </div>
      {message && (
        <p className={status === 'Nije sačuvano' ? 'notice form-error' : 'notice'} role="status">
          {message}
          {blocked && (
            <a
              href={post ? `/redakcija/tekst/${post.id}` : '/redakcija'}
              target="_blank"
              rel="noopener noreferrer"
            >
              {' '}
              Otvori sačuvanu verziju u drugom prozoru ↗
            </a>
          )}
        </p>
      )}
      {post?.status === 'published' && (
        <p className="published-note">
          Javna verzija se mijenja tek kada izaberete „Objavi izmjene”.{' '}
          <a href={`/tekst/${post.slug}`} target="_blank" rel="noopener noreferrer">
            Otvori objavljeni tekst ↗
          </a>
        </p>
      )}
      {!initial && !post && (
        <fieldset className="type-starters">
          <legend>Šta pripremate?</legend>
          {[
            ['poem', 'Pjesma'],
            ['prose', 'Tekst'],
            ['gallery', 'Galerija'],
          ].map(([type, label]) => (
            <button
              type="button"
              key={type}
              aria-pressed={content.type === type}
              onClick={() => {
                if (!content.title)
                  change(blank(type as RevisionContent['type'], content.authorId));
                else setMessage('Za promjenu vrste otvorite novi tekst; vaš nacrt ostaje sačuvan.');
              }}
            >
              {label}
            </button>
          ))}
        </fieldset>
      )}
      <div className="editor-fields">
        <label className="title-field">
          Naslov
          <textarea
            rows={2}
            aria-label="Naslov"
            value={content.title}
            maxLength={240}
            onChange={(e) => change({ title: e.target.value })}
            placeholder="Naslov vašeg teksta"
          />
        </label>
        <div className="author-field">
          <label>
            Autor
            <select value={content.authorId} onChange={(e) => change({ authorId: e.target.value })}>
              <option value="">Izaberite autora</option>
              {authors.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={() => setNewAuthor(!newAuthor)}>
            + Dodaj autora
          </button>
        </div>
        {newAuthor && (
          <div className="new-author">
            <label>
              Ime autora
              <input
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                maxLength={120}
              />
            </label>
            <button
              className="button secondary"
              type="button"
              onClick={async () => {
                const r = await fetch('/api/authors', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name: authorName }),
                });
                if (r.ok) {
                  const a = await r.json();
                  setAuthors([...authors, a]);
                  change({ authorId: a.id });
                  setNewAuthor(false);
                  setAuthorName('');
                } else setMessage('Autor nije sačuvan. Provjerite ime.');
              }}
            >
              Sačuvaj autora
            </button>
            <p className="hint">Autorski potpis ne otvara korisnički nalog.</p>
          </div>
        )}
        <section className="content-field">
          <h2>Sadržaj</h2>
          {content.body.kind === 'poem' ? (
            <>
              <p className="hint">
                Enter započinje novi red. Prazan red odvaja strofe. Razmaci i izvorno pismo ostaju
                sačuvani.
              </p>
              <div className="editor-toolbar" role="toolbar" aria-label="Uređivanje pjesme">
                <button type="button" onClick={() => mark('italic')}>
                  <em>Kurziv</em>
                </button>
                <button type="button" onClick={() => mark('bold')}>
                  <strong>Masno</strong>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (content.body.kind !== 'poem' || !verse.current) return;
                    const start = verse.current.selectionStart,
                      end = verse.current.selectionEnd;
                    const text =
                      content.body.text.slice(0, start) + '\n\n' + content.body.text.slice(end);
                    change({
                      body: {
                        ...content.body,
                        text,
                        emphasis: remapEmphasis(content.body.text, text, content.body.emphasis),
                      },
                    });
                  }}
                >
                  Nova strofa
                </button>
              </div>
              <textarea
                className="verse-input"
                ref={verse}
                aria-label="Sadržaj pjesme"
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="off"
                value={content.body.text}
                onChange={(e) => {
                  if (content.body.kind === 'poem')
                    change({
                      body: {
                        ...content.body,
                        text: e.target.value,
                        emphasis: remapEmphasis(
                          content.body.text,
                          e.target.value,
                          content.body.emphasis,
                        ),
                      },
                    });
                }}
              />
              <p className="hint">Naglašene djelove provjerite u pregledu prije objave.</p>
            </>
          ) : (
            <RichEditor
              doc={content.body.doc}
              onChange={(doc) =>
                change({ body: { kind: content.type === 'gallery' ? 'gallery' : 'prose', doc } })
              }
            />
          )}
        </section>
        <section>
          <h2>Fotografije</h2>
          <MediaPicker items={content.media} onChange={(media) => change({ media })} />
        </section>
        <fieldset className="rubric-checkboxes">
          <legend>Rubrika</legend>
          {rubrics.map(([slug, label]) => (
            <label key={slug}>
              <input
                type="checkbox"
                checked={content.rubrics.includes(slug)}
                onChange={(e) =>
                  change({
                    rubrics: e.target.checked
                      ? [...content.rubrics, slug].slice(0, 4)
                      : content.rubrics.filter((s) => s !== slug),
                  })
                }
              />
              {label}
            </label>
          ))}
        </fieldset>
        <details className="advanced">
          <summary>Dodatne mogućnosti</summary>
          <label>
            Kratak uvod (opciono)
            <textarea
              value={content.intro}
              maxLength={2000}
              rows={3}
              onChange={(e) => change({ intro: e.target.value })}
            />
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={content.commentsOpen}
              onChange={(e) => change({ commentsOpen: e.target.checked })}
            />
            Dozvoli komentare
          </label>
          {content.body.kind === 'poem' && (
            <label>
              Poravnanje pjesme
              <select
                value={content.body.align}
                onChange={(e) => {
                  if (content.body.kind === 'poem')
                    change({
                      body: { ...content.body, align: e.target.value as 'left' | 'center' },
                    });
                }}
              >
                <option value="left">Lijevo (uobičajeno)</option>
                <option value="center">Centrirano (po izboru autora)</option>
              </select>
            </label>
          )}
          <label>
            Istakni na početnoj prilikom objave
            <select value={slot} onChange={(e) => setSlot(e.target.value)}>
              <option value="">Zadrži postojeći izbor</option>
              <option value="auto">Prepusti automatskom izboru</option>
              <option value="lead">Glavni tekst</option>
              <option value="poem">Izbor poezije</option>
              <option value="art">Umjetnost</option>
            </select>
          </label>
          {post && (
            <>
              <button
                className="text-button"
                type="button"
                onClick={async () => {
                  const res = await fetch(`/api/posts/${post.id}`);
                  if (res.ok) setHistory((await res.json()).history);
                }}
              >
                Ranije sačuvane verzije ↓
              </button>
              {history && (
                <div className="revision-list">
                  {history.map((r, i) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={async () => {
                        const res = await fetch(`/api/posts/${post.id}?revision=${r.id}`);
                        if (res.ok) {
                          change((await res.json()).content);
                          setMessage(
                            'Ranija verzija je vraćena u nacrt. Javna verzija ostaje ista do objave.',
                          );
                        }
                      }}
                    >
                      Verzija {history.length - i} ·{' '}
                      {new Date(r.createdAt).toLocaleString('sr-Latn-ME')}
                    </button>
                  ))}
                </div>
              )}
              {post.status === 'published' && (
                <button
                  type="button"
                  className="text-button danger"
                  onClick={async () => {
                    const current = await ensureSaved();
                    if (!current) return;
                    const res = await fetch(`/api/posts/${current.id}/unpublish`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ version: current.version }),
                    });
                    const result = await res.json();
                    if (res.ok) {
                      const next = { ...current, status: 'unpublished', version: result.version };
                      postRef.current = next;
                      setPost(next);
                      setMessage('Tekst je povučen. Nacrt je sačuvan i može se ponovo objaviti.');
                    } else setMessage(result.error);
                  }}
                >
                  Povuci objavljeni tekst
                </button>
              )}
            </>
          )}
        </details>
      </div>
    </div>
  );
}
