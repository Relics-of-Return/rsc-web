import type { NextRequest } from 'next/server'

import { proxyAdminImage } from '@/lib/admin-proxy'

// BFF: proxy rsc-www's GET /api/admin/reports/screenshot?id=N — the screenshot
// the reporter's game client uploaded with the report.
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id') ?? ''
  return proxyAdminImage(request, `/api/admin/reports/screenshot?id=${encodeURIComponent(id)}`)
}
