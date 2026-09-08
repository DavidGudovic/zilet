import { editorSession } from '@/lib/editor-session';
import { mailConfigured, registrationEnabled } from '@/lib/auth';
export default async function Page() {
  await editorSession('maintainer');
  return (
    <>
      <div className="desk-title">
        <h1>Tehnička podešavanja</h1>
      </div>
      <p>Konfiguracija se mijenja na serveru. Ovaj pregled ne prikazuje tajne.</p>
      <dl className="settings-list">
        <dt>Transakciona pošta</dt>
        <dd>{mailConfigured() ? 'Podešena' : 'Nije podešena'}</dd>
        <dt>Otvaranje naloga</dt>
        <dd>{registrationEnabled() ? 'Omogućeno' : 'Onemogućeno'}</dd>
        <dt>Statistika</dt>
        <dd>
          {process.env.UMAMI_URL &&
          process.env.UMAMI_WEBSITE_ID &&
          process.env.UMAMI_USERNAME &&
          process.env.UMAMI_PASSWORD
            ? 'Podešena'
            : 'Nije povezana'}
        </dd>
        <dt>Provjera priloga čitalaca</dt>
        <dd>
          {process.env.INTEL_KEY
            ? 'Automatska provjera uz ručni pregled kada servis nije dostupan'
            : 'Ručni pregled redakcije'}
        </dd>
        <dt>Facebook za prigovore</dt>
        <dd>{process.env.FACEBOOK_URL ? 'Link je podešen' : 'Dodajte FACEBOOK_URL'}</dd>
        <dt>Moderacija</dt>
        <dd>
          {process.env.COMMENTS_REQUIRE_APPROVAL === 'true' ? 'Prije objave' : 'Nakon objave'}
        </dd>
      </dl>
      <p>Pozivanje urednika, rezervne kopije i obnova opisani su u uputstvu za održavanje.</p>
    </>
  );
}
