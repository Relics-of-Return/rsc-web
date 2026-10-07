import { NextResponse, type NextRequest } from 'next/server'

import { getWwwApiUrl } from '@/lib/www'

// "Link Discord" on the account page: rsc-www makes Discord's consent page
// address for the logged-in player (with a state only their session can
// complete), and the browser is sent there. Anything that goes wrong lands
// back on the account page with a reason.
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const cookie = request.headers.get('cookie') ?? ''
  const back = (reason: string) =>
    NextResponse.redirect(new URL(`/account?discord=${reason}`, request.url))

  try {
    const res = await fetch(`${getWwwApiUrl()}/api/discord/link`, {
      headers: cookie ? { cookie } : undefined,
      cache: 'no-store',
    })

    if (res.status === 401) return back('login')

    const data = (await res.json().catch(() => null)) as { url?: string } | null

    if (!res.ok || !data?.url?.startsWith('https://discord.com/')) return back('unavailable')

    return NextResponse.redirect(data.url)
  } catch {
    return back('unavailable')
  }
}
