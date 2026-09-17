import { absoluteUrl } from '@/lib/seo';
import type { MetadataRoute } from 'next';
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
        '/specimen',
        '/dev-art',
        '/specimen-fonts',
      ],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
  };
}
