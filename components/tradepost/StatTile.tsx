import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

interface StatTileProps {
  label: string
  value: ReactNode
  /** A line under the value: a unit, a count, a movement. */
  detail?: ReactNode
  className?: string
}

/** A labelled figure, for the numbers a tradepost page leads with. */
export function StatTile({ label, value, detail, className }: StatTileProps) {
  return (
    <div className={cn('rounded-lg border border-stone-700 bg-stone-900/60 px-4 py-3', className)}>
      <p className="text-xs uppercase tracking-wide text-text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-text-primary">{value}</p>
      {detail && <div className="mt-1 text-sm text-text-secondary">{detail}</div>}
    </div>
  )
}
