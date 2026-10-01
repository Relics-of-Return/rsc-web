import type { NextRequest } from 'next/server'

import { proxyAdminGet, proxyAdminPost } from '@/lib/admin-proxy'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const page = request.nextUrl.searchParams.get('page') ?? '0'
  const id = request.nextUrl.searchParams.get('id')
  const params = new URLSearchParams({ page })

  if (id !== null) params.set('id', id)

  return proxyAdminGet(request, `/api/admin/news?${params}`)
}

export async function POST(request: NextRequest) {
  return proxyAdminPost(request, '/api/admin/news')
}