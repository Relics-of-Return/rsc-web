import Image from 'next/image'

import { crownPath, staffRankName } from '@/data/ranks'
import { cn } from '@/lib/utils'

interface CrownProps {
  /** Staff rank as stored in the data server (0 = regular player). */
  rank: number | null | undefined
  className?: string
}

/**
 * The crown a staff member wears in front of their username, matching the one
 * the game client draws in the chat box. Renders nothing for regular players.
 */
export function Crown({ rank, className }: CrownProps) {
  const src = crownPath(rank)
  if (!src) return null

  const name = staffRankName(rank)

  return (
    <span
      className={cn('relative inline-block shrink-0 align-[-0.1em]', 'w-[13px] h-[11px]', className)}
      title={name}
    >
      <Image
        src={src}
        alt={`${name} crown`}
        fill
        // 13x11 pixel art: serve it untouched and scale it in whole pixels
        unoptimized
        className="object-contain [image-rendering:pixelated]"
        sizes="13px"
      />
    </span>
  )
}
