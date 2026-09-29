import { cn } from '@/lib/utils'

interface ProgressBarProps {
  progress: number
  color?: 'moss' | 'gold' | 'blue' | 'ember' | 'red'
  showLabel?: boolean
  className?: string
}

const colorMap = {
  moss: 'bg-moss',
  gold: 'bg-gold-500',
  blue: 'bg-rune-blue',
  ember: 'bg-ember',
  red: 'bg-rune-red',
}

export function ProgressBar({
  progress,
  color = 'moss',
  showLabel = true,
  className,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, progress))

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs text-text-secondary">Progress</span>
          <span className="text-xs font-medium text-text-primary">{clamped}%</span>
        </div>
      )}
      <div className="h-2.5 w-full overflow-hidden rounded bg-stone-900">
        <div
          className={cn('h-2.5 rounded transition-all duration-500 ease-out', colorMap[color])}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  )
}
