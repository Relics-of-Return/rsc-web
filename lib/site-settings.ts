import type { SiteSettings } from '@/lib/types'
import { fetchWwwJson } from '@/lib/www'

/** What the site shows when rsc-www can't be reached. */
export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  halloweenLogo: false,
  loginTheme: 'seasonal',
}

/**
 * The site's settings for server components, read on every request so a
 * change in the admin section shows on the next page anyone loads.
 */
export async function readSiteSettings(): Promise<SiteSettings> {
  try {
    const settings = await fetchWwwJson<Partial<SiteSettings>>('/api/settings')
    return { ...DEFAULT_SITE_SETTINGS, ...settings }
  } catch {
    return DEFAULT_SITE_SETTINGS
  }
}
