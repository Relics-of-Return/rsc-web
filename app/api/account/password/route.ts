import { NextResponse, type NextRequest } from 'next/server'

import { getWwwApiUrl, visitorHeaders } from '@/lib/www'

// BFF: proxy rsc-www's POST /api/account/password. The session cookie says
// whose password it is, and the visitor's address goes along for the same
// lockout wrong login passwords count towards.
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null)

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid request body' }, { status: 400 })
  }

  const cookie = request.headers.get('cookie') ?? ''

  try {
    const res = await fetch(`${getWwwApiUrl()}/api/account/password`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}), ...visitorHeaders(request) },
      body: JSON.stringify(body),
      cache: 'no-store',
    })

    const data = await res.json().catch(() => null)

    return NextResponse.json(data ?? { error: 'unexpected response' }, { status: data ? res.status : 502 })
  } catch {
    return NextResponse.json({ error: 'the website API is unreachable' }, { status: 502 })
  }
}
