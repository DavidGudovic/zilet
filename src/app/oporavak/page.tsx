import { AccountForm } from '@/components/account-form';
import { mailConfigured } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Obnova lozinke', robots: { index: false, follow: false } };
export default function Page() {
  return (
    <div className="wrap account-page">
      {mailConfigured() ? (
        <AccountForm mode="recover" returnTo="/" registration={false} />
      ) : (
        <section className="empty">
          <h1>Obnova trenutno nije dostupna</h1>
          <p>Slanje poruka za obnovu naloga još nije podešeno.</p>
          <a href="/nalog">Nazad na prijavu</a>
        </section>
      )}
    </div>
  );
}
