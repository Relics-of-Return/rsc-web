import { NextResponse } from 'next/server'

import { getWwwApiUrl } from '@/lib/www'

// BFF: proxy rsc-www's /api/players (live player positions for map).
//
// `?world=N` picks which world's positions to read. Each world keeps its own
// data server, so this is not a filter — it decides which one rsc-www asks.
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const world = new URL(request.url).searchParams.get('world')
  const query = world && /^\d+$/.test(world) ? `?world=${world}` : ''

  try {
    const res = await fetch(`${getWwwApiUrl()}/api/players${query}`, {
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: 'failed to fetch players' },
        { status: res.status },
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { error: 'the website API is unreachable' },
      { status: 502 },
    )
  }
}
