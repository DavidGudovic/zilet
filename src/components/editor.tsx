'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { RevisionContent } from '@/db/schema';
import { rubrics, bodyText, type Author } from '@/lib/content';
import { DeletePostButton } from './delete-post-button';
import { SelectField } from './select-field';
import { MediaPicker } from './media-picker';
import { remapEmphasis, toggleEmphasis } from '@/lib/verse-edit';
import { VerseText } from './reading';
const RichEditor = dynamic(() => import('./rich-editor').then((m) => m.RichEditor), {
  ssr: false,
  loading: () => <p>Otvaranje prostora za pisanje…</p>,
});
const blank = (kind: RevisionContent['type'], authorId: string): RevisionContent => ({
  title: '',
  intro: '',
  editorialNote: '',
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
  postedBy,
  readerSubmission = false,
  initial,
  post: initialPost,
}: {
  authors: Author[];
  postedBy: string;
  readerSubmission?: boolean;
  initial?: RevisionContent;
  post?: PostState;
}) {
  const [authors, setAuthors] = useState(initialAuthors);
  const [content, setContent] = useState(initial || { ...blank('poem', ''), rubrics: [] });
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
  const [selection, setSelection] = useState({ from: 0, to: 0 });
  const dirty = JSON.stringify(content) !== saved.current;
  function change(update: Partial<RevisionContent>) {
    setContent((c) => ({ ...c, ...update }));
    setMessage('');
  }
  const save = useCallback(async (): Promise<PostState | undefined> => {
    if (flight.current) await flight.current;
    if (blocked) return undefined;
    const snapshot = data.current;
    if (!snapshot.title.trim() || !snapshot.authorId || !snapshot.rubrics.length) {
      setStatus('Izaberite rubriku, dodajte naslov i autora');
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
    const { from, to } = selection;
    if (from === to) {
      setMessage('Najprije označite riječi u pjesmi.');
      return;
    }
    change({
      body: { ...content.body, emphasis: toggleEmphasis(content.body.emphasis, from, to, style) },
    });
    requestAnimationFrame(() => {
      verse.current?.focus();
      verse.current?.setSelectionRange(from, to);
    });
  }
  return (
    <div className="editing-desk">
      <h1 className="sr-only">{initial ? 'Uredi tekst' : 'Novi tekst'}</h1>
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
              if (current) window.location.assign(`/redakcija/pregled/${current.id}#radni-prostor`);
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
      <div className="editor-fields">
        <div className="rubric-first" data-next-step tabIndex={-1}>
          <SelectField
            label="Rubrika"
            value={
              content.rubrics.find((r) => r !== 'citaoci') === 'price'
                ? 'proza'
                : content.rubrics.find((r) => r !== 'citaoci') || ''
            }
            options={[
              { value: '', label: 'Izaberite rubriku' },
              ...rubrics
                .filter(([s]) => s !== 'price' && s !== 'citaoci')
                .map(([value, label]) => ({ value, label })),
            ]}
            onChange={(rubric) => {
              if (!rubric) return;
              const kind =
                rubric === 'poezija' ? 'poem' : rubric === 'slikarstvo' ? 'gallery' : 'prose';
              // Never convert authored formatting implicitly when moving an existing work.
              const empty = !bodyText(content.body).length;
              change({
                rubrics: [
                  ...(readerSubmission ? ['citaoci'] : []),
                  rubric,
                  ...content.rubrics
                    .filter((r) => r !== 'citaoci')
                    .slice(1)
                    .filter((r) => r !== rubric),
                ],
                ...(empty ? { type: kind, body: blank(kind, content.authorId).body } : {}),
              });
              if (!content.title)
                requestAnimationFrame(() => document.getElementById('text-title')?.focus());
            }}
          />
          {readerSubmission && (
            <p className="hint">Prihvaćeni rad čitaoca · objavljuje se i u Radovima čitalaca.</p>
          )}
          <p className="hint">
            Prvo izaberite đe će rad biti objavljen, zatim dodajte naslov, autora i sadržaj.
          </p>
        </div>
        <p className="composer-hint">
          Napišite ili nalijepite tekst, kao objavu na Facebooku. Nacrt se čuva automatski. Dugme
          „Objavi” ga otvara čitaocima.
        </p>
        <label className="title-field">
          Naslov
          <textarea
            rows={2}
            id="text-title"
            aria-label="Naslov"
            value={content.title}
            maxLength={240}
            onChange={(e) => change({ title: e.target.value })}
            placeholder="Naslov vašeg teksta"
          />
        </label>
        <div className="author-field">
          <SelectField
            label="Autor djela"
            value={content.authorId}
            onChange={(authorId) => change({ authorId })}
            options={[
              { value: '', label: 'Izaberite autora' },
              ...authors.map((a) => ({ value: a.id, label: a.name })),
            ]}
          />
          <button type="button" onClick={() => setNewAuthor(!newAuthor)}>
            + Dodaj autora
          </button>
        </div>
        {newAuthor && (
          <div className="new-author">
            <label>
              Ime autora
              <input
                autoFocus
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
        <p className="composer-credit">
          Objavu pripremio/la: <strong>{postedBy}</strong>
        </p>
        <section className="content-field">
          <h2>Sadržaj</h2>
          {content.body.kind === 'poem' ? (
            <>
              <p className="hint">
                Enter započinje novi red. Prazan red odvaja strofe. Razmaci i izvorno pismo ostaju
                sačuvani.
              </p>
              <div
                className="editor-toolbar"
                role="toolbar"
                aria-label="Uređivanje pjesme"
                onMouseDown={(event) => event.preventDefault()}
              >
                <button
                  type="button"
                  aria-pressed={
                    selection.to > selection.from &&
                    content.body.emphasis.some(
                      (m) =>
                        m.style === 'italic' && m.from <= selection.from && m.to >= selection.to,
                    )
                  }
                  onClick={() => mark('italic')}
                >
                  <em>Kurziv</em>
                </button>
                <button
                  type="button"
                  aria-pressed={
                    selection.to > selection.from &&
                    content.body.emphasis.some(
                      (m) => m.style === 'bold' && m.from <= selection.from && m.to >= selection.to,
                    )
                  }
                  onClick={() => mark('bold')}
                >
                  <strong>Masno</strong>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (content.body.kind !== 'poem' || !verse.current) return;
                    const start = selection.from,
                      end = selection.to;
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
                onSelect={(event) =>
                  setSelection({
                    from: event.currentTarget.selectionStart,
                    to: event.currentTarget.selectionEnd,
                  })
                }
                aria-label="Sadržaj pjesme"
                placeholder="Ovdje napišite ili nalijepite pjesmu…"
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
              {content.body.emphasis.length > 0 && (
                <div
                  className="verse-format-preview"
                  role="region"
                  aria-label="Pregled naglašavanja"
                >
                  <p className="hint">Pregled naglašavanja</p>
                  <div className="verse" style={{ textAlign: content.body.align }}>
                    <VerseText body={content.body} />
                  </div>
                </div>
              )}
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
        <section className="editor-note-field">
          <h2>Vaša bilješka uz djelo</h2>
          <p className="hint" id="note-help">
            Opciono: napišite svoj osvrt ili zašto dijelite ovo djelo. Bilješka se objavljuje
            odvojeno od djela, uz ime urednika koji je napiše ili izmijeni.
          </p>
          <label htmlFor="editorial-note">Bilješka urednika</label>
          <textarea
            id="editorial-note"
            value={content.editorialNote || ''}
            maxLength={4000}
            rows={5}
            aria-describedby="note-help"
            placeholder="Šta biste dodali uz ovo djelo?"
            onChange={(event) => change({ editorialNote: event.target.value })}
          />
        </section>
        <section>
          <h2>Fotografije</h2>
          <MediaPicker items={content.media} onChange={(media) => change({ media })} />
        </section>
        {post && ['draft', 'unpublished'].includes(post.status) && !dirty && !busy && (
          <section className="delete-draft">
            <DeletePostButton id={post.id} version={post.version} />
          </section>
        )}
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
            <SelectField
              label="Poravnanje pjesme"
              value={content.body.align}
              onChange={(align) => {
                if (content.body.kind === 'poem')
                  change({ body: { ...content.body, align: align as 'left' | 'center' } });
              }}
              options={[
                { value: 'left', label: 'Lijevo (uobičajeno)' },
                { value: 'center', label: 'Centrirano (po izboru autora)' },
              ]}
            />
          )}
          <SelectField
            label="Istakni na početnoj prilikom objave"
            value={slot}
            onChange={setSlot}
            options={[
              { value: '', label: 'Zadrži postojeći izbor' },
              { value: 'auto', label: 'Prepusti automatskom izboru' },
              { value: 'lead', label: 'Glavni tekst' },
              { value: 'poem', label: 'Izbor poezije' },
              { value: 'art', label: 'Umjetnost' },
            ]}
          />
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
