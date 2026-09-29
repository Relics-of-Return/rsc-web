'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'

import { PlayerName } from '@/components/players/PlayerName'
import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { offenceName } from '@/data/offences'
import { isStaff, staffRankName } from '@/data/ranks'
import { abuseReportScreenshotUrl, getAbuseReportDetail } from '@/lib/api'
import type {
  AbuseReportDetail,
  ActivityEntry,
  ChatActivity,
  PrivateMessageActivity,
  ReportPlayerFacts,
  ReportSnapshot,
  SnapshotPlayer,
  TradeActivity,
  TradeItem,
  TrailPoint,
} from '@/lib/types'
import { cn, formatUnixDateTime } from '@/lib/utils'

/** Trail points shown per player: the last few are the ones that matter. */
const TRAIL_POINTS = 8

/** Two records of the same event (each player's log) land this close together. */
const SAME_EVENT_MS = 3000

type Role = 'accused' | 'reporter' | 'other'

interface TimelineRow {
  key: string
  t: number
  /** Who did it, used to colour the row. */
  role: Role
  /** Whether the accused took part, used by the "accused only" filter. */
  involvesAccused: boolean
  content: ReactNode
}

// ---- formatting ----------------------------------------------------------

/** mm:ss before the report was filed, e.g. "-1:12". */
function formatBefore(t: number, capturedAt: number): string {
  const seconds = Math.max(0, Math.round((capturedAt - t) / 1000))
  return `-${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

/** "until Sep 22, 2026, 4:37 PM", "permanently" or null when not active. */
function formatUntil(until: number): string | null {
  if (!until) return null
  return until === -1 ? 'permanently' : `until ${formatUnixDateTime(until)}`
}

function formatItems(items: TradeItem[]): string {
  return items.length
    ? items.map((item) => (item.amount > 1 ? `${item.amount} × ${item.name}` : item.name)).join(', ')
    : 'nothing'
}

function formatTiles(distance: number | null): string {
  if (distance === null) return 'on a different floor'
  if (distance === 0) return 'on the same tile'
  return `${distance} ${distance === 1 ? 'tile' : 'tiles'} away`
}

// ---- the activity timeline -----------------------------------------------

const ROLE_STYLES: Record<Role, { name: string; border: string }> = {
  accused: { name: 'text-ember', border: 'border-ember/70' },
  reporter: { name: 'text-rune-blue', border: 'border-rune-blue/60' },
  other: { name: 'text-text-secondary', border: 'border-stone-700' },
}

function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="mr-2 rounded bg-stone-700/70 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-text-secondary">
      {children}
    </span>
  )
}

type Row = TimelineRow & {
  /** Two rows with the same key close together are the same event. */
  dedupe: string
}

/**
 * Merges the reporter's and the accused's recorded activity into one timeline.
 * Each event is recorded once per player who took part or saw it, so the same
 * line of chat, private message or trade shows up in both logs: show it once.
 */
function buildTimeline(context: ReportSnapshot): TimelineRow[] {
  const reporter = context.reporter.username.toLowerCase()
  const accused = context.accused.username.toLowerCase()

  const roleOf = (username: string): Role => {
    const name = username.toLowerCase()
    return name === accused ? 'accused' : name === reporter ? 'reporter' : 'other'
  }

  const chatRow = (owner: string, entry: ChatActivity): Row => {
    const role = roleOf(entry.from)

    return {
      key: `${owner}-${entry.t}-chat-${entry.from}-${entry.text}`,
      dedupe: `chat|${entry.from.toLowerCase()}|${entry.text}`,
      t: entry.t,
      role,
      involvesAccused: role === 'accused',
      content: (
        <>
          <span className={cn('font-medium', ROLE_STYLES[role].name)}>{entry.from}</span>
          <span className="text-text-muted">: </span>
          <span className="text-text-primary">{entry.text}</span>
        </>
      ),
    }
  }

  const pmRow = (owner: string, entry: PrivateMessageActivity): Row => {
    const sender = entry.dir === 'in' ? entry.with : owner
    const receiver = entry.dir === 'in' ? owner : entry.with
    const role = roleOf(sender)

    return {
      key: `${owner}-${entry.t}-pm-${sender}-${receiver}-${entry.text}`,
      dedupe: `pm|${sender.toLowerCase()}|${receiver.toLowerCase()}|${entry.text}`,
      t: entry.t,
      role,
      involvesAccused: role === 'accused' || roleOf(receiver) === 'accused',
      content: (
        <>
          <Tag>PM</Tag>
          <span className={cn('font-medium', ROLE_STYLES[role].name)}>{sender}</span>
          <span className="text-text-muted"> → {receiver}: </span>
          <span className="text-text-primary">{entry.text}</span>
        </>
      ),
    }
  }

  // a trade is written from the point of view of the log's owner
  const tradeRow = (owner: string, entry: TradeActivity): Row => {
    const role = roleOf(owner)

    return {
      key: `${owner}-${entry.t}-trade-${entry.with}`,
      dedupe: `trade|${[owner, entry.with.toLowerCase()].sort().join('|')}`,
      t: entry.t,
      role,
      involvesAccused: role === 'accused' || roleOf(entry.with) === 'accused',
      content: (
        <>
          <Tag>Trade</Tag>
          <span className={cn('font-medium', ROLE_STYLES[role].name)}>{owner}</span>
          <span className="text-text-muted"> with {entry.with} — gave </span>
          <span className="text-text-primary">{formatItems(entry.gave)}</span>
          <span className="text-text-muted">, received </span>
          <span className="text-text-primary">{formatItems(entry.got)}</span>
        </>
      ),
    }
  }

  // the reporter's log first, so when both hold the same event the reporter's
  // telling of it is the one kept
  const logs: { owner: string; entries: ActivityEntry[] }[] = [
    { owner: reporter, entries: context.reporter.log },
  ]

  if (context.accused.online) {
    logs.push({ owner: accused, entries: context.accused.log })
  }

  const rows: Row[] = []

  for (const { owner, entries } of logs) {
    for (const entry of entries) {
      const row =
        entry.type === 'chat'
          ? chatRow(owner, entry)
          : entry.type === 'pm'
            ? pmRow(owner, entry)
            : tradeRow(owner, entry)

      const duplicate = rows.some(
        (other) => other.dedupe === row.dedupe && Math.abs(other.t - row.t) < SAME_EVENT_MS,
      )

      if (!duplicate) rows.push(row)
    }
  }

  return rows.sort((a, b) => a.t - b.t)
}

function Timeline({ context }: { context: ReportSnapshot }) {
  const [accusedOnly, setAccusedOnly] = useState(false)

  const rows = useMemo(() => buildTimeline(context), [context])
  const shown = accusedOnly ? rows.filter((row) => row.involvesAccused) : rows

  return (
    <Section
      title="Recent activity"
      hint="What the game server recorded in the 5 minutes before the report, oldest first."
      action={
        <label className="flex cursor-pointer items-center gap-2 text-xs text-text-secondary">
          <input
            type="checkbox"
            checked={accusedOnly}
            onChange={(event) => setAccusedOnly(event.target.checked)}
            className="accent-gold-500"
          />
          Reported player only
        </label>
      }
    >
      {shown.length === 0 ? (
        <p className="text-sm text-text-secondary">
          {rows.length === 0
            ? 'Nothing was said or traded in the 5 minutes before this report.'
            : 'The reported player did nothing recorded in that time.'}
        </p>
      ) : (
        <ol className="max-h-80 space-y-1 overflow-y-auto pr-1">
          {shown.map((row) => (
            <li
              key={row.key}
              className={cn(
                'grid grid-cols-[3.25rem_minmax(0,1fr)] gap-3 border-l-2 py-1 pl-3 text-sm',
                ROLE_STYLES[row.role].border,
              )}
            >
              <time
                className="pt-0.5 font-mono text-xs text-text-muted"
                dateTime={new Date(row.t).toISOString()}
                title={new Date(row.t).toLocaleTimeString()}
              >
                {formatBefore(row.t, context.capturedAt)}
              </time>
              <span className="break-words">{row.content}</span>
            </li>
          ))}
        </ol>
      )}

      <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
        <span className="text-ember">■ reported player</span>
        <span className="text-rune-blue">■ reporter</span>
        <span>■ everyone else</span>
      </p>
    </Section>
  )
}

// ---- pieces ---------------------------------------------------------------

function Section({
  title,
  hint,
  action,
  children,
}: {
  title: string
  hint?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-md border border-stone-700 bg-stone-900/50 p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-adventure text-sm uppercase tracking-wide text-gold-400">{title}</h3>
          {hint && <p className="mt-0.5 text-xs text-text-muted">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function Badge({ tone, children }: { tone: 'good' | 'bad' | 'warn' | 'neutral'; children: ReactNode }) {
  return (
    <span
      className={cn(
        'rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide',
        tone === 'good' && 'bg-moss/20 text-moss',
        tone === 'bad' && 'bg-rune-red/25 text-ember',
        tone === 'warn' && 'bg-gold-500/15 text-gold-400',
        tone === 'neutral' && 'bg-stone-700/70 text-text-secondary',
      )}
    >
      {children}
    </span>
  )
}

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <dt className="text-text-muted">{label}</dt>
      <dd className="text-right text-text-primary">{children}</dd>
    </div>
  )
}

function PlayerCard({
  role,
  username,
  facts,
  snapshot,
  distance,
}: {
  role: 'Reported player' | 'Reporter'
  username: string
  facts: ReportPlayerFacts | null
  /** null when the player was offline and the server couldn't look at them. */
  snapshot: SnapshotPlayer | null
  distance?: number | null
}) {
  const rank = facts?.rank ?? snapshot?.rank ?? 0
  const muted = facts ? formatUntil(facts.mutedUntil) : null
  const banned = facts ? formatUntil(facts.bannedUntil) : null

  return (
    <div className="rounded-md border border-stone-700 bg-stone-900/50 p-4">
      <p className="text-xs uppercase tracking-wide text-text-muted">{role}</p>

      <p className="mt-1 text-lg text-gold-400">
        <PlayerName username={username} rank={rank} />
      </p>
      {isStaff(rank) && <p className="text-xs text-text-secondary">{staffRankName(rank)}</p>}

      <div className="mt-2 flex flex-wrap gap-1.5">
        {facts &&
          (facts.online ? (
            <Badge tone="good">Online · world {facts.world}</Badge>
          ) : (
            <Badge tone="neutral">Offline</Badge>
          ))}
        {muted && <Badge tone="bad">Muted {muted}</Badge>}
        {banned && <Badge tone="bad">Banned {banned}</Badge>}
        {snapshot?.skulled && <Badge tone="warn">Skulled</Badge>}
        {snapshot?.inCombat && <Badge tone="warn">In combat</Badge>}
      </div>

      {!facts && (
        <p className="mt-3 text-sm text-text-secondary">
          No account by this name exists — the reporter may have mistyped it.
        </p>
      )}

      <dl className="mt-3 space-y-1.5">
        {snapshot && (
          <>
            <Fact label="Combat level">{snapshot.combatLevel}</Fact>
            <Fact label="Position">
              ({snapshot.x}, {snapshot.y}){snapshot.plane > 0 && ` · floor ${snapshot.plane}`}
            </Fact>
          </>
        )}
        {distance !== undefined && <Fact label="From the reporter">{formatTiles(distance)}</Fact>}
        {facts && (
          <>
            <Fact label="Total level">{facts.totalLevel}</Fact>
            <Fact label="Account created">{formatUnixDateTime(facts.createdAt)}</Fact>
            <Fact label="Last login">{formatUnixDateTime(facts.lastLogin)}</Fact>
          </>
        )}
      </dl>

      {facts && facts.alts.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-text-muted">Other accounts on the same network</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {facts.alts.map((alt) => (
              <span key={alt} className="rounded bg-stone-700/70 px-1.5 py-0.5 text-xs text-text-primary">
                {alt}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Trail({ label, trail, capturedAt }: { label: string; trail: TrailPoint[]; capturedAt: number }) {
  if (trail.length === 0) return null

  return (
    <div>
      <p className="text-xs text-text-muted">{label}</p>
      <ul className="mt-1 flex flex-wrap gap-1.5">
        {trail.slice(-TRAIL_POINTS).map((point) => (
          <li
            key={point.t}
            className="rounded bg-stone-700/70 px-1.5 py-0.5 font-mono text-xs text-text-primary"
            title={new Date(point.t).toLocaleTimeString()}
          >
            <span className="text-text-muted">{formatBefore(point.t, capturedAt)} </span>({point.x}, {point.y})
            {point.plane > 0 && ` f${point.plane}`}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Screenshot({ id, taken }: { id: number; taken: number }) {
  const [failed, setFailed] = useState(false)
  const src = abuseReportScreenshotUrl(id)

  return (
    <Section
      title="Screenshot"
      hint="Taken by the reporter's game client the moment they opened the report form."
    >
      {failed ? (
        <p className="text-sm text-text-secondary">The screenshot could not be loaded.</p>
      ) : (
        <a href={src} target="_blank" rel="noopener noreferrer" className="block w-fit">
          {/* an authenticated one-off response from our own API: nothing for the image optimiser to do */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt="The reporter's game view when they opened the report form"
            loading="lazy"
            onError={() => setFailed(true)}
            className="max-h-96 w-auto max-w-full rounded border border-stone-700 [image-rendering:pixelated]"
          />
        </a>
      )}

      <p className="mt-3 text-xs text-text-muted">
        Uploaded {formatUnixDateTime(taken)}. Unlike the activity log, this comes from the
        reporter&apos;s own client — the server can&apos;t verify it wasn&apos;t edited. Click to open full size.
      </p>
    </Section>
  )
}

// ---- the case file --------------------------------------------------------

function CaseFile({ detail }: { detail: AbuseReportDetail }) {
  const { report, context, screenshot, accused, reporter, history } = detail

  const accusedSnapshot = context && context.accused.online ? context.accused : null

  // people either player could see, minus the two involved
  const witnesses = useMemo(() => {
    if (!context) return []

    const involved = new Set([report.reporter, report.accused])
    const names = new Set<string>()

    for (const snapshot of [context.reporter, accusedSnapshot]) {
      for (const name of snapshot?.witnesses ?? []) {
        if (!involved.has(name.toLowerCase())) names.add(name)
      }
    }

    return [...names]
  }, [context, accusedSnapshot, report.reporter, report.accused])

  return (
    <div className="space-y-4">
      {!context && !screenshot && (
        <p className="rounded-md border border-stone-700 bg-stone-900/50 p-4 text-sm text-text-secondary">
          This report was filed before the game started recording evidence with reports, so there is no
          chat log or screenshot to show. The account details and history below are current.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <PlayerCard
          role="Reported player"
          username={report.accused}
          facts={accused}
          snapshot={accusedSnapshot}
          distance={accusedSnapshot ? accusedSnapshot.distance : undefined}
        />
        <PlayerCard
          role="Reporter"
          username={report.reporter}
          facts={reporter}
          snapshot={context ? context.reporter : null}
        />
      </div>

      {context && !context.accused.online && (
        <p className="rounded-md border border-gold-500/30 bg-gold-500/5 p-3 text-sm text-text-secondary">
          The reported player was not online when this was filed, so the server has no snapshot of them —
          only what the reporter saw and did is on record.
        </p>
      )}

      {context && <Timeline context={context} />}

      {screenshot && <Screenshot id={report.id} taken={screenshot.date} />}

      {context && (witnesses.length > 0 || context.reporter.trail.length > 0 || accusedSnapshot?.trail.length) && (
        <Section
          title="Where and who"
          hint="Who could see it, and where each player stood over the last couple of minutes."
        >
          <div className="space-y-4">
            {witnesses.length > 0 && (
              <div>
                <p className="text-xs text-text-muted">
                  Other players in view — possible witnesses ({witnesses.length})
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {witnesses.map((name) => (
                    <span key={name} className="rounded bg-stone-700/70 px-1.5 py-0.5 text-xs text-text-primary">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {accusedSnapshot && (
              <Trail label="Reported player's movements" trail={accusedSnapshot.trail} capturedAt={context.capturedAt} />
            )}
            <Trail label="Reporter's movements" trail={context.reporter.trail} capturedAt={context.capturedAt} />

            {accusedSnapshot && accusedSnapshot.sameNetwork.length > 0 && (
              <p className="text-xs text-text-secondary">
                Logged in from the same address as the reported player right now:{' '}
                <span className="text-text-primary">{accusedSnapshot.sameNetwork.join(', ')}</span>
              </p>
            )}
          </div>
        </Section>
      )}

      <Section title="History" hint="Whether this is a one-off or a pattern.">
        <ul className="space-y-1.5 text-sm text-text-secondary">
          <li>
            <span className="text-gold-400">{history.against}</span>{' '}
            {history.against === 1 ? 'report has' : 'reports have'} been filed against{' '}
            <span className="text-text-primary">{report.accused}</span>
            {history.against === 1 ? ' — this one.' : ', including this one.'}
          </li>
          <li>
            <span className="text-gold-400">{history.byReporter}</span>{' '}
            {history.byReporter === 1 ? 'report has' : 'reports have'} been filed by{' '}
            <span className="text-text-primary">{report.reporter}</span>
            {history.byReporter === 1 ? ' — this one.' : ', including this one.'}
          </li>
        </ul>

        {history.previous.length > 0 && (
          <div className="mt-3">
            <p className="text-xs text-text-muted">Other reports against {report.accused}</p>
            <ul className="mt-1 space-y-1">
              {history.previous.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                  <span className="text-text-muted">#{item.id}</span>
                  <span className="text-text-primary">{offenceName(item.offence)}</span>
                  <span className="text-text-secondary">by {item.reporter}</span>
                  <span className="text-text-muted">{formatUnixDateTime(item.date)}</span>
                  <Badge tone={item.handled ? 'good' : 'warn'}>{item.handled ? 'Resolved' : 'Open'}</Badge>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>
    </div>
  )
}

/**
 * The evidence behind one abuse report: what the game server recorded when it
 * was filed, the screenshot the reporter's client uploaded, live facts about
 * both accounts and the reported player's history. Fetched when opened.
 */
export function ReportDetail({ id }: { id: number }) {
  const [detail, setDetail] = useState<AbuseReportDetail | null>(null)
  const [failed, setFailed] = useState(false)

  // bumped to fetch again after a failure
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false

    getAbuseReportDetail(id)
      .then((data) => {
        if (!cancelled) setDetail(data)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
    }
  }, [id, attempt])

  const retry = () => {
    setFailed(false)
    setAttempt((current) => current + 1)
  }

  if (failed) {
    return (
      <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary">
        Unable to load this report&apos;s details.
        <Button variant="outline" size="sm" onClick={retry}>
          Try again
        </Button>
      </div>
    )
  }

  if (!detail) {
    return (
      <div className="space-y-3" aria-busy="true">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  return <CaseFile detail={detail} />
}
