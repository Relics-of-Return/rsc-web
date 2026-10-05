'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { ReportDetail } from '@/components/admin/ReportDetail'
import { PlayerName } from '@/components/players/PlayerName'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { isSevere, offenceName } from '@/data/offences'
import { ApiError, getAbuseReports, resolveAbuseReport } from '@/lib/api'
import type { AbuseReport } from '@/lib/types'
import { cn, formatUnixDate, formatUnixDateTime, formatUsername } from '@/lib/utils'

/** How often the open queue re-polls rsc-www, in milliseconds. */
const POLL_INTERVAL = 30000

const FILTERS = [
  { label: 'Open', handled: 0 },
  { label: 'Resolved', handled: 1 },
  { label: 'All', handled: -1 },
] as const

/**
 * The queue of abuse reports players file with the in-game report form.
 * Reports arrive over rsc-server → rsc-data-server and are read back here
 * through rsc-www, which only answers staff sessions.
 */
export function AbuseReports() {
  const [handled, setHandled] = useState<number>(0)
  const [accused, setAccused] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)

  const [reports, setReports] = useState<AbuseReport[]>([])
  const [pages, setPages] = useState(0)
  const [unhandled, setUnhandled] = useState(0)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [openId, setOpenId] = useState<number | null>(null)

  const load = useCallback(
    async (showSpinner = true) => {
      if (showSpinner) setLoading(true)

      try {
        const data = await getAbuseReports({ handled, accused: search, page })

        setReports(data.reports ?? [])
        setPages(data.pages ?? 0)
        setUnhandled(data.unhandled ?? 0)
        setError(null)
      } catch (e) {
        setError(
          e instanceof ApiError && e.status === 403
            ? 'Your account is no longer staff.'
            : 'Unable to reach the report queue. The data server may be offline.',
        )
      } finally {
        setLoading(false)
      }
    },
    [handled, search, page],
  )

  useEffect(() => {
    load()
  }, [load])

  // keep the queue fresh without a reload: reports land here whenever someone
  // in game submits the report form
  useEffect(() => {
    const timer = setInterval(() => load(false), POLL_INTERVAL)
    return () => clearInterval(timer)
  }, [load])

  const onResolve = async (report: AbuseReport) => {
    setBusyId(report.id)

    try {
      await resolveAbuseReport(report.id, !report.handled)
      await load(false)
    } catch {
      setError('Unable to update that report. Try again in a moment.')
    } finally {
      setBusyId(null)
    }
  }

  // the report whose case file is open, if it is still in the current list
  const openReport = useMemo(
    () => reports.find((report) => report.id === openId) ?? null,
    [reports, openId],
  )

  const onSearch = (event: React.FormEvent) => {
    event.preventDefault()
    setPage(0)
    setSearch(accused.trim())
  }

  return (
    <section className="rounded-lg border border-stone-700 bg-stone-800/60">
      <header className="flex flex-col gap-4 border-b border-stone-700 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-adventure text-lg uppercase tracking-wide text-gold-400">
            Abuse Reports
          </h2>
          <p className="mt-1 text-xs text-text-secondary">
            Filed with the in-game report form.{' '}
            {unhandled > 0 ? (
              <span className="text-ember">
                {unhandled} awaiting review
              </span>
            ) : (
              <span className="text-moss">Nothing awaiting review</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-md border border-stone-700 bg-stone-900 p-1">
          {FILTERS.map((filter) => (
            <button
              key={filter.label}
              type="button"
              onClick={() => {
                setPage(0)
                setOpenId(null)
                setHandled(filter.handled)
              }}
              className={cn(
                'rounded px-3 py-1.5 text-xs uppercase tracking-wide transition-colors',
                handled === filter.handled
                  ? 'bg-gold-500 text-stone-950'
                  : 'text-text-secondary hover:text-gold-400',
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </header>

      <div className="border-b border-stone-700 px-5 py-4">
        <form onSubmit={onSearch} className="flex gap-3">
          <Input
            value={accused}
            onChange={(event) => setAccused(event.target.value)}
            placeholder="Filter by reported player"
            maxLength={12}
            aria-label="Filter by reported player"
            className="max-w-xs"
          />
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
          {search && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setAccused('')
                setSearch('')
                setPage(0)
              }}
            >
              Clear
            </Button>
          )}
        </form>
      </div>

      {error && (
        <p className="border-b border-stone-700 bg-rune-red/10 px-5 py-3 text-sm text-parchment">
          {error}
        </p>
      )}

      {loading ? (
        <div className="space-y-3 px-5 py-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : reports.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm text-text-secondary">
          {search
            ? `No reports for "${search}".`
            : handled === 0
              ? 'No open reports. The queue is clear.'
              : 'No reports to show.'}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-stone-700 text-xs uppercase tracking-wide text-text-muted">
                <th scope="col" className="px-5 py-3 font-medium">
                  Filed
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Reported
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Rule broken
                </th>
                <th scope="col" className="hidden px-5 py-3 font-medium md:table-cell">
                  Reported by
                </th>
                <th scope="col" className="hidden px-5 py-3 font-medium sm:table-cell">
                  Status
                </th>
                <th scope="col" className="px-5 py-3 font-medium text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr
                  key={report.id}
                  className={cn(
                    'border-b border-stone-800 hover:bg-stone-900/40',
                    openId === report.id && 'bg-stone-900/40',
                  )}
                >
                  <td className="whitespace-nowrap px-5 py-3 text-text-secondary">
                    <span className="sm:hidden">{formatUnixDate(report.date)}</span>
                    <span className="hidden sm:inline">
                      {formatUnixDateTime(report.date)}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <Link
                      href={`/hiscores?username=${encodeURIComponent(report.accused)}`}
                      className="text-gold-400 hover:text-gold-500 transition-colors"
                    >
                      {formatUsername(report.accused)}
                    </Link>
                    {report.muted && (
                      <span
                        className="ml-2 rounded bg-rune-red/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-ember"
                        title="A moderator muted this player for 48 hours when reporting"
                      >
                        Muted
                      </span>
                    )}
                    {report.has_details && (
                      <span
                        className="ml-2 rounded bg-stone-700/70 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-text-secondary"
                        title="The game server recorded chat, trades and positions with this report"
                      >
                        Log
                      </span>
                    )}
                    {report.has_screenshot && (
                      <span
                        className="ml-2 rounded bg-stone-700/70 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-text-secondary"
                        title="The reporter's client uploaded a screenshot"
                      >
                        Screenshot
                      </span>
                    )}
                  </td>
                  <td
                    className={cn(
                      'px-5 py-3',
                      isSevere(report.offence)
                        ? 'text-ember'
                        : 'text-text-primary',
                    )}
                  >
                    {offenceName(report.offence)}
                  </td>
                  <td className="hidden px-5 py-3 text-text-secondary md:table-cell">
                    <PlayerName
                      username={report.reporter}
                      rank={report.reporter_rank}
                    />
                  </td>
                  <td className="hidden px-5 py-3 sm:table-cell">
                    {report.handled ? (
                      <span className="text-moss">
                        Resolved
                        {report.handled_by ? ` by ${formatUsername(report.handled_by)}` : ''}
                      </span>
                    ) : (
                      <span className="text-ember">Open</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-expanded={openId === report.id}
                      aria-controls="report-case-file"
                      onClick={() =>
                        setOpenId((current) =>
                          current === report.id ? null : report.id,
                        )
                      }
                    >
                      {openId === report.id ? 'Hide' : 'Details'}
                    </Button>
                    <Button
                      variant={report.handled ? 'ghost' : 'outline'}
                      size="sm"
                      className="ml-2"
                      disabled={busyId === report.id}
                      onClick={() => onResolve(report)}
                    >
                      {busyId === report.id
                        ? '…'
                        : report.handled
                          ? 'Reopen'
                          : 'Resolve'}
                    </Button>
                  </td>
                </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {openReport && (
        <div
          id="report-case-file"
          className="border-t border-stone-700 bg-stone-950/40 px-5 py-5"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-adventure text-sm uppercase tracking-wide text-gold-400">
              Report #{openReport.id} · {formatUsername(openReport.accused)} ·{' '}
              {offenceName(openReport.offence)}
            </h3>
            <Button variant="ghost" size="sm" onClick={() => setOpenId(null)}>
              Close
            </Button>
          </div>

          <ReportDetail id={openReport.id} />
        </div>
      )}

      {pages > 1 && (
        <nav
          className="flex items-center justify-center gap-4 border-t border-stone-700 px-5 py-4 text-sm"
          aria-label="Report pagination"
        >
          <Button
            variant="ghost"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((current) => Math.max(0, current - 1))}
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
            onClick={() => setPage((current) => current + 1)}
          >
            Next &raquo;
          </Button>
        </nav>
      )}
    </section>
  )
}
