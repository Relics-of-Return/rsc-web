import { NextResponse } from 'next/server'

import { getTradeableItems } from '@/lib/items'

// the items the news editor can put inline: every one with an icon in
// public/items, which are the tradeable ones
export const dynamic = 'force-static'

export function GET() {
  const items = getTradeableItems({ members: true }).map(({ id, name }) => ({ id, name }))
  return NextResponse.json({ items })
}
