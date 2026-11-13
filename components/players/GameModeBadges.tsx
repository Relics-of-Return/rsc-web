import Image from 'next/image'

import { PATHS, TIERS, tierTitle } from '@/data/game-modes'
import type { GameMode } from '@/lib/types'
import { cn } from '@/lib/utils'

interface GameModeBadgesProps {
  gameMode: GameMode | null | undefined
  className?: string
  height?: number
}

/**
 * The tier icon, then the path icon, drawn before a username. Icons are
 * 1x pixel art (11px tall natively); height scales them by whole multiples.
 */
export function GameModeBadges({ gameMode, className, height = 11 }: GameModeBadgesProps) {
  if (!gameMode) return null

  const tier = TIERS[gameMode.tier]
  const path = PATHS[gameMode.path]
  const marks: { src: string; title: string }[] = []
  if (tier?.icon) marks.push({ src: tier.icon, title: tierTitle(tier) })
  if (path?.icon) marks.push({ src: path.icon, title: path.name })

  if (marks.length === 0) return null

  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center gap-0.5 align-[-0.1em]',
        className,
      )}
    >
      {marks.map(({ src, title }) => (
        <span key={src} className="inline-block" style={{ height }} title={title}>
          <Image
            src={src}
            alt={title}
            width={0}
            height={0}
            unoptimized
            style={{ height }}
            className="w-auto [image-rendering:pixelated]"
            sizes="20px"
          />
        </span>
      ))}
    </span>
  )
}
