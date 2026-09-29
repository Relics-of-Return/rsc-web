'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { registerAccount } from '@/lib/api'
import {
  PASSWORD_MESSAGE,
  PASSWORD_MIN,
  PASSWORD_MAX,
  REGISTER_MESSAGES,
  USERNAME_MESSAGE,
  USERNAME_PATTERN,
} from '@/lib/validations'

export function RegisterForm() {
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
      const result = await registerAccount(trimmed, password, confirm)

      if (result.success) {
        setSuccess(REGISTER_MESSAGES[result.code] ?? 'Your account has been created!')
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
