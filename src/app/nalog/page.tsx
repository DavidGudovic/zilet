import { ProfileForm } from '@/components/profile-form';
import { headers } from 'next/headers';
import Link from 'next/link';
import { auth, registrationEnabled } from '@/lib/auth';
import { safeReturn } from '@/lib/content';
import { AccountForm, SignOut } from '@/components/account-form';
import { PasswordForm } from '@/components/password-form';
export const metadata = { title: 'Čitalački nalog', robots: { index: false, follow: false } };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string; verified?: string; mode?: string }>;
}) {
  const q = await searchParams;
  const session = await auth.api.getSession({ headers: await headers() });
  return (
    <div className="wrap account-page">
      {q.verified && <p className="notice">Adresa je potvrđena. Možete se prijaviti.</p>}
      {session ? (
        <section className="account-panel">
          <span className="eyebrow">Vaš nalog</span>
          <h1>{session.user.name}</h1>
          <p>Vaša adresa ostaje privatna.</p>
          <div className="account-links">
            <Link href={safeReturn(q.returnTo)}>Nastavite sa čitanjem ↗</Link>
            {['editor', 'maintainer'].includes(session.user.role || '') && (
              <Link href="/redakcija">Otvorite redakciju ↗</Link>
            )}
            <Link href="/posalji">Pošaljite svoj rad ↗</Link>
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
