import { NextResponse, type NextRequest } from 'next/server'

import { getItem, itemIconPath } from '@/lib/items'
import { parseWorld } from '@/lib/tradepost'
import type { TradepostItemData } from '@/lib/types'
import { getWwwApiUrl } from '@/lib/www'

// BFF: one item's order book, recent trades, trends and price history from
// rsc-www's /api/tradepost/item, with its name, description and picture
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const item = /^\d+$/.test(id) ? getItem(Number(id)) : null

  if (!item) {
    return NextResponse.json({ error: 'no such tradeable item' }, { status: 404 })
  }

  const world = parseWorld(request.nextUrl.searchParams.get('world') ?? undefined)

  try {
    const res = await fetch(`${getWwwApiUrl()}/api/tradepost/item?id=${item.id}&world=${world}`, {
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'failed to fetch the item' }, { status: res.status })
    }

    const data = (await res.json()) as TradepostItemData

    return NextResponse.json({
      world: data.world,
      item: {
        ...data.item,
        name: item.name,
        description: item.description,
        members: item.members,
        basePrice: item.basePrice,
        icon: itemIconPath(item.id),
      },
    })
  } catch {
    return NextResponse.json({ error: 'the website API is unreachable' }, { status: 502 })
  }
}
