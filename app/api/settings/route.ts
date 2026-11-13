import { proxyGet } from '@/lib/admin-proxy'

// BFF: expose rsc-www's /api/settings (the site's settings, such as which logo to show).
export const dynamic = 'force-dynamic'

/**
 * the game client lives on its own origin and reads its login scene from
 * here as it starts (rsc-client's src/title-screen.js). the settings are
 * public, so any origin may read them
 */
export async function GET() {
  return proxyGet('/api/settings', { cors: true })
}
