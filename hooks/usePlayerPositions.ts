'use client'

import { useCallback, useEffect, useState } from 'react'

import { getPlayerPositions } from '@/lib/api'
import type { PlayerPosition } from '@/lib/types'

/** How often the world map refreshes player coordinates. */
const POLL_INTERVAL = 10000

/**
 * Polls `/api/players` so the world map tracks players as they walk around.
 * rsc-server pushes coordinates to the data server every five seconds, so
 * polling faster than that would not surface anything new.
 *
 * Each world keeps its own data server, so `world` picks which one to read.
 */
export function usePlayerPositions(
  initialPlayers: PlayerPosition[] = [],
  world = 1,
) {
  const [players, setPlayers] = useState<PlayerPosition[]>(initialPlayers)
  const [updatedAt, setUpdatedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchPositions = useCallback(async () => {
    try {
      const data = await getPlayerPositions(world)
      setPlayers(data.players ?? [])
      setUpdatedAt(Date.now())
      setError(null)
    } catch {
      setError('Failed to fetch player positions')
    }
  }, [world])

  useEffect(() => {
    fetchPositions()

    const interval = setInterval(fetchPositions, POLL_INTERVAL)

    return () => clearInterval(interval)
  }, [fetchPositions])

  return { players, updatedAt, error, refetch: fetchPositions }
}
