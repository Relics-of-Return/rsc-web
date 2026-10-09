'use client'

import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Skeleton } from '@/components/ui/Skeleton'
import { getBetaAccess, unlinkDiscord } from '@/lib/api'
import { DISCORD_URL } from '@/lib/constants'
import type { BetaAccess } from '@/lib/types'
import { cn } from '@/lib/utils'

// what the Discord link said on the way back (/api/discord/callback and
// /api/discord/link put it in ?discord=)
const RESULTS: Record<string, { text: string; good?: boolean }> = {
  tester: { text: 'Discord linked. You have the Beta Tester role, so World 3 is open to you.', good: true },
  'no-role': {
    text: "Discord linked, but that account doesn't have the Beta Tester role yet. Once it's given, it counts within a few minutes.",
  },
  'not-in-server': {
    text: "Discord linked, but that account isn't in our Discord server. Join it, then ask for the Beta Tester role.",
  },
  cancelled: { text: 'Linking was cancelled on Discord.' },
  expired: { text: 'That link expired. Please try linking again.' },
  failed: { text: "Discord couldn't be reached. Please try again." },
  unavailable: { text: "Discord linking isn't available right now. Please try again later." },
  login: { text: 'Your session ended. Log in again, then link Discord.' },
}

/**
 * The invite-only beta on the account page: World 3 lets in accounts linked to
 * a Discord member with the Beta Tester role (and staff). Linking goes through
 * Discord's own consent page and only reads who the player is.
 */
export function BetaAccessCard({ className = 'mt-8' }: { className?: string }) {
  const [access, setAccess] = useState<BetaAccess | null>(null)
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  useEffect(() => {
    // read once, then dropped from the address so a reload doesn't repeat it
    const params = new URLSearchParams(window.location.search)
    const said = params.get('discord')

    if (said) window.history.replaceState(null, '', window.location.pathname)

    getBetaAccess()
      .then(setAccess)
      .catch(() => setFailed(true))
      .finally(() => setResult(said && RESULTS[said] ? said : null))
  }, [])

  async function unlink() {
    setBusy(true)
    setResult(null)

    try {
      setAccess(await unlinkDiscord())
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  const notice = result ? RESULTS[result] : null

  return (
    <div className={className}>
      <h2 className="font-adventure text-lg text-gold-400 uppercase tracking-wide">Beta Testing</h2>

      {notice && (
        <p
          className={cn(
            'mt-4 rounded-md border p-3 text-sm',
            notice.good
              ? 'border-moss/40 bg-moss/10 text-parchment'
              : 'border-stone-600 bg-stone-900/60 text-text-secondary',
          )}
        >
          {notice.text}
        </p>
      )}

      <div className="mt-4 rounded-lg border border-stone-700 p-5">
        {failed ? (
          <p className="text-sm text-text-secondary">
            Your beta access could not be loaded. The website API may be offline.
          </p>
        ) : !access ? (
          <div className="space-y-2.5">
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : !access.enabled ? (
          <p className="text-sm text-text-secondary">Discord linking isn&apos;t set up yet.</p>
        ) : (
          <>
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-parchment">
                {access.linked ? (
                  <>
                    Linked to Discord as <b className="text-gold-400">{access.discordName || 'unknown'}</b>
                  </>
                ) : (
                  'No Discord account linked'
                )}
              </p>
              <StatusBadge access={access} />
            </div>

            <p className="mt-3 text-sm text-text-secondary">
              World 3 runs the next update before everyone else gets it. It&apos;s open to members of our{' '}
              {DISCORD_URL ? (
                <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="text-gold-400 hover:underline">
                  Discord server
                </a>
              ) : (
                'Discord server'
              )}{' '}
              with the <b>Beta Tester</b> role. Link your Discord account to join; linking only tells us who you
              are on Discord.
              {access.staff && ' As staff, you can play World 3 without the role.'}
            </p>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="sm">
                {/* a plain link: the route sends the browser on to Discord */}
                <a href="/api/discord/link">{access.linked ? 'Link a different Discord account' : 'Link Discord'}</a>
              </Button>
              {access.linked && (
                <Button size="sm" variant="outline" disabled={busy} onClick={unlink}>
                  {busy ? 'Unlinking…' : 'Unlink'}
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ access }: { access: BetaAccess }) {
  const [label, good] = access.tester
    ? ['Beta tester', true]
    : access.staff
      ? ['Staff', true]
      : !access.linked
        ? ['Not a beta tester', false]
        : access.inServer
          ? ['No Beta Tester role', false]
          : ['Not in the Discord server', false]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs uppercase tracking-wide',
        good ? 'text-moss' : 'text-text-muted',
      )}
    >
      <span className={cn('h-2 w-2 rounded-full', good ? 'bg-moss' : 'bg-stone-500')} />
      {label}
    </span>
  )
}
