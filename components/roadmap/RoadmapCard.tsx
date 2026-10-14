'use client'

import Image from 'next/image'
import { useState } from 'react'

import { areaLabels } from '@/data/roadmap'
import type { RoadmapItem } from '@/lib/roadmap-types'
import { cn } from '@/lib/utils'

export function RoadmapCard({ item }: { item: RoadmapItem }) {
  const [open, setOpen] = useState(false)
  const hasDetails = Boolean(item.image || item.highlights?.length || item.remaining?.length)

  const body = (
    <>
      <div className="min-w-0 flex-1 text-left">
        <p className="text-[11px] uppercase tracking-[0.14em] text-text-muted">
          {areaLabels[item.area]}
        </p>
        <h3 className="mt-0.5 text-base font-semibold text-text-primary">{item.title}</h3>
        <p className="mt-1 text-sm text-text-secondary">{item.summary}</p>
      </div>
      {hasDetails && (
        <svg
          className={cn(
            'mt-1 h-4 w-4 flex-shrink-0 text-text-secondary transition-transform',
            open && 'rotate-180'
          )}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      )}
    </>
  )

  return (
    <article className="rounded-lg border border-stone-700 bg-stone-800/50">
      {hasDetails ? (
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-stone-700/30"
        >
          {body}
        </button>
      ) : (
        <div className="flex items-start gap-3 p-4">{body}</div>
      )}

      {open && (
        <div className="space-y-3 border-t border-stone-700/60 p-4 text-sm">
          {item.image && (
            <Image
              src={item.image.src}
              alt={item.image.alt}
              width={item.image.width}
              height={item.image.height}
              className="h-auto w-full rounded border border-stone-700"
            />
          )}
          {item.highlights && item.highlights.length > 0 && (
            <ul className="space-y-1 text-text-secondary">
              {item.highlights.map((h) => (
                <li key={h} className="flex gap-2">
                  <span className="text-gold-500" aria-hidden="true">
                    ✓
                  </span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          )}
          {item.remaining && item.remaining.length > 0 && (
            <div>
              <h4 className="mb-1 text-xs font-semibold uppercase tracking-[0.12em] text-ember">
                Still to do
              </h4>
              <ul className="space-y-1 text-text-muted">
                {item.remaining.map((r) => (
                  <li key={r} className="flex gap-2">
                    <span aria-hidden="true">○</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </article>
  )
}
