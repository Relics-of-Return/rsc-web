'use client'

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'

import type { TradepostHistory, TradepostHistoryPoint, TradepostRange } from '@/lib/types'
import { formatCoins, formatCompact, TRADEPOST_RANGES } from '@/lib/tradepost'
import { cn } from '@/lib/utils'

// an item's price over time: the average it traded for in each bucket as a
// line, the lowest-to-highest as a faint band behind it, and how many traded
// as columns in a second chart underneath - two measures, two charts, one time
// axis. drawn once mounted, at the width it actually has, and in the viewer's
// own time zone

interface PriceChartProps {
  history: Record<TradepostRange, TradepostHistory>
  now: number
}

// the one series colour (the categorical amber, stepped for the dark surface
// and checked against it); the volume columns are context, so they take the
// muted text tone. grid one step off the surface
const PRICE_COLOUR = '#c98500'
const VOLUME_COLOUR = '#6e6459'
const GRID_COLOUR = '#2a231a'
const SURFACE_COLOUR = '#1e1913'

const PRICE_HEIGHT = 200
const VOLUME_HEIGHT = 56
const CHART_GAP = 32
const AXIS_HEIGHT = 24
const MARGIN = { top: 12, right: 16, left: 64 }
const TOTAL_HEIGHT = MARGIN.top + PRICE_HEIGHT + CHART_GAP + VOLUME_HEIGHT + AXIS_HEIGHT

const MAX_BAR_WIDTH = 24
const HOUR = 3600
const DAY = 24 * HOUR

const EMPTY_MESSAGES: Record<TradepostRange, string> = {
  day: 'No trades in the last 24 hours.',
  month: 'No trades in the last 30 days.',
  all: 'No trades yet.',
}

// round numbers for the price axis: 1, 2 or 5 times a power of ten
function niceStep(span: number, count: number): number {
  const raw = span / Math.max(1, count)
  const power = 10 ** Math.floor(Math.log10(raw))

  for (const multiple of [1, 2, 5, 10]) {
    if (raw <= multiple * power) return Math.max(1, multiple * power)
  }

  return Math.max(1, 10 * power)
}

function priceTicks(points: TradepostHistoryPoint[]) {
  let low = Math.min(...points.map((point) => point.low))
  let high = Math.max(...points.map((point) => point.high))

  if (low === high) {
    const pad = Math.max(1, Math.round(low * 0.1))
    low -= pad
    high += pad
  }

  const step = niceStep(high - low, 4)
  const min = Math.max(0, Math.floor(low / step) * step)
  const max = Math.ceil(high / step) * step
  const ticks: number[] = []

  for (let tick = min; tick <= max; tick += step) {
    ticks.push(tick)
  }

  return { min, max, ticks }
}

function timeTicks(range: TradepostRange, since: number, now: number, count: number): number[] {
  if (range === 'day') {
    const every = 6 * HOUR
    const ticks = []
    for (let t = Math.ceil(since / every) * every; t <= now; t += every) ticks.push(t)
    return ticks
  }

  const days = Math.max(1, Math.round((now - since) / DAY / Math.max(1, count)))
  const every = days * DAY
  const ticks = []

  for (let t = Math.ceil(since / every) * every; t <= now; t += every) ticks.push(t)

  return ticks
}

