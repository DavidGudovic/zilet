import { ProfileForm } from '@/components/profile-form';
import { headers } from 'next/headers';
import Link from 'next/link';
import { Arrow } from '@/components/arrow';
import { auth, registrationEnabled } from '@/lib/auth';
import { firstParams, safeReturn, type SearchParams } from '@/lib/content';
import { AccountForm, SignOut } from '@/components/account-form';
import { PasswordForm } from '@/components/password-form';
export const metadata = { title: 'Čitalački nalog', robots: { index: false, follow: false } };
export default async function Page({
  searchParams,
}: {
  searchParams: SearchParams<'returnTo' | 'verified' | 'mode' | 'error'>;
}) {
  const q = firstParams(await searchParams);
  const session = await auth.api.getSession({ headers: await headers() });
  return (
    <div className="wrap account-page">
      {/* A failed confirmation link appends error= to a callback that already says verified. */}
      {q.error ? (
        <p className="notice form-error" role="alert">
          {q.error === 'TOKEN_EXPIRED'
            ? 'Link za potvrdu adrese je istekao.'
            : 'Link za potvrdu adrese nije ispravan.'}{' '}
          Prijavite se svojom adresom i lozinkom; ako adresa još nije potvrđena, poslaćemo vam novi
          link.
        </p>
      ) : (
        q.verified && <p className="notice">Adresa je potvrđena. Možete se prijaviti.</p>
      )}
      {session ? (
        <section className="account-panel">
          <span className="eyebrow">Vaš nalog</span>
          <h1>{session.user.name}</h1>
          <p>Vaša adresa ostaje privatna.</p>
          <div className="account-links">
            <Link href={safeReturn(q.returnTo)}>
              Nastavite sa čitanjem <Arrow />
            </Link>
            {['editor', 'maintainer'].includes(session.user.role || '') && (
              <Link href="/redakcija">
                Otvorite redakciju <Arrow />
              </Link>
            )}
            <Link href="/posalji">
              Pošaljite svoj rad <Arrow />
            </Link>
            <SignOut />
          </div>
          <ProfileForm name={session.user.name} email={session.user.email} />
          <PasswordForm />
        </section>
      ) : (
        <AccountForm
          mode={q.mode === 'register' ? 'register' : 'login'}
          returnTo={safeReturn(q.returnTo)}
          registration={registrationEnabled()}
        />
      )}
    </div>
  );
}
