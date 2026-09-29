import { NextResponse } from 'next/server'

import { getWwwApiUrl } from '@/lib/www'

// BFF: expose rsc-www's /api/settings (the site's settings, such as which logo to show).
export const dynamic = 'force-dynamic'

// the game client lives on its own origin and reads its login scene from
// here as it starts (rsc-client's src/title-screen.js). the settings are
// public, so any origin may read them
const HEADERS = { 'Access-Control-Allow-Origin': '*' }

export async function GET() {
  try {
    const res = await fetch(`${getWwwApiUrl()}/api/settings`, {
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: 'failed to fetch settings' },
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
