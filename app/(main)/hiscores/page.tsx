import Link from 'next/link'

import { PlayerAvatar } from '@/components/players/Avatar'
import { Crown } from '@/components/players/Crown'
import { DiaryCard } from '@/components/players/DiaryCard'
import { IronBadge } from '@/components/players/IronBadge'
import { Pagination } from '@/components/shared/Pagination'
import { SkillIcon } from '@/components/skills/SkillIcon'
import { Container } from '@/components/ui/Container'
import { SectionTitle } from '@/components/ui/SectionTitle'
import { HISCORE_SKILLS, hiscoreSkillOrder, skillLabel } from '@/data/skills'
import type { HiscoresData, PlayerRanksData } from '@/lib/types'
import { cn, formatNumber, formatUsername } from '@/lib/utils'
import { fetchWwwJson } from '@/lib/www'

const RANKS_PER_PAGE = 16

interface HiscoresPageProps {
  searchParams: Promise<{ skill?: string; page?: string; username?: string; mode?: string }>
}

const MODES = [
  { id: 'all', label: 'Everyone' },
  { id: 'ironman', label: 'Ironman' },
] as const

export async function generateMetadata({ searchParams }: HiscoresPageProps) {
  const { skill, username, mode } = await searchParams

  if (username) {
    return { title: `${formatUsername(username)} - Hiscores` }
  }

  const who = mode === 'ironman' ? 'Ironman ' : ''

  return { title: `${who}${skillLabel(skill ?? 'overall')} Hiscores` }
}

