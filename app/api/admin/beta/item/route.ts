import type { NextRequest } from 'next/server'

import { proxyAdminPost } from '@/lib/admin-proxy'

// BFF: proxy rsc-www's POST /api/admin/beta/item (add, change or remove a
// checklist item). Staff only - rsc-www checks.
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  return proxyAdminPost(request, '/api/admin/beta/item')
}
