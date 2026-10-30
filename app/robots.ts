import type { MetadataRoute } from 'next'

import { SITE_URL } from '@/lib/config'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/downloads/',
          '/account',
          '/admin',
        ],
        other: {
          'Content-Signal': 'search=yes, ai-input=yes, ai-train=no, use=reference',
        },
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
