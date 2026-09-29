import type { MetadataRoute } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://127.0.0.1:3000'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // staff tools and the BFF routes are not public pages
      disallow: ['/admin', '/api/'],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
