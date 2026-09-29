'use client'

import { RoadmapCard } from '@/components/roadmap/RoadmapCard'
import type { RoadmapCategory } from '@/lib/roadmap-types'
import { cn } from '@/lib/utils'

interface CategoryAccordionProps {
  category: RoadmapCategory
  isExpanded: boolean
  onToggle: () => void
}

export function CategoryAccordion({ category, isExpanded, onToggle }: CategoryAccordionProps) {
  const complete = category.items.filter((i) => i.status === 'Complete').length

  return (
    <div className="overflow-hidden rounded-lg border border-stone-700 bg-stone-800/50">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-stone-700/30"
        aria-expanded={isExpanded}
      >
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-text-primary">
            {category.title}{' '}
            <span className="text-sm font-normal text-text-muted">({category.items.length})</span>
          </h2>
          <p className="text-xs text-text-muted">
            {category.description} — {complete}/{category.items.length} complete
          </p>
        </div>
        <svg
          className={cn(
            'h-5 w-5 text-text-secondary transition-transform',
            isExpanded && 'rotate-180'
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="space-y-2 border-t border-stone-700 p-4">
          {category.items.map((item) => (
            <RoadmapCard key={item.name} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
