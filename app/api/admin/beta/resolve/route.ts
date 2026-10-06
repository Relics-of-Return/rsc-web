import type { NextRequest } from 'next/server'

import { proxyAdminPost } from '@/lib/admin-proxy'

// BFF: proxy rsc-www's POST /api/admin/beta/resolve (what a broken report
// turned out to be). Staff only - rsc-www checks and records who decided.
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  return proxyAdminPost(request, '/api/admin/beta/resolve')
}
