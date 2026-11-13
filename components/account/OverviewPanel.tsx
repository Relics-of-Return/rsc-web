'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { KeyRound, Link2, ShieldCheck, Trophy, Vote } from 'lucide-react'

import { GameModeBadges } from '@/components/players/GameModeBadges'
import { characterModeText } from '@/data/game-modes'
import { SERVER_LIST_VOTE_URL } from '@/lib/constants'
import type { AccountPageData, AccountWorld } from '@/lib/types'
import { cn, formatUsername } from '@/lib/utils'
import { Dot, Fact, Panel, longDate, onlineWorld, relativeTime, standingOf } from './parts'

export type AccountTab = 'overview' | 'character' | 'security' | 'linked'

function QuickAction({ icon, title, text, href, onClick }: { icon: ReactNode; title: string; text: string; href?: string; onClick?: () => void }) {
  const className = 'group flex items-start gap-3 rounded-md border border-stone-700 bg-stone-900/60 p-4 text-left transition-colors hover:border-gold-500/50 hover:bg-stone-900'
  const body = (
    <>
      <span className="rounded-md border border-stone-700 bg-stone-950 p-2 text-gold-500 transition-colors group-hover:text-gold-400">{icon}</span>
      <span>
        <span className="block font-adventure uppercase tracking-wide text-gold-400">{title}</span>
        <span className="mt-0.5 block text-xs text-text-secondary">{text}</span>
      </span>
    </>
  )

  return href ? (
    <Link href={href} className={className}>{body}</Link>
  ) : (
    <button type="button" onClick={onClick} className={className}>{body}</button>
  )
}

export function OverviewPanel({ data, home, onTab }: { data: AccountPageData; home: AccountWorld | undefined; onTab: (tab: AccountTab) => void }) {
  const account = home?.account ?? null
  const standing = standingOf(account)
  const online = onlineWorld(data.worlds)
  const elsewhere = data.worlds.filter((world) => world.id !== home?.id && standingOf(world.account)?.tone !== 'good' && world.account)

  return (
    <div className="space-y-6">
      <Panel title="Account details" description="Your website account, which is also your login on every world.">
        {account ? (
          <dl>
            <Fact label="Username">{formatUsername(account.username)}</Fact>
            <Fact label="Game mode">
              <span className="inline-flex items-center gap-1.5">
                <GameModeBadges gameMode={home?.character?.gameMode} />
                {characterModeText(account.accountMode, home?.character?.gameMode)}
              </span>
            </Fact>
            <Fact label="Member since">{longDate(account.createdAt)}</Fact>
            <Fact label="Last logged in">
              {account.lastLogin > 0 ? (
                <>
                  {longDate(account.lastLogin)} <span className="text-text-muted">({relativeTime(account.lastLogin)})</span>
                </>
              ) : (
                'Never'
              )}
            </Fact>
            <Fact label="Status">
              <span className="inline-flex items-center gap-2">
                <Dot tone={online ? 'good' : 'off'} />
                {online ? `Playing on ${online.name}` : 'Offline'}
              </span>
            </Fact>
            {standing && (
              <Fact label="Account standing">
                <span className={cn('inline-flex items-center gap-2', standing.tone === 'good' ? 'text-moss' : standing.tone === 'warn' ? 'text-gold-400' : 'text-red-400')}>
                  <Dot tone={standing.tone} />
                  {standing.label}
                  {standing.detail && <span className="text-text-secondary">{standing.detail}</span>}
                </span>
              </Fact>
            )}
          </dl>
        ) : (
          <p className="text-sm text-text-secondary">
            Your account details will show here after the next game update. Everything else on this page already works.
          </p>
        )}

        {elsewhere.length > 0 && (
          <ul className="mt-4 space-y-1.5 rounded-md border border-gold-500/30 bg-gold-500/10 p-3 text-xs text-parchment">
            {elsewhere.map((world) => {
              const other = standingOf(world.account)
              return (
                <li key={world.id}>
                  <b>{world.name}:</b> {other?.label} {other?.detail}
                </li>
              )
            })}
          </ul>
        )}
      </Panel>

      {data.votes !== undefined && (
        <Panel
          title="Voting"
          description="Every vote is 250,000 coins and a vote token, once every 24 hours."
          action={
            <a
              href={`${SERVER_LIST_VOTE_URL}?username=${encodeURIComponent(data.username)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-gold-500/50 px-3 py-1.5 font-adventure text-sm uppercase tracking-wide text-gold-400 transition-colors hover:bg-gold-500/10"
            >
              <Vote className="h-4 w-4" aria-hidden="true" />
              Vote
              <span className="sr-only"> on the RSC Server List (opens in a new tab)</span>
            </a>
          }
        >
          {data.votes ? (
          <dl>
            <Fact label="Total votes">{data.votes.total.toLocaleString('en-GB')}</Fact>
            <Fact label="Last voted">
              {data.votes.lastVoteAt > 0 ? (
                <>
                  {longDate(data.votes.lastVoteAt)} <span className="text-text-muted">({relativeTime(data.votes.lastVoteAt)})</span>
                </>
              ) : (
                'Never'
              )}
            </Fact>
            <Fact label="Next vote">
              {data.votes.nextVoteAt > Date.now() / 1000 ? relativeTime(data.votes.nextVoteAt) : <span className="text-moss">Now</span>}
            </Fact>
            <Fact label="Rewards to claim">
              {data.votes.waiting > 0 ? (
                <span className="text-gold-400">
                  {data.votes.waiting} &mdash; type <b>::claim</b> in game
                </span>
              ) : (
                'None'
              )}
            </Fact>
          </dl>
          ) : (
            <p className="text-sm text-text-secondary">Your votes will show here after the next game update.</p>
          )}
        </Panel>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <QuickAction icon={<Trophy className="h-4 w-4" />} title="Your hiscores" text="Your ranks against every other player." href={`/hiscores?username=${encodeURIComponent(data.username)}`} />
        <QuickAction icon={<KeyRound className="h-4 w-4" />} title="Change password" text="Keep your account secure." onClick={() => onTab('security')} />
        <QuickAction icon={<Link2 className="h-4 w-4" />} title="Link Discord" text="Join the beta world and more." onClick={() => onTab('linked')} />
      </div>

      <Panel title="Staying safe" description="The same rules RuneScape players have lived by for twenty years.">
        <ul className="space-y-2 text-sm text-text-secondary">
          <li className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" /><span><b className="text-text-primary">Staff will never ask for your password</b>, in game, on Discord or anywhere else.</span></li>
          <li className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" /><span>Only ever log in at <b className="text-text-primary">relicsofreturn.com</b> or in the official launcher.</span></li>
          <li className="flex gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold-500" /><span>Use a password you don&apos;t use anywhere else, and never share your account.</span></li>
        </ul>
      </Panel>
    </div>
  )
}
