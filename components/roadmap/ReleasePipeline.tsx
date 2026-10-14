import { roadmapItems, stageInfo } from '@/data/roadmap'
import type { RoadmapStage } from '@/lib/roadmap-types'
import { cn } from '@/lib/utils'

/** Order a feature travels in: written on dev, tried on beta, then released. */
const pipeline: RoadmapStage[] = ['dev', 'beta', 'live']

export function ReleasePipeline() {
  return (
    <div className="mx-auto max-w-4xl">
      <ol className="grid gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr] sm:items-stretch">
        {pipeline.flatMap((stage, index) => {
          const info = stageInfo[stage]
          const count = roadmapItems.filter((i) => i.stage === stage).length
          const card = (
            <li
              key={stage}
              className="rounded-lg border border-stone-700 bg-stone-800/60 p-4 text-center"
            >
              <p className="font-adventure text-3xl text-gold-500">{count}</p>
              <p className="mt-1 text-sm font-semibold text-text-primary">{info.label}</p>
              <span
                className={cn(
                  'mt-2 inline-block rounded border px-2 py-0.5 text-xs',
                  info.tone
                )}
              >
                {info.world}
              </span>
            </li>
          )
          if (index === pipeline.length - 1) return [card]
          return [
            card,
            <li
              key={`${stage}-arrow`}
              aria-hidden="true"
              className="flex items-center justify-center text-gold-600 max-sm:rotate-90"
            >
              →
            </li>,
          ]
        })}
      </ol>
    </div>
  )
}
