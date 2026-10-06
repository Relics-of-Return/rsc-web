'use client'

import { useCallback, useEffect, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { ApiError, editBetaItem, getAdminBeta, resolveBetaReport } from '@/lib/api'
import type { AdminBetaData, BetaItem, BetaResolution } from '@/lib/types'
import { cn, formatUsername } from '@/lib/utils'

const RESOLUTIONS: { value: BetaResolution | ''; label: string }[] = [
  { value: '', label: 'Open' },
  { value: 'fixed', label: 'Fixed in next push' },
  { value: 'not-a-bug', label: 'Not a bug' },
  { value: 'duplicate', label: 'Duplicate' },
]

/**
 * The beta round, for staff (documentation/RELEASE_CHANNELS.md): every answer
 * and who gave it, deciding what broken reports were, and editing the
 * checklist the push made from the changelog. Promote (npm run promote) only
 * goes ahead once the round is green.
 */
export function BetaRounds() {
  const [data, setData] = useState<AdminBetaData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    try {
      setData(await getAdminBeta())
      setError(null)
    } catch (e) {
      setError(describe(e))
    }
  }, [])

  useEffect(() => {
    getAdminBeta()
      .then(setData)
      .catch((e) => setError(describe(e)))
  }, [])

  // every change answers with the round; the history comes from a reload
  const run = async (change: () => Promise<unknown>): Promise<boolean> => {
    setBusy(true)
    setError(null)

    try {
      await change()
      await load()
      return true
    } catch (e) {
      setError(describe(e))
      return false
    } finally {
      setBusy(false)
    }
  }

  const round = data?.round ?? null
  const open = round?.status === 'open'

  return (
    <section className="rounded-lg border border-stone-700 bg-stone-800/60">
      <header className="border-b border-stone-700 px-5 py-4">
        <h2 className="font-adventure text-lg uppercase tracking-wide text-gold-400">Beta Testing</h2>
        <p className="mt-1 text-xs text-text-secondary">
          Each <code>npm run push-beta</code> opens a round from the changelog. Players answer on the
          public <a href="/beta" className="text-gold-400 hover:underline">beta page</a>; <code>npm run promote</code> only
          goes ahead when every item is confirmed and no report is open or marked fixed in the next push.
        </p>
      </header>

      {error && (
        <p className="border-b border-stone-700 bg-rune-red/10 px-5 py-3 text-sm text-parchment">{error}</p>
      )}

      {!data ? (
        <p className="px-5 py-6 text-sm text-text-secondary">Loading…</p>
      ) : !round ? (
        <p className="px-5 py-6 text-sm text-text-secondary">No beta round yet - the first push to beta opens one.</p>
      ) : (
        <div className="px-5 py-5">
          <p className="text-sm text-text-primary">
            Round {round.id} · <span className="font-mono text-gold-400">{round.revision}</span> ·{' '}
            {round.status === 'open' ? (
              <span className={round.green ? 'text-emerald-300' : ''}>
                {round.confirmed}/{round.total} confirmed{round.green ? ', ready to promote' : ''}
              </span>
            ) : (
              <span>
                {round.status}
                {round.closeReason ? ` (${round.closeReason})` : ''}
              </span>
            )}
          </p>

          <ul className="mt-5 space-y-4">
            {round.items.map((item) => (
              <StaffItem key={item.id} item={item} editable={open} busy={busy} run={run} />
            ))}
          </ul>

          {open && <AddItem busy={busy} run={run} />}
        </div>
      )}

      {data && data.history.length > 1 && (
        <div className="border-t border-stone-700 px-5 py-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Earlier rounds</h3>
          <ul className="mt-2 space-y-1 text-xs text-text-secondary">
            {data.history.slice(1).map((entry) => (
              <li key={entry.id}>
                Round {entry.id} · <span className="font-mono">{entry.revision}</span> · {entry.status} ·{' '}
                {entry.items} items · {new Date(entry.openedAt).toLocaleDateString()}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}

function describe(e: unknown): string {
  if (e instanceof ApiError && e.status === 401) return 'Your session has ended. Log in again.'
  if (e instanceof ApiError && e.status === 403) return 'Only staff can manage beta rounds.'
  return e instanceof Error ? e.message : 'The website API may be offline.'
}

function StaffItem({
  item,
  editable,
  busy,
  run,
}: {
  item: BetaItem
  editable: boolean
  busy: boolean
  run: (change: () => Promise<unknown>) => Promise<boolean>
}) {
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState(item.title)
  const [howToTest, setHowToTest] = useState(item.howToTest)
  const [area, setArea] = useState(item.area)
  const [minWorks, setMinWorks] = useState(String(item.minWorks))
  const results = item.results ?? []

  return (
    <li className="rounded border border-stone-700 bg-stone-900/40 p-3">
      {editing ? (
        <form
          className="space-y-2"
          onSubmit={(event) => {
            event.preventDefault()
            void run(() => editBetaItem({ id: item.id, title, howToTest, area, minWorks: Number(minWorks) || null })).then((ok) => ok && setEditing(false))
          }}
        >
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} required className={FIELD} aria-label="Title" />
          <textarea value={howToTest} onChange={(e) => setHowToTest(e.target.value)} maxLength={600} rows={2} className={FIELD} aria-label="How to test" placeholder="How to test" />
          <input value={area} onChange={(e) => setArea(e.target.value)} maxLength={60} className={FIELD} aria-label="Area" placeholder="Area (Added, Fixed, ...)" />
          <label className="flex items-center gap-2 text-xs text-text-secondary">
            &ldquo;Works&rdquo; answers needed
            <input type="number" min={1} max={10} value={minWorks} onChange={(e) => setMinWorks(e.target.value)} className="w-16 rounded border border-stone-600 bg-stone-900 p-1 text-sm text-text-primary" />
          </label>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={busy}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)} disabled={busy}>Cancel</Button>
          </div>
        </form>
      ) : (
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-text-primary">
              {item.title} <span className="text-xs text-text-muted">· {item.area || 'Other'}</span>
            </p>
            {item.howToTest && <p className="mt-0.5 text-xs text-text-secondary">{item.howToTest}</p>}
            <p className={cn('mt-1 text-xs', item.status === 'confirmed' ? 'text-emerald-300' : item.status === 'broken' ? 'text-red-300' : 'text-text-muted')}>
              {item.status} · {item.works}/{item.minWorks} works · {item.broken} blocking
            </p>
          </div>
          {editable && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setEditing(true)} disabled={busy}>Edit</Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => {
                  if (window.confirm(`Remove "${item.title}" from the checklist?`)) {
                    void run(() => editBetaItem({ id: item.id, remove: true }))
                  }
                }}
              >
                Remove
              </Button>
            </div>
          )}
        </div>
      )}

      {results.length > 0 && (
        <table className="mt-3 w-full text-left text-xs">
          <tbody>
            {results.map((result) => (
              <tr key={result.id} className="border-t border-stone-800 align-top">
                <td className="py-1.5 pr-3 text-text-primary">{formatUsername(result.player)}</td>
                <td className={cn('py-1.5 pr-3', result.result === 'works' ? 'text-emerald-300' : 'text-red-300')}>{result.result}</td>
                <td className="py-1.5 pr-3 text-text-secondary">{result.note}</td>
                <td className="py-1.5 pr-3 text-text-muted whitespace-nowrap">{new Date(result.at).toLocaleString()}</td>
                <td className="py-1.5">
                  {result.result === 'broken' && (
                    <select
                      value={result.resolution ?? ''}
                      disabled={!editable || busy}
                      onChange={(event) =>
                        void run(() =>
                          resolveBetaReport(item.id, result.id, (event.target.value || null) as BetaResolution | null),
                        )
                      }
                      className="rounded border border-stone-600 bg-stone-900 px-1 py-0.5 text-xs text-text-primary"
                      aria-label={`What ${formatUsername(result.player)}'s report was`}
                    >
                      {RESOLUTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </li>
  )
}

const FIELD = 'w-full rounded border border-stone-600 bg-stone-900 p-2 text-sm text-text-primary'

function AddItem({ busy, run }: { busy: boolean; run: (change: () => Promise<unknown>) => Promise<boolean> }) {
  const [title, setTitle] = useState('')
  const [howToTest, setHowToTest] = useState('')
  const [area, setArea] = useState('')
  const [minWorks, setMinWorks] = useState('')

  return (
    <form
      className="mt-6 space-y-2 rounded border border-dashed border-stone-600 p-3"
      onSubmit={(event) => {
        event.preventDefault()
        void run(() => editBetaItem({ title, howToTest, area, minWorks: Number(minWorks) || null })).then((ok) => {
          if (!ok) return
          setTitle('')
          setHowToTest('')
          setArea('')
          setMinWorks('')
        })
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Add an item</p>
      <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} required className={FIELD} placeholder="What to test" aria-label="What to test" />
      <textarea value={howToTest} onChange={(e) => setHowToTest(e.target.value)} maxLength={600} rows={2} className={FIELD} placeholder="How to test it" aria-label="How to test it" />
      <input value={area} onChange={(e) => setArea(e.target.value)} maxLength={60} className={FIELD} placeholder="Area (Added, Fixed, ...)" aria-label="Area" />
      <input type="number" min={1} max={10} value={minWorks} onChange={(e) => setMinWorks(e.target.value)} className={FIELD} placeholder="'Works' answers needed (empty: the round's; 3 for trading and banking)" aria-label="Works answers needed" />
      <Button type="submit" size="sm" disabled={busy || !title.trim()}>Add</Button>
    </form>
  )
}
