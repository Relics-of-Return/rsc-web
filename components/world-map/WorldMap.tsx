'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { Crown } from '@/components/players/Crown'
import { PlayerMarkers } from '@/components/world-map/player-markers'
import { Input } from '@/components/ui/Input'
import { usePlayerPositions } from '@/hooks/usePlayerPositions'
import type { PlayerPosition } from '@/lib/types'
import { cn, formatUsername } from '@/lib/utils'
import { gameToMap, planeLabel } from '@/lib/world-map'

/**
 * The two worlds get their own map, and each one looks like the world it
 * belongs to: world 1 in the site's gold, world 2 — where botting is allowed —
 * in moss green, down to the colour of the player pins. Everything else is
 * shared, because the worlds run the same landscape.
 */
export type WorldMapVariant = 'classic' | 'botting'

const VARIANTS: Record<
  WorldMapVariant,
  {
    /** Scopes the marker colour overrides in app/globals.css. */
    mapClass: string
    checkbox: string
    dot: string
    chipIdle: string
    chipSelected: string
    frame: string
  }
> = {
  classic: {
    mapClass: '',
    checkbox: 'accent-gold-500',
    dot: 'bg-gold-500',
    chipIdle:
      'border-stone-700 bg-stone-800 text-text-secondary hover:border-gold-500/50 hover:text-gold-400',
    chipSelected: 'border-gold-500 bg-stone-700 text-gold-400',
    frame: 'border-stone-700',
  },
  botting: {
    mapClass: 'rsc-map--bot',
    checkbox: 'accent-moss',
    dot: 'bg-moss',
    chipIdle:
      'border-stone-700 bg-stone-800 text-text-secondary hover:border-moss/60 hover:text-moss',
    chipSelected: 'border-moss bg-stone-700 text-moss',
    frame: 'border-moss/40',
  },
}

interface WorldMapProps {
  /** Server-rendered positions, replaced by the first poll. */
  initialPlayers?: PlayerPosition[]
  /** Which world's positions to plot — each world has its own data server. */
  world?: number
  variant?: WorldMapVariant
  className?: string
}

export function WorldMapDisplay({
  initialPlayers = [],
  world = 1,
  variant = 'classic',
  className,
}: WorldMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const markersRef = useRef<PlayerMarkers | null>(null)

  const theme = VARIANTS[variant]

  const [ready, setReady] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showNames, setShowNames] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)

  const { players, updatedAt, error } = usePlayerPositions(initialPlayers, world)

  const filteredPlayers = players.filter((player) =>
    player.username.toLowerCase().includes(searchQuery.trim().toLowerCase()),
  )

  const select = useCallback((username: string) => {
    setSelected((current) => (current === username ? null : username))
    markersRef.current?.focus(username)
  }, [])

  // boot the map once — the library reaches for `document`/`navigator` at
  // import time, so it can only be pulled in from the browser
  useEffect(() => {
    const container = containerRef.current

    if (!container) {
      return
    }

    let markers: PlayerMarkers | null = null
    let cancelled = false

    const load = async () => {
      try {
        const { default: WorldMap } = await import('@2003scape/rsc-world-map')

        if (cancelled) {
          return
        }

        const worldMap = new WorldMap({ container })
        await worldMap.init()

        if (cancelled) {
          container.innerHTML = ''
          return
        }

        markers = new PlayerMarkers(worldMap, { onSelect: select })
        markers.attach()
        markersRef.current = markers

        // the effect below plants the markers once `ready` flips
        setReady(true)
      } catch (err) {
        console.error(err)

        if (!cancelled) {
          setMapError('The world map failed to load.')
        }
      }
    }

    load()

    return () => {
      cancelled = true
      markers?.destroy()
      markersRef.current = null
      container.innerHTML = ''
      setReady(false)
    }
  }, [select])

  useEffect(() => {
    markersRef.current?.setPlayers(players)
  }, [players, ready])

  useEffect(() => {
    markersRef.current?.setSelected(selected)
  }, [selected, ready])

  useEffect(() => {
    markersRef.current?.setShowNames(showNames)
  }, [showNames, ready])

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Input
            type="search"
            placeholder="Search players..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="max-w-xs"
            aria-label="Search online players"
          />
          <span className="whitespace-nowrap text-sm text-text-secondary">
            {players.length} player{players.length === 1 ? '' : 's'} on world{' '}
            {world}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={showNames}
              onChange={(event) => setShowNames(event.target.checked)}
              className={theme.checkbox}
            />
            Show names
          </label>
          <span className="text-xs text-text-muted">
            {error ? 'Positions unavailable' : <LastUpdated updatedAt={updatedAt} />}
          </span>
        </div>
      </div>

      <div
        className={cn(
          'relative overflow-hidden rounded-lg border bg-stone-900',
          theme.frame,
        )}
      >
        <div
          ref={containerRef}
          className={cn('h-[420px] w-full sm:h-[560px] lg:h-[640px]', theme.mapClass)}
          role="application"
          aria-label={`RuneScape Classic world map, world ${world}`}
        />

        {(!ready || mapError) && (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-900/90 text-sm text-text-secondary">
            {mapError ?? 'Loading world map…'}
          </div>
        )}
      </div>

      <p className="text-xs text-text-muted">
        Drag to pan, scroll or use +/- to zoom, and use Up/Down to view upstairs
        floors and dungeons. Player positions refresh every 10 seconds.
      </p>

      {filteredPlayers.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {filteredPlayers.map((player) => {
            const { plane } = gameToMap(player.x, player.y, player.plane)

            return (
              <button
                key={`${player.world}-${player.username}`}
                type="button"
                onClick={() => select(player.username)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs transition-colors',
                  selected === player.username
                    ? theme.chipSelected
                    : theme.chipIdle,
                )}
                title={`${planeLabel(plane)} — (${player.x}, ${player.y})`}
              >
                {player.rank ? (
                  <Crown rank={player.rank} />
                ) : (
                  <span className={cn('h-2 w-2 rounded-full', theme.dot)} />
                )}
                <span className="font-medium text-text-primary">{formatUsername(player.username)}</span>
                <span className="text-text-muted">W{player.world}</span>
              </button>
            )
          })}
        </div>
      ) : (
        <p className="text-sm text-text-secondary">
          {players.length === 0
            ? variant === 'botting'
              ? 'Nobody is on world 2 right now — players and bots appear here as they log in.'
              : 'Nobody is online right now — positions appear here as players log in.'
            : `No online player matches “${searchQuery.trim()}”.`}
        </p>
      )}
    </div>
  )
}

/** Clock time of the most recent successful poll. */
function LastUpdated({ updatedAt }: { updatedAt: number | null }) {
  if (!updatedAt) {
    return <>Updating…</>
  }

  return <>Updated {new Date(updatedAt).toLocaleTimeString()}</>
}
