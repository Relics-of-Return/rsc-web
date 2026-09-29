import type { NextRequest } from 'next/server'

import { proxyAdminGet } from '@/lib/admin-proxy'

// BFF: proxy rsc-www's GET /api/admin/reports/detail?id=N — the full case file
// for one report (snapshot, account facts, history).
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id') ?? ''
  return proxyAdminGet(request, `/api/admin/reports/detail?id=${encodeURIComponent(id)}`)
}
