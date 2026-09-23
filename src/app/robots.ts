import { absoluteUrl } from '@/lib/seo';
import type { MetadataRoute } from 'next';
export const dynamic = 'force-dynamic';
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Account and submission pages stay crawlable so search engines can read their noindex.
      disallow: ['/redakcija', '/api', '/specimen', '/dev-art', '/specimen-fonts'],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
