import { NextResponse, type NextRequest } from 'next/server'

import { getWwwApiUrl } from '@/lib/www'

// BFF: proxy rsc-www's /api/hiscores/player (per-player rank lookup).
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get('username') ?? ''

  try {
    const res = await fetch(
      `${getWwwApiUrl()}/api/hiscores/player?username=${encodeURIComponent(username)}`,
      { cache: 'no-store' },
    )

    if (!res.ok) {
      return NextResponse.json(
        { error: 'failed to fetch player ranks' },
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
