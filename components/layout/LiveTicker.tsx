'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Pause, Play } from 'lucide-react'

import { REALM_EVENTS, formatShort, schedule } from '@/data/realm-events'
import type { TickerData, TickerItem, TickerKind } from '@/lib/ticker'
import { cn } from '@/lib/utils'

const KIND_LABEL: Record<TickerKind, { label: string; tone: string }> = {
  realm: { label: 'Realm', tone: 'text-emerald-400' },
  news: { label: 'News', tone: 'text-gold-500' },
  market: { label: 'Market', tone: 'text-sky-300' },
  event: { label: 'Event', tone: 'text-rose-300' },
}

const INTERVAL = 4000
const REFRESH = 60_000

function eventItems(now: number): TickerItem[] {
  return schedule(REALM_EVENTS, now)
    .slice(0, 2)
    .map(({ event, start, end, live }) => ({
      id: `event-${event.id}`,
      kind: 'event',
      text: live ? `${event.title} is on now` : `${event.title} starts soon`,
      note: live ? `${formatShort(end - now)} left` : `in ${formatShort(start - now)}`,
    }))
}

function useTickerData() {
  const [data, setData] = useState<TickerData | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      try {
        const res = await fetch('/api/ticker', { cache: 'no-store' })
        if (res.ok && !cancelled) setData((await res.json()) as TickerData)
      } catch {
      }
    }

    load()
    const id = setInterval(load, REFRESH)

    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  return data
}

export function LiveTicker({ className }: { className?: string }) {
  const data = useTickerData()
  const [index, setIndex] = useState(0)
  const [held, setHeld] = useState(false)
  const [stopped, setStopped] = useState(false)
  const [now, setNow] = useState<number | null>(null)

  const clock = now ?? data?.now ?? 0
  const all = data ? [...data.items, ...eventItems(clock)] : []
  const current = all.length ? all[index % all.length] : null

  useEffect(() => {
    if (held || stopped || all.length < 2) return

    const id = setInterval(() => {
      setIndex((i) => (i + 1) % all.length)
      setNow(Math.floor(Date.now() / 1000))
    }, INTERVAL)

    return () => clearInterval(id)
  }, [held, stopped, all.length])

  if (!current) {
    return <span className={cn('text-text-muted', className)}>…</span>
  }

  const kind = KIND_LABEL[current.kind]

  const line = (
    <>
      <span className={cn('shrink-0 font-label text-[10px] font-bold uppercase tracking-widest', kind.tone)}>
        {kind.label}
      </span>
      <span className="truncate text-text-secondary">{current.text}</span>
      {current.note && <span className="shrink-0 text-text-muted">{current.note}</span>}
    </>
  )

  return (
    <div
      className={cn('flex min-w-0 items-center gap-2', className)}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
    >
      {all.length > 1 && (
        <button
          type="button"
          onClick={() => setStopped((s) => !s)}
          className="shrink-0 rounded-sm p-1 text-text-muted transition-colors hover:text-gold-400 focus:outline-none focus-visible:ring-1 focus-visible:ring-gold-400"
          aria-label={stopped ? 'Resume the live feed' : 'Pause the live feed'}
        >
          {stopped ? <Play className="h-3 w-3" aria-hidden="true" /> : <Pause className="h-3 w-3" aria-hidden="true" />}
        </button>
      )}
      <div className="relative h-5 min-w-0 flex-1 overflow-hidden" aria-live="off" data-testid="live-ticker">
        <div
          key={`${current.id}-${index}`}
          className="absolute inset-0 flex animate-[fade-in-up_0.45s_cubic-bezier(0.16,1,0.3,1)_both] items-center gap-2 motion-reduce:animate-none"
        >
          {current.href ? (
            <Link
              href={current.href}
              className="flex min-w-0 items-center gap-2 transition-colors hover:[&>span:nth-child(2)]:text-gold-400"
            >
              {line}
            </Link>
          ) : (
            line
          )}
        </div>
      </div>

    </div>
  )
}
