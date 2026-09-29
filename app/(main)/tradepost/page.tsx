import { MarketTable, type MarketRow } from '@/components/tradepost/MarketTable'
import { StatTile } from '@/components/tradepost/StatTile'
import { WorldSwitch } from '@/components/tradepost/WorldSwitch'
import { Container } from '@/components/ui/Container'
import { SectionTitle } from '@/components/ui/SectionTitle'
import { getItem, getTradeableItems } from '@/lib/items'
import { formatCompact, parseWorld } from '@/lib/tradepost'
import type { TradepostMarketData, WorldEntry, WorldsData } from '@/lib/types'
import { formatNumber, formatUnixDate } from '@/lib/utils'
import { fetchWwwJson } from '@/lib/www'

interface TradepostPageProps {
  searchParams: Promise<{ world?: string }>
}

export const metadata = {
  title: 'Tradepost',
  description:
    'Live buy and sell offers from the Tradepost, with prices and trends from every trade.',
}

async function getWorlds(): Promise<WorldEntry[]> {
  try {
    const { worlds } = await fetchWwwJson<WorldsData>('/api/worlds')
    return worlds ?? []
  } catch {
    return []
  }
}

export default async function TradepostPage({ searchParams }: TradepostPageProps) {
  const world = parseWorld((await searchParams).world)

  const [worlds, market] = await Promise.all([
    getWorlds(),
    fetchWwwJson<TradepostMarketData>(`/api/tradepost?world=${world}`).catch(() => null),
  ])

  const members = !!worlds.find(({ id }) => id === world)?.members

  const rows: MarketRow[] = []

  for (const entry of market?.items ?? []) {
    const item = getItem(entry.id)

    if (item) {
      rows.push({ ...entry, name: item.name, members: item.members })
    }
  }

  const catalogue = getTradeableItems({ members }).map(({ id, name, members }) => ({
    id,
    name,
    members,
  }))

  const totals = market?.totals

  return (
    <Container className="py-16">
      <SectionTitle
        eyebrow="Grand Exchange"
        title="Tradepost"
        description="Live buy and sell offers from the Tradepost booths, with prices and trends from every trade."
      />

      <div className="mt-8 flex justify-center">
        <WorldSwitch worlds={worlds} world={world} path="/tradepost" />
      </div>

      {!market ? (
        <p className="mt-12 text-center text-text-secondary">
          Unable to load the Tradepost. The game server may be offline.
        </p>
      ) : (
        <>
          <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatTile
              label="Open offers"
              value={formatNumber(totals?.openOffers)}
              detail={`${formatNumber(totals?.listedItems)} items listed`}
            />
            <StatTile
              label="Trades today"
              value={formatNumber(totals?.dayTrades)}
              detail="in the last 24 hours"
            />
            <StatTile
              label="Items traded today"
              value={formatCompact(totals?.dayVolume ?? 0)}
              detail={`${formatNumber(totals?.tradedItems)} different items ever`}
            />
            <StatTile
              label="Coins changed hands"
              value={formatCompact(totals?.dayValue ?? 0)}
              detail="in the last 24 hours"
            />
          </div>

          <div className="mt-10">
            <MarketTable rows={rows} catalogue={catalogue} now={market.now} world={world} />
          </div>

          <p className="mt-6 text-center text-xs text-text-muted">
            {totals?.trackedSince
              ? `Trades tracked since ${formatUnixDate(totals.trackedSince)}. `
              : 'Trends appear once items start trading. '}
            Prices refresh every 15 seconds. Who placed an offer or traded is never shown.
          </p>
        </>
      )}
    </Container>
  )
}
