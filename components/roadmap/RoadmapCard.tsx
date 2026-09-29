'use client'

import { useState } from 'react'

import { ProgressBar } from '@/components/roadmap/ProgressBar'
import type { RoadmapItem, RoadmapStatus } from '@/lib/roadmap-types'
import { cn } from '@/lib/utils'

const statusColors: Record<RoadmapStatus, string> = {
  Complete: 'bg-moss/20 text-moss border-moss/30',
  Testing: 'bg-gold-500/20 text-gold-500 border-gold-500/30',
  'In Progress': 'bg-rune-blue/20 text-rune-blue border-rune-blue/30',
  'Not Started': 'bg-ember/20 text-ember border-ember/30',
}

interface RoadmapCardProps {
  item: RoadmapItem
}

export function RoadmapCard({ item }: RoadmapCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const hasDetails = Boolean(
    item.completedFeatures?.length ||
      item.plannedFeatures?.length ||
      item.knownIssues?.length ||
      item.notes?.length
  )

  const header = (
    <>
      <div className="min-w-0 flex-1 text-left">
        <div className="flex items-center justify-between gap-2">
          <h3 className="truncate text-sm font-medium text-text-primary">{item.name}</h3>
          <span
            className={cn(
              'flex-shrink-0 rounded border px-2 py-0.5 text-xs',
              statusColors[item.status]
            )}
          >
            {item.status}
          </span>
        </div>
        <ProgressBar progress={item.progress} className="mt-1.5" />
      </div>
      {hasDetails && (
        <svg
          className={cn(
            'h-4 w-4 flex-shrink-0 text-text-secondary transition-transform',
            isExpanded && 'rotate-180'
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      )}
    </>
  )

  return (
    <div className="rounded-lg border border-stone-700 bg-stone-800/30">
      {hasDetails ? (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-stone-700/30"
          aria-expanded={isExpanded}
        >
          {header}
        </button>
      ) : (
        <div className="flex w-full items-center gap-3 p-3">{header}</div>
      )}

      {isExpanded && (
        <div className="space-y-3 border-t border-stone-700/50 px-3 pb-3 pt-3">
          <p className="text-sm text-text-secondary">{item.description}</p>

          {item.completedFeatures && item.completedFeatures.length > 0 && (
            <div>
              <h4 className="mb-1 text-xs font-semibold text-moss">Completed</h4>
              <ul className="space-y-0.5 text-xs text-text-muted">
                {item.completedFeatures.map((feature, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-moss">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {item.plannedFeatures && item.plannedFeatures.length > 0 && (
            <div>
              <h4 className="mb-1 text-xs font-semibold text-rune-blue">Planned</h4>
              <ul className="space-y-0.5 text-xs text-text-muted">
                {item.plannedFeatures.map((feature, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-rune-blue">○</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {item.knownIssues && item.knownIssues.length > 0 && (
            <div>
              <h4 className="mb-1 text-xs font-semibold text-ember">Known Issues</h4>
              <ul className="space-y-0.5 text-xs text-text-muted">
                {item.knownIssues.map((issue, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-ember">!</span>
                    <span>{issue}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {item.notes && item.notes.length > 0 && (
            <div>
              <h4 className="mb-1 text-xs font-semibold text-text-secondary">Notes</h4>
              <ul className="space-y-0.5 text-xs text-text-muted">
                {item.notes.map((note, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span>•</span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
