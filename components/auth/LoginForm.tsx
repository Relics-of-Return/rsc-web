'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useAuth } from '@/hooks/useAuth'
import { formatUsername } from '@/lib/utils'
import {
  PASSWORD_MESSAGE,
  USERNAME_MESSAGE,
  USERNAME_PATTERN,
} from '@/lib/validations'

export function LoginForm() {
  const { user, loading, login, logout } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    const trimmed = username.trim()

    if (!USERNAME_PATTERN.test(trimmed)) {
      setError(USERNAME_MESSAGE)
      return
    }

    if (password.length < 4 || password.length > 20) {
      setError(PASSWORD_MESSAGE)
      return
    }

    setSubmitting(true)

    try {
      const result = await login(trimmed, password)

      if (!result.success) {
        setError(result.error ?? 'Login failed. Please try again.')
      }
    } catch {
      setError('Could not reach the account server. Please try again later.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!loading && user) {
    return (
      <div className="text-center">
        <p className="font-adventure text-2xl text-gold-400">
          Welcome back, {formatUsername(user)}
        </p>
        <p className="mt-2 text-sm text-text-secondary">
          You are already logged in.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button asChild>
            <Link href="/account">Go to Account</Link>
          </Button>
          <Button variant="outline" onClick={() => logout()}>
            Log Out
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
          placeholder="Your adventurer name"
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
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
        />
      </div>

      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={submitting || loading}
      >
        {submitting ? 'Logging in…' : 'Log In'}
      </Button>

      <p className="text-center text-sm text-text-secondary">
        No account yet?{' '}
        <Link href="/register" className="text-gold-400 hover:text-gold-500">
          Create one
        </Link>
      </p>
    </form>
  )
}
