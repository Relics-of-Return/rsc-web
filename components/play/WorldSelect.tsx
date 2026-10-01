'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import useSWR from 'swr'

import { SectionTitle } from '@/components/ui/SectionTitle'
import { getWorlds } from '@/lib/api'
import { countryName } from '@/lib/countries'
import type { WorldEntry } from '@/lib/types'
import { cn, formatNumber } from '@/lib/utils'

// the world select, laid out like Old School RuneScape's server list: quick
// picks for the best world of each kind, then every world in a table that
// sorts on any column. a world's name (or its row) opens the game on it

const REFRESH_INTERVAL = 15_000

type SortKey = 'world' | 'players' | 'location' | 'type' | 'activity'

interface Sort {
  key: SortKey
  ascending: boolean
}

const COLUMNS: { key: SortKey; label: string; right?: boolean }[] = [
  { key: 'world', label: 'World' },
  { key: 'players', label: 'Players', right: true },
  { key: 'location', label: 'Location' },
  { key: 'type', label: 'Type' },
  { key: 'activity', label: 'Activity' },
]

function worldName(world: WorldEntry): string {
  return world.name ?? `World ${world.id}`
}

function isOnline(world: WorldEntry): boolean {
  return Boolean(world.online)
}

function typeOf(world: WorldEntry): string {
  return world.members ? 'Members' : 'Free'
}

function activityOf(world: WorldEntry): string {
  return world.botting ? 'Botting allowed' : '-'
}

function playersText(world: WorldEntry): string {
  const players = world.players ?? 0
  return `${formatNumber(players)} ${players === 1 ? 'player' : 'players'}`
}

function playHref(world: WorldEntry): string {
  return `/play?world=${world.id}`
}

function WorldIcon({ world }: { world: WorldEntry }) {
  return (
    <Image
      src={
        world.id === 3
          ? '/worlds/beta_testing_world_icon.webp'
          : '/worlds/members_world_icon.webp'
      }
      alt=""
      aria-hidden="true"
      width={20}
      height={20}
      unoptimized
      className="shrink-0 object-contain"
    />
  )
}

const SORT_VALUE: Record<SortKey, (world: WorldEntry) => string | number> = {
  world: (world) => world.id,
  // offline worlds sort below empty ones
  players: (world) => (isOnline(world) ? (world.players ?? 0) : -1),
  location: (world) => countryName(world.country),
  type: typeOf,
  activity: activityOf,
}

export function WorldSelect({ initialWorlds }: { initialWorlds: WorldEntry[] }) {
  const router = useRouter()
  const [sort, setSort] = useState<Sort>({ key: 'world', ascending: true })

  const { data } = useSWR('/api/worlds', getWorlds, {
    fallbackData: { worlds: initialWorlds },
    refreshInterval: REFRESH_INTERVAL,
  })

  const worlds = data?.worlds ?? initialWorlds

  const sorted = useMemo(() => {
    const value = SORT_VALUE[sort.key]

    return [...worlds].sort((a, b) => {
      const x = value(a)
      const y = value(b)
      const order =
        typeof x === 'number' && typeof y === 'number'
          ? x - y
          : String(x).localeCompare(String(y))

      return (sort.ascending ? order : -order) || a.id - b.id
    })
  }, [worlds, sort])

  const playing = worlds.reduce(
    (total, world) => total + (isOnline(world) ? (world.players ?? 0) : 0),
    0,
  )

  // a fresh column sorts the way it's most useful first: the busiest worlds
  // at the top for players, a-z for everything else
  function toggleSort(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, ascending: !current.ascending }
        : { key, ascending: key !== 'players' },
    )
  }

  return (
    <div>
      <SectionTitle
        eyebrow="Play"
        title="Select a world"
        description="Pick where to play. Each world keeps its own accounts, items and hiscores."
      />

      <p className="mt-6 text-center text-text-secondary">
        There {playing === 1 ? 'is' : 'are'} currently{' '}
        <span className="font-semibold text-gold-400">{formatNumber(playing)}</span>{' '}
        {playing === 1 ? 'person' : 'people'} playing!
      </p>

      <section aria-labelledby="advanced-select" className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3
            id="advanced-select"
            className="font-adventure text-lg uppercase tracking-wide text-gold-400"
          >
            Advanced select{' '}
            <span className="font-body text-sm normal-case tracking-normal text-text-muted">
              (for experienced players)
            </span>
          </h3>
          <p className="text-xs text-text-muted">Player counts update every 15 seconds</p>
        </div>

        <div className="mt-4 overflow-x-auto rounded-lg border border-stone-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-700 bg-stone-800/80">
                {COLUMNS.map((column) => {
                  const active = sort.key === column.key

                  return (
                    <th
                      key={column.key}
                      scope="col"
                      aria-sort={
                        active ? (sort.ascending ? 'ascending' : 'descending') : 'none'
                      }
                      className={cn('px-4 py-3', column.right ? 'text-right' : 'text-left')}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort(column.key)}
                        className="inline-flex items-center gap-1.5 font-adventure uppercase tracking-wide text-gold-400 hover:text-gold-500"
                      >
                        {column.label}
                        <span
                          aria-hidden="true"
                          className={cn('text-[0.65rem]', active ? 'opacity-100' : 'opacity-30')}
                        >
                          {active && !sort.ascending ? '▼' : '▲'}
                        </span>
                      </button>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {sorted.map((world) => {
                const online = isOnline(world)

                return (
                  <tr
                    key={world.id}
                    onClick={online ? () => router.push(playHref(world)) : undefined}
                    className={cn(
                      'border-b border-stone-800 transition-colors last:border-0',
                      online ? 'cursor-pointer hover:bg-stone-800/60' : 'opacity-55',
                    )}
                  >
                    <td className="px-4 py-3">
                      {online ? (
                        <Link
                          href={playHref(world)}
                          onClick={(event) => event.stopPropagation()}
                          className="font-medium text-gold-400 hover:underline"
                        >
                          <span className="inline-flex items-center gap-2">
                            <WorldIcon world={world} />
                            {worldName(world)}
                          </span>
                        </Link>
                      ) : (
                        <span className="inline-flex items-center gap-2 font-medium text-text-muted">
                          <WorldIcon world={world} />
                          {worldName(world)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-text-primary">
                      {online ? playersText(world) : 'Offline'}
                    </td>
                    <td className="px-4 py-3 text-text-secondary">{countryName(world.country)}</td>
                    <td className="px-4 py-3 text-text-secondary">{typeOf(world)}</td>
                    <td className="px-4 py-3">
                      {world.botting ? (
                        <span className="inline-flex items-center rounded border border-moss/50 bg-moss/10 px-2 py-0.5 text-xs text-moss">
                          Botting allowed
                        </span>
                      ) : (
                        <span className="text-text-muted">-</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
