import type { NextRequest } from 'next/server'

import { proxyAdminGet, proxyAdminPost } from '@/lib/admin-proxy'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const revision = request.nextUrl.searchParams.get('revision') ?? ''
  return proxyAdminGet(request, `/api/beta/ticks?revision=${encodeURIComponent(revision)}`)
}

export async function POST(request: NextRequest) {
  return proxyAdminPost(request, '/api/beta/ticks')
}
