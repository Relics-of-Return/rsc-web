'use client'

import { Fragment, useEffect, useState, type ReactNode } from 'react'

import { betaAreas, betaRevision } from '@/data/beta-tests'
import { cn, formatUsername } from '@/lib/utils'

type Tick = { username: string; at: string }

type Ticks = Record<string, Tick>

type TickState = {
  ticks: Ticks
  username: string | null
  canTick: boolean
  staff: boolean
}

const TICKS_URL = `/api/beta/ticks?revision=${encodeURIComponent(betaRevision)}`

// other testers' ticks show up without a reload
const REFRESH_MS = 60_000

const tickTime = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

/** **bold**, `code` and _italic_ in a test's text, as React nodes. */
function renderText(text: string) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`|_[^_]+_|\*[^*]+\*)/g).map((part, i) => {
    if (part.startsWith('**')) return <strong key={i}>{part.slice(2, -2)}</strong>
    if (part.startsWith('`'))
      return (
        <code key={i} className="rounded bg-stone-900 px-1 py-0.5 text-[0.85em] text-gold-400">
          {part.slice(1, -1)}
        </code>
      )
    if (/^[_*].+[_*]$/.test(part)) return <em key={i}>{part.slice(1, -1)}</em>
    return <Fragment key={i}>{part}</Fragment>
  })
}

function CarefulMark() {
  return (
    <span
      title="Items, coins or saved progress: try it twice, with a relog between"
      className="mr-1 inline-flex h-[1.25em] w-[1.25em] shrink-0 items-center justify-center rounded border border-gold-600/60 align-middle font-sans text-[0.75em] leading-none text-gold-500"
    >
      ★
    </span>
  )
}

async function readError(res: Response) {
  const data = await res.json().catch(() => null)
  return (data && data.error) || 'The tick could not be saved. Try again.'
}

type Access = 'loading' | 'login' | 'denied' | 'failed' | 'open'

const JOIN_URL = '/account'

