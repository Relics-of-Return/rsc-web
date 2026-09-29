'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'

import { Change } from '@/components/tradepost/Change'
import { ItemIcon } from '@/components/tradepost/ItemIcon'
import type { TradepostMarketItem } from '@/lib/types'
import { formatAgo, formatCoins, worldQuery } from '@/lib/tradepost'
import { cn } from '@/lib/utils'

/** A market row with the item's name, as the page hands it over. */
export interface MarketRow extends TradepostMarketItem {
  name: string
  members: boolean
}

/** An item nobody has offered or traded yet: only found by searching. */
export interface CatalogueItem {
  id: number
  name: string
  members: boolean
}

interface MarketTableProps {
  rows: MarketRow[]
  catalogue: CatalogueItem[]
  now: number
  world: number
}

type SortKey = 'name' | 'sell' | 'buy' | 'last' | 'day' | 'month' | 'volume'

// how many quiet items a search lists after the ones on the market
const SEARCH_LIMIT = 40

// a missing value sorts last whichever way the column is turned
function compare(a: number | string | null, b: number | string | null, ascending: boolean) {
  if (a === null && b === null) return 0
  if (a === null) return 1
  if (b === null) return -1

  const order = typeof a === 'string' ? a.localeCompare(b as string) : a - (b as number)

  return ascending ? order : -order
}

function sortValue(row: MarketRow, key: SortKey): number | string | null {
  switch (key) {
    case 'name':
      return row.name
    case 'sell':
      return row.sell?.price ?? null
    case 'buy':
      return row.buy?.price ?? null
    case 'last':
      return row.last?.date ?? null
    case 'day':
      return row.day?.changePercent ?? null
    case 'month':
      return row.month?.changePercent ?? null
    case 'volume':
      return row.day?.volume || null
  }
}

const COLUMNS: { key: SortKey; label: string; hint?: string; align: 'left' | 'right' }[] = [
  { key: 'name', label: 'Item', align: 'left' },
  { key: 'sell', label: 'Buyout', hint: 'Cheapest sell offer', align: 'right' },
  { key: 'buy', label: 'Top offer', hint: 'Highest buy offer', align: 'right' },
  { key: 'last', label: 'Last trade', align: 'right' },
  { key: 'day', label: '24h', hint: 'Price change, last 24 hours', align: 'right' },
  { key: 'month', label: '30d', hint: 'Price change, last 30 days', align: 'right' },
  { key: 'volume', label: 'Volume', hint: 'Items traded, last 24 hours', align: 'right' },
]