export default async function HiscoresPage({ searchParams }: HiscoresPageProps) {
  const { skill: rawSkill, page: rawPage, username, mode: rawMode } = await searchParams

  const skill = rawSkill ?? 'overall'
  const page = Number.parseInt(rawPage ?? '0', 10) || 0
  const mode = rawMode === 'ironman' ? 'ironman' : 'all'
  const skills = HISCORE_SKILLS

  const buildHref = (params: { skill?: string; page?: number; username?: string; mode?: string }) => {
    const sp = new URLSearchParams()
    const m = params.mode ?? mode
    if (m !== 'all' && !params.username) sp.set('mode', m)
    const s = params.skill ?? skill
    if (s !== 'overall') sp.set('skill', s)
    const p = params.page ?? page
    if (p > 0) sp.set('page', String(p))
    if (params.username) sp.set('username', params.username)
    const qs = sp.toString()
    return qs ? `/hiscores?${qs}` : '/hiscores'
  }

  // ---- Player lookup view -------------------------------------------------
  if (username) {
    let ranks: PlayerRanksData['ranks'] = null
    let staffRank = 0
    let accountMode = 0
    let diaries: PlayerRanksData['diaries'] = null
    let appearance: PlayerRanksData['appearance'] = null
    let loadError = false

    try {
      const data = await fetchWwwJson<PlayerRanksData>(
        `/api/hiscores/player?username=${encodeURIComponent(username)}`,
      )
      ranks = data.ranks
      staffRank = data.staffRank ?? 0
      accountMode = data.accountMode ?? 0
      diaries = data.diaries ?? null
      appearance = data.appearance ?? null
    } catch {
      loadError = true
    }

    const rankEntries = ranks
      ? Object.entries(
          ranks as Record<string, { rank: number; level: number; experience: number }>,
        ).sort(([a], [b]) => hiscoreSkillOrder(a) - hiscoreSkillOrder(b))
      : null

    return (
      <Container className="py-16">
        <div className="mb-8">
          <Link
            href={buildHref({ username: undefined })}
            className="text-sm text-text-secondary hover:text-gold-400 transition-colors"
          >
            &laquo; Back to hiscores
          </Link>
        </div>

        <SectionTitle
          eyebrow="Player Lookup"
          title={
            <span className="inline-flex items-center gap-2">
              <Crown rank={staffRank} className="w-[26px] h-[22px]" />
              <IronBadge
                accountMode={accountMode}
                temper={diaries?.temper}
                className="w-[20px] h-[26px]"
              />
              {formatUsername(username)}
            </span>
          }
          align="left"
        />

        {loadError ? (
          <p className="mt-10 text-center text-text-secondary">
            Unable to load player ranks. The game server may be offline.
          </p>
        ) : !rankEntries ? (
          <p className="mt-10 text-center text-text-secondary">
            No player with that name was found.
          </p>
        ) : (
          <div className="mt-8 flex flex-col lg:flex-row gap-8 lg:gap-12">
            {/* Avatar, and the diaries under it */}
            <div className="flex-shrink-0 space-y-6 lg:w-72">
              <PlayerAvatar appearance={appearance} />
              <DiaryCard diaries={diaries} accountMode={accountMode} />
            </div>

            {/* Ranks Table */}
            <div className="flex-1 min-w-0 overflow-x-auto rounded-lg border border-stone-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-700 bg-stone-800/80">
                    <th className="px-4 py-3 text-left font-adventure uppercase tracking-wide text-gold-400">Skill</th>
                    <th className="px-4 py-3 text-right font-adventure uppercase tracking-wide text-gold-400">Rank</th>
                    <th className="px-4 py-3 text-right font-adventure uppercase tracking-wide text-gold-400">Level</th>
                    <th className="px-4 py-3 text-right font-adventure uppercase tracking-wide text-gold-400">Experience</th>
                  </tr>
                </thead>
                <tbody>
                  {rankEntries.map(([skillKey, rank]) => (
                    <tr
                      key={skillKey}
                      className="border-b border-stone-800 last:border-0 hover:bg-stone-800/50 transition-colors"
                    >
                      <td className="px-4 py-2.5">
                        <Link
                          href={buildHref({ skill: skillKey, page: 0, username: undefined })}
                          className="inline-flex items-center gap-2 text-text-primary hover:text-gold-400 transition-colors"
                        >
                          <SkillIcon skill={skillKey} className="w-5 h-5" />
                          {skillLabel(skillKey)}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-right text-text-secondary">
                        {rank.rank > 0 ? formatNumber(rank.rank) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-gold-400">
                        {formatNumber(rank.level)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-text-secondary">
                        {formatNumber(rank.experience)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Container>
    )
  }

  // ---- Skill ranking view -------------------------------------------------
  let data: HiscoresData | null = null
  let loadError = false

  try {
    data = await fetchWwwJson<HiscoresData>(
      `/api/hiscores?skill=${encodeURIComponent(skill)}&page=${page}&mode=${mode}`,
    )
  } catch {
    loadError = true
  }

  const ranks = data?.ranks ?? []
  const totalPages = data?.pages ?? 0

  return (
    <Container className="py-16">
      <SectionTitle
        eyebrow="Rankings"
        title={`${mode === 'ironman' ? 'Ironman ' : ''}${skillLabel(skill)} Hiscores`}
        description={
          mode === 'ironman'
            ? 'Ironman accounts ranked among themselves. Their helms are tempered by the Achievement Diaries.'
            : 'Live rankings across all 19 skills, straight from the game server.'
        }
      />

      {/* Everyone, or Ironman */}
      <div className="mt-8 flex justify-center gap-2">
        {MODES.map((m) => (
          <Link
            key={m.id}
            href={buildHref({ mode: m.id, page: 0 })}
            className={cn(
              'inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wide border transition-colors',
              m.id === mode
                ? 'border-gold-500/60 bg-gold-500/10 text-gold-400'
                : 'border-stone-700 text-text-secondary hover:border-gold-500/40 hover:text-gold-400'
            )}
          >
            {m.id === 'ironman' && <IronBadge accountMode={1} temper={0} />}
            {m.label}
          </Link>
        ))}
      </div>

      {/* Skill tabs */}
      <div className="mt-10 flex flex-wrap justify-center gap-2">
        {skills.map((s) => (
                    <Link
            key={s}
            href={buildHref({ skill: s, page: 0 })}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium uppercase tracking-wide border transition-colors',
              s === skill
                ? 'border-gold-500/60 bg-gold-500/10 text-gold-400'
                : 'border-stone-700 text-text-secondary hover:border-gold-500/40 hover:text-gold-400'
            )}
          >
            <SkillIcon skill={s} className="w-4 h-4" />
            {skillLabel(s)}
          </Link>
        ))}
      </div>

      {loadError ? (
        <p className="mt-12 text-center text-text-secondary">
          Unable to load hiscores. The game server may be offline.
        </p>
      ) : ranks.length === 0 ? (
        <p className="mt-12 text-center text-text-secondary">
          {mode === 'ironman'
            ? 'No Ironman accounts are ranked yet. Choose Ironman when you register, or ask Paul in Lumbridge.'
            : 'No players are ranked yet — be the first!'}
        </p>
      ) : (
        <>
          <div className="mt-10 overflow-x-auto rounded-lg border border-stone-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-700 bg-stone-800/80">
                  <th className="px-4 py-3 text-left font-adventure uppercase tracking-wide text-gold-400">Rank</th>
                  <th className="px-4 py-3 text-left font-adventure uppercase tracking-wide text-gold-400">Username</th>
                  <th className="px-4 py-3 text-right font-adventure uppercase tracking-wide text-gold-400">Level</th>
                  <th className="px-4 py-3 text-right font-adventure uppercase tracking-wide text-gold-400">Experience</th>
                </tr>
              </thead>
              <tbody>
                {ranks.map((entry, index) => (
                  <tr
                    key={entry.username}
                    className="border-b border-stone-800 last:border-0 hover:bg-stone-800/50 transition-colors"
                  >
                    <td className="px-4 py-2.5 text-text-muted">
                      {page * RANKS_PER_PAGE + index + 1}
                    </td>
                    <td className="px-4 py-2.5">
                      <Link
                        href={buildHref({ username: entry.username })}
                        className="inline-flex items-center gap-1.5 text-text-primary hover:text-gold-400 transition-colors"
                      >
                        <Crown rank={entry.staffRank} />
                        <IronBadge accountMode={entry.accountMode} temper={entry.temper} />
                        {formatUsername(entry.username)}
                      </Link>
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium text-gold-400">
                      {formatNumber(entry.level)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-text-secondary">
                      {formatNumber(entry.experience)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={page}
            totalPages={totalPages}
            buildHref={(p) => buildHref({ page: p })}
          />
        </>
      )}
    </Container>
  )
}

