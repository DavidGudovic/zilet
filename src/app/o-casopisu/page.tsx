export const metadata = { title: 'O časopisu' };
export default function Page() {
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
        <p>Savka Parađina</p>
        <h2>Autori i čitaoci</h2>
        <p>
          Uz svaki tekst stoji ime autora. Registrovani čitaoci mogu ostaviti komentar ispod
          tekstova za koje je komentarisanje otvoreno.
        </p>
      </div>
    </article>
  );
}
