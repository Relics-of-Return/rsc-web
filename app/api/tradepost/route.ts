import { NextResponse, type NextRequest } from 'next/server'

import { getItem, itemIconPath } from '@/lib/items'
import { parseWorld } from '@/lib/tradepost'
import type { TradepostMarketData } from '@/lib/types'
import { getWwwApiUrl } from '@/lib/www'

// BFF: the tradepost's market from rsc-www's /api/tradepost, with each item's
// name and picture added, so anything outside the site (a Discord bot, say)
// can use it as it is. ?world=N for another world's market
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const world = parseWorld(request.nextUrl.searchParams.get('world') ?? undefined)

  try {
    const res = await fetch(`${getWwwApiUrl()}/api/tradepost?world=${world}`, {
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'failed to fetch the tradepost' }, { status: res.status })
    }

    const market = (await res.json()) as TradepostMarketData

    return NextResponse.json({
      ...market,
      items: market.items.flatMap((entry) => {
        const item = getItem(entry.id)
        return item
          ? [{ ...entry, name: item.name, members: item.members, icon: itemIconPath(entry.id) }]
          : []
      }),
    })
  } catch {
    return NextResponse.json({ error: 'the website API is unreachable' }, { status: 502 })
  }
}
