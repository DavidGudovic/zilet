'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { rubrics } from '@/lib/content';
import { SelectField } from './select-field';
export function SubmissionForm({
  facebookUrl,
  screening,
}: {
  facebookUrl?: string;
  screening: boolean;
}) {
  const router = useRouter();
  const [rubric, setRubric] = useState('');
  const [photo, setPhoto] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [flagged, setFlagged] = useState(false);
  const [sent, setSent] = useState(false);
  const notice = useRef<HTMLDivElement>(null);
  return (
    <form
      className="submission-form editor-fields"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        if (!rubric) {
          setMessage('Izaberite rubriku.');
          return;
        }
        setBusy(true);
        setMessage('');
        setFlagged(false);
        try {
          const data = new FormData(form);
          data.set('rubric', rubric);
          const r = await fetch('/api/submissions', { method: 'POST', body: data });
          const result = await r.json();
          setFlagged(Boolean(result.flagged));
          if (!r.ok) throw new Error(result.error || 'Rad nije poslat. Pokušajte ponovo.');
          setMessage(result.message);
          setSent(true);
          form.reset();
          setPhoto(false);
          router.refresh();
        } catch (e) {
          setMessage(
            e instanceof Error
              ? e.message
              : 'Veza nije dostupna. Rad je ostao u obrascu. Pokušajte ponovo.',
          );
        } finally {
          setBusy(false);
          requestAnimationFrame(() => notice.current?.focus());
        }
      }}
    >
      {!sent && (
        <fieldset disabled={busy} className="submission-fields">
          <SelectField
            label="Rubrika"
            value={rubric}
            options={[
              { value: '', label: 'Izaberite rubriku' },
              ...rubrics
                .filter(([s]) => !['price', 'citaoci'].includes(s))
                .map(([value, label]) => ({ value, label })),
            ]}
            onChange={(value) => {
              setRubric(value);
              requestAnimationFrame(() => document.getElementById('submission-title')?.focus());
            }}
          />
          <label>
            Naslov
            <textarea id="submission-title" name="title" required maxLength={240} rows={2} />
          </label>
          <label>
            Vaš tekst
            <textarea
              name="text"
              required
              maxLength={30000}
              rows={14}
              className="submission-text"
              spellCheck={false}
            />
          </label>
          <p className="hint">
            Do 30.000 znakova. Sačuvaćemo redove, razmake i pismo kojim pišete.
          </p>
          <label>
            Jedna fotografija (opciono)
            <input
              type="file"
              name="photo"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setPhoto(Boolean(e.target.files?.length))}
            />
          </label>
          <p className="hint">JPG, PNG ili WebP, do 5 MB.</p>
          {photo && (
            <>
              <label>
                Opis fotografije
                <input name="alt" required maxLength={500} />
              </label>
              <label>
                Autor fotografije / izvor i prava
                <input name="credit" required maxLength={500} />
              </label>
            </>
          )}
          <label className="check-label">
            <input type="checkbox" name="consent" value="yes" required />
            Potvrđujem da je rad moj i da imam pravo da podijelim fotografiju. Dozvoljavam Žiletu da
            objavi rad uz moje ime i uredničku bilješku.
          </label>
          {screening && (
            <p className="hint">
              Naslov i tekst šalju se Google Gemini servisu radi automatske provjere neželjenog
              sadržaja. Fotografiju, ime i adresu e-pošte ne šaljemo. Ako provjera nije dostupna,
              rad pregleda redakcija. Na besplatnom paketu Google može koristiti poslat tekst za
              unapređenje svojih usluga. Ne unosite povjerljive ili tuđe lične podatke.
            </p>
          )}
          <button className="button" disabled={busy || !rubric}>
            {busy ? 'Slanje rada…' : 'Pošalji redakciji'}
          </button>
        </fieldset>
      )}
      <div
        ref={notice}
        tabIndex={-1}
        role="status"
        className={flagged ? 'form-error' : 'submission-notice'}
      >
        {message}
        {flagged && facebookUrl && (
          <p>
            <a href={facebookUrl} target="_blank" rel="noopener noreferrer">
              Javite nam se na Facebooku ↗
            </a>
          </p>
        )}
      </div>
      {sent && (
        <button
          type="button"
          onClick={() => {
            setSent(false);
            setMessage('');
            setRubric('');
          }}
        >
          Pošalji još jedan rad
        </button>
      )}
    </form>
  );
}
