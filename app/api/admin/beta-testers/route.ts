import type { NextRequest } from 'next/server'

import { proxyAdminGet } from '@/lib/admin-proxy'

// BFF: proxy rsc-www's GET /api/admin/beta-testers (staff: every account linked
// to Discord, and whether it holds the Beta Tester role).
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  return proxyAdminGet(request, '/api/admin/beta-testers')
}
