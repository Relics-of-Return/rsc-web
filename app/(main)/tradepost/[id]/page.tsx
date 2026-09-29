import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Change } from '@/components/tradepost/Change'
import { ItemIcon } from '@/components/tradepost/ItemIcon'
import { PriceChart } from '@/components/tradepost/PriceChart'
import { StatTile } from '@/components/tradepost/StatTile'
import { WorldSwitch } from '@/components/tradepost/WorldSwitch'
import { Container } from '@/components/ui/Container'
import { getItem } from '@/lib/items'
import { formatAgo, formatCoins, parseWorld, TRADEPOST_RANGES, worldQuery } from '@/lib/tradepost'
import type {
  TradepostItemData,
  TradepostPriceLevel,
  TradepostStats,
  WorldEntry,
  WorldsData,
} from '@/lib/types'
import { formatUnixDate, formatUnixDateTime } from '@/lib/utils'
import { fetchWwwJson } from '@/lib/www'

interface ItemPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ world?: string }>
}

function itemFromParam(id: string) {
  return /^\d+$/.test(id) ? getItem(Number(id)) : null
}

export async function generateMetadata({ params }: ItemPageProps) {
  const item = itemFromParam((await params).id)

  return item
    ? { title: `${item.name} - Tradepost`, description: `Tradepost prices and trends for ${item.name}.` }
    : { title: 'Tradepost' }
}

async function getWorlds(): Promise<WorldEntry[]> {
  try {
    const { worlds } = await fetchWwwJson<WorldsData>('/api/worlds')
    return worlds ?? []
  } catch {
    return []
  }
}

function TrendTile({ label, stats }: { label: string; stats: TradepostStats }) {
  return (
    <StatTile
      label={label}
      value={<Change percent={stats.changePercent} className="text-2xl font-semibold normal-nums" />}
      detail={
        stats.trades ? (
          <dl className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-xs">
            <dt className="text-text-muted">Average</dt>
            <dd className="text-right tabular-nums text-text-secondary">{formatCoins(stats.average)}</dd>
            <dt className="text-text-muted">Range</dt>
            <dd className="text-right tabular-nums text-text-secondary">
              {stats.low === stats.high
                ? formatCoins(stats.low)
                : `${formatCoins(stats.low)} – ${formatCoins(stats.high)}`}
            </dd>
            <dt className="text-text-muted">Traded</dt>
            <dd className="text-right tabular-nums text-text-secondary">
              {formatCoins(stats.volume)} in {formatCoins(stats.trades)}{' '}
              {stats.trades === 1 ? 'trade' : 'trades'}
            </dd>
          </dl>
        ) : (
          <span className="text-xs text-text-muted">No trades in this period</span>
        )
      }
    />
  )
}

