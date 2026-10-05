'use client'

import Link from 'next/link'
import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'

import { PlayerName } from '@/components/players/PlayerName'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { ApiError, getStaffLogs, type StaffLogFilters } from '@/lib/api'
import type { StaffLogEntry } from '@/lib/types'
import { staffRankName } from '@/data/ranks'
import { cn, formatUnixDateTime, formatUsername } from '@/lib/utils'

/** The select styling matches {@link Input}, which is an `<input>` only. */
const SELECT_CLASS =
  'w-full rounded-md border border-stone-700 bg-stone-900 px-3.5 py-2.5 text-sm text-text-primary transition-colors focus:border-gold-500/60 focus:outline-none focus:ring-2 focus:ring-gold-500/20'

interface LogForm {
  player: string
  staff: string
  target: string
  command: string
  source: string
  world: string
  from: string
  to: string
}

const EMPTY_FORM: LogForm = {
  player: '',
  staff: '',
  target: '',
  command: '',
  source: '',
  world: '',
  from: '',
  to: '',
}

function hasFilters(form: LogForm): boolean {
  return Object.values(form).some((value) => value.trim() !== '')
}

/**
 * A `<input type="date">` value (yyyy-mm-dd) as unix seconds. With `end` the
 * whole day is covered, so "to 3 March" includes 3 March.
 */
function dateToUnix(value: string, end = false): number | undefined {
  if (!value) return undefined

  const ms = new Date(`${value}T00:00:00`).getTime()
  if (Number.isNaN(ms)) return undefined

  return Math.floor((end ? ms + 86400000 - 1000 : ms) / 1000)
}

function toFilters(form: LogForm, page: number): StaffLogFilters {
  const filters: StaffLogFilters = { page }

  const player = form.player.trim()
  const staff = form.staff.trim()
  const target = form.target.trim()

  if (player) filters.player = player
  if (staff) filters.staff = staff
  if (target) filters.target = target
  if (form.command) filters.command = form.command
  if (form.source) filters.source = form.source as 'game' | 'website'

  const world = parseInt(form.world, 10)
  if (Number.isInteger(world)) filters.world = world

  const from = dateToUnix(form.from)
  const to = dateToUnix(form.to, true)
  if (from) filters.from = from
  if (to) filters.to = to

  return filters
}

/** The report a website action touched, from its 'report=12' argument. */
function reportId(args: string): number | null {
  const match = /(?:^|\s)report=(\d+)/.exec(args)
  return match ? Number(match[1]) : null
}

/**
 * The staff command log: every moderation command used in game or on the
 * website, who used it, on whom, and whether it went through. Administrators
 * only — rsc-www enforces that on every request, so a player who forces this
 * open gets nothing back.
 */
