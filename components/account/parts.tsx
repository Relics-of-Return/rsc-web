import type { ReactNode } from 'react'

import type { AccountDetails, AccountWorld } from '@/lib/types'
import { cn, formatNewsDate } from '@/lib/utils'

export function Panel({ title, description, action, children, className }: { title: string; description?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn('rounded-lg border border-stone-700 bg-stone-800/60', className)}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-700/80 px-5 py-4">
        <div>
          <h2 className="font-adventure text-lg uppercase tracking-wide text-gold-400">{title}</h2>
          {description && <p className="mt-1 text-xs text-text-secondary">{description}</p>}
        </div>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  )
}

export function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-stone-800 py-2.5 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <dt className="text-xs uppercase tracking-wide text-text-muted">{label}</dt>
      <dd className="text-sm text-text-primary sm:text-right">{children}</dd>
    </div>
  )
}

export function Dot({ tone }: { tone: 'good' | 'warn' | 'bad' | 'off' }) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block h-2 w-2 shrink-0 rounded-full',
        tone === 'good' && 'bg-moss shadow-[0_0_6px] shadow-moss',
        tone === 'warn' && 'bg-gold-500',
        tone === 'bad' && 'bg-red-500',
        tone === 'off' && 'bg-stone-500'
      )}
    />
  )
}

export function longDate(seconds: number): string {
  return seconds > 0 ? formatNewsDate(seconds) : 'Unknown'
}

const RELATIVE = new Intl.RelativeTimeFormat('en-GB', { numeric: 'auto' })

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 86400],
  ['month', 30 * 86400],
  ['week', 7 * 86400],
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
]

/** "3 days ago", "in 2 hours". */
export function relativeTime(seconds: number, now = Date.now() / 1000): string {
  const delta = seconds - now

  for (const [unit, size] of UNITS) {
    if (Math.abs(delta) >= size) return RELATIVE.format(Math.round(delta / size), unit)
  }

  return 'just now'
}

export type Standing = { tone: 'good' | 'warn' | 'bad'; label: string; detail?: string }

function until(value: number): string {
  return value === -1 ? 'permanently' : `until ${longDate(value)} (${relativeTime(value)})`
}

/** Banned before muted before good: the worst thing that applies. */
export function standingOf(account: AccountDetails | null): Standing | null {
  if (!account) return null
  if (account.bannedUntil) return { tone: 'bad', label: 'Banned', detail: until(account.bannedUntil) }
  if (account.mutedUntil) return { tone: 'warn', label: 'Muted', detail: until(account.mutedUntil) }
  return { tone: 'good', label: 'Good standing' }
}

/** The world the player is on right now, if any. */
export function onlineWorld(worlds: AccountWorld[]): AccountWorld | null {
  return worlds.find((world) => (world.account?.world ?? 0) > 0) ?? null
}

export function levelsOf(world: AccountWorld | undefined): Record<string, number> {
  const levels: Record<string, number> = {}
  for (const [skill, rank] of Object.entries(world?.character?.ranks ?? {})) levels[skill] = rank.level
  return levels
}
