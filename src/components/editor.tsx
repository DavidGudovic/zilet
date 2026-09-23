'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { RevisionContent } from '@/db/schema';
import { rubrics, rubricLabel, bodyText, type Author } from '@/lib/content';
import { convertBody, kindForRubric } from '@/lib/body-convert';
import { DeletePostButton } from './delete-post-button';
import { SelectField } from './select-field';
import { MediaPicker } from './media-picker';
import { ShareLinks } from './share-links';
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
type Toast = {
  tone: 'success' | 'error' | 'info';
  text: string;
  shareSlug?: string;
  sticky?: boolean;
  key: number;
};
type Action = 'save' | 'publish' | 'preview' | 'unpublish' | 'author' | 'history';
const primaryRubric = (list: string[]) => {
  const rubric = list.find((r) => r !== 'citaoci') || '';
  return rubric === 'price' ? 'proza' : rubric;
};
// Error pages from the proxy are HTML; show the editor's own message instead of a parser error.
const readJson = (res: Response) => res.json().catch(() => ({}));
const sentence = (parts: string[]) =>
  parts.length > 1 ? `${parts.slice(0, -1).join(', ')} i ${parts.at(-1)}` : parts[0] || '';
// Works saved before the rubric decided their form (e.g. Novosti pasted as verse) are
// realigned when opened, but only between verse and text, and only when no words change.
function aligned(content: RevisionContent) {
  const rubric = primaryRubric(content.rubrics);
  const kind = rubric && kindForRubric(rubric);
  if (!kind || (kind === 'poem') === (content.type === 'poem')) return content;
  const converted = convertBody(content.body, kind);
  return converted.lossy
    ? content
    : { ...content, type: converted.body.kind, body: converted.body };
}
export function Editor({
  authors: initialAuthors,
  postedBy,
  origin,
  readerSubmission = false,
  initial,
  post: initialPost,
  unpublishedChanges = false,
}: {
  authors: Author[];
  postedBy: string;
  origin: string;
  readerSubmission?: boolean;
  initial?: RevisionContent;
  post?: PostState;
  unpublishedChanges?: boolean;
}) {
  const [authors, setAuthors] = useState(initialAuthors);
  const [content, setContent] = useState(() =>
    initial ? aligned(initial) : { ...blank('poem', ''), rubrics: [] },
  );
  const [realigned, setRealigned] = useState(() =>
    initial && aligned(initial) !== initial
      ? `Tekst je prilagođen rubrici ${rubricLabel(primaryRubric(initial.rubrics))}: sada se prikazuje kao ${initial.type === 'poem' ? 'običan tekst sa pasusima, a ne kao pjesma' : 'pjesma, red po red'}. Riječi i naglašavanje su isti. Ako je tekst već objavljen, pritisnite „Objavi izmjene”.`
      : '',
  );
  const [toast, setToast] = useState<Toast | null>(null);
  const [toastHeld, setToastHeld] = useState(false);
  const data = useRef(content);
  data.current = content;
  const [post, setPost] = useState(initialPost);
  const postRef = useRef(initialPost);
  const saved = useRef(initial ? JSON.stringify(initial) : '');
  const flight = useRef<Promise<PostState | undefined> | null>(null);
  const [status, setStatus] = useState(initial ? 'Sačuvano' : 'Novi nacrt');
  const problem = useRef('');
  const [conflict, setConflict] = useState('');
  const blocked = Boolean(conflict);
  const [pending, setPending] = useState<Action | null>(null);
  const busy = pending !== null;
  const [draftAhead, setDraftAhead] = useState(unpublishedChanges);
  const [slot, setSlot] = useState('');
  const [history, setHistory] = useState<{ id: string; createdAt: string }[] | null>(null);
  const [newAuthor, setNewAuthor] = useState(false);
  const [authorName, setAuthorName] = useState('');
  const verse = useRef<HTMLTextAreaElement>(null);
  const [selection, setSelection] = useState({ from: 0, to: 0 });
  const dirty = JSON.stringify(content) !== saved.current;
  const notify = useCallback(
    (text: string, tone: Toast['tone'] = 'success', shareSlug?: string) =>
      // A failure already on screen is not announced twice.
      setToast((t) =>
        tone === 'error' && t?.tone === 'error' && t.text === text
          ? t
          : { text, tone, shareSlug, sticky: tone === 'error', key: Date.now() },
      ),
    [],
  );
  useEffect(() => {
    // Errors stay until closed or resolved; confirmations wait while pointed at or focused.
    if (!toast || toast.sticky || toastHeld) return;
    const timer = setTimeout(() => setToast(null), toast.shareSlug ? 10000 : 5000);
    return () => clearTimeout(timer);
  }, [toast, toastHeld]);
  function change(update: Partial<RevisionContent>) {
    setContent((c) => ({ ...c, ...update }));
  }
  const save = useCallback(async (): Promise<PostState | undefined> => {
    if (flight.current) await flight.current;
    if (blocked) return undefined;
    const snapshot = data.current;
    const needs = [
      !snapshot.rubrics.length && 'izaberite rubriku',
      !snapshot.title.trim() && 'upišite naslov',
      !snapshot.authorId && 'izaberite autora',
    ].filter((need): need is string => Boolean(need));
    if (needs.length) {
      const text = sentence(needs);
      problem.current = `Tekst još nije sačuvan: ${text}.`;
      setStatus(text[0].toUpperCase() + text.slice(1));
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
        const result = await readJson(res);
        if (!res.ok) {
          if (res.status === 409)
            setConflict(result.error || 'Drugi urednik je sačuvao novu verziju.');
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
        if (next.status === 'published') setDraftAhead(true);
        setStatus('Sačuvano');
        setToast((t) => (t?.tone === 'error' ? null : t));
        if (!current) window.history.replaceState(null, '', `/redakcija/tekst/${result.id}`);
        return next;
      } catch (e) {
        setStatus('Nije sačuvano');
        problem.current =
          e instanceof TypeError || !(e instanceof Error)
            ? 'Veza je prekinuta. Vaš tekst je ostao u ovom prozoru; pokušajte ponovo „Sačuvaj”.'
            : e.message;
        notify(problem.current, 'error');
        return undefined;
      }
    })();
    flight.current = work;
    const result = await work;
    flight.current = null;
    return result;
  }, [blocked, notify]);
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
  async function saveNow() {
    setPending('save');
    const before = saved.current;
    const current = await ensureSaved();
    setPending(null);
    if (!current) {
      notify(problem.current, 'error');
      return;
    }
    if (saved.current === before) notify('Sve izmjene su već sačuvane.');
    else if (current.status === 'published')
      notify('Izmjene su sačuvane u nacrtu. Čitaoci ih vide kada pritisnete „Objavi izmjene”.');
    else notify('Nacrt je sačuvan.');
  }
  async function publish() {
    setPending('publish');
    try {
      const current = await ensureSaved();
      if (!current) {
        notify(problem.current, 'error');
        return;
      }
      const res = await fetch(`/api/posts/${current.id}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: current.version, slot }),
      });
      const result = await readJson(res);
      if (!res.ok) throw new Error(result.error || 'Objava nije uspjela. Pokušajte ponovo.');
      const next = { ...current, version: result.version, status: 'published', slug: result.slug };
      postRef.current = next;
      setPost(next);
      setDraftAhead(false);
      setRealigned('');
      notify(
        current.status === 'published' ? 'Izmjene su objavljene.' : 'Tekst je objavljen.',
        'success',
        result.slug,
      );
    } catch (e) {
      notify(
        e instanceof Error && !(e instanceof TypeError)
          ? e.message
          : 'Objava nije uspjela. Provjerite vezu i pokušajte ponovo.',
        'error',
      );
    } finally {
      setPending(null);
    }
  }
  async function unpublish() {
    if (
      !window.confirm(
        'Povući tekst sa sajta? Čitaoci ga više neće vidjeti. Nacrt ostaje sačuvan i možete ga ponovo objaviti.',
      )
    )
      return;
    setPending('unpublish');
    try {
      const current = await ensureSaved();
      if (!current) {
        notify(problem.current, 'error');
        return;
      }
      const res = await fetch(`/api/posts/${current.id}/unpublish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version: current.version }),
      });
      const result = await readJson(res);
      if (!res.ok) throw new Error(result.error || 'Tekst nije povučen. Pokušajte ponovo.');
      const next = { ...current, status: 'unpublished', version: result.version };
      postRef.current = next;
      setPost(next);
      notify('Tekst je povučen. Nacrt je sačuvan i može se ponovo objaviti.');
    } catch (e) {
      notify(
        e instanceof Error && !(e instanceof TypeError)
          ? e.message
          : 'Tekst nije povučen. Provjerite vezu i pokušajte ponovo.',
        'error',
      );
    } finally {
      setPending(null);
    }
  }
  function mark(style: 'italic' | 'bold') {
    if (content.body.kind !== 'poem' || !verse.current) return;
    const { from, to } = selection;
    if (from === to) {
      notify('Najprije označite riječi u pjesmi, pa izaberite Kurziv ili Masno.', 'info');
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
  // Typing shows saving at once; autosave follows a moment later.
  const shownStatus = dirty && status === 'Sačuvano' ? 'Čuvanje…' : status;
  const stateTone =
    shownStatus === 'Sačuvano'
      ? 'saved'
      : shownStatus === 'Čuvanje…'
        ? 'saving'
        : shownStatus === 'Novi nacrt'
          ? 'idle'
          : shownStatus === 'Nije sačuvano'
            ? 'error'
            : 'needs';
  return (
    <div className="editing-desk">
      <h1 className="sr-only">{initial ? 'Uredi tekst' : 'Novi tekst'}</h1>
      <div className="editor-heading">
        <a href="/redakcija">← Tekstovi</a>
        <span className={`save-state save-${stateTone}`} role="status">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
            {stateTone === 'saved' ? (
              <path d="m2.5 7.5 3 3 6-7" fill="none" stroke="currentColor" strokeWidth="1.8" />
            ) : stateTone === 'error' ? (
              <path d="M7 2v6M7 10.5v1.5" stroke="currentColor" strokeWidth="1.8" />
            ) : (
              <circle cx="7" cy="7" r="3.5" fill="currentColor" />
            )}
          </svg>
          {shownStatus}
        </span>
        <div>
          <button type="button" onClick={saveNow} disabled={busy || blocked}>
            {pending === 'save' ? 'Čuvanje…' : 'Sačuvaj'}
          </button>
          <button
            type="button"
            onClick={async () => {
              setPending('preview');
              const current = await ensureSaved();
              if (current) window.location.assign(`/redakcija/pregled/${current.id}#radni-prostor`);
              else {
                notify(problem.current, 'error');
                setPending(null);
              }
            }}
            disabled={busy || blocked}
          >
            {pending === 'preview' ? 'Otvaranje…' : 'Pregled ↗'}
          </button>
          <button
            type="button"
            className="button"
            onClick={publish}
            disabled={busy || blocked}
            aria-busy={pending === 'publish'}
          >
            {pending === 'publish'
              ? 'Objavljivanje…'
              : post?.status === 'published'
                ? 'Objavi izmjene'
                : 'Objavi'}
          </button>
        </div>
      </div>
      {conflict && (
        <p className="notice form-error" role="alert">
          {conflict}{' '}
          <a
            href={post ? `/redakcija/tekst/${post.id}` : '/redakcija'}
            target="_blank"
            rel="noopener noreferrer"
          >
            Otvori sačuvanu verziju u drugom prozoru ↗
          </a>
        </p>
      )}
      {realigned && (
        <p className="notice" role="status">
          {realigned}
        </p>
      )}
      {post?.status === 'published' && (
        <div className={`published-note${draftAhead || dirty ? ' has-changes' : ''}`}>
          <p>
            {draftAhead || dirty ? (
              <strong>Imate izmjene koje čitaoci još ne vide. Pritisnite „Objavi izmjene”.</strong>
            ) : (
              'Tekst je objavljen. Javna verzija se mijenja tek kada izaberete „Objavi izmjene”.'
            )}{' '}
            <a href={`/tekst/${post.slug}`} target="_blank" rel="noopener noreferrer">
              Otvori objavljeni tekst ↗
            </a>
          </p>
          <ShareLinks url={`${origin}/tekst/${post.slug}`} title={content.title} />
        </div>
      )}
      <div className="editor-fields">
        <div className="rubric-first" data-next-step tabIndex={-1}>
          <SelectField
            label="Rubrika"
            value={primaryRubric(content.rubrics)}
            options={[
              { value: '', label: 'Izaberite rubriku' },
              ...rubrics
                .filter(([s]) => s !== 'price' && s !== 'citaoci')
                .map(([value, label]) => ({ value, label })),
            ]}
            onChange={(rubric) => {
              if (!rubric) return;
              // The rubric decides the form: verse for Poezija, formatted text elsewhere.
              const converted = convertBody(content.body, kindForRubric(rubric));
              if (
                converted.lossy &&
                !window.confirm(
                  'Pjesma čuva redove, kurziv i masna slova. Podnaslovi, citati, liste i linkovi postaće običan tekst. Premjestiti tekst u Poeziju?',
                )
              )
                return;
              change({
                rubrics: [
                  ...(readerSubmission ? ['citaoci'] : []),
                  rubric,
                  ...content.rubrics
                    .filter((r) => r !== 'citaoci')
                    .slice(1)
                    .filter((r) => r !== rubric),
                ],
                type: converted.body.kind,
                body: converted.body,
              });
              if (converted.body.kind !== content.body.kind && bodyText(content.body).trim())
                notify(
                  converted.body.kind === 'poem'
                    ? 'Tekst je pretvoren u pjesmu: svaki red ostaje kako je napisan.'
                    : 'Tekst je pretvoren u običan tekst sa pasusima. Riječi i naglašavanje su sačuvani.',
                  'info',
                );
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
              disabled={pending === 'author' || !authorName.trim()}
              onClick={async () => {
                setPending('author');
                try {
                  const r = await fetch('/api/authors', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: authorName }),
                  });
                  const a = await readJson(r);
                  if (!r.ok) throw new Error(a.error || 'Autor nije sačuvan. Provjerite ime.');
                  setAuthors((current) =>
                    current.some((item) => item.id === a.id) ? current : [...current, a],
                  );
                  change({ authorId: a.id });
                  notify(
                    r.status === 200
                      ? 'Izabran je postojeći autor. Velika i mala slova ne stvaraju novi profil.'
                      : `Autor ${a.name} je dodat i izabran.`,
                  );
                  setNewAuthor(false);
                  setAuthorName('');
                } catch (e) {
                  notify(
                    e instanceof Error && !(e instanceof TypeError)
                      ? e.message
                      : 'Autor nije sačuvan. Provjerite vezu i pokušajte ponovo.',
                    'error',
                  );
                } finally {
                  setPending(null);
                }
              }}
            >
              {pending === 'author' ? 'Čuvanje…' : 'Sačuvaj autora'}
            </button>
            <p className="hint">Autorski potpis ne otvara korisnički nalog.</p>
          </div>
        )}
        <p className="composer-credit">
          Objavu pripremio/la: <strong>{postedBy}</strong>
        </p>
        <section className="content-field">
          <h2>Sadržaj</h2>
          {!primaryRubric(content.rubrics) && content.body.kind === 'poem' ? (
            <>
              <p className="hint">
                Tekst možete nalijepiti odmah. Kada izaberete rubriku, prilagodiće joj se, a riječi
                ostaju iste.
              </p>
              <textarea
                className="verse-input"
                aria-label="Sadržaj"
                placeholder="Ovdje napišite ili nalijepite tekst…"
                value={content.body.text}
                onChange={(e) => {
                  if (content.body.kind === 'poem')
                    change({ body: { ...content.body, text: e.target.value, emphasis: [] } });
                }}
              />
            </>
          ) : content.body.kind === 'poem' ? (
            <>
              <p className="hint">
                Enter započinje novi red. Prazan red odvaja strofe. Razmaci i izvorno pismo ostaju
                sačuvani.
              </p>
              <div
                className="editor-toolbar"
                role="toolbar"
                aria-label="Uređivanje pjesme"
                onPointerDown={(event) => event.preventDefault()}
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
          <p className="field-help">
            Naslov i opis za pretragu pripremamo automatski iz objavljenog teksta. Ako napišete
            kratak uvod, koristićemo njega kao opis.
          </p>
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
                aria-expanded={Boolean(history)}
                disabled={pending === 'history'}
                onClick={async () => {
                  if (history) return setHistory(null);
                  setPending('history');
                  try {
                    const res = await fetch(`/api/posts/${post.id}`);
                    if (!res.ok) throw new Error();
                    setHistory((await res.json()).history);
                  } catch {
                    notify('Ranije verzije trenutno nijesu dostupne. Pokušajte ponovo.', 'error');
                  } finally {
                    setPending(null);
                  }
                }}
              >
                {pending === 'history'
                  ? 'Učitavanje…'
                  : history
                    ? 'Sakrij ranije verzije ↑'
                    : 'Ranije sačuvane verzije ↓'}
              </button>
              {history && (
                <div className="revision-list">
                  {history.map((r, i) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await fetch(`/api/posts/${post.id}?revision=${r.id}`);
                          if (!res.ok) throw new Error();
                          change(aligned((await res.json()).content));
                          notify(
                            'Ranija verzija je vraćena u nacrt. Javna verzija ostaje ista do objave.',
                            'info',
                          );
                        } catch {
                          notify('Ta verzija nije otvorena. Pokušajte ponovo.', 'error');
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
                  onClick={unpublish}
                  disabled={busy || blocked}
                >
                  {pending === 'unpublish' ? 'Povlačenje…' : 'Povuci objavljeni tekst'}
                </button>
              )}
            </>
          )}
        </details>
      </div>
      <div className="toast-region" aria-live="polite">
        {toast && (
          <div
            key={toast.key}
            className={`toast toast-${toast.tone}`}
            role={toast.tone === 'error' ? 'alert' : undefined}
            onPointerEnter={() => setToastHeld(true)}
            onPointerLeave={() => setToastHeld(false)}
            onFocus={() => setToastHeld(true)}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setToastHeld(false);
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
              {toast.tone === 'success' ? (
                <path d="m4 10.5 4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2" />
              ) : (
                <path d="M10 4v8M10 14.5v2" stroke="currentColor" strokeWidth="2" />
              )}
            </svg>
            <div>
              <p>{toast.text}</p>
              {toast.shareSlug && (
                <>
                  <a href={`/tekst/${toast.shareSlug}`} target="_blank" rel="noopener noreferrer">
                    Pogledajte tekst ↗
                  </a>
                  <ShareLinks url={`${origin}/tekst/${toast.shareSlug}`} title={content.title} />
                </>
              )}
            </div>
            <button
              type="button"
              aria-label="Zatvori obavještenje"
              onClick={() => {
                setToast(null);
                setToastHeld(false);
              }}
            >
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
