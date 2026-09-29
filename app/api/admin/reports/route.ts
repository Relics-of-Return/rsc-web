import type { NextRequest } from 'next/server'

import { proxyAdminGet } from '@/lib/admin-proxy'

// BFF: proxy rsc-www's GET /api/admin/reports (the in-game abuse report queue).
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.toString()
  return proxyAdminGet(request, `/api/admin/reports${search ? `?${search}` : ''}`)
}