/** A box in place of the checklist, for anyone it isn't open to. */
function Gate({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-lg rounded-lg border border-stone-700 bg-stone-800/60 p-8 text-center">
      <h2 className="font-adventure text-2xl uppercase tracking-wide text-gold-500">{title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-text-muted">{children}</p>
    </div>
  )
}

export function BetaChecklist({ children }: { children?: ReactNode }) {
  const [state, setState] = useState<TickState | null>(null)
  const [access, setAccess] = useState<Access>('loading')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = () =>
      fetch(TICKS_URL, { cache: 'no-store' })
        .then(async (res) => {
          if (cancelled) return
          if (res.status === 401) return setAccess('login')
          if (res.status === 403) return setAccess('denied')
          if (!res.ok) throw new Error(String(res.status))

          const data = (await res.json()) as TickState
          if (cancelled) return
          setState({ ...data, ticks: data.ticks || {} })
          setAccess('open')
        })
        .catch(() => {
          // a refresh that fails keeps the list already shown
          if (!cancelled) setAccess((current) => (current === 'open' ? current : 'failed'))
        })

    load()
    const timer = setInterval(load, REFRESH_MS)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [])

  const ticks = state?.ticks ?? {}
  const total = betaAreas.reduce((sum, area) => sum + area.items.length, 0)
  const done = Object.keys(ticks).length

  async function toggle(key: string) {
    if (!state || !state.canTick || saving) return

    const ticked = !ticks[key]
    setSaving(key)
    setError(null)

    try {
      const res = await fetch('/api/beta/ticks', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ revision: betaRevision, key, ticked }),
      })

      if (!res.ok) {
        setError(await readError(res))
        return
      }

      const { tick } = (await res.json()) as { tick: Tick | null }

      setState((current) => {
        if (!current) return current
        const next = { ...current.ticks }
        if (tick) next[key] = tick
        else delete next[key]
        return { ...current, ticks: next }
      })
    } catch {
      setError('The tick could not be saved. Try again.')
    } finally {
      setSaving(null)
    }
  }

  if (access === 'loading') {
    return <p className="text-center text-sm text-text-muted">Loading…</p>
  }

  if (access === 'failed') {
    return (
      <Gate title="Not available">
        The beta checklist could not be loaded right now. Try again in a moment.
      </Gate>
    )
  }

  if (access === 'login') {
    return (
      <Gate title="Beta testers only">
        <a href="/login" className="text-gold-400 hover:text-gold-500">
          Log in
        </a>{' '}
        with a beta tester account to see what to test.
      </Gate>
    )
  }

  if (access === 'denied') {
    return (
      <Gate title="Beta testers only">
        This page is for beta testers: members of our Discord with the Beta Tester role, or players
        staff accepted on the website. Link Discord on your{' '}
        <a href={JOIN_URL} className="text-gold-400 hover:text-gold-500">
          account page
        </a>
        .
      </Gate>
    )
  }

  return (
    <>
      {children}
      <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
        <nav aria-label="Test areas" className="lg:sticky lg:top-24">
          <p className="mb-2 text-sm text-text-muted">
            <span className="font-semibold text-text-primary">{done}</span> of {total} ticked
          </p>
          <ol className="grid gap-1 text-sm max-lg:grid-cols-2 max-sm:grid-cols-1">
            {betaAreas.map((area, a) => {
              const count = area.items.filter((_, i) => ticks[`${a}-${i}`]).length
              return (
                <li key={area.title}>
                  <a
                    href={`#area-${a + 1}`}
                    className="flex justify-between gap-2 rounded px-2 py-1 text-text-primary hover:bg-stone-800/60"
                  >
                    <span>
                      <span className="mr-2 text-gold-600">{a + 1}</span>
                      {area.title}
                    </span>
                    <span
                      className={cn(
                        'tabular-nums text-xs',
                        count === area.items.length ? 'text-green-400' : 'text-text-muted',
                      )}
                    >
                      {count}/{area.items.length}
                    </span>
                  </a>
                </li>
              )
            })}
          </ol>
        </nav>

        <div className="grid min-w-0 gap-6">
          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-700/60 bg-red-950/40 px-4 py-3 text-sm text-red-200"
            >
              {error}
            </p>
          )}

          {betaAreas.map((area, a) => (
            <section
              key={area.title}
              id={`area-${a + 1}`}
              className="scroll-mt-24 rounded-lg border border-stone-700 bg-stone-800/60 p-5"
            >
              <h2 className="mb-3 flex items-center gap-2 font-adventure text-xl leading-none tracking-wide text-gold-500">
                <span className="text-gold-600">{a + 1}</span>
                {area.careful && <CarefulMark />}
                <span>{area.title}</span>
              </h2>
              <ul className="divide-y divide-stone-700">
                {area.items.map((item, i) => {
                  const key = `${a}-${i}`
                  const tick = ticks[key]
                  const locked =
                    !state?.canTick ||
                    saving !== null ||
                    (!!tick && tick.username !== state.username && !state.staff)

                  return (
                    <li key={key}>
                      <label
                        className={cn(
                          'flex gap-3 py-2 text-sm leading-relaxed',
                          locked ? 'cursor-default' : 'cursor-pointer',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={!!tick}
                          disabled={locked}
                          onChange={() => toggle(key)}
                          className="mt-1 h-4 w-4 shrink-0 accent-gold-500 disabled:opacity-70"
                        />
                        <span className="min-w-0">
                          <span
                            className={cn(
                              'text-text-primary',
                              tick && 'text-text-muted line-through decoration-green-500/70',
                            )}
                          >
                            {item.careful && <CarefulMark />}
                            {renderText(item.text)}
                          </span>
                          {tick && (
                            <span className="mt-0.5 block text-xs text-green-400">
                              Ticked by <span className="font-semibold">{formatUsername(tick.username)}</span> on{' '}
                              <time dateTime={tick.at}>{tickTime.format(new Date(tick.at))}</time>
                            </span>
                          )}
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </>
  )
}
