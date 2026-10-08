import type { NextRequest } from 'next/server'

import { proxyAdminGet } from '@/lib/admin-proxy'

// BFF: proxy rsc-www's GET /api/account (the logged-in player's account and
// character on every world). rsc-www takes the player from the session cookie.
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  return proxyAdminGet(request, '/api/account')
}
