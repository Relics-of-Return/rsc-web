'use client'

import { useMemo, useState } from 'react'

import { RoadmapCard } from '@/components/roadmap/RoadmapCard'
import { areaLabels, roadmapItems, stageInfo, stageOrder } from '@/data/roadmap'
import type { RoadmapArea } from '@/lib/roadmap-types'
import { cn } from '@/lib/utils'

type AreaFilter = RoadmapArea | 'all'

const areaKeys = Object.keys(areaLabels) as RoadmapArea[]

export function RoadmapBoard() {
  const [area, setArea] = useState<AreaFilter>('all')

  const counts = useMemo(() => {
    const byArea = new Map<AreaFilter, number>([['all', roadmapItems.length]])
    for (const item of roadmapItems) byArea.set(item.area, (byArea.get(item.area) ?? 0) + 1)
    return byArea
  }, [])

  const filters: AreaFilter[] = ['all', ...areaKeys.filter((k) => counts.has(k))]

  return (
    <div>
      <div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Filter by area">
        {filters.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setArea(key)}
            aria-pressed={area === key}
            className={cn(
              'rounded-full border px-3 py-1 text-xs transition-colors',
              area === key
                ? 'border-gold-500 bg-gold-500/15 text-gold-500'
                : 'border-stone-700 text-text-secondary hover:border-stone-600 hover:text-text-primary'
            )}
          >
            {key === 'all' ? 'Everything' : areaLabels[key]}{' '}
            <span className="text-text-muted">{counts.get(key)}</span>
          </button>
        ))}
      </div>

      <div className="mt-10 space-y-12">
        {stageOrder.map((stage) => {
          const items = roadmapItems.filter(
            (i) => i.stage === stage && (area === 'all' || i.area === area)
          )
          if (items.length === 0) return null
          const info = stageInfo[stage]

          return (
            <section key={stage} aria-labelledby={`stage-${stage}`}>
              <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2
                  id={`stage-${stage}`}
                  className="font-adventure text-xl uppercase tracking-wide text-gold-500"
                >
                  {info.label}
                </h2>
                <span className={cn('rounded border px-2 py-0.5 text-xs', info.tone)}>
                  {info.world}
                </span>
                {info.blurb && (
                  <p className="w-full text-sm text-text-muted sm:w-auto">{info.blurb}</p>
                )}
              </div>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <RoadmapCard key={item.id} item={item} />
                ))}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
