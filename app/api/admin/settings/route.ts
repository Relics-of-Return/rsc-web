import type { NextRequest } from 'next/server'

import { proxyAdminPost } from '@/lib/admin-proxy'

// BFF: proxy rsc-www's POST /api/admin/settings, which changes the site's
// settings. rsc-www only accepts it from administrators.
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  return proxyAdminPost(request, '/api/admin/settings')
}