export function MarketTable({ rows, catalogue, now, world }: MarketTableProps) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<{ key: SortKey; ascending: boolean }>({
    key: 'volume',
    ascending: false,
  })

  const search = query.trim().toLowerCase()

  const sorted = useMemo(() => {
    const matching = search
      ? rows.filter((row) => row.name.toLowerCase().includes(search))
      : rows

    return [...matching].sort(
      (a, b) =>
        compare(sortValue(a, sort.key), sortValue(b, sort.key), sort.ascending) ||
        // ties: the busier market first, then by name
        b.volume - a.volume ||
        a.name.localeCompare(b.name),
    )
  }, [rows, search, sort])

  const quiet = useMemo(() => {
    if (!search) return []

    const listed = new Set(rows.map(({ id }) => id))

    return catalogue
      .filter((item) => !listed.has(item.id) && item.name.toLowerCase().includes(search))
      .slice(0, SEARCH_LIMIT)
  }, [catalogue, rows, search])

  const itemHref = (id: number) => `/tradepost/${id}${worldQuery(world)}`

  const toggleSort = (key: SortKey) => {
    setSort((current) =>
      current.key === key
        ? { key, ascending: !current.ascending }
        : // names read A-Z; figures lead with the biggest
          { key, ascending: key === 'name' },
    )
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <label className="relative block w-full sm:max-w-xs">
          <span className="sr-only">Search items</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search any item…"
            className="w-full rounded-md border border-stone-700 bg-stone-900 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold-500/60 focus:outline-none"
          />
        </label>
        <p className="text-xs text-text-muted">
          <span className="text-text-secondary">Buyout</span> is the cheapest anyone is selling
          for; <span className="text-text-secondary">top offer</span> is the most anyone is
          paying.
        </p>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-stone-700">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="border-b border-stone-700 bg-stone-800/80">
              {COLUMNS.map((column) => {
                const active = sort.key === column.key

                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={active ? (sort.ascending ? 'ascending' : 'descending') : 'none'}
                    className={cn(
                      'px-4 py-3 font-adventure uppercase tracking-wide text-gold-400',
                      column.align === 'right' ? 'text-right' : 'text-left',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(column.key)}
                      title={column.hint}
                      className={cn(
                        'inline-flex items-center gap-1 uppercase tracking-wide hover:text-gold-500 transition-colors',
                        column.align === 'right' && 'flex-row-reverse',
                      )}
                    >
                      {column.label}
                      <span aria-hidden="true" className={cn('text-[0.6em]', !active && 'opacity-0')}>
                        {sort.ascending ? '▲' : '▼'}
                      </span>
                    </button>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr
                key={row.id}
                className="border-b border-stone-800 last:border-0 hover:bg-stone-800/50 transition-colors"
              >
                <td className="px-4 py-2">
                  <Link
                    href={itemHref(row.id)}
                    className="inline-flex items-center gap-3 text-text-primary hover:text-gold-400 transition-colors"
                  >
                    <ItemIcon id={row.id} />
                    <span>
                      {row.name}
                      {row.members && (
                        <span className="ml-2 align-middle text-[10px] uppercase tracking-wide text-text-muted">
                          Members
                        </span>
                      )}
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {row.sell ? (
                    <>
                      <span className="font-medium text-gold-400">{formatCoins(row.sell.price)}</span>
                      <span className="block text-xs text-text-muted">{formatCoins(row.sell.quantity)} for sale</span>
                    </>
                  ) : (
                    <span className="text-text-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {row.buy ? (
                    <>
                      <span className="font-medium text-text-primary">{formatCoins(row.buy.price)}</span>
                      <span className="block text-xs text-text-muted">{formatCoins(row.buy.quantity)} wanted</span>
                    </>
                  ) : (
                    <span className="text-text-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right tabular-nums">
                  {row.last ? (
                    <>
                      <span className="text-text-primary">{formatCoins(row.last.price)}</span>
                      <span className="block text-xs text-text-muted">{formatAgo(row.last.date, now)}</span>
                    </>
                  ) : (
                    <span className="text-text-muted">—</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  <Change percent={row.day?.changePercent} />
                </td>
                <td className="px-4 py-2 text-right">
                  <Change percent={row.month?.changePercent} />
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-text-secondary">
                  {row.day?.volume ? formatCoins(row.day.volume) : '—'}
                </td>
              </tr>
            ))}

            {quiet.map((item) => (
              <tr
                key={item.id}
                className="border-b border-stone-800 last:border-0 hover:bg-stone-800/50 transition-colors"
              >
                <td className="px-4 py-2">
                  <Link
                    href={itemHref(item.id)}
                    className="inline-flex items-center gap-3 text-text-secondary hover:text-gold-400 transition-colors"
                  >
                    <ItemIcon id={item.id} className="opacity-70" />
                    <span>{item.name}</span>
                  </Link>
                </td>
                <td colSpan={COLUMNS.length - 1} className="px-4 py-2 text-right text-xs text-text-muted">
                  No offers or trades yet
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sorted.length === 0 && quiet.length === 0 && (
          <p className="px-4 py-10 text-center text-text-secondary">
            {search
              ? 'No tradeable item matches that name.'
              : 'Nothing is on the Tradepost yet. Place the first offer at a Tradepost booth in game.'}
          </p>
        )}
      </div>
    </div>
  )
}
