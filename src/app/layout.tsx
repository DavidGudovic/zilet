import { headers } from 'next/headers';
import { requireUser } from '@/lib/security';
import { AnalyticsTracker } from '@/components/analytics-tracker';
import type { Metadata } from 'next';
import './fonts.css';
import './globals.css';
import './atmosphere.css';
import './editorial-experience.css';
import { PageAtmosphere } from '@/components/page-atmosphere';
import { Header, Footer } from '@/components/header';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || 'http://localhost:3000'),
  title: { default: 'Žilet — književnost, umjetnost i kultura', template: '%s — Žilet' },
  description: 'Poezija, proza, književna kritika i umjetnost. Čitajte Žilet.',
  openGraph: {
    title: 'Žilet',
    description: 'Časopis za književnost, umjetnost i kulturu',
    images: [{ url: '/identity/social-preview.png', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image', images: ['/identity/social-preview.png'] },
  icons: { icon: '/icon.svg' },
};
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let isEditor = false;
  try {
    await requireUser(await headers(), 'editor');
    isEditor = true;
  } catch {}
  return (
    <html lang="cnr-Latn">
      <body id="vrh">
        <a className="skip-link" href="#sadrzaj">
          Pređi na sadržaj
        </a>
        <Header isEditor={isEditor} />
        <main id="sadrzaj">{children}</main>
        <Footer />
        <PageAtmosphere />
        {process.env.UMAMI_URL && process.env.UMAMI_WEBSITE_ID && <AnalyticsTracker />}
      </body>
    </html>
  );
}
