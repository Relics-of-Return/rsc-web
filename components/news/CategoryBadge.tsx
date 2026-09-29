import { cn } from '@/lib/utils'
import { newsCategoryStyle } from '@/data/news'

interface CategoryBadgeProps {
  category: number
  size?: 'sm' | 'md'
}

export function CategoryBadge({ category, size = 'md' }: CategoryBadgeProps) {
  const style = newsCategoryStyle(category)
  const Icon = style.Icon

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-3.5 w-3.5',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded font-medium uppercase tracking-wide border',
        size === 'sm' ? 'px-2 py-1 text-xs' : 'px-2 py-0.5 text-xs',
        style.borderColor,
        style.bgColor,
        style.textColor
      )}
    >
      <Icon className={sizeClasses[size]} />
      {style.label}
    </span>
  )
}
