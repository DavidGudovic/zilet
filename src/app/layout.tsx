import { headers } from 'next/headers';
import { requireUser } from '@/lib/security';
import { AnalyticsTracker } from '@/components/analytics-tracker';
import type { Metadata } from 'next';
import { pageMetadata, siteDescription, siteUrl } from '@/lib/seo';
import './fonts.css';
import './globals.css';
import './atmosphere.css';
import './editorial-experience.css';
import './editorial-flourish.css';
import './responsive-content.css';
import { PageAtmosphere } from '@/components/page-atmosphere';
import { Header, Footer } from '@/components/header';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  ...pageMetadata('Žilet — književnost, umjetnost i kultura', siteDescription, '/'),
  metadataBase: new URL(siteUrl()),
  title: { default: 'Žilet — književnost, umjetnost i kultura', template: '%s — Žilet' },
  // Each public page supplies its own canonical; private routes must not inherit home.
  alternates: undefined,
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
