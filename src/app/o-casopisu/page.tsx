import Link from 'next/link';
import { getAuthors } from '@/lib/data';
import { pageMetadata } from '@/lib/seo';
export const dynamic = 'force-dynamic';
export const metadata = pageMetadata(
  'O časopisu',
  'Žilet je časopis za književnost, umjetnost i kulturu. Upoznajte redakciju i naše autore.',
  '/o-casopisu',
);
export default async function Page() {
  const editors = (await getAuthors()).filter((a) => a.isEditor);
  return (
    <article className="wrap information-page">
      <span className="eyebrow">O časopisu</span>
      <h1>Žilet</h1>
      <div className="prose">
        <p>
          Žilet je časopis za književnost, umjetnost i kulturu. Objavljuje poeziju, prozu, eseje,
          književnu kritiku i priloge o umjetnosti.
        </p>
        <p>Tekstovi zadržavaju jezik, pismo i izraz svojih autora. Čitanje je otvoreno svima.</p>
        <h2>Redakcija</h2>
        <div className="editor-people">
          {editors.map((editor) => (
            <Link key={editor.id} href={`/autor/${editor.slug}`}>
              {editor.name}
              <span>O meni ↗</span>
            </Link>
          ))}
        </div>
        <h2>Autori i čitaoci</h2>
        <p>
          Uz svaki tekst stoji ime autora. Registrovani čitaoci mogu ostaviti komentar ispod
          tekstova za koje je komentarisanje otvoreno.
        </p>
      </div>
    </article>
  );
}
