'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { useAuth } from '@/hooks/useAuth'
import { ApiError, getBeta, submitBetaResult } from '@/lib/api'
import type { BetaItem, BetaResult, BetaRound } from '@/lib/types'
import { cn } from '@/lib/utils'

/**
 * The beta checklist (documentation/RELEASE_CHANNELS.md). Every push to the
 * beta world opens a round listing what changed; players try each item on
 * World 3 and say whether it works. A round where every item is confirmed by
 * enough players, with nothing still broken, can go live.
 */
export default function BetaPage() {
  const { user, loading: authLoading } = useAuth()
  const [round, setRound] = useState<BetaRound | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // after the session is known, so the player's own answers come back marked
  useEffect(() => {
    if (authLoading) return

    getBeta()
      .then((data) => {
        setRound(data.round)
        setError(null)
      })
      .catch(() => setError('The beta checklist could not be loaded. The website API may be offline.'))
      .finally(() => setLoading(false))
  }, [authLoading, user])

  const areas = useMemo(() => {
    const groups = new Map<string, BetaItem[]>()

    for (const item of round?.items ?? []) {
      const area = item.area || 'Other'
      groups.set(area, [...(groups.get(area) ?? []), item])
    }

    return [...groups]
  }, [round])

  const open = round?.status === 'open'

  return (
    <Container className="py-16">
      <div className="mb-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-500">Beta Testing</p>
        <h1 className="mt-2 font-adventure text-3xl uppercase tracking-wide text-gold-400 sm:text-4xl">
          Help test the next update
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-sm text-text-secondary">
          World 3 runs the next update before it reaches everyone. Play it from the launcher
          (Settings, then <b>Join the beta</b>) or from the <Link href="/play" className="text-gold-400 hover:underline">play page</Link>,
          try each item below, and say whether it works. The update goes live once every item is
          confirmed and nothing is left broken.
        </p>
      </div>

      {loading || authLoading ? (
        <p className="text-center text-sm text-text-secondary">Loading…</p>
      ) : error ? (
        <p className="mx-auto max-w-xl rounded-lg border border-rune-red/40 bg-rune-red/10 p-4 text-center text-sm text-parchment">
          {error}
        </p>
      ) : !round ? (
        <p className="mx-auto max-w-xl rounded-lg border border-stone-700 bg-stone-800/60 p-6 text-center text-sm text-text-secondary">
          No beta test is running right now. Check back after the next update is pushed to World 3.
        </p>
      ) : (
        <>
          <RoundSummary round={round} />

          {open && !user && (
            <p className="mx-auto mt-6 max-w-2xl rounded-lg border border-stone-700 bg-stone-800/60 p-4 text-center text-sm text-text-secondary">
              <Link href="/login" className="text-gold-400 hover:underline">Log in</Link> to mark items
              as working or broken.
            </p>
          )}

          <div className="mt-10 space-y-10">
            {areas.map(([area, items]) => (
              <section key={area}>
                <h2 className="mb-4 font-adventure text-lg uppercase tracking-wide text-gold-400">{area}</h2>
                <ul className="space-y-3">
                  {items.map((item) => (
                    <ChecklistItem
                      key={item.id}
                      item={item}
                      minWorks={item.minWorks}
                      canAnswer={open && !!user}
                      onAnswered={setRound}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </Container>
  )
}

function RoundSummary({ round }: { round: BetaRound }) {
  const percent = round.total ? Math.round((round.confirmed / round.total) * 100) : 0
  const state =
    round.status === 'promoted'
      ? 'Released: this test is over and the update is live.'
      : round.status !== 'open'
        ? 'This test is closed.'
        : round.green
          ? 'Every item is confirmed: this update is ready to go live.'
          : `${round.total - round.confirmed} item${round.total - round.confirmed === 1 ? '' : 's'} still to confirm.`

  return (
    <div className="mx-auto max-w-3xl rounded-lg border border-stone-700 bg-stone-800/60 p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-text-secondary">
          Testing <span className="font-mono text-gold-400">{round.revision}</span>, since{' '}
          {new Date(round.openedAt).toLocaleDateString()}
        </p>
        <p className="text-sm text-text-primary">
          {round.confirmed} of {round.total} confirmed
        </p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded bg-stone-900" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <div className={cn('h-full', round.green ? 'bg-emerald-500' : 'bg-gold-500')} style={{ width: `${percent}%` }} />
      </div>
      <p className="mt-3 text-xs text-text-secondary">
        {state} An item is confirmed when {round.minWorks} different players say it works (3 for
        anything to do with trading, banking, the Tradepost or the Grand Exchange) and nobody has an
        open report of it being broken.
      </p>
      {round.notes && <p className="mt-3 text-sm text-text-primary">{round.notes}</p>}
    </div>
  )
}

const STATUS_LABELS: Record<BetaItem['status'], string> = {
  confirmed: 'Confirmed',
  broken: 'Broken',
  testing: 'Needs testing',
}

const STATUS_CLASSES: Record<BetaItem['status'], string> = {
  confirmed: 'border-emerald-500/40 text-emerald-300',
  broken: 'border-rune-red/50 text-red-300',
  testing: 'border-stone-600 text-text-secondary',
}

function ChecklistItem({
  item,
  minWorks,
  canAnswer,
  onAnswered,
}: {
  item: BetaItem
  minWorks: number
  canAnswer: boolean
  onAnswered: (round: BetaRound | null) => void
}) {
  const [reporting, setReporting] = useState(false)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const answer = async (result: BetaResult) => {
    setSaving(true)
    setError(null)

    try {
      onAnswered((await submitBetaResult(item.id, result, result === 'broken' ? note : '')).round)
      setReporting(false)
      setNote('')
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 401
          ? 'Your session has ended. Log in again to answer.'
          : e instanceof Error
            ? e.message
            : 'Unable to save that.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <li className="rounded-lg border border-stone-700 bg-stone-800/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-text-primary">{item.title}</p>
          {item.howToTest && <p className="mt-1 text-sm text-text-secondary">{item.howToTest}</p>}
        </div>
        <span className={cn('shrink-0 rounded border px-2 py-0.5 text-xs uppercase tracking-wide', STATUS_CLASSES[item.status])}>
          {STATUS_LABELS[item.status]}
        </span>
      </div>

      <p className="mt-2 text-xs text-text-muted">
        {item.works} of {minWorks} &ldquo;works&rdquo;
        {item.broken ? ` · ${item.broken} open report${item.broken === 1 ? '' : 's'} of it broken` : ''}
        {item.mine && (
          <span className="text-text-secondary"> · you said it {item.mine.result === 'works' ? 'works' : 'is broken'}</span>
        )}
      </p>

      {item.reports.length > 0 && (
        <ul className="mt-3 space-y-1 border-l-2 border-stone-700 pl-3 text-xs text-text-secondary">
          {item.reports.map((report, i) => (
            <li key={i}>
              &ldquo;{report.note}&rdquo;
              {report.resolution && (
                <span className="text-text-muted">
                  {' '}
                  ({report.resolution === 'fixed' ? 'fixed in the next push' : report.resolution === 'not-a-bug' ? 'not a bug' : 'duplicate'})
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {canAnswer && (
        <div className="mt-3">
          {reporting ? (
            <form
              onSubmit={(event) => {
                event.preventDefault()
                void answer('broken')
              }}
              className="space-y-2"
            >
              <label className="block text-xs text-text-secondary" htmlFor={`note-${item.id}`}>
                What went wrong? Where were you, and what did you do?
              </label>
              <textarea
                id={`note-${item.id}`}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={500}
                rows={3}
                required
                className="w-full rounded border border-stone-600 bg-stone-900 p-2 text-sm text-text-primary"
              />
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={saving || !note.trim()}>
                  Report it broken
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setReporting(false)} disabled={saving}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => void answer('works')} disabled={saving}>
                It works
              </Button>
              <Button size="sm" variant="outline" onClick={() => setReporting(true)} disabled={saving}>
                It&rsquo;s broken
              </Button>
            </div>
          )}
          {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
        </div>
      )}
    </li>
  )
}
