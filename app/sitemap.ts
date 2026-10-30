import type { MetadataRoute } from 'next'

import { SITE_URL } from '@/lib/config'

interface RouteConfig {
  path: string
  changeFrequency: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never'
  priority: number
}

const PUBLIC_ROUTES: RouteConfig[] = [
  { path: '', changeFrequency: 'daily', priority: 1.0 },
  { path: '/play', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/download', changeFrequency: 'weekly', priority: 0.9 },
  { path: '/news', changeFrequency: 'daily', priority: 0.8 },
  { path: '/roadmap', changeFrequency: 'weekly', priority: 0.8 },
  { path: '/hiscores', changeFrequency: 'hourly', priority: 0.8 },
  { path: '/tradepost', changeFrequency: 'hourly', priority: 0.8 },
  { path: '/status', changeFrequency: 'hourly', priority: 0.7 },
  { path: '/map', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/countdown', changeFrequency: 'daily', priority: 0.6 },
  { path: '/login', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/register', changeFrequency: 'monthly', priority: 0.4 },
]

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  return PUBLIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }))
}
