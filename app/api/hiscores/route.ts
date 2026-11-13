import type { NextRequest } from 'next/server'

import { hiscoreModeOf } from '@/data/game-modes'
import { proxyGet } from '@/lib/admin-proxy'
import { hiscoreHeaders } from '@/lib/www'

// BFF: proxy rsc-www's /api/hiscores (skill rankings with pagination, for
// everyone or, with ?mode=ironman, Ironman accounts ranked among themselves).
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const query = new URLSearchParams({
    skill: params.get('skill') ?? 'overall',
    page: params.get('page') ?? '0',
    mode: hiscoreModeOf(params.get('mode')),
    world: params.get('world') ?? '1',
  })

  return proxyGet(`/api/hiscores?${query}`, { headers: hiscoreHeaders(request) })
}
