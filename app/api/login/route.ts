import { NextResponse, type NextRequest } from 'next/server'

import { getWwwApiUrl, visitorHeaders } from '@/lib/www'

// BFF: proxy rsc-www's POST /api/login. Body: { username, password }.
// On success rsc-www sets a `rsc-www-session` cookie; it is forwarded to the
// browser so subsequent requests (including /api/session) can use it.
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid request body' }, { status: 400 })
  }

  try {
    const res = await fetch(`${getWwwApiUrl()}/api/login`, {
      method: 'POST',
      // who the visitor is, for rsc-www's per-IP login lockout
      headers: { 'content-type': 'application/json', ...visitorHeaders(request) },
      body: JSON.stringify(body),
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: 'failed to log in' },
        { status: res.status },
      )
    }

    const data = await res.json()

    const next = NextResponse.json(data)

    // Forward any Set-Cookie headers from rsc-www to the browser.
    for (const cookie of res.headers.getSetCookie()) {
      next.headers.append('set-cookie', cookie)
    }

    return next
  } catch {
    return NextResponse.json(
      { error: 'the website API is unreachable' },
      { status: 502 },
    )
  }
}
