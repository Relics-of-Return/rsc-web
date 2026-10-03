import type { NextRequest } from 'next/server'

import { proxyAdminGet } from '@/lib/admin-proxy'

// BFF: proxy rsc-www's GET /api/admin/logs — the staff command log of every
// moderation action taken in game or on the website. rsc-www only answers
// administrators, and writes the read itself to the log.
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.toString()
  return proxyAdminGet(request, `/api/admin/logs${search ? `?${search}` : ''}`)
}