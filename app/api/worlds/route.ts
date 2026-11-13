import { proxyGet } from '@/lib/admin-proxy'

// BFF: proxy rsc-www's /api/worlds (live world list).
export const dynamic = 'force-dynamic'

/**
 * the game client lives on its own origin and reads this list for its
 * in-game world switcher (rsc-client's src/title-screen.js). it's the same
 * public list the status page shows, so any origin may read it
 */
export async function GET() {
  return proxyGet('/api/worlds', { cors: true })
}
