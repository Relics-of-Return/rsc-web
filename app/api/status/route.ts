import { NextResponse } from 'next/server'

import { getWwwApiUrl } from '@/lib/www'

// BFF: proxy rsc-www's /api/status so the browser never talks to it directly
// and no CORS/session-cookie issues arise.
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const res = await fetch(`${getWwwApiUrl()}/api/status`, {
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: 'failed to fetch status' },
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
