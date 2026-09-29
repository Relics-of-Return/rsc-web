import { NextResponse, type NextRequest } from 'next/server'

import { getWwwApiUrl } from '@/lib/www'

// BFF: proxy rsc-www's POST /api/logout. The browser's session cookie is
// forwarded so rsc-www can delete the session server-side; the clearing
// Set-Cookie header is forwarded back.
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const cookie = request.headers.get('cookie') ?? ''

  try {
    const res = await fetch(`${getWwwApiUrl()}/api/logout`, {
      method: 'POST',
      headers: cookie ? { cookie } : undefined,
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: 'failed to log out' },
        { status: res.status },
      )
    }

    const data = await res.json()

    const next = NextResponse.json(data)

    for (const c of res.headers.getSetCookie()) {
      next.headers.append('set-cookie', c)
    }

    return next
  } catch {
    return NextResponse.json(
      { error: 'the website API is unreachable' },
      { status: 502 },
    )
  }
}
