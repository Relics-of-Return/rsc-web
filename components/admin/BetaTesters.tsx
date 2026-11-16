'use client'

import { useEffect, useState, type FormEvent } from 'react'

import { ApiError, getBetaTesters, setBetaTesterAccepted } from '@/lib/api'
import type { BetaTestersData } from '@/lib/types'
import { formatUsername } from '@/lib/utils'

const REPORT_URL = 'https://discord.com/channels/1551412750821888050/1564737814858301561'

export function BetaTesters() {
  const [data, setData] = useState<BetaTestersData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [username, setUsername] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  useEffect(() => {
    getBetaTesters()
      .then(setData)
      .catch((e) =>
        setError(
          e instanceof ApiError && (e.status === 401 || e.status === 403)
            ? 'Staff only.'
            : e instanceof Error
              ? e.message
              : 'The beta testers could not be loaded.',
        ),
      )
  }, [])

  async function setAccepted(name: string, accepted: boolean) {
    setSaving(true)
    setSaveError(null)

    try {
      const result = await setBetaTesterAccepted(name, accepted)
      setData((current) => (current ? { ...current, accepted: result.accepted } : current))
      if (accepted) setUsername('')
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'The beta tester could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  function accept(event: FormEvent) {
    event.preventDefault()
    if (username.trim()) void setAccepted(username.trim(), true)
  }

  const links = data?.links ?? []
  const accepted = data?.accepted ?? []
  const testers = links.filter((link) => link.tester).length

  return (
    <section className="rounded-lg border border-stone-700 bg-stone-800/60">
      <header className="border-b border-stone-700 px-5 py-4">
        <h2 className="font-adventure text-lg uppercase tracking-wide text-gold-400">Beta Testers</h2>
        <p className="mt-1 text-xs text-text-secondary">
          World 3 and the{' '}
          <a href="/beta" className="text-gold-400 hover:underline">
            /beta
          </a>{' '}
          checklist are open to staff, to accounts linked to a Discord member with the Beta Tester role, and to accounts
          accepted below. Give or take the role in Discord; it counts here within a few minutes. Testers report what
          they find in the{' '}
          <a href={REPORT_URL} target="_blank" rel="noopener noreferrer" className="text-gold-400 hover:underline">
            beta channel on Discord
          </a>
          .
        </p>
      </header>

      {error ? (
        <p className="px-5 py-4 text-sm text-parchment">{error}</p>
      ) : !data ? (
        <p className="px-5 py-6 text-sm text-text-secondary">Loading…</p>
      ) : (
        <>
          <div className="border-b border-stone-700 px-5 py-4">
            <p className="text-xs uppercase tracking-wide text-text-secondary">
              Accepted on the website ({accepted.length})
            </p>
            <form onSubmit={accept} className="mt-3 flex flex-wrap gap-2">
              <label htmlFor="beta-accept-username" className="sr-only">
                Account name
              </label>
              <input
                id="beta-accept-username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                maxLength={12}
                placeholder="Account name"
                className="min-w-0 flex-1 rounded border border-stone-600 bg-stone-900 px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={saving || !username.trim()}
                className="rounded border border-gold-600 px-3 py-1.5 text-sm text-gold-400 hover:bg-gold-500/10 disabled:opacity-50"
              >
                Accept
              </button>
            </form>
            {saveError && <p className="mt-2 text-xs text-red-300">{saveError}</p>}
            {accepted.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs">
                {accepted.map((entry) => (
                  <li key={entry.username} className="flex flex-wrap items-center gap-x-2 text-text-secondary">
                    <span className="text-emerald-300">●</span>
                    <span className="text-text-primary">{formatUsername(entry.username)}</span>
                    <span>
                      · accepted by {formatUsername(entry.by)} on {new Date(entry.at).toLocaleString()}
                    </span>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => setAccepted(entry.username, false)}
                      className="text-red-300 hover:underline disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {!data.enabled ? (
            <p className="px-5 py-6 text-sm text-text-secondary">
              Discord is not configured in rsc-www, so no tester, accepted or not, is sent to World 3.
            </p>
          ) : links.length === 0 ? (
            <p className="px-5 py-6 text-sm text-text-secondary">No account has linked Discord yet.</p>
          ) : (
            <div className="px-5 py-4">
              <p className="text-xs uppercase tracking-wide text-text-secondary">
                {testers} of {links.length} linked account{links.length === 1 ? '' : 's'} hold the role
              </p>
              <ul className="mt-3 space-y-1 text-xs">
                {links.map((link) => (
                  <li key={link.username} className="flex flex-wrap gap-x-2 text-text-secondary">
                    <span className={link.tester ? 'text-emerald-300' : 'text-text-muted'}>
                      {link.tester ? '●' : '○'}
                    </span>
                    <span className="text-text-primary">{formatUsername(link.username)}</span>
                    <span>· {link.discordName || link.discordId}</span>
                    <span>
                      · {link.tester ? 'Beta Tester' : link.inServer ? 'no role' : 'not in the Discord server'}
                    </span>
                    <span>· checked {new Date(link.checked).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  )
}