export function CommandLog() {
  const [form, setForm] = useState<LogForm>(EMPTY_FORM)
  const [applied, setApplied] = useState<LogForm>(EMPTY_FORM)
  const [page, setPage] = useState(0)

  const [logs, setLogs] = useState<StaffLogEntry[]>([])
  const [commands, setCommands] = useState<{ id: string; name: string }[]>([])
  const [pages, setPages] = useState(0)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<number | null>(null)

  const load = useCallback(
    async (showSpinner = true) => {
      if (showSpinner) setLoading(true)

      try {
        const data = await getStaffLogs(toFilters(applied, page))

        setLogs(data.logs ?? [])
        setPages(data.pages ?? 0)

        // the command list is the same on every page, so keep the first one
        if (data.commands?.length) setCommands(data.commands)

        setError(null)
      } catch (e) {
        setError(
          e instanceof ApiError && e.status === 403
            ? 'Your account is no longer an administrator.'
            : 'Unable to reach the command log. The data server may be offline.',
        )
      } finally {
        setLoading(false)
      }
    },
    [applied, page],
  )

  useEffect(() => {
    load()
  }, [load])

  const onSearch = (event: React.FormEvent) => {
    event.preventDefault()
    setPage(0)
    setOpenId(null)
    setApplied(form)
  }

  const onClear = () => {
    setForm(EMPTY_FORM)
    setApplied(EMPTY_FORM)
    setPage(0)
    setOpenId(null)
  }

  const commandName = useMemo(() => {
    const names = new Map(commands.map((command) => [command.id, command.name]))
    return (id: string) => names.get(id) ?? id
  }, [commands])

  const set =
    (key: keyof LogForm) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((current) => ({ ...current, [key]: event.target.value }))

  return (
    <section className="rounded-lg border border-stone-700 bg-stone-800/60">
      <header className="border-b border-stone-700 px-5 py-4">
        <h2 className="font-adventure text-lg uppercase tracking-wide text-gold-400">
          Command Log
        </h2>
        <p className="mt-1 text-xs text-text-secondary">
          Every moderation command, in game and on this website, newest first.
          An entry can never be edited or deleted.
        </p>
      </header>

      <div className="border-b border-stone-700 px-5 py-4">
        <form
          onSubmit={onSearch}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        >
          <Input
            value={form.player}
            onChange={set('player')}
            placeholder="Player (used by or on)"
            maxLength={12}
            aria-label="Player"
          />
          <Input
            value={form.staff}
            onChange={set('staff')}
            placeholder="Staff member"
            maxLength={12}
            aria-label="Staff member"
          />
          <Input
            value={form.target}
            onChange={set('target')}
            placeholder="Target player"
            maxLength={12}
            aria-label="Target player"
          />
          <select
            value={form.command}
            onChange={set('command')}
            aria-label="Command"
            className={SELECT_CLASS}
          >
            <option value="">Any command</option>
            {commands.map((command) => (
              <option key={command.id} value={command.id}>
                {command.name}
              </option>
            ))}
          </select>
          <select
            value={form.source}
            onChange={set('source')}
            aria-label="Source"
            className={SELECT_CLASS}
          >
            <option value="">In game or website</option>
            <option value="game">In game</option>
            <option value="website">Website</option>
          </select>
          <Input
            value={form.world}
            onChange={set('world')}
            placeholder="World"
            inputMode="numeric"
            aria-label="World"
          />
          <Input
            type="date"
            value={form.from}
            onChange={set('from')}
            aria-label="From date"
          />
          <Input
            type="date"
            value={form.to}
            onChange={set('to')}
            aria-label="To date"
          />

          <div className="flex gap-3 sm:col-span-2 lg:col-span-4">
            <Button type="submit" variant="secondary" size="sm">
              Search
            </Button>
            {hasFilters(applied) && (
              <Button type="button" variant="ghost" size="sm" onClick={onClear}>
                Clear
              </Button>
            )}
          </div>
        </form>
      </div>

      {error && (
        <p className="border-b border-stone-700 bg-rune-red/10 px-5 py-3 text-sm text-parchment">
          {error}
        </p>
      )}

      {loading ? (
        <div className="space-y-3 px-5 py-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-text-secondary">
          {hasFilters(applied)
            ? 'No commands match those filters.'
            : 'No staff commands have been used yet.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-stone-700 text-xs uppercase tracking-wide text-text-muted">
                <th scope="col" className="px-5 py-3 font-medium">
                  Time
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Staff
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Command
                </th>
                <th scope="col" className="hidden px-5 py-3 font-medium sm:table-cell">
                  Target
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Result
                </th>
                <th scope="col" className="px-5 py-3 font-medium text-right">
                  Detail
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.map((entry) => {
                const report = reportId(entry.args)

                return (
                  <Fragment key={entry.id}>
                    <tr
                      className={cn(
                        'border-b border-stone-800 hover:bg-stone-900/40',
                        openId === entry.id && 'bg-stone-900/40',
                      )}
                    >
                      <td className="whitespace-nowrap px-5 py-3 text-text-secondary">
                        {formatUnixDateTime(entry.date)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <PlayerName
                          username={entry.staff}
                          rank={entry.staff_rank}
                        />
                        <span className="ml-2 text-xs text-text-muted">
                          {entry.source === 'website'
                            ? 'website'
                            : `w${entry.world}`}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-text-primary">
                        {commandName(entry.command)}
                      </td>
                      <td className="hidden px-5 py-3 sm:table-cell">
                        {entry.target ? (
                          <Link
                            href={`/hiscores?username=${encodeURIComponent(entry.target)}`}
                            className="text-gold-400 transition-colors hover:text-gold-500"
                          >
                            {formatUsername(entry.target)}
                          </Link>
                        ) : report ? (
                          <span className="text-text-secondary">
                            Report #{report}
                          </span>
                        ) : (
                          <span className="text-text-muted">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {entry.success ? (
                          <span className="text-moss">Done</span>
                        ) : (
                          <span
                            className="text-ember"
                            title={entry.reason || undefined}
                          >
                            Refused
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-expanded={openId === entry.id}
                          aria-controls="command-log-detail"
                          onClick={() =>
                            setOpenId((current) =>
                              current === entry.id ? null : entry.id,
                            )
                          }
                        >
                          {openId === entry.id ? 'Hide' : 'Details'}
                        </Button>
                      </td>
                    </tr>
                    {openId === entry.id && (
                      <tr
                        id="command-log-detail"
                        className="border-b border-stone-800 bg-stone-950/40"
                      >
                        <td colSpan={6} className="px-5 py-4">
                          <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
                            <Detail
                              label="When"
                              value={formatUnixDateTime(entry.date)}
                            />
                            <Detail
                              label="Where"
                              value={
                                entry.source === 'website'
                                  ? 'Website'
                                  : `World ${entry.world}`
                              }
                            />
                            <Detail
                              label="Staff"
                              value={`${formatUsername(entry.staff)} (${staffRankName(entry.staff_rank)})`}
                            />
                            <Detail label="Command" value={entry.command} />
                            <Detail label="Target" value={entry.target || '—'} />
                            <Detail
                              label="Arguments"
                              value={entry.args || '—'}
                            />
                            <Detail
                              label="Result"
                              value={
                                entry.success
                                  ? 'Done'
                                  : `Refused: ${entry.reason || 'no reason given'}`
                              }
                            />
                          </dl>

                          {(entry.target || report) && (
                            <div className="mt-3 flex flex-wrap gap-4 text-sm">
                              {entry.target && (
                                <Link
                                  href={`/hiscores?username=${encodeURIComponent(entry.target)}`}
                                  className="text-gold-400 transition-colors hover:text-gold-500"
                                >
                                  View {formatUsername(entry.target)}&apos;s profile
                                </Link>
                              )}
                              {report && (
                                <span className="text-text-secondary">
                                  Related report #{report} — open it from Abuse
                                  Reports
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <nav
          className="flex items-center justify-center gap-4 border-t border-stone-700 px-5 py-4 text-sm"
          aria-label="Command log pagination"
        >
          <Button
            variant="ghost"
            size="sm"
            disabled={page === 0}
            onClick={() => {
              setOpenId(null)
              setPage((current) => Math.max(0, current - 1))
            }}
          >
            &laquo; Previous
          </Button>
          <span className="text-text-muted">
            Page <span className="text-gold-400">{page + 1}</span> of{' '}
            <span className="text-gold-400">{pages}</span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={page + 1 >= pages}
            onClick={() => {
              setOpenId(null)
              setPage((current) => current + 1)
            }}
          >
            Next &raquo;
          </Button>
        </nav>
      )}
    </section>
  )
}

/** One labelled line in the expanded entry. */
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-24 shrink-0 text-text-muted">{label}</dt>
      <dd className="break-words text-text-primary">{value}</dd>
    </div>
  )
}