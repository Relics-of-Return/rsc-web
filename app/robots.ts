import type { MetadataRoute } from 'next'

import { SITE_URL } from '@/lib/config'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Private endpoints
      disallow: [
        '/api/',
        '/downloads/',
        '/account',
        '/admin',
        '/map/edit',
        '/models/edit',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
