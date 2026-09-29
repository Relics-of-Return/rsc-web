'use client'

import Link from 'next/link'

import { PersonalHiscores } from '@/components/account/PersonalHiscores'
import { Crown } from '@/components/players/Crown'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { staffRankName, isStaff } from '@/data/ranks'
import { useAuth } from '@/hooks/useAuth'

export default function AccountPage() {
  const { user, rank, loading, logout } = useAuth()

  return (
    <Container className="py-16">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="font-adventure text-4xl text-gold-500 uppercase tracking-wide">
            My Account
          </h1>
        </div>

        <div className="rounded-lg border border-stone-700 bg-stone-800/60 p-8">
          {loading ? (
            <p className="text-center text-sm text-text-secondary">
              Loading…
            </p>
          ) : !user ? (
            <div className="text-center">
              <p className="text-sm text-text-secondary">
                You are not logged in. Log in or create an account to manage
                your profile.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button asChild>
                  <Link href="/login">Log In</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/register">Create Account</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-md border border-stone-700 bg-stone-900/60 px-5 py-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-text-muted">
                    Logged in as
                  </p>
                  <p className="mt-1 inline-flex items-center gap-2 font-adventure text-xl text-gold-400">
                    <Crown rank={rank} className="w-[26px] h-[22px]" />
                    {user}
                  </p>
                  {isStaff(rank) && (
                    <p className="mt-1 text-xs uppercase tracking-wide text-text-secondary">
                      {staffRankName(rank)}
                    </p>
                  )}
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs text-moss">
                  <span className="w-2 h-2 rounded-full bg-moss animate-pulse" />
                  Credentials verified
                </span>
              </div>

              <div className="mt-8">
                <h2 className="font-adventure text-lg text-gold-400 uppercase tracking-wide">
                  My Hiscores
                </h2>
                <PersonalHiscores username={user} />
              </div>

              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-stone-700 pt-6">
                <p className="text-sm text-text-secondary">
                  In-game mail and account settings arrive in a future update.
                </p>
                <Button variant="outline" onClick={() => logout()}>
                  Log Out
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Container>
  )
}
