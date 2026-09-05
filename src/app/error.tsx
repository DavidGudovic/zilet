'use client';
export default function Error({ reset }: { reset: () => void }) {
  return (
    <section className="wrap empty">
      <h1>Stranica trenutno nije dostupna.</h1>
      <p>Pokušajte ponovo za trenutak.</p>
      <button className="button" onClick={reset}>
        Pokušaj ponovo
      </button>
    </section>
  );
}