function OrderBookSide({
  title,
  levels,
  empty,
}: {
  title: string
  levels: TradepostPriceLevel[]
  empty: string
}) {
  return (
    <div className="rounded-lg border border-stone-700 overflow-hidden">
      <h3 className="border-b border-stone-700 bg-stone-800/80 px-4 py-3 font-adventure uppercase tracking-wide text-gold-400">
        {title}
      </h3>
      {levels.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-text-secondary">{empty}</p>
      ) : (
        <table className="w-full text-sm tabular-nums">
          <thead>
            <tr className="text-text-muted">
              <th className="px-4 py-2 text-left font-medium">Price</th>
              <th className="px-4 py-2 text-right font-medium">Quantity</th>
              <th className="px-4 py-2 text-right font-medium">Offers</th>
            </tr>
          </thead>
          <tbody>
            {levels.map((level) => (
              <tr key={level.price} className="border-t border-stone-800">
                <td className="px-4 py-2 text-text-primary">{formatCoins(level.price)}</td>
                <td className="px-4 py-2 text-right text-text-secondary">{formatCoins(level.quantity)}</td>
                <td className="px-4 py-2 text-right text-text-secondary">{formatCoins(level.offers)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default async function TradepostItemPage({ params, searchParams }: ItemPageProps) {
  const item = itemFromParam((await params).id)

  if (!item) {
    notFound()
  }

  const world = parseWorld((await searchParams).world)

  const [worlds, data] = await Promise.all([
    getWorlds(),
    fetchWwwJson<TradepostItemData>(`/api/tradepost/item?id=${item.id}&world=${world}`).catch(
      () => null,
    ),
  ])

  const market = data?.item

  const backLink = (
    <Link
      href={`/tradepost${worldQuery(world)}`}
      className="text-sm text-text-secondary hover:text-gold-400 transition-colors"
    >
      &laquo; Back to the Tradepost
    </Link>
  )

  const margin = market?.sell && market?.buy ? market.sell.price - market.buy.price : null

  return (
    <Container className="py-16">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        {backLink}
        <WorldSwitch worlds={worlds} world={world} path={`/tradepost/${item.id}`} />
      </div>

      <div className="flex items-center gap-5">
        <div className="flex h-20 w-28 shrink-0 items-center justify-center rounded-lg border border-stone-700 bg-stone-900">
          <ItemIcon id={item.id} scale={2} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-500">
            Tradepost{item.members && ' · Members'}
          </p>
          <h1 className="mt-1 font-adventure text-3xl sm:text-4xl text-gold-500 uppercase tracking-wide">
            {item.name}
          </h1>
          <p className="mt-1 text-text-secondary">{item.description}</p>
          <p className="mt-1 text-xs text-text-muted">
            Shop value {formatCoins(item.basePrice)} coins
          </p>
        </div>
      </div>

      {!market ? (
        <p className="mt-12 text-center text-text-secondary">
          Unable to load the Tradepost. The game server may be offline.
        </p>
      ) : (
        <>
          <section aria-label="Current prices" className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatTile
              label="Buyout"
              value={market.sell ? formatCoins(market.sell.price) : '—'}
              detail={
                market.sell
                  ? `${formatCoins(market.sell.quantity)} for sale`
                  : 'Nobody is selling'
              }
            />
            <StatTile
              label="Top offer"
              value={market.buy ? formatCoins(market.buy.price) : '—'}
              detail={
                market.buy ? `${formatCoins(market.buy.quantity)} wanted` : 'Nobody is buying'
              }
            />
            <StatTile
              label="Last trade"
              value={market.last ? formatCoins(market.last.price) : '—'}
              detail={
                market.last
                  ? `${formatCoins(market.last.amount)} traded ${formatAgo(market.last.date, market.now)}`
                  : 'Never traded'
              }
            />
            <StatTile
              label="Margin"
              value={margin !== null ? formatCoins(margin) : '—'}
              detail="buyout minus top offer"
            />
          </section>

          <section aria-labelledby="trends" className="mt-10">
            <h2 id="trends" className="font-adventure text-2xl uppercase tracking-wide text-gold-500">
              Trends
            </h2>
            <p className="mt-1 text-sm text-text-secondary">
              From the price at the start of each period to the last trade.
              {market.trackedSince && ` Tracked since ${formatUnixDate(market.trackedSince)}.`}
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              {TRADEPOST_RANGES.map(({ key, label }) => (
                <TrendTile key={key} label={label} stats={market.stats[key]} />
              ))}
            </div>
          </section>

          <section aria-labelledby="history" className="mt-10">
            <h2 id="history" className="font-adventure text-2xl uppercase tracking-wide text-gold-500">
              Price history
            </h2>
            <p className="mt-1 mb-4 text-sm text-text-secondary">
              The average price in each hour (last 24 hours) or day, with the lowest to highest
              price shaded behind it.
            </p>
            <PriceChart history={market.history} now={market.now} />
          </section>

          <section aria-labelledby="offers" className="mt-10">
            <h2 id="offers" className="font-adventure text-2xl uppercase tracking-wide text-gold-500">
              Current offers
            </h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <OrderBookSide
                title="Selling"
                levels={market.orderBook.selling}
                empty="Nobody is selling right now."
              />
              <OrderBookSide
                title="Buying"
                levels={market.orderBook.buying}
                empty="Nobody is buying right now."
              />
            </div>
          </section>

          <section aria-labelledby="recent" className="mt-10">
            <h2 id="recent" className="font-adventure text-2xl uppercase tracking-wide text-gold-500">
              Recent trades
            </h2>
            {market.trades.length === 0 ? (
              <p className="mt-4 text-text-secondary">No trades yet.</p>
            ) : (
              <div className="mt-4 overflow-x-auto rounded-lg border border-stone-700">
                <table className="w-full text-sm tabular-nums">
                  <thead>
                    <tr className="border-b border-stone-700 bg-stone-800/80">
                      <th className="px-4 py-3 text-left font-adventure uppercase tracking-wide text-gold-400">When</th>
                      <th className="px-4 py-3 text-right font-adventure uppercase tracking-wide text-gold-400">Price</th>
                      <th className="px-4 py-3 text-right font-adventure uppercase tracking-wide text-gold-400">Quantity</th>
                      <th className="px-4 py-3 text-right font-adventure uppercase tracking-wide text-gold-400">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {market.trades.map((trade, i) => (
                      <tr key={`${trade.date}-${i}`} className="border-b border-stone-800 last:border-0">
                        <td className="px-4 py-2 text-text-secondary" title={formatUnixDateTime(trade.date)}>
                          {formatAgo(trade.date, market.now)}
                        </td>
                        <td className="px-4 py-2 text-right text-text-primary">{formatCoins(trade.price)}</td>
                        <td className="px-4 py-2 text-right text-text-secondary">{formatCoins(trade.amount)}</td>
                        <td className="px-4 py-2 text-right text-text-secondary">
                          {formatCoins(trade.price * trade.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </Container>
  )
}
