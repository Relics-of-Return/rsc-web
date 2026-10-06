import type { NextRequest } from 'next/server'

import { proxyAdminGet } from '@/lib/admin-proxy'

// BFF: proxy rsc-www's GET /api/beta (the beta round testers are working on).
// Open to everyone; the session cookie goes along so the logged-in player's
// own answers come back marked.
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  return proxyAdminGet(request, '/api/beta')
}
