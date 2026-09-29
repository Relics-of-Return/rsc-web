import Image from 'next/image'

import { cn } from '@/lib/utils'

interface ItemIconProps {
  id: number
  /** How many times the game's 48x32 picture to draw it. */
  scale?: 1 | 2
  className?: string
}

/**
 * An item's inventory picture, as the game draws it (exported by rsc-client's
 * scripts/export-item-icons.js into public/items).
 */
export function ItemIcon({ id, scale = 1, className }: ItemIconProps) {
  const width = 48 * scale
  const height = 32 * scale

  return (
    <span
      className={cn('relative inline-block shrink-0', className)}
      style={{ width, height }}
      aria-hidden="true"
    >
      <Image
        src={`/items/${id}.png`}
        alt=""
        fill
        // pixel art: serve it untouched and scale it in whole pixels
        unoptimized
        className="object-contain [image-rendering:pixelated]"
        sizes={`${width}px`}
      />
    </span>
  )
}
