import { DISCORD_URL } from '@/lib/constants'

export type EventKind = 'skilling' | 'combat' | 'community' | 'minigame'

export interface RealmEvent {
  id: string
  title: string
  description: string
  kind: EventKind
  weekly: { day: number; hour: number; minute?: number; minutes: number }
  where?: string
  host?: string
  link?: { href: string; label: string; external?: boolean }
  danger?: boolean
}

export interface Occurrence {
  event: RealmEvent
  start: number
  end: number
  live: boolean
}

const DAY = 24 * 60 * 60
const WEEK = 7 * DAY

export const REALM_EVENTS: RealmEvent[] = [
  {
    id: 'double-xp',
    title: 'Double XP Weekend',
    description: 'Every skill earns twice the experience until Sunday midnight. Bank your logs, bones and ores now.',
    kind: 'skilling',
    weekly: { day: 5, hour: 18, minutes: 54 * 60 },
    where: 'Every world',
    link: { href: '/hiscores', label: 'Watch the hiscores' },
  },
  {
    id: 'wildy-surge',
    title: 'Wilderness Boss Surge',
    description: 'Better unique drops from the King Black Dragon and the Chaos Elemental in the deep Wilderness.',
    kind: 'combat',
    weekly: { day: 6, hour: 16, minutes: 3 * 60 },
    where: 'Deep Wilderness · level 40+',
    danger: true,
    link: { href: '/map', label: 'Open the map' },
  },
  {
    id: 'kbd-hunt',
    title: 'KBD Community Hunt',
    description: 'A clan raid on the King Black Dragon, open to all, with anti-dragon shields given away.',
    kind: 'community',
    weekly: { day: 6, hour: 19, minutes: 2 * 60 },
    where: 'Deep Wilderness',
    host: 'Mod Falador',
    link: { href: DISCORD_URL, label: 'Sign up on Discord', external: true },
  },
  {
    id: 'trawler',
    title: 'Fishing Trawler Spotlight',
    description: 'Bonus manta rays and sea turtles in the net, and double certificates for every Port Khazard crew.',
    kind: 'minigame',
    weekly: { day: 0, hour: 14, minutes: 4 * 60 },
    where: 'Port Khazard',
  },
]

export function occurrenceOf(event: RealmEvent, now: number): Occurrence {
  const date = new Date(now * 1000)
  const today = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 1000
  const weekStart = today - date.getUTCDay() * DAY

  const { day, hour, minute = 0, minutes } = event.weekly
  const thisWeek = weekStart + day * DAY + hour * 3600 + minute * 60
  const duration = minutes * 60

  const start =
    [thisWeek - WEEK, thisWeek, thisWeek + WEEK].find((candidate) => candidate + duration > now) ??
    thisWeek + WEEK

  return { event, start, end: start + duration, live: start <= now }
}

export function schedule(events: RealmEvent[], now: number): Occurrence[] {
  return events
    .map((event) => occurrenceOf(event, now))
    .sort((a, b) => {
      if (a.live !== b.live) return a.live ? -1 : 1
      return a.live ? a.end - b.end : a.start - b.start
    })
}

const pad = (n: number) => String(n).padStart(2, '0')
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function formatCountdown(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const days = Math.floor(s / DAY)
  const hours = Math.floor((s % DAY) / 3600)
  const mins = Math.floor((s % 3600) / 60)

  if (days > 0) return `${days}d ${pad(hours)}h ${pad(mins)}m`

  return `${pad(hours)}:${pad(mins)}:${pad(s % 60)}`
}

/** 2d 5h / 3h 45m / 12m / under a minute. */
export function formatShort(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const days = Math.floor(s / DAY)
  const hours = Math.floor((s % DAY) / 3600)
  const mins = Math.floor((s % 3600) / 60)

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${mins}m`
  if (mins > 0) return `${mins}m`

  return 'under a minute'
}

/** Sat 19:00 UTC. */
export function formatUTC(time: number): string {
  const date = new Date(time * 1000)
  return `${WEEKDAYS[date.getUTCDay()]} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`
}

/** 19:00 UTC. */
export function formatClock(time: number): string {
  const date = new Date(time * 1000)
  return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`
}

export { DAY, WEEK, WEEKDAYS }
