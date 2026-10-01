import type { NextRequest } from 'next/server'

import { proxyAdminPost } from '@/lib/admin-proxy'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  return proxyAdminPost(request, '/api/admin/news/image')
}