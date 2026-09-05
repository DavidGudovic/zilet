import Link from 'next/link';
export default function NotFound() {
  return (
    <section className="wrap empty">
      <span className="eyebrow">404</span>
      <h1>Ova stranica nije pronađena.</h1>
      <p>Možda je adresa promijenjena ili tekst više nije dostupan.</p>
      <Link href="/pretraga">Potražite tekst ↗</Link>
    </section>
  );
}