function formatTick(range: TradepostRange, time: number): string {
  const date = new Date(time * 1000)

  return range === 'day'
    ? date.toLocaleTimeString('en-US', { hour: 'numeric' })
    : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// what a bucket covers, for the tooltip and the table
function formatBucket(time: number, bucket: number): string {
  const start = new Date(time * 1000)

  if (bucket < DAY) {
    const end = new Date((time + bucket) * 1000)
    const day = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const from = start.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    const to = end.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

    return `${day}, ${from} – ${to}`
  }

  const date = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  if (bucket === DAY) return date

  const end = new Date((time + bucket - DAY) * 1000)

  return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
}

// a column with its data end rounded and its foot square on the baseline
function columnPath(x: number, width: number, top: number, base: number): string {
  const radius = Math.min(4, width / 2, base - top)

  return [
    `M${x},${base}`,
    `V${top + radius}`,
    `Q${x},${top} ${x + radius},${top}`,
    `H${x + width - radius}`,
    `Q${x + width},${top} ${x + width},${top + radius}`,
    `V${base}`,
    'Z',
  ].join(' ')
}

export function PriceChart({ history, now }: PriceChartProps) {
  const [range, setRange] = useState<TradepostRange>('month')
  const [width, setWidth] = useState<number | null>(null)
  const [active, setActive] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.floor(entry.contentRect.width))
    })

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const { bucket, since, points } = history[range]

  const chart = useMemo(() => {
    if (!width || points.length === 0) return null

    const plotWidth = Math.max(80, width - MARGIN.left - MARGIN.right)
    const start = range === 'all' ? Math.min(since, points[0].time) : since
    const end = Math.max(now, start + bucket)

    const x = (time: number) => MARGIN.left + ((time - start) / (end - start)) * plotWidth
    // a bucket's line point sits in its middle, or at "now" if it's still open
    const pointX = (point: TradepostHistoryPoint) => x(Math.min(point.time + bucket / 2, now))

    const prices = priceTicks(points)
    const priceTop = MARGIN.top
    const y = (price: number) =>
      priceTop + PRICE_HEIGHT - ((price - prices.min) / (prices.max - prices.min)) * PRICE_HEIGHT

    const volumeTop = priceTop + PRICE_HEIGHT + CHART_GAP
    const volumeBase = volumeTop + VOLUME_HEIGHT
    const maxVolume = Math.max(...points.map((point) => point.volume))
    const volumeY = (volume: number) => volumeBase - (volume / maxVolume) * VOLUME_HEIGHT

    const line = points.map((point, i) => `${i ? 'L' : 'M'}${pointX(point)},${y(point.average)}`).join(' ')

    const band =
      points.length > 1
        ? [
            ...points.map((point, i) => `${i ? 'L' : 'M'}${pointX(point)},${y(point.high)}`),
            ...[...points].reverse().map((point) => `L${pointX(point)},${y(point.low)}`),
            'Z',
          ].join(' ')
        : null

    const columns = points.map((point) => {
      const left = x(point.time)
      const right = x(Math.min(point.time + bucket, end))
      // the slot minus a 2px gap, and never a thick block
      const barWidth = Math.max(1, Math.min(MAX_BAR_WIDTH, right - left - 2))

      return {
        path: columnPath(left + (right - left - barWidth) / 2, barWidth, volumeY(point.volume), volumeBase),
      }
    })

    const ticks = timeTicks(range, start, end, Math.max(2, Math.floor(plotWidth / 110)))

    return {
      plotWidth,
      x,
      pointX,
      y,
      prices,
      line,
      band,
      columns,
      ticks,
      volumeTop,
      volumeBase,
      maxVolume,
    }
  }, [width, points, range, since, bucket, now])

  const choose = (next: TradepostRange) => {
    setRange(next)
    setActive(null)
  }

  // the crosshair snaps to whichever bucket is nearest the pointer
  const onPointerMove = (event: PointerEvent<SVGRectElement>) => {
    if (!chart) return

    const bounds = event.currentTarget.ownerSVGElement!.getBoundingClientRect()
    const pointer = event.clientX - bounds.left
    let nearest = 0

    points.forEach((point, i) => {
      if (Math.abs(chart.pointX(point) - pointer) < Math.abs(chart.pointX(points[nearest]) - pointer)) {
        nearest = i
      }
    })

    setActive(nearest)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!points.length) return

    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault()
      const step = event.key === 'ArrowLeft' ? -1 : 1
      setActive((current) =>
        Math.min(points.length - 1, Math.max(0, (current ?? points.length - 1) + (current === null ? 0 : step))),
      )
    } else if (event.key === 'Escape') {
      setActive(null)
    }
  }

  const activePoint = active !== null ? points[active] : null
  const lastPoint = points[points.length - 1]

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Time range">
        {TRADEPOST_RANGES.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={range === key}
            onClick={() => choose(key)}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium uppercase tracking-wide border transition-colors',
              range === key
                ? 'border-gold-500/60 bg-gold-500/10 text-gold-400'
                : 'border-stone-700 text-text-secondary hover:border-gold-500/40 hover:text-gold-400',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div
        ref={containerRef}
        className="relative mt-4 rounded-lg border border-stone-700 bg-stone-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/50"
        style={{ height: TOTAL_HEIGHT + 16 }}
        tabIndex={points.length ? 0 : -1}
        onKeyDown={onKeyDown}
        onBlur={() => setActive(null)}
        aria-label={`Price history, ${TRADEPOST_RANGES.find(({ key }) => key === range)!.label.toLowerCase()}. Use the arrow keys to step through it.`}
      >
        {points.length === 0 ? (
          <p className="absolute inset-0 flex items-center justify-center text-text-secondary">
            {EMPTY_MESSAGES[range]}
          </p>
        ) : chart ? (
          <svg width={width ?? 0} height={TOTAL_HEIGHT} className="mt-2 block overflow-visible text-text-muted">
            {/* price grid and axis */}
            {chart.prices.ticks.map((tick) => (
              <g key={tick}>
                <line
                  x1={MARGIN.left}
                  x2={MARGIN.left + chart.plotWidth}
                  y1={chart.y(tick)}
                  y2={chart.y(tick)}
                  stroke={GRID_COLOUR}
                  strokeWidth={1}
                />
                <text
                  x={MARGIN.left - 8}
                  y={chart.y(tick)}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fill="currentColor"
                  className="text-[11px] tabular-nums"
                >
                  {formatCompact(tick)}
                </text>
              </g>
            ))}

            {chart.band && <path d={chart.band} fill={PRICE_COLOUR} fillOpacity={0.1} />}
            <path
              d={chart.line}
              fill="none"
              stroke={PRICE_COLOUR}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* the latest price, marked at the end of the line */}
            <circle
              cx={chart.pointX(lastPoint)}
              cy={chart.y(lastPoint.average)}
              r={4}
              fill={PRICE_COLOUR}
              stroke={SURFACE_COLOUR}
              strokeWidth={2}
            />

            {/* volume */}
            <text x={MARGIN.left - 8} y={chart.volumeTop} textAnchor="end" dominantBaseline="hanging" fill="currentColor" className="text-[11px] tabular-nums">
              {formatCompact(chart.maxVolume)}
            </text>
            <text x={MARGIN.left - 8} y={chart.volumeBase} textAnchor="end" dominantBaseline="auto" fill="currentColor" className="text-[11px]">
              0
            </text>
            <line
              x1={MARGIN.left}
              x2={MARGIN.left + chart.plotWidth}
              y1={chart.volumeBase}
              y2={chart.volumeBase}
              stroke={GRID_COLOUR}
              strokeWidth={1}
            />
            {chart.columns.map((column, i) => (
              <path
                key={points[i].time}
                d={column.path}
                fill={VOLUME_COLOUR}
                fillOpacity={active === null || active === i ? 1 : 0.6}
              />
            ))}
            <text
              x={MARGIN.left}
              y={chart.volumeTop - 6}
              fill="currentColor"
              className="text-[10px] uppercase tracking-wide"
            >
              Items traded
            </text>

            {/* time axis */}
            {chart.ticks.map((tick) => (
              <text
                key={tick}
                x={chart.x(tick)}
                y={chart.volumeBase + 16}
                textAnchor="middle"
                fill="currentColor"
                className="text-[11px]"
              >
                {formatTick(range, tick)}
              </text>
            ))}

            {/* crosshair */}
            {activePoint && (
              <g pointerEvents="none">
                <line
                  x1={chart.pointX(activePoint)}
                  x2={chart.pointX(activePoint)}
                  y1={MARGIN.top}
                  y2={chart.volumeBase}
                  stroke="#a89f8f"
                  strokeWidth={1}
                />
                <circle
                  cx={chart.pointX(activePoint)}
                  cy={chart.y(activePoint.average)}
                  r={4}
                  fill={PRICE_COLOUR}
                  stroke={SURFACE_COLOUR}
                  strokeWidth={2}
                />
              </g>
            )}

            <rect
              x={MARGIN.left}
              y={MARGIN.top}
              width={chart.plotWidth}
              height={chart.volumeBase - MARGIN.top}
              fill="transparent"
              onPointerMove={onPointerMove}
              onPointerLeave={() => setActive(null)}
            />
          </svg>
        ) : null}

        {chart && activePoint && (
          <div
            className="pointer-events-none absolute top-3 z-10 w-52 rounded-md border border-stone-700 bg-stone-950/95 px-3 py-2 text-xs shadow-lg"
            style={{
              left: Math.min(
                Math.max(chart.pointX(activePoint) + 12, 8),
                (width ?? 0) - 216,
              ),
            }}
            role="status"
          >
            <p className="text-text-muted">{formatBucket(activePoint.time, bucket)}</p>
            <p className="mt-1 flex items-center gap-2">
              <span className="inline-block h-0.5 w-3 rounded" style={{ background: PRICE_COLOUR }} aria-hidden="true" />
              <span className="text-sm font-semibold text-text-primary">{formatCoins(activePoint.average)}</span>
              <span className="text-text-muted">average</span>
            </p>
            {activePoint.low !== activePoint.high && (
              <p className="mt-0.5 pl-5 text-text-secondary">
                {formatCoins(activePoint.low)} – {formatCoins(activePoint.high)}
              </p>
            )}
            <p className="mt-1 flex items-center gap-2">
              <span className="inline-block h-0.5 w-3 rounded" style={{ background: VOLUME_COLOUR }} aria-hidden="true" />
              <span className="font-semibold text-text-primary">{formatCoins(activePoint.volume)}</span>
              <span className="text-text-muted">traded</span>
            </p>
          </div>
        )}
      </div>

      {points.length > 0 && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-text-secondary hover:text-gold-400">
            Show the numbers
          </summary>
          <div className="mt-2 max-h-72 overflow-auto rounded-lg border border-stone-700">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-stone-800">
                <tr>
                  <th className="px-3 py-2 text-left text-text-secondary font-medium">When</th>
                  <th className="px-3 py-2 text-right text-text-secondary font-medium">Average</th>
                  <th className="px-3 py-2 text-right text-text-secondary font-medium">Low</th>
                  <th className="px-3 py-2 text-right text-text-secondary font-medium">High</th>
                  <th className="px-3 py-2 text-right text-text-secondary font-medium">Traded</th>
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {[...points].reverse().map((point) => (
                  <tr key={point.time} className="border-t border-stone-800">
                    <td className="px-3 py-1.5 text-text-secondary">{width ? formatBucket(point.time, bucket) : ''}</td>
                    <td className="px-3 py-1.5 text-right text-text-primary">{formatCoins(point.average)}</td>
                    <td className="px-3 py-1.5 text-right text-text-secondary">{formatCoins(point.low)}</td>
                    <td className="px-3 py-1.5 text-right text-text-secondary">{formatCoins(point.high)}</td>
                    <td className="px-3 py-1.5 text-right text-text-secondary">{formatCoins(point.volume)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  )
}
