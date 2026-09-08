import { DeskNavigation } from '@/components/desk-navigation';
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
          <img src="/identity/wordmark-generated.webp" width="126" height="56" alt="Žilet" />
        </Link>
        <span className="desk-name">Redakcija</span>
        <div>
          <Link href="/redakcija/nalog">Moj nalog</Link>
          <SignOut />
        </div>
      </header>
      <DeskNavigation />
      <div className="desk-content" id="radni-prostor" tabIndex={-1}>
        {children}
      </div>
      {user.role === 'maintainer' && (
        <footer className="desk-footer">
          <Link href="/redakcija/podesavanja">Tehnička podešavanja</Link>
        </footer>
      )}
    </div>
  );
}
