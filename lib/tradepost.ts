// formatting shared by the tradepost pages and their client components. every
// relative time is measured from the `now` the data server answered with, so
// the server's render and the browser's agree

import type { TradepostRange } from './types'

export const TRADEPOST_RANGES: { key: TradepostRange; label: string; short: string }[] = [
  { key: 'day', label: 'Last 24 hours', short: '24h' },
  { key: 'month', label: 'Last 30 days', short: '30d' },
  { key: 'all', label: 'Since tracked', short: 'All' },
]

/** 1,234,567 coins → "1,234,567". */
export function formatCoins(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'
  return value.toLocaleString('en-US')
}

/** 1,284 / 12.9K / 4.2M / 1.1B, for tiles where a full number won't fit. */
export function formatCompact(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'

  const units: [number, string][] = [
    [1e9, 'B'],
    [1e6, 'M'],
    [1e4, 'K'],
  ]

  for (const [size, unit] of units) {
    if (Math.abs(value) >= size) {
      const scaled = value / size
      return `${scaled >= 100 ? Math.round(scaled) : scaled.toFixed(1).replace(/\.0$/, '')}${unit}`
    }
  }

  return value.toLocaleString('en-US')
}

/** +12.5% / -3% / 0%, with no more precision than it's worth. */
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return '—'

  const rounded = Math.abs(value) >= 10 ? Math.round(value) : Math.round(value * 10) / 10

  if (rounded === 0) return '0%'

  return `${rounded > 0 ? '+' : ''}${rounded}%`
}

/** "just now", "5m ago", "3h ago", "2d ago" - from `now`, not the clock. */
export function formatAgo(date: number, now: number): string {
  const seconds = Math.max(0, now - date)

  if (seconds < 60) return 'just now'
  if (seconds < 60 * 60) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 24 * 60 * 60) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 60 * 24 * 60 * 60) return `${Math.floor(seconds / 86400)}d ago`

  return `${Math.floor(seconds / (30 * 86400))}mo ago`
}

/** The page's query string for a world: nothing for world 1. */
export function worldQuery(world: number, prefix: '?' | '&' = '?'): string {
  return world === 1 ? '' : `${prefix}world=${world}`
}

/** ?world=N, or world 1. */
export function parseWorld(value: string | undefined): number {
  const world = Number.parseInt(value ?? '', 10)
  return Number.isInteger(world) && world > 0 ? world : 1
}
