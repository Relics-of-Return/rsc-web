import { NextResponse, type NextRequest } from 'next/server'

import { getWwwApiUrl } from '@/lib/www'

// Where Discord sends the player back after its consent page (the redirect
// registered with the Discord application). rsc-www checks the state against
// the session, asks Discord who they are and whether they hold the Beta Tester
// role, and saves the link; the player lands on the account page either way.
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  // only these words travel back, never rsc-www's own text, so the address
  // can't be made to put words on the account page
  const back = (result: string) =>
    NextResponse.redirect(new URL(`/account?discord=${result}`, request.url))

  // the player pressed "Cancel" on Discord's page
  if (params.get('error')) return back('cancelled')

  const code = params.get('code')
  const state = params.get('state')

  if (!code || !state) return back('failed')

  const cookie = request.headers.get('cookie') ?? ''

  try {
    const res = await fetch(`${getWwwApiUrl()}/api/discord/callback`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
      body: JSON.stringify({ code, state }),
      cache: 'no-store',
    })

    const data = (await res.json().catch(() => null)) as
      | { tester?: boolean; inServer?: boolean }
      | null

    if (res.status === 401) return back('login')
    // an expired or reused state, or a code Discord no longer accepts
    if (res.status === 400) return back('expired')
    if (!res.ok || !data) return back('failed')

    return back(data.tester ? 'tester' : data.inServer ? 'no-role' : 'not-in-server')
  } catch {
    return back('failed')
  }
}
