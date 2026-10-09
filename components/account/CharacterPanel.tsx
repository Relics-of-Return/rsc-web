'use client'

import Image from 'next/image'
import Link from 'next/link'

import { DiaryCard } from '@/components/players/DiaryCard'
import { DEFAULT_SKILLS, MAX_LEVEL, combatLevel, experienceForLevel, skillIconPath, skillLabel } from '@/data/skills'
import type { AccountWorld, PlayerRank } from '@/lib/types'
import { cn, formatNumber } from '@/lib/utils'
import { Panel, levelsOf } from './parts'

function SkillTile({ skill, rank }: { skill: string; rank: PlayerRank | undefined }) {
  const level = rank?.level ?? (skill === 'hits' ? 10 : 1)
  const experience = rank?.experience ?? (skill === 'hits' ? experienceForLevel(10) : 0)
  const maxed = level >= MAX_LEVEL
  const from = experienceForLevel(level)
  const to = experienceForLevel(level + 1)
  const progress = maxed ? 1 : Math.min(1, Math.max(0, (experience - from) / (to - from)))
  const icon = skillIconPath(skill)

  const title = [
    `${skillLabel(skill)}: level ${level}`,
    `${formatNumber(experience)} XP`,
    maxed ? 'Maximum level' : `${formatNumber(to - experience)} XP to level ${level + 1}`,
    rank && rank.rank > 0 ? `Rank #${formatNumber(rank.rank)}` : 'Unranked',
  ].join(' · ')

  return (
    <div title={title} className={cn('rounded-md border bg-stone-950/60 px-3 py-2.5', maxed ? 'border-gold-500/60 shadow-[0_0_12px_rgba(212,175,55,0.15)]' : 'border-stone-700')}>
      <div className="flex items-center gap-2.5">
        <span className="relative h-7 w-7 shrink-0">
          {icon && <Image src={icon} alt="" fill unoptimized sizes="28px" className="object-contain" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs text-text-secondary">{skillLabel(skill)}</span>
          <span className="block text-[10px] text-text-muted">{rank && rank.rank > 0 ? `#${formatNumber(rank.rank)}` : 'Unranked'}</span>
        </span>
        <span className={cn('font-adventure text-2xl leading-none', maxed ? 'text-gold-400' : 'text-[#ffff00]')}>{level}</span>
      </div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-stone-800" aria-hidden>
        <div className={cn('h-full rounded-full', maxed ? 'bg-gold-500' : 'bg-moss')} style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
    </div>
  )
}

export function CharacterPanel({ worlds, selected, onSelect, username }: { worlds: AccountWorld[]; selected: AccountWorld | undefined; onSelect: (id: number) => void; username: string }) {
  const playable = worlds.filter((world) => world.character || world.account)
  const character = selected?.character ?? null
  const ranks = character?.ranks ?? {}
  const overall = ranks.overall

  return (
    <div className="space-y-6">
      {playable.length > 1 && (
        <div role="tablist" aria-label="World" className="flex flex-wrap gap-1.5">
          {playable.map((world) => (
            <button
              key={world.id}
              type="button"
              role="tab"
              aria-selected={world.id === selected?.id}
              onClick={() => onSelect(world.id)}
              className={cn(
                'rounded-md border px-3 py-1.5 text-xs uppercase tracking-wide transition-colors',
                world.id === selected?.id ? 'border-gold-500/60 bg-gold-500/15 text-gold-400' : 'border-stone-700 text-text-secondary hover:text-text-primary'
              )}
            >
              {world.name}
            </button>
          ))}
        </div>
      )}

      <Panel
        title={`Skills${selected ? ` · ${selected.name}` : ''}`}
        description="Hover over a skill for its experience, rank and what the next level takes."
        action={
          selected?.id === 1 ? (
            <Link href={`/hiscores?username=${encodeURIComponent(username)}`} className="text-xs font-medium text-gold-400 hover:text-gold-500">
              Public hiscores &rarr;
            </Link>
          ) : undefined
        }
      >
        {!character ? (
          <p className="text-sm text-text-secondary">
            {selected?.account
              ? 'This character has no hiscore entries yet. Earn some experience and it will appear here.'
              : `You don't have a character on ${selected?.name ?? 'this world'} yet. Your first login there creates one.`}{' '}
            <Link href={`/play${selected && selected.id !== 1 ? `?world=${selected.id}` : ''}`} className="text-gold-400 hover:text-gold-500">
              Play now
            </Link>
          </p>
        ) : (
          <>
            <div className="mb-4 grid gap-2 sm:grid-cols-3">
              <div className="rounded-md border border-stone-700 bg-stone-950/60 px-4 py-3">
                <div className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Total level</div>
                <div className="font-adventure text-2xl text-gold-400">{formatNumber(overall?.level ?? 0)}</div>
              </div>
              <div className="rounded-md border border-stone-700 bg-stone-950/60 px-4 py-3">
                <div className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Total experience</div>
                <div className="font-adventure text-2xl text-gold-400">{formatNumber(overall?.experience ?? 0)}</div>
              </div>
              <div className="rounded-md border border-stone-700 bg-stone-950/60 px-4 py-3">
                <div className="text-[10px] uppercase tracking-[0.16em] text-text-muted">Combat level</div>
                <div className="font-adventure text-2xl text-gold-400">{combatLevel(levelsOf(selected))}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 lg:grid-cols-3">
              {DEFAULT_SKILLS.map((skill) => (
                <SkillTile key={skill} skill={skill} rank={ranks[skill]} />
              ))}
            </div>
          </>
        )}
      </Panel>

      {character && <DiaryCard diaries={character.diaries} accountMode={character.accountMode} />}
    </div>
  )
}
