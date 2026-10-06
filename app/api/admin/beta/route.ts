import type { NextRequest } from 'next/server'

import { proxyAdminGet } from '@/lib/admin-proxy'

// BFF: proxy rsc-www's GET /api/admin/beta (the round with every answer and
// who gave it). Staff only - rsc-www checks.
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  return proxyAdminGet(request, '/api/admin/beta')
}
