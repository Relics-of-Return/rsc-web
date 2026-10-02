'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ACCOUNT_MODES, HELMS } from '@/data/ironman'
import { registerAccount } from '@/lib/api'
import { cn } from '@/lib/utils'
import {
  PASSWORD_MESSAGE,
  PASSWORD_MIN,
  PASSWORD_MAX,
  REGISTER_MESSAGES,
  USERNAME_MESSAGE,
  USERNAME_PATTERN,
} from '@/lib/validations'


const ACCOUNT_TYPES = [
  {
    mode: ACCOUNT_MODES.standard,
    name: 'Standard',
    blurb: 'Trade, use the Tradepost and play with everyone.',
  },
  {
    mode: ACCOUNT_MODES.ironman,
    name: 'Ironman',
    blurb:
      'Stand alone: no trading, no Tradepost, nobody else\'s loot. Your helm is tempered by the Achievement Diaries.',
  },
] as const

export function RegisterForm() {
  const [accountMode, setAccountMode] = useState<number>(ACCOUNT_MODES.standard)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const trimmed = username.trim()

    if (!USERNAME_PATTERN.test(trimmed)) {
      setError(USERNAME_MESSAGE)
      return
    }

    if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
      setError(PASSWORD_MESSAGE)
      return
    }

    if (password !== confirm) {
      setError('The passwords do not match.')
      return
    }

    setSubmitting(true)

    try {
      const result = await registerAccount(trimmed, password, confirm, accountMode)

      if (result.success) {
        const created = REGISTER_MESSAGES[result.code] ?? 'Your account has been created!'

        setSuccess(
          accountMode === ACCOUNT_MODES.ironman
            ? `${created} You are an Ironman: you stand alone.`
            : created,
        )
      } else {
        setError(
          REGISTER_MESSAGES[result.code] ??
            'Registration failed. Please try again.',
        )
      }
    } catch {
      setError('Could not reach the account server. Please try again later.')
    } finally {
      setSubmitting(false)
    }
  }

  if (success) {
    return (
      <div className="text-center">
        <div
          className="rounded-md border border-moss/50 bg-moss/10 px-4 py-3 text-sm text-text-primary"
          role="status"
        >
          {success}
        </div>
        <div className="mt-8">
          <Button asChild size="lg" className="min-w-[180px]">
            <Link href="/login">Log In</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {error && (
        <div
          className="rounded-md border border-rune-red/50 bg-rune-red/10 px-4 py-3 text-sm text-text-primary"
          role="alert"
        >
          {error}
        </div>
      )}

      <div>
        <label
          htmlFor="username"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary"
        >
          Username
        </label>
        <Input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          maxLength={12}
          required
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="1-12 letters, numbers or underscores"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary"
        >
          Password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="4-20 characters"
        />
      </div>

      <div>
        <label
          htmlFor="confirm"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary"
        >
          Confirm Password
        </label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Repeat your password"
        />
      </div>

      <fieldset>
        <legend className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Account Type
        </legend>
        <div className="grid gap-2" role="radiogroup">
          {ACCOUNT_TYPES.map((type) => {
            const chosen = accountMode === type.mode

            return (
              <label
                key={type.mode}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 transition-colors',
                  chosen
                    ? 'border-gold-500/60 bg-gold-500/10'
                    : 'border-stone-700 hover:border-gold-500/40',
                )}
              >
                <input
                  type="radio"
                  name="accountMode"
                  value={type.mode}
                  checked={chosen}
                  onChange={() => setAccountMode(type.mode)}
                  className="mt-1 accent-gold-500"
                />
                <span className="flex-1">
                  <span className="flex items-center gap-2 text-sm font-medium text-text-primary">
                    {type.mode === ACCOUNT_MODES.ironman && (
                      <span className="relative inline-block h-[26px] w-[20px] shrink-0">
                        <Image
                          src={HELMS[0].image}
                          alt=""
                          fill
                          unoptimized
                          className="object-contain [image-rendering:pixelated]"
                          sizes="20px"
                        />
                      </span>
                    )}
                    {type.name}
                  </span>
                  <span className="mt-0.5 block text-xs text-text-secondary">{type.blurb}</span>
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={submitting}
      >
        {submitting ? 'Creating account…' : 'Create Account'}
      </Button>

      <p className="text-center text-sm text-text-secondary">
        Already have an account?{' '}
        <Link href="/login" className="text-gold-400 hover:text-gold-500">
          Log in
        </Link>
      </p>

      <p className="text-center text-xs text-text-muted">
        Note: the game server limits account creation to one account per IP
        address every 5 minutes.
      </p>
    </form>
  )
}
