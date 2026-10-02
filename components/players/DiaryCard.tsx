import { DIARY_AREAS, DIARY_TIERS, helmFor } from '@/data/ironman'
import type { DiarySummary } from '@/lib/types'
import { cn } from '@/lib/utils'

import { IronBadge } from './IronBadge'

interface DiaryCardProps {
  diaries: DiarySummary | null | undefined
  accountMode: number | null | undefined
}

/**
 * A player's achievement diaries on their hiscores page: each area's four
 * tiers, done or claimed, and an Ironman's helm with what tempers it next.
 */
export function DiaryCard({ diaries, accountMode }: DiaryCardProps) {
  const complete = diaries?.complete ?? {}
  const claimed = diaries?.claimed ?? {}
  const temper = diaries?.temper ?? 0
  const helm = helmFor(accountMode, temper)

  return (
    <section className="rounded-lg border border-stone-700 bg-stone-800/60 p-5">
      <h2 className="font-adventure text-lg uppercase tracking-wide text-gold-400">
        Achievement Diaries
      </h2>

      <ul className="mt-4 space-y-3">
        {DIARY_AREAS.map((area) => {
          const done = Number(complete[area.id] ?? 0)
          const got = Number(claimed[area.id] ?? 0)

          return (
            <li key={area.id}>
              <div className="text-sm text-text-primary">{area.name}</div>
              <div className="mt-1 grid grid-cols-4 gap-1.5">
                {DIARY_TIERS.map((tier, index) => (
                  <span
                    key={tier}
                    title={
                      index < got ? `${tier}: claimed` : index < done ? `${tier}: complete` : `${tier}: not done`
                    }
                    className={cn(
                      'rounded px-1.5 py-0.5 text-center text-[11px] font-medium uppercase tracking-wide border',
                      index < got
                        ? 'border-moss/60 bg-moss/20 text-text-primary'
                        : index < done
                          ? 'border-gold-500/60 bg-gold-500/10 text-gold-400'
                          : 'border-stone-700 text-text-muted',
                    )}
                  >
                    {tier}
                  </span>
                ))}
              </div>
            </li>
          )
        })}
      </ul>

      {helm && (
        <p className="mt-5 flex items-center gap-2 text-sm text-text-secondary">
          <IronBadge accountMode={accountMode} temper={temper} className="w-[20px] h-[26px]" />
          <span>
            Ironman, <span className="text-text-primary">{helm.metal}</span> helm
            {temper < 4 ? ' — every tier in every area tempers it further.' : ' — fully tempered.'}
          </span>
        </p>
      )}
    </section>
  )
}
