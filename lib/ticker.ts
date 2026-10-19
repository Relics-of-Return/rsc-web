import 'server-only'

import { getItem } from './items'
import { formatAgo, formatCompact } from './tradepost'
import type { NewsListData, ServerStatusData, TradepostMarketData, WorldsData } from './types'
import { formatNumber } from './utils'
import { fetchWwwJson } from './www'

export type TickerKind = 'realm' | 'news' | 'market' | 'event'

export interface TickerItem {
  id: string
  kind: TickerKind
  text: string
  note?: string
  href?: string
}

export interface TickerData {
  items: TickerItem[]
  now: number
}

const WEEK = 7 * 24 * 60 * 60
const REVALIDATE = 30

export async function getTicker(): Promise<TickerData> {
  const cached = { revalidate: REVALIDATE }

  const [status, worlds, news, market] = await Promise.all([
    fetchWwwJson<ServerStatusData>('/api/status', cached).catch(() => null),
    fetchWwwJson<WorldsData>('/api/worlds', cached).catch(() => null),
    fetchWwwJson<NewsListData>('/api/news?page=0', cached).catch(() => null),
    fetchWwwJson<TradepostMarketData>('/api/tradepost?world=1', cached).catch(() => null),
  ])

  const items: TickerItem[] = []

  if (status?.connected) {
    const online = worlds?.worlds?.filter((world) => world.online).length ?? 0
    items.push(
      {
        id: 'online',
        kind: 'realm',
        text: `${formatNumber(status.online)} adventurers online${online ? ` across ${online} worlds` : ''}`,
        href: '/status',
      },
      {
        id: 'registered',
        kind: 'realm',
        text: `${formatNumber(status.registered)} accounts registered`,
        href: '/hiscores',
      }
    )
  }

  const latest = news?.articles?.[0]
  if (latest) {
    items.push({ id: `news-${latest.id}`, kind: 'news', text: latest.title, href: `/news/${latest.id}` })
  }

  if (market) {
    const trades = market.items
      .filter((entry) => entry.last && entry.last.date >= market.now - WEEK)
      .sort((a, b) => (b.last?.date ?? 0) - (a.last?.date ?? 0))
      .slice(0, 4)

    for (const entry of trades) {
      const item = getItem(entry.id)
      if (!item || !entry.last) continue

      const amount = entry.last.amount > 1 ? `${formatNumber(entry.last.amount)} × ` : ''
      items.push({
        id: `trade-${entry.id}-${entry.last.date}`,
        kind: 'market',
        text: `${amount}${item.name} sold for ${formatCompact(entry.last.price)} gp each`,
        note: formatAgo(entry.last.date, market.now),
        href: `/tradepost/${entry.id}`,
      })
    }
  }

  return { items, now: Math.floor(Date.now() / 1000) }
}
