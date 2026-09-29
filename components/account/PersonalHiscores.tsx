'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import { Skeleton } from '@/components/ui/Skeleton'
import { skillLabel } from '@/data/skills'
import type { PlayerRank } from '@/lib/types'
import { formatNumber } from '@/lib/utils'

type RankMap = Record<string, PlayerRank>

interface PersonalHiscoresProps {
  username: string
}

/** Fetches and renders the logged-in player's skill ranks. */
export function PersonalHiscores({ username }: PersonalHiscoresProps) {
  const [ranks, setRanks] = useState<RankMap | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false

    setLoading(true)
    setFailed(false)

    fetch(`/api/hiscores/player?username=${encodeURIComponent(username)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`request failed (${res.status})`)
        return res.json() as Promise<{ ranks: RankMap | null }>
      })
      .then((data) => {
        if (!cancelled) setRanks(data.ranks)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [username])

  if (loading) {
    return (
      <div className="mt-6 rounded-lg border border-stone-700 p-5">
        <Skeleton className="h-4 w-40" />
        <div className="mt-4 space-y-2.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (failed) {
    return (
      <p className="mt-6 rounded-lg border border-stone-700 p-5 text-sm text-text-secondary">
        Unable to load your hiscores right now. The game server may be offline.
      </p>
    )
  }

  if (!ranks) {
    return (
      <p className="mt-6 rounded-lg border border-stone-700 p-5 text-sm text-text-secondary">
        You don&apos;t have any hiscore entries yet.{' '}
        <Link href="/play" className="text-gold-400 hover:text-gold-500">
          Play in-game
        </Link>{' '}
        to appear on the leaderboards.
      </p>
    )
  }

  return (
    <div className="mt-6">
      <div className="overflow-x-auto rounded-lg border border-stone-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-stone-700 bg-stone-800/80">
              <th className="px-4 py-2.5 text-left font-adventure text-xs uppercase tracking-wide text-gold-400">Skill</th>
              <th className="px-4 py-2.5 text-right font-adventure text-xs uppercase tracking-wide text-gold-400">Rank</th>
              <th className="px-4 py-2.5 text-right font-adventure text-xs uppercase tracking-wide text-gold-400">Level</th>
              <th className="px-4 py-2.5 text-right font-adventure text-xs uppercase tracking-wide text-gold-400">Experience</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(ranks).map(([skillKey, rank]) => (
              <tr key={skillKey} className="border-b border-stone-800 last:border-0">
                <td className="px-4 py-2 text-text-primary">
                  {skillLabel(skillKey)}
                </td>
                <td className="px-4 py-2 text-right text-text-secondary">
                  {rank.rank > 0 ? formatNumber(rank.rank) : '—'}
                </td>
                <td className="px-4 py-2 text-right font-medium text-gold-400">
                  {formatNumber(rank.level)}
                </td>
                <td className="px-4 py-2 text-right text-text-secondary">
                  {formatNumber(rank.experience)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-right">
        <Link
          href={`/hiscores?username=${encodeURIComponent(username)}`}
          className="text-sm font-medium text-gold-400 hover:text-gold-500 transition-colors"
        >
          View public profile &rarr;
        </Link>
      </div>
    </div>
  )
}
