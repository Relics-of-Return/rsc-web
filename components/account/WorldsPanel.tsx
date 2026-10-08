'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { Bot, FlaskConical, Globe } from 'lucide-react'

import { IronBadge } from '@/components/players/IronBadge'
import { combatLevel } from '@/data/skills'
import type { AccountWorld } from '@/lib/types'
import { cn, formatNumber } from '@/lib/utils'
import { Dot, Panel, levelsOf, relativeTime, standingOf } from './parts'

function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide', className)}>{children}</span>
}

function WorldCard({ world, onCharacter }: { world: AccountWorld; onCharacter: () => void }) {
  const { account, character } = world
  const online = (account?.world ?? 0) > 0
  const standing = standingOf(account)
  const Icon = world.channel === 'beta' ? FlaskConical : world.botting ? Bot : Globe
  const exists = !!(account || character)

  return (
    <article className={cn('flex flex-col rounded-lg border bg-stone-900/60 p-4', online ? 'border-moss/60' : 'border-stone-700')}>
      <header className="flex items-start gap-3">
        <span className="rounded-md border border-stone-700 bg-stone-950 p-2 text-gold-500">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-adventure text-lg uppercase tracking-wide text-gold-400">{world.name}</h3>
          <div className="mt-1 flex flex-wrap gap-1">
            {world.channel === 'beta' && <Badge className="border-rune-blue/50 text-rune-blue">Beta</Badge>}
            {world.botting && <Badge className="border-ember/50 text-ember">Botting allowed</Badge>}
            {world.channel !== 'beta' && !world.botting && <Badge className="border-moss/50 text-moss">Main world</Badge>}
          </div>
        </div>
      </header>

      <div className="mt-4 flex-1 text-sm">
        {!world.reachable ? (
          <p className="text-text-secondary">{world.name} couldn&apos;t be reached just now. Try again in a little while.</p>
        ) : !exists ? (
          <p className="text-text-secondary">No character here yet. Your first login on {world.name} creates one, with your website password.</p>
        ) : (
          <dl className="space-y-1.5">
            <div className="flex justify-between gap-3">
              <dt className="text-text-muted">Combat</dt>
              <dd className="text-text-primary">{character ? combatLevel(levelsOf(world)) : '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-text-muted">Total level</dt>
              <dd className="text-text-primary">{character?.ranks.overall ? formatNumber(character.ranks.overall.level) : account ? formatNumber(account.totalLevel) : '—'}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-text-muted">Account type</dt>
              <dd className="inline-flex items-center gap-1.5 text-text-primary">
                {(character?.accountMode ?? account?.accountMode) === 1 ? (
                  <>
                    <IronBadge accountMode={1} temper={character?.diaries?.temper} /> Ironman
                  </>
                ) : (
                  'Standard'
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-text-muted">Status</dt>
              <dd className="inline-flex items-center gap-1.5 text-text-primary">
                <Dot tone={online ? 'good' : 'off'} />
                {online ? 'Online now' : account && account.lastLogin > 0 ? `Last played ${relativeTime(account.lastLogin)}` : 'Offline'}
              </dd>
            </div>
            {standing && standing.tone !== 'good' && (
              <div className="flex justify-between gap-3">
                <dt className="text-text-muted">Standing</dt>
                <dd className={standing.tone === 'bad' ? 'text-red-400' : 'text-gold-400'}>{standing.label}</dd>
              </div>
            )}
          </dl>
        )}
      </div>

      <footer className="mt-4 flex gap-2">
        <Link
          href={`/play${world.id !== 1 ? `?world=${world.id}` : ''}`}
          className="inline-flex flex-1 items-center justify-center rounded-md bg-gradient-to-b from-gold-500 to-gold-600 px-3 py-2 font-adventure text-xs uppercase tracking-wide text-stone-950 transition-shadow hover:shadow-[0_0_15px_rgba(212,175,55,0.4)]"
        >
          Play
        </Link>
        {character && (
          <button type="button" onClick={onCharacter} className="flex-1 rounded-md border border-stone-700 px-3 py-2 font-adventure text-xs uppercase tracking-wide text-gold-400 transition-colors hover:border-gold-500/50">
            Skills
          </button>
        )}
      </footer>
    </article>
  )
}

export function WorldsPanel({ worlds, onCharacter }: { worlds: AccountWorld[]; onCharacter: (id: number) => void }) {
  return (
    <Panel title="Your worlds" description="Every world keeps its own character, bank and progress. Your login is the same on all of them.">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {worlds.map((world) => (
          <WorldCard key={world.id} world={world} onCharacter={() => onCharacter(world.id)} />
        ))}
      </div>
    </Panel>
  )
}
