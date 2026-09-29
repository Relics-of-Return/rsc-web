import { formatPercent } from '@/lib/tradepost'
import { cn } from '@/lib/utils'

interface ChangeProps {
  percent: number | null | undefined
  className?: string
}

/**
 * A price movement: an arrow and a signed percentage, so the direction never
 * rests on the colour alone.
 */
export function Change({ percent, className }: ChangeProps) {
  if (percent === null || percent === undefined) {
    return <span className={cn('text-text-muted', className)}>—</span>
  }

  const text = formatPercent(percent)
  const flat = text === '0%'
  const up = !flat && percent > 0

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 tabular-nums',
        flat ? 'text-text-secondary' : up ? 'text-moss' : 'text-ember',
        className,
      )}
    >
      <span aria-hidden="true" className="text-[0.7em]">
        {flat ? '■' : up ? '▲' : '▼'}
      </span>
      <span>
        <span className="sr-only">{flat ? 'unchanged' : up ? 'up' : 'down'} </span>
        {text}
      </span>
    </span>
  )
}
