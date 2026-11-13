import type { NextRequest } from 'next/server'

import { proxyGet } from '@/lib/admin-proxy'
import { hiscoreHeaders } from '@/lib/www'

// BFF: proxy rsc-www's /api/hiscores/player (per-player rank lookup).
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const query = new URLSearchParams({
    username: params.get('username') ?? '',
    world: params.get('world') ?? '1',
  })

  return proxyGet(`/api/hiscores/player?${query}`, { headers: hiscoreHeaders(request) })
}
