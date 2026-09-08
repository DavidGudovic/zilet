export const metadata = { title: 'Pravila i privatnost' };
export default function Page() {
  return (
    <article className="wrap information-page">
      <span className="eyebrow">Čitanje i razgovor</span>
      <h1>Pravila i privatnost</h1>
      <div className="prose">
        <p>
          Za čitanje tekstova nije potreban nalog. Za komentarisanje i slanje radova potrebni su ime
          za prikaz, adresa e-pošte i lozinka. Adresa e-pošte se ne objavljuje.
        </p>
        <h2>Komentari</h2>
        <p>
          Razgovarajte o djelu i argumentima. Ne objavljujte prijetnje, lične podatke drugih osoba
          ili neželjene reklame. Urednici mogu ukloniti komentar i obustaviti pristup nalogu.
          Uklonjen komentar mogu vratiti; autor može izbrisati svoj komentar.
        </p>
        <h2>Nalog i podaci</h2>
        <p>
          Podaci o nalogu služe za prijavu, potvrdu adrese, obnovu lozinke i zaštitu od zloupotrebe.
          Sesija koristi neophodan kolačić. Ne šaljemo biltene niti marketinške poruke.
        </p>
        <h2>Radovi čitalaca</h2>
        <p>
          Prilozi i fotografije ostaju privatni do odluke redakcije. Slanjem potvrđujete autorstvo i
          pravo na objavu. Izabrani rad objavljujemo uz vaše ime i zasebnu, potpisanu bilješku
          urednika.
        </p>
        <p>
          Kada je automatska provjera uključena, naslov i tekst šalju se servisu za automatsku
          provjeru radi prepoznavanja neželjenog sadržaja. Ime naloga, adresu e-pošte i fotografiju
          ne šaljemo tom servisu. Provjera može pogriješiti; za prigovor se javite Žiletu na
          Facebooku. Ako servis nije dostupan, prilog pregleda urednik.
        </p>
        <h2>Privatni nacrti</h2>
        <p>
          Nacrti, njihove ranije verzije i neobjavljene fotografije dostupni su samo ovlašćenoj
          redakciji. Izmjene objavljenog teksta postaju javne tek nakon objave.
        </p>
      </div>
    </article>
  );
}
