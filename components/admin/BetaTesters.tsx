'use client'

import { useEffect, useState } from 'react'

import { ApiError, getBetaTesters } from '@/lib/api'
import type { BetaTestersData } from '@/lib/types'
import { formatUsername } from '@/lib/utils'

const PROJECT_URL = 'https://github.com/orgs/Relics-of-Return/projects/1'

export function BetaTesters() {
  const [data, setData] = useState<BetaTestersData | null>(null)
  const [error, setError] = useState<string | null>(null)

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

  const links = data?.links ?? []
  const testers = links.filter((link) => link.tester).length

  return (
    <section className="rounded-lg border border-stone-700 bg-stone-800/60">
      <header className="border-b border-stone-700 px-5 py-4">
        <h2 className="font-adventure text-lg uppercase tracking-wide text-gold-400">Beta Testers</h2>
        <p className="mt-1 text-xs text-text-secondary">
          World 3 lets in staff and the accounts linked to a Discord member with the Beta Tester role. Give or take
          the role in Discord; it counts here within a few minutes. What testers find is tracked on the{' '}
          <a href={PROJECT_URL} className="text-gold-400 hover:underline">
            GitHub project
          </a>
          .
        </p>
      </header>

      {error ? (
        <p className="px-5 py-4 text-sm text-parchment">{error}</p>
      ) : !data ? (
        <p className="px-5 py-6 text-sm text-text-secondary">Loading…</p>
      ) : !data.enabled ? (
        <p className="px-5 py-6 text-sm text-text-secondary">
          Discord is not configured in rsc-www, so nobody is sent to World 3 as a tester.
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
                <span className={link.tester ? 'text-emerald-300' : 'text-text-muted'}>{link.tester ? '●' : '○'}</span>
                <span className="text-text-primary">{formatUsername(link.username)}</span>
                <span>· {link.discordName || link.discordId}</span>
                <span>· {link.tester ? 'Beta Tester' : link.inServer ? 'no role' : 'not in the Discord server'}</span>
                <span>· checked {new Date(link.checked).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
