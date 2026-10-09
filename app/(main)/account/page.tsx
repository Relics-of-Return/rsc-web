'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'

import { AccountHub } from '@/components/account/AccountHub'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { Skeleton } from '@/components/ui/Skeleton'
import { useAuth } from '@/hooks/useAuth'
import { getAccountPage } from '@/lib/api'
import type { AccountPageData } from '@/lib/types'

function Loading() {
  return (
    <div className="space-y-6" aria-busy>
      <div className="flex gap-6 rounded-lg border border-stone-700 bg-stone-800/60 p-8">
        <Skeleton className="h-[150px] w-[120px]" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-48" />
          <div className="flex gap-2 pt-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 w-28" />
            ))}
          </div>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
      </div>
    </div>
  )
}

export default function AccountPage() {
  const { user, loading, logout } = useAuth()
  const [data, setData] = useState<AccountPageData | null>(null)
  const [failed, setFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!user) return
    let live = true

    getAccountPage()
      .then((page) => live && setData(page))
      .catch(() => live && setFailed(true))

    return () => {
      live = false
    }
  }, [user, attempt])

  const retry = () => {
    setFailed(false)
    setAttempt((count) => count + 1)
  }

  return (
    <Container className="py-12">
      <div className="mx-auto max-w-6xl">
        {loading || (user && !data && !failed) ? (
          <Loading />
        ) : !user ? (
          <div className="mx-auto max-w-md rounded-lg border border-gold-500/30 bg-gradient-to-b from-stone-800 to-stone-900 p-8 text-center shadow-[0_0_40px_rgba(212,175,55,0.08)]">
            <ShieldCheck className="mx-auto h-10 w-10 text-gold-500" />
            <h1 className="mt-4 font-adventure text-3xl uppercase tracking-wide text-gold-500">Account</h1>
            <p className="mt-3 text-sm text-text-secondary">Log in to see your characters on every world, change your password and link your Discord account.</p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild>
                <Link href="/login">Log In</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/register">Create Account</Link>
              </Button>
            </div>
          </div>
        ) : failed || !data ? (
          <div className="mx-auto max-w-md rounded-lg border border-stone-700 bg-stone-800/60 p-8 text-center">
            <p className="text-sm text-text-secondary">Your account couldn&apos;t be loaded. The game server may be offline.</p>
            <div className="mt-5 flex justify-center gap-3">
              <Button size="sm" onClick={retry}>Try again</Button>
              <Button size="sm" variant="outline" onClick={() => logout()}>Log out</Button>
            </div>
          </div>
        ) : (
          <AccountHub data={data} onLogout={() => logout()} />
        )}
      </div>
    </Container>
  )
}
