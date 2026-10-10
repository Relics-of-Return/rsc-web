import type { MetadataRoute } from 'next'

import { SITE_URL } from '@/lib/config'

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', '/hiscores', '/tradepost', '/roadmap', '/news', '/status', '/play', '/login', '/register']

  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency:
      route === '/news' || route === '/status' || route === '/tradepost' ? 'hourly' : 'weekly',
    priority: route === '' ? 1 : 0.7,
  }))
}
