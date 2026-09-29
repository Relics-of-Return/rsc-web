import { NextResponse } from 'next/server'

import { getWwwApiUrl } from '@/lib/www'

// BFF: expose rsc-www's /api/config (server name, browser client URL, skill list).
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const res = await fetch(`${getWwwApiUrl()}/api/config`, {
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: 'failed to fetch config' },
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
