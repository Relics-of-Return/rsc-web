import { NextResponse, type NextRequest } from 'next/server'

import { getWwwApiUrl } from '@/lib/www'

// BFF: proxy rsc-www's POST /api/register. Body: { username, password, confirm }.
// Response: { success, code } — codes map to friendly messages client-side.
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  let body: unknown

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'invalid request body' }, { status: 400 })
  }

  try {
    const res = await fetch(`${getWwwApiUrl()}/api/register`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: 'failed to register' },
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
