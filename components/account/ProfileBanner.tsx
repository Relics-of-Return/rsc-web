'use client'

import { PlayerAvatar } from '@/components/players/Avatar'
import { Crown } from '@/components/players/Crown'
import { IronBadge } from '@/components/players/IronBadge'
import { combatLevel } from '@/data/skills'
import { isStaff, staffRankName } from '@/data/ranks'
import type { AccountPageData, AccountWorld } from '@/lib/types'
import { cn, formatNumber, formatUsername } from '@/lib/utils'
import { Dot, levelsOf, onlineWorld } from './parts'

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[6.5rem] rounded-md border border-stone-700/80 bg-stone-950/50 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.16em] text-text-muted">{label}</div>
      <div className="font-adventure text-xl text-gold-400">{value}</div>
    </div>
  )
}

export function ProfileBanner({ data, home }: { data: AccountPageData; home: AccountWorld | undefined }) {
  const character = home?.character ?? null
  const account = home?.account ?? null
  const accountMode = character?.accountMode ?? account?.accountMode ?? 0
  const online = onlineWorld(data.worlds)
  const overall = character?.ranks.overall

  return (
    <section className="relative overflow-hidden rounded-lg border border-gold-500/30 bg-gradient-to-br from-stone-800 via-stone-900 to-stone-950 shadow-[0_0_40px_rgba(212,175,55,0.08)]">
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gold-500/10 blur-3xl" />
      <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
        <div className="mx-auto flex h-[150px] w-[120px] shrink-0 items-center justify-center overflow-hidden rounded-lg border border-stone-700 bg-stone-950/70 sm:mx-0">
          {character?.appearance ? (
            <div className="origin-center scale-[0.62]">
              <PlayerAvatar appearance={character.appearance} />
            </div>
          ) : (
            <span className="mb-12 font-adventure text-5xl text-stone-600">{data.username.charAt(0).toUpperCase()}</span>
          )}
        </div>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <p className="text-[11px] uppercase tracking-[0.2em] text-text-muted">Account</p>
          <h1 className="mt-1 inline-flex flex-wrap items-center justify-center gap-2 font-adventure text-3xl uppercase tracking-wide text-gold-500 sm:justify-start sm:text-4xl">
            <Crown rank={data.rank} className="h-[22px] w-[26px]" />
            {formatUsername(data.username)}
            <IronBadge accountMode={accountMode} temper={character?.diaries?.temper} className="h-[26px] w-[20px]" />
          </h1>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-sm sm:justify-start">
            <span className={cn('inline-flex items-center gap-2', online ? 'text-moss' : 'text-text-secondary')}>
              <Dot tone={online ? 'good' : 'off'} />
              {online ? `Online on ${online.name}` : 'Offline'}
            </span>
            <span className="text-text-secondary">{accountMode === 1 ? 'Ironman' : 'Standard account'}</span>
            {isStaff(data.rank) && <span className="text-gold-400">{staffRankName(data.rank)}</span>}
          </div>

          <div className="mt-5 flex flex-wrap justify-center gap-2 sm:justify-start">
            <Stat label="Combat" value={character ? String(combatLevel(levelsOf(home))) : '—'} />
            <Stat label="Total level" value={overall ? formatNumber(overall.level) : account ? formatNumber(account.totalLevel) : '—'} />
            <Stat label="Quest points" value={account ? formatNumber(account.questPoints) : '—'} />
            <Stat label="Overall rank" value={overall && overall.rank > 0 ? `#${formatNumber(overall.rank)}` : '—'} />
          </div>
        </div>
      </div>
    </section>
  )
}
