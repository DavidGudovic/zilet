import { AccountForm } from '@/components/account-form';
export const metadata = { title: 'Nova lozinka', robots: { index: false, follow: false } };
export default function Page() {
  return (
    <div className="wrap account-page">
      <AccountForm mode="reset" returnTo="/" registration={false} />
    </div>
  );
}
