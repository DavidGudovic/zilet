import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/seo';
export const dynamic = 'force-dynamic';
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/redakcija',
        '/api',
        '/nalog',
        '/posalji',
        '/oporavak',
        '/nova-lozinka',
        '/pretraga',
        '/specimen',
        '/dev-art',
      ],
    },
    sitemap: siteUrl('/sitemap.xml'),
  };
}
