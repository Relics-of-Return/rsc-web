import { NextResponse, type NextRequest } from 'next/server'

import { getWwwApiUrl } from '@/lib/www'

// BFF: proxy rsc-www's GET /api/session. The browser's session cookie is
// forwarded so rsc-www can resolve it. Response: { username: string | null }.
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const cookie = request.headers.get('cookie') ?? ''

  try {
    const res = await fetch(`${getWwwApiUrl()}/api/session`, {
      headers: cookie ? { cookie } : undefined,
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: 'failed to fetch session' },
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
