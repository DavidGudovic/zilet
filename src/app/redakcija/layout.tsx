import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireUser, HttpError } from '@/lib/security';
import { SignOut } from '@/components/account-form';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Redakcija', robots: { index: false, follow: false } };
export default async function Layout({ children }: { children: React.ReactNode }) {
  let user;
  try {
    user = await requireUser(await headers(), 'editor');
  } catch (e) {
    if (e instanceof HttpError && e.status === 401) redirect('/nalog?returnTo=/redakcija');
    return (
      <section className="wrap empty">
        <h1>Ovaj prostor je za redakciju.</h1>
        <p>Vaš nalog nema pristup uređivanju časopisa.</p>
        <Link href="/">Nastavite sa čitanjem ↗</Link>
      </section>
    );
  }
  return (
    <div className="desk">
      <header className="desk-header">
        <Link href="/" aria-label="Žilet — Početna">
          <img src="/identity/wordmark-green.svg" width="126" height="56" alt="Žilet" />
        </Link>
        <span className="desk-name">Redakcija</span>
        <div>
          <span>{user.name}</span>
          <SignOut />
        </div>
      </header>
      <nav className="desk-nav" aria-label="Redakcija">
        <Link href="/redakcija">Tekstovi</Link>
        <Link href="/redakcija/fotografije">Fotografije</Link>
        <Link href="/redakcija/komentari">Komentari</Link>
        <Link href="/redakcija/statistika">Statistika</Link>
        <Link className="button" href="/redakcija/novi">
          + Novi tekst
        </Link>
      </nav>
      <div className="desk-content">{children}</div>
      {user.role === 'maintainer' && (
        <footer className="desk-footer">
          <Link href="/redakcija/podesavanja">Tehnička podešavanja</Link>
        </footer>
      )}
    </div>
  );
}
