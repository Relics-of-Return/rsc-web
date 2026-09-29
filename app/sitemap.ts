import type { MetadataRoute } from 'next'

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://127.0.0.1:3000'

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ['', '/hiscores', '/tradepost', '/roadmap', '/news', '/status', '/play', '/login', '/register']

  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: new Date(),
    changeFrequency:
      route === '/news' || route === '/status' || route === '/tradepost' ? 'hourly' : 'weekly',
    priority: route === '' ? 1 : 0.7,
  }))
}
