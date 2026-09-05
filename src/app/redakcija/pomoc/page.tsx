import Link from 'next/link';
import { editorSession } from '@/lib/editor-session';
export default async function Page() {
  await editorSession();
  return (
    <article className="editor-help">
      <span className="eyebrow">Žilet / Mali vodič</span>
      <h1>Od prve riječi do objave.</h1>
      <p className="intro">Ako ste već pisali objavu na Facebooku, ovdje ćete se brzo snaći.</p>
      <ol className="help-steps">
        <li>
          <h2>Otvorite novi tekst</h2>
          <p>
            Izaberite <strong>+ Novi tekst</strong>, pa Pjesma, Tekst ili Galerija. Dodajte naslov i
            izaberite autora.
          </p>
        </li>
        <li>
          <h2>Pišite ili nalijepite</h2>
          <p>
            Kopirajte tekst iz svoje bilješke ili Facebook objave i nalijepite ga u Sadržaj. U
            pjesmi Enter prelazi u novi red, a prazan red odvaja strofe. Za naglašavanje prvo
            označite riječi, pa izaberite Kurziv ili Masno.
          </p>
        </li>
        <li>
          <h2>Dodajte sliku, ako želite</h2>
          <p>
            U Fotografijama izaberite sliku sa telefona ili iz biblioteke. Napišite šta se na njoj
            vidi i potpišite umjetnika, fotografa ili izvor. Koristite slike za koje imate pravo
            objavljivanja.
          </p>
        </li>
        <li>
          <h2>Pogledajte, pa objavite</h2>
          <p>
            <strong>Pregled</strong> otvara izgled za čitaoce. Kada ste zadovoljni, pritisnite{' '}
            <strong>Objavi</strong>. Nacrt se automatski čuva dok pišete; status „Sačuvano”
            potvrđuje da je sačuvan.
          </p>
        </li>
      </ol>
      <div className="help-notes">
        <h2>Poslije objave</h2>
        <p>
          Otvorite tekst i nastavite uređivanje. Čitaoci vide izmjene tek kad pritisnete{' '}
          <strong>Objavi izmjene</strong>. U Dodatnim mogućnostima možete istaknuti tekst na
          početnoj stranici ili ga povući iz javnosti.
        </p>
        <h2>Vaša stranica i lozinka</h2>
        <p>
          U <Link href="/redakcija/autori">Autorima</Link> uredite biografiju. U{' '}
          <Link href="/redakcija/nalog">Moj nalog</Link> promijenite lozinku. Ime autora ispod
          teksta birate posebno od naloga kojim ste prijavljeni.
        </p>
        <h2>Ako piše „Nije sačuvano”</h2>
        <p>
          Ostavite prozor otvoren, provjerite vezu i pritisnite Sačuvaj. Ako je drugi urednik već
          mijenjao tekst, otvorite sačuvanu verziju u drugom prozoru i uporedite ih prije nastavka.
        </p>
      </div>
      <Link className="button" href="/redakcija/novi">
        + Napišite prvi tekst
      </Link>
    </article>
  );
}
