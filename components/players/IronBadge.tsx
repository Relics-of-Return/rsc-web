import Image from 'next/image'

import { helmFor } from '@/data/ironman'
import { cn } from '@/lib/utils'

interface IronBadgeProps {
  accountMode: number | null | undefined
  temper?: number | null
  className?: string
}

export function IronBadge({ accountMode, temper, className }: IronBadgeProps) {
  const helm = helmFor(accountMode, temper)
  if (!helm) return null

  const title = `Ironman (${helm.metal} helm)`

  return (
    <span
      className={cn('relative inline-block shrink-0 align-[-0.1em]', 'w-[10px] h-[13px]', className)}
      title={title}
    >
      <Image
        src={helm.image}
        alt={title}
        fill
        unoptimized
        className="object-contain [image-rendering:pixelated]"
        sizes="10px"
      />
    </span>
  )
}
