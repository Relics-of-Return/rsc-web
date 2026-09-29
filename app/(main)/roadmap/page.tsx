'use client'

import { useMemo, useState } from 'react'

import { CategoryAccordion } from '@/components/roadmap/CategoryAccordion'
import { ProgressBar } from '@/components/roadmap/ProgressBar'
import { Container } from '@/components/ui/Container'
import { roadmapCategories } from '@/data/roadmap'

export default function RoadmapPage() {
  const [expandedId, setExpandedId] = useState<string | null>(roadmapCategories[0]?.id ?? null)

  const { overallProgress, completeCount, totalCount } = useMemo(() => {
    const items = roadmapCategories.flatMap((c) => c.items)
    return {
      overallProgress: Math.round(
        items.reduce((sum, item) => sum + item.progress, 0) / items.length
      ),
      completeCount: items.filter((i) => i.status === 'Complete').length,
      totalCount: items.length,
    }
  }, [])

  // Categories sorted by average progress (most complete first)
  const sortedCategories = useMemo(
    () =>
      [...roadmapCategories].sort((a, b) => {
        const avg = (cat: (typeof roadmapCategories)[number]) =>
          cat.items.reduce((s, i) => s + i.progress, 0) / cat.items.length
        return avg(b) - avg(a)
      }),
    []
  )

  return (
    <Container className="py-16">
      <div className="mb-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-500">
          Development
        </p>
        <h1 className="mt-2 font-adventure text-3xl text-gold-500 uppercase tracking-wide sm:text-4xl">
          Server Roadmap
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-text-secondary">
          A transparent look at what is built, being tested and still to come across the
          Relics of Return stack. Categories are ordered by overall completion.
        </p>
      </div>

      {/* Overall stats */}
      <div className="mx-auto max-w-3xl rounded-lg border border-stone-700 bg-stone-800/60 p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-adventure text-3xl text-gold-500">{overallProgress}%</p>
            <p className="text-xs uppercase tracking-[0.15em] text-text-muted">
              Overall completion
            </p>
          </div>
          <div className="flex gap-6 text-center">
            <div>
              <p className="font-adventure text-2xl text-moss">{completeCount}</p>
              <p className="text-xs text-text-muted">Complete</p>
            </div>
            <div>
              <p className="font-adventure text-2xl text-gold-500">
                {totalCount - completeCount}
              </p>
              <p className="text-xs text-text-muted">Remaining</p>
            </div>
            <div>
              <p className="font-adventure text-2xl text-text-primary">{totalCount}</p>
              <p className="text-xs text-text-muted">Tracked</p>
            </div>
          </div>
        </div>
        <ProgressBar progress={overallProgress} showLabel={false} className="mt-4" />
      </div>

      {/* Categories */}
      <div className="mt-10 space-y-4">
        {sortedCategories.map((category) => (
          <CategoryAccordion
            key={category.id}
            category={category}
            isExpanded={expandedId === category.id}
            onToggle={() => setExpandedId(expandedId === category.id ? null : category.id)}
          />
        ))}
      </div>

      <p className="mt-8 text-center text-xs text-text-muted">
        Want to help build? Check the{' '}
        <a
          href="https://github.com/2003scape"
          target="_blank"
          rel="noopener noreferrer"
          className="text-gold-400 hover:text-gold-500"
        >
          source on GitHub
        </a>{' '}
        and pick an unclaimed item.
      </p>
    </Container>
  )
}
