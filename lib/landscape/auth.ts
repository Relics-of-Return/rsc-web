import 'server-only'

import { NextResponse, type NextRequest } from 'next/server'

import { canEditWorld } from '@/lib/landscape/access'
import { getWwwApiUrl } from '@/lib/www'

/**
 * The world editor writes files, so unlike the admin routes it cannot simply
 * relay the request and let rsc-www decide. It asks rsc-www who the caller is
 * — forwarding the browser's session cookie, the same way lib/admin-proxy
 * does — and refuses anything that does not come back as staff.
 *
 * The page gates itself too, but that only decides what to draw. This is the
 * part that matters.
 */
export async function requireStaff(
  request: NextRequest,
): Promise<{ username: string; rank: number } | NextResponse> {
  const cookie = request.headers.get('cookie') ?? ''

  if (!cookie) {
    return NextResponse.json({ error: 'not signed in' }, { status: 401 })
  }

  let session: { username?: string | null; rank?: number | null } | null = null

  try {
    const res = await fetch(`${getWwwApiUrl()}/api/session`, {
      headers: { cookie },
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'not signed in' }, { status: 401 })
    }

    session = await res.json()
  } catch {
    return NextResponse.json(
      { error: 'the website API is unreachable' },
      { status: 502 },
    )
  }

  if (!session?.username) {
    return NextResponse.json({ error: 'not signed in' }, { status: 401 })
  }

  const rank = session.rank ?? 0

  if (!canEditWorld(rank)) {
    return NextResponse.json(
      { error: 'the world editor is for administrators only' },
      { status: 403 },
    )
  }

  return { username: session.username, rank }
}

/** True when the guard returned a refusal rather than a session. */
export function isRefusal(
  result: { username: string; rank: number } | NextResponse,
): result is NextResponse {
  return result instanceof NextResponse
}
