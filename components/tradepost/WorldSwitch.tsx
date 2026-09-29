import Link from 'next/link'

import type { WorldEntry } from '@/lib/types'
import { worldQuery } from '@/lib/tradepost'
import { cn } from '@/lib/utils'

interface WorldSwitchProps {
  worlds: WorldEntry[]
  world: number
  /** The page's path, without a query string. */
  path: string
}

/**
 * Each world keeps its own tradepost, like its own bank and hiscores. Nothing
 * to switch between with just one.
 */
export function WorldSwitch({ worlds, world, path }: WorldSwitchProps) {
  if (worlds.length < 2) return null

  return (
    <nav className="flex flex-wrap gap-2" aria-label="World">
      {worlds.map((entry) => (
        <Link
          key={entry.id}
          href={`${path}${worldQuery(entry.id)}`}
          aria-current={entry.id === world ? 'page' : undefined}
          className={cn(
            'px-3 py-1.5 rounded-md text-xs font-medium uppercase tracking-wide border transition-colors',
            entry.id === world
              ? 'border-gold-500/60 bg-gold-500/10 text-gold-400'
              : 'border-stone-700 text-text-secondary hover:border-gold-500/40 hover:text-gold-400',
          )}
        >
          {entry.name ?? `World ${entry.id}`}
        </Link>
      ))}
    </nav>
  )
}
