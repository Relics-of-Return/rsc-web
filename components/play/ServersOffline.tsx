'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { RotateCw } from 'lucide-react'

import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

const RETRY_SECONDS = 15

export function ServersOffline() {
  const router = useRouter()
  const [seconds, setSeconds] = useState(RETRY_SECONDS)
  const [round, setRound] = useState(0)
  const [checking, setChecking] = useState(false)

  const check = useCallback(() => {
    setChecking(true)
    router.refresh()

    window.setTimeout(() => {
      setChecking(false)
      setSeconds(RETRY_SECONDS)
      setRound((value) => value + 1)
    }, 1500)
  }, [router])

  useEffect(() => {
    if (checking) {
      return
    }

    const timer = window.setInterval(() => {
      if (document.hidden) {
        return
      }

      setSeconds((value) => value - 1)
    }, 1000)

    return () => window.clearInterval(timer)
  }, [checking, round])

  useEffect(() => {
    if (seconds > 0 || checking) {
      return
    }

    const timer = window.setTimeout(check, 0)
    return () => window.clearTimeout(timer)
  }, [seconds, checking, check])

  return (
    <div
      role="status"
      aria-live="polite"
      className="fx-fade-in-up mx-auto w-full max-w-xl py-10 sm:py-16"
    >
      <p className="sr-only">
        The game servers can&rsquo;t be reached right now. This page checks again by
        itself every {RETRY_SECONDS} seconds, and shows the world list as soon as they
        answer.
      </p>

      <div className="rsc-offline-stone rounded-lg px-6 py-10 sm:px-10 sm:py-12">
        <div className="flex flex-col items-center text-center text-sm leading-relaxed text-text-secondary">
          <div
            aria-hidden="true"
            className="relative grid h-24 w-24 place-items-center sm:h-28 sm:w-28"
          >
            <span className="rsc-offline-halo absolute -inset-6 rounded-full" />
            <span className="rsc-offline-ping absolute inset-0 rounded-full border border-gold-500/40" />
            <span
              className="rsc-offline-ping absolute inset-0 rounded-full border border-gold-500/30"
              style={{ animationDelay: '1.8s' }}
            />
            <span className="absolute inset-0 rounded-full border-[6px] border-gold-500/12" />
            <span
              className="rsc-offline-ring absolute inset-0 rounded-full"
              style={{ animationDuration: checking ? '0.9s' : '2.6s' }}
            />
            <span
              className="rsc-offline-orbit absolute inset-0"
              style={{ animationDuration: checking ? '0.9s' : '2.6s' }}
            >
              <span className="absolute left-1/2 top-0 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-400 shadow-[0_0_10px_4px_rgba(240,198,116,0.55)]" />
            </span>
          </div>

          <h1 className="mt-8 font-adventure text-2xl uppercase tracking-wide text-gold-400 [text-shadow:0_0_30px_rgba(212,175,55,0.4)] sm:text-3xl">
            Game servers unavailable
          </h1>

          <p className="mt-3 max-w-md">
            We can&rsquo;t reach the game servers at the moment. They may be down for
            maintenance or restarting after an update.
          </p>

          <div
            aria-hidden="true"
            className="mt-9 h-1.5 w-full max-w-xs overflow-hidden rounded-full border border-gold-600/25 bg-stone-950/80"
          >
            <div
              key={round}
              className="rsc-offline-bar fx-shimmer h-full rounded-full bg-gradient-to-r from-gold-600 via-gold-500 to-gold-400 shadow-[0_0_12px_rgba(212,175,55,0.55)]"
              style={{ animationDuration: `${RETRY_SECONDS}s` }}
            />
          </div>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Button
              onClick={check}
              disabled={checking}
              className="disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RotateCw
                aria-hidden="true"
                className={cn('mr-2 h-4 w-4', checking && 'animate-spin motion-reduce:animate-none')}
              />
              Check now
            </Button>
            <Button asChild variant="secondary">
              <Link href="/status">View server status</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
