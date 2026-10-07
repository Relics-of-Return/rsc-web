import type { NextRequest } from 'next/server'

import { proxyAdminGet } from '@/lib/admin-proxy'

// BFF: proxy rsc-www's GET /api/discord (the logged-in player's Discord link
// and whether they hold the Beta Tester role). rsc-www takes the player from
// the session cookie.
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  return proxyAdminGet(request, '/api/discord')
}
