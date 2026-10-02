'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarCheck, Hourglass, Shield, Ship, Swords } from 'lucide-react'

import { cn } from '@/lib/utils'

function useNow(interval: number) {
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    const tick = () => setNow(Date.now() / 1000)
    tick()

    const id = setInterval(tick, interval)
    return () => clearInterval(id)
  }, [interval])

  return now
}

function realmTime(now: number): string {
  const date = new Date(now * 1000)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`
}

type BadgeVariant = 'live' | 'danger' | 'info' | 'neutral'

interface EventEntry {
  id: string
  title: string
  description: string
  live: boolean
  badgeText: string
  badgeVariant: BadgeVariant
  topRight: React.ReactNode
  footLeftText: string
  footLeftIcon?: React.ReactNode
  footLeftClassName?: string
  footRightText: string
  href: string
}

const EVENTS: EventEntry[] = [
  {
    id: 'xp-weekend',
    title: 'Double XP Weekend',
    description: 'All 18 skills earn 2x experience until Sunday midnight. Bank your logs, bones, and raw ores now!',
    live: true,
    badgeText: 'Live Now',
    badgeVariant: 'live',
    topRight: <span className="font-label-sm text-[11px] text-primary/80">Ends Sun 23:59</span>,
    footLeftText: '28h remaining',
    footLeftIcon: <Hourglass className="h-3.5 w-3.5" aria-hidden="true" />,
    footLeftClassName: 'text-primary flex items-center gap-1',
    footRightText: 'Details →',
    href: '/events/double-xp'
  },
  {
    id: 'wildy-surge',
    title: 'Wilderness Boss Surge',
    description: 'Boosted King Black Dragon & Chaos Elemental unique drop rates across deep wildy spawns.',
    live: false,
    badgeText: 'Starts in 3h 45m',
    badgeVariant: 'danger',
    topRight: <Swords className="h-4 w-4 text-rose-400/70" aria-hidden="true" />,
    footLeftText: 'Danger Zone: Lvl 40+',
    footLeftClassName: 'text-rose-300/80',
    footRightText: 'Spawn Info →',
    href: '/events/wildy-surge'
  },
  {
    id: 'kbd-hunt',
    title: 'KBD Community Hunt',
    description: 'Multi-combat clan raid in the Deep Wilderness. Open mass party with anti-dragon shield drop giveaways.',
    live: false,
    badgeText: 'Sat 19:00 UTC',
    badgeVariant: 'info',
    topRight: <Shield className="h-4 w-4 text-tertiary/70" aria-hidden="true" />,
    footLeftText: 'Host: Mod Falador',
    footLeftClassName: 'text-tertiary/80',
    footRightText: 'Sign Up →',
    href: '/events/kbd-hunt'
  },
  {
    id: 'fishing-trawler',
    title: 'Fishing Trawler Spotlight',
    description: 'Bonus raw manta rays, sea turtle hauls, and double cert tokens for all Port Khazard boat crews.',
    live: false,
    badgeText: 'Upcoming',
    badgeVariant: 'neutral',
    topRight: <Ship className="h-4 w-4 text-primary/70" aria-hidden="true" />,
    footLeftText: 'Minigame Boost',
    footRightText: 'View Schedule →',
    href: '/events/fishing-trawler'
  }
]

const BADGE_STYLES: Record<BadgeVariant, string> = {
  live: 'bg-amber-500/15 border-primary/40 text-primary',
  danger: 'bg-[#241c13] border-rose-400/40 text-rose-300',
  info: 'bg-[#241c13] border-tertiary/40 text-tertiary',
  neutral: 'bg-[#241c13] border-primary/30 text-on-surface-variant'
}

export function StatusStrip() {
  const now = useNow(1000)
  const activeEventsCount = EVENTS.filter((e) => e.live).length

  return (
    <section className="relative w-full border-b border-[#292015] bg-[#110e0a] py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col justify-between gap-3 border-b border-[#2b2216] pb-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <CalendarCheck className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="font-alagard text-xs font-bold uppercase tracking-widest text-primary">
              Active Realm Events & Modifiers
            </h2>
          </div>
          <div className="flex items-center gap-3 font-alagard text-xs text-on-surface-variant/80">
            <span className="inline-flex items-center gap-1.5">
              <span className="relative flex h-2 w-2" aria-hidden="true">
                {activeEventsCount > 0 && (
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                )}
                <span
                  className={cn(
                    'relative inline-flex h-2 w-2 rounded-full',
                    activeEventsCount > 0
                      ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]'
                      : 'bg-stone-700'
                  )}
                />
              </span>
              <span className={activeEventsCount > 0 ? 'font-semibold text-emerald-400' : ''}>
                {activeEventsCount} {activeEventsCount === 1 ? 'Event' : 'Events'} Active
              </span>
            </span>
            {now !== null && (
              <>
                <span className="text-[#382e20]" aria-hidden="true">
                  •
                </span>
                <span>Realm Time: {realmTime(now)}</span>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {EVENTS.map((event) => (
            <EventPlaque key={event.id} event={event} />
          ))}
        </div>
      </div>
    </section>
  )
}

function EventPlaque({ event }: { event: EventEntry }) {
  return (
    <article
      className={cn(
        'osrs-stone-border group relative flex flex-col justify-between overflow-hidden rounded-sm p-5 shadow-md transition-all duration-300',
        event.live
          ? 'bg-[#1b150e] shadow-lg hover:border-primary/50'
          : 'bg-[#18130d] hover:border-[#6a5435]'
      )}
    >
      {event.live && (
        <div
          className="pointer-events-none absolute -right-10 -top-10 h-24 w-24 rounded-full bg-amber-500/10 blur-xl"
          aria-hidden="true"
        />
      )}

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm border font-alagard text-[11px] uppercase tracking-wider',
              BADGE_STYLES[event.badgeVariant]
            )}
          >
            {event.live && (
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" aria-hidden="true" />
            )}
            {event.badgeText}
          </span>
          {event.topRight}
        </div>

        <h4
          className={cn(
            'mb-1.5 font-alagard text-lg font-bold leading-snug transition-colors',
            event.live
              ? 'text-primary group-hover:text-primary-fixed'
              : 'text-[#f5ebd9] group-hover:text-primary'
          )}
        >
          <Link href={event.href} className="after:absolute after:inset-0">
            {event.title}
          </Link>
        </h4>

        <p className="font-body-sm text-xs leading-relaxed text-on-surface-variant">
          {event.description}
        </p>
      </div>

      <div
        className={cn(
          'mt-3 flex items-center justify-between border-t border-[#291f14] pt-3 font-alagard text-xs',
          event.live ? 'text-primary' : 'text-on-surface-variant/80'
        )}
      >
        <span className={event.footLeftClassName}>
          {event.footLeftIcon}
          {event.footLeftIcon && ' '}
          {event.footLeftText}
        </span>
        <span
          className={cn(
            'transition-colors',
            event.live ? 'text-primary-fixed group-hover:underline' : 'group-hover:text-primary'
          )}
        >
          {event.footRightText}
        </span>
      </div>
    </article>
  )
}