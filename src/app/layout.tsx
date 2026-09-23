import { headers } from 'next/headers';
import { requireUser } from '@/lib/security';
import { AnalyticsTracker } from '@/components/analytics-tracker';
import type { Metadata } from 'next';
import { siteUrl, siteTitle, siteDescription, ogLocale } from '@/lib/seo';
import './fonts.css';
import './globals.css';
import './atmosphere.css';
import './editorial-experience.css';
import './editorial-flourish.css';
import './responsive-content.css';
import './design-feedback.css';
import { PageAtmosphere } from '@/components/page-atmosphere';
import { Header, Footer } from '@/components/header';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: siteTitle, template: '%s | Žilet' },
  description: siteDescription,
  // No og:title or og:description here: Next fills them from each page's own title and
  // description, so pages without share metadata do not borrow the homepage's.
  openGraph: {
    siteName: 'Žilet',
    type: 'website',
    locale: ogLocale,
    images: [{ url: '/identity/social-preview.png', width: 1200, height: 630 }],
  },
  twitter: { card: 'summary_large_image', images: ['/identity/social-preview.png'] },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '16x16 32x32 48x48' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-touch-icon.png',
  },
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
