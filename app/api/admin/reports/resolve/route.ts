import type { NextRequest } from 'next/server'

import { proxyAdminPost } from '@/lib/admin-proxy'

// BFF: proxy rsc-www's POST /api/admin/reports/resolve. rsc-www records who
// resolved the report, so this route only relays.
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  return proxyAdminPost(request, '/api/admin/reports/resolve')
}
