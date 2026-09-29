import { NextResponse } from 'next/server'

import { getWwwApiUrl } from '@/lib/www'

// BFF: proxy rsc-www's /api/worlds (live world list).
export const dynamic = 'force-dynamic'

// the game client lives on its own origin and reads this list for its
// in-game world switcher (rsc-client's src/title-screen.js). it's the same
// public list the status page shows, so any origin may read it
const HEADERS = { 'Access-Control-Allow-Origin': '*' }

export async function GET() {
  try {
    const res = await fetch(`${getWwwApiUrl()}/api/worlds`, {
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: 'failed to fetch worlds' },
        { status: res.status, headers: HEADERS },
      )
    }

    const data = await res.json()
    return NextResponse.json(data, { headers: HEADERS })
  } catch {
    return NextResponse.json(
      { error: 'the website API is unreachable' },
      { status: 502, headers: HEADERS },
    )
  }
}
