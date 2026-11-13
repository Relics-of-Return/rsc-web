import type { NextRequest } from 'next/server'

import { proxyAdminGet, proxyAdminPost } from '@/lib/admin-proxy'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  return proxyAdminGet(request, '/api/admin/polls')
}

export async function POST(request: NextRequest) {
  return proxyAdminPost(request, '/api/admin/polls')
}
