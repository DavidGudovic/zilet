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
        '/oporavak',
        '/nova-lozinka',
        '/pretraga',
        '/specimen',
        '/dev-art',
      ],
    },
    sitemap: `${process.env.APP_URL || 'http://localhost:3000'}/sitemap.xml`,
  };
}
