import { Crown } from '@/components/players/Crown'
import { cn } from '@/lib/utils'

interface PlayerNameProps {
  username: string
  /** Staff rank as stored in the data server (0 = regular player). */
  rank?: number | null
  className?: string
}

/** A username with its staff crown in front of it, like in game. */
export function PlayerName({ username, rank, className }: PlayerNameProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <Crown rank={rank} />
      {username}
    </span>
  )
}
