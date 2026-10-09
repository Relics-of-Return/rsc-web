'use client'

import { useState, type FormEvent, type ReactNode } from 'react'
import { Check, Eye, EyeOff, X } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { ApiError, changeAccountPassword } from '@/lib/api'
import type { AccountWorld, PasswordChangeResult } from '@/lib/types'
import { cn } from '@/lib/utils'
import { Panel, longDate, relativeTime } from './parts'

// what the game client can send: letters, digits and _ (anything else becomes
// _), 20 characters at most. rsc-www and the data server check the same
const GAME_CHARACTERS = /^[A-Za-z0-9_]*$/

const ERRORS: Record<string, string> = {
  'wrong-password': 'Your current password is wrong.',
  throttled: 'Too many wrong passwords. Wait five minutes, then try again.',
  'invalid-password': 'Use 4 to 20 letters, numbers or underscores.',
  mismatch: "The two new passwords don't match.",
  'contains-username': "Your new password mustn't contain your username.",
  'same-password': 'Your new password has to be different from the current one.',
  unavailable: 'Password changes open with the next game update. Please try again then.',
  'not logged in': 'Your session has ended. Log in again to change your password.',
}

function strength(password: string): { score: number; label: string } {
  if (!password) return { score: 0, label: '' }

  let score = 0
  if (password.length >= 8) score += 1
  if (password.length >= 12) score += 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/_/.test(password)) score += 1

  const level = Math.min(4, Math.max(1, score))
  return { score: level, label: ['', 'Weak', 'Fair', 'Good', 'Strong'][level] }
}

function PasswordInput({ label, value, onChange, autoComplete, shown }: { label: string; value: string; onChange: (value: string) => void; autoComplete: string; shown: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-text-muted">{label}</span>
      <input
        type={shown ? 'text' : 'password'}
        value={value}
        maxLength={20}
        autoComplete={autoComplete}
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-stone-700 bg-stone-900 px-3.5 py-2.5 font-label text-sm text-text-primary placeholder:text-text-muted focus:border-gold-500/60 focus:outline-none focus:ring-2 focus:ring-gold-500/20"
      />
    </label>
  )
}

function Rule({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <li className={cn('flex items-center gap-2', ok ? 'text-moss' : 'text-text-muted')}>
      {ok ? <Check className="h-3.5 w-3.5 shrink-0" /> : <X className="h-3.5 w-3.5 shrink-0" />}
      {children}
    </li>
  )
}

export function SecurityPanel({ username, worlds }: { username: string; worlds: AccountWorld[] }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [shown, setShown] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<PasswordChangeResult | null>(null)

  const rules = {
    length: next.length >= 4 && next.length <= 20,
    characters: next.length > 0 && GAME_CHARACTERS.test(next),
    username: next.length > 0 && !next.toLowerCase().includes(username.toLowerCase()),
    different: next.length > 0 && next !== current,
    match: next.length > 0 && next === confirm,
  }

  const ready = current.length > 0 && Object.values(rules).every(Boolean)
  const meter = strength(next)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!ready || busy) return

    setBusy(true)
    setError(null)
    setResult(null)

    try {
      setResult(await changeAccountPassword({ password: current, newPassword: next, confirm }))
      setCurrent('')
      setNext('')
      setConfirm('')
    } catch (failure) {
      const reason = failure instanceof ApiError ? failure.message : ''
      setError(ERRORS[reason] ?? 'Your password could not be changed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const played = worlds.flatMap((world) => (world.account && world.account.lastLogin > 0 ? [{ id: world.id, name: world.name, lastLogin: world.account.lastLogin }] : []))

  return (
    <div className="space-y-6">
      <Panel title="Change password" description="Your password is the same for the website, the launcher and every world.">
        <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
          <div className="space-y-4">
            <PasswordInput label="Current password" value={current} onChange={setCurrent} autoComplete="current-password" shown={shown} />
            <PasswordInput label="New password" value={next} onChange={setNext} autoComplete="new-password" shown={shown} />

            {next && (
              <div>
                <div className="grid grid-cols-4 gap-1" aria-hidden>
                  {[1, 2, 3, 4].map((step) => (
                    <span
                      key={step}
                      className={cn(
                        'h-1.5 rounded-full',
                        step <= meter.score ? ['', 'bg-red-500', 'bg-orange-400', 'bg-gold-500', 'bg-moss'][meter.score] : 'bg-stone-800'
                      )}
                    />
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-text-muted">Strength: {meter.label}</p>
              </div>
            )}

            <PasswordInput label="Confirm new password" value={confirm} onChange={setConfirm} autoComplete="new-password" shown={shown} />

            <div className="flex items-center gap-2 text-xs text-text-secondary">
              <button
                type="button"
                onClick={() => setShown((value) => !value)}
                className="inline-flex items-center gap-1.5 rounded border border-stone-700 px-2 py-1 hover:border-gold-500/50 hover:text-gold-400"
              >
                {shown ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {shown ? 'Hide passwords' : 'Show passwords'}
              </button>
            </div>

            {error && <p className="rounded-md border border-rune-red/60 bg-rune-red/10 px-3 py-2 text-sm text-parchment">{error}</p>}

            {result && (
              <div className="space-y-2 rounded-md border border-moss/50 bg-moss/10 px-3 py-3 text-sm text-parchment">
                <p className="font-medium text-text-primary">Your password has been changed.</p>
                {result.sessionsEnded > 0 && (
                  <p>You&apos;ve been logged out of the website everywhere else ({result.sessionsEnded} {result.sessionsEnded === 1 ? 'session' : 'sessions'}).</p>
                )}
                {result.worlds.length > 0 && (
                  <ul className="space-y-1 text-xs text-text-secondary">
                    {result.worlds.map((world) => (
                      <li key={world.id}>
                        <b className="text-text-primary">{world.name}:</b>{' '}
                        {world.changed === true
                          ? 'changed too.'
                          : world.changed === null
                            ? "couldn't be reached, so it still has your old password. Change it again later to update it."
                            : world.reason === 'no-account'
                              ? 'no character yet; your first login there uses the new password.'
                              : 'its character had a different password, so it keeps that one.'}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <Button type="submit" disabled={!ready || busy}>{busy ? 'Changing…' : 'Change password'}</Button>
          </div>

          <div className="rounded-md border border-stone-700 bg-stone-950/50 p-4">
            <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-text-muted">Your new password</p>
            <ul className="space-y-2 text-xs">
              <Rule ok={rules.length}>4 to 20 characters</Rule>
              <Rule ok={rules.characters}>Letters, numbers and _ only</Rule>
              <Rule ok={rules.username}>Doesn&apos;t contain your username</Rule>
              <Rule ok={rules.different}>Different from your current one</Rule>
              <Rule ok={rules.match}>Both new passwords match</Rule>
            </ul>
            <p className="mt-4 text-[11px] leading-relaxed text-text-muted">
              The game can only type letters, numbers and underscores, so other symbols would lock you out of the game.
            </p>
          </div>
        </form>
      </Panel>

      <Panel title="Recent logins" description="When each of your characters last logged in. Anything you don't recognise? Change your password.">
        {played.length === 0 ? (
          <p className="text-sm text-text-secondary">No logins on record yet.</p>
        ) : (
          <ul className="divide-y divide-stone-800">
            {played.map((world) => (
              <li key={world.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                <span className="text-text-primary">{world.name}</span>
                <span className="text-text-secondary">
                  {longDate(world.lastLogin)} <span className="text-text-muted">({relativeTime(world.lastLogin)})</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  )
}
