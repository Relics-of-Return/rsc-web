import type { NextRequest } from 'next/server'

import { proxyGet } from '@/lib/admin-proxy'

// BFF: proxy rsc-www's /api/news (paginated list or single article by id).
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')
  const params = new URLSearchParams({ page: request.nextUrl.searchParams.get('page') ?? '0' })

  if (id !== null) {
    params.set('id', id)
  }

  return proxyGet(`/api/news?${params}`)
}
