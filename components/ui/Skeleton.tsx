import { cn } from '@/lib/utils'

interface SkeletonProps {
  className?: string
}

/** Pulsing placeholder block used by route-level loading skeletons. */
export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('animate-pulse rounded bg-stone-800', className)} />
}
