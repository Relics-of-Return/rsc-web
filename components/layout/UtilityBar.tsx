'use client'

import Link from 'next/link'

import { Crown } from '@/components/players/Crown'
import { Container } from '@/components/ui/Container'
import { isStaff } from '@/data/ranks'
import { GITHUB_URL } from '@/lib/constants'
import { useAuth } from '@/hooks/useAuth'
import { useServerStatus } from '@/hooks/useServerStatus'
import { formatNumber, formatUsername } from '@/lib/utils'

export function UtilityBar() {
  const { status, loading } = useServerStatus()
  const { user, rank, loading: authLoading } = useAuth()

  return (
    <div className="bg-stone-950 border-b border-stone-800 text-xs">
      <Container>
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-text-secondary">
              <span
                className={
                  'w-2 h-2 rounded-full ' +
                  (loading || !status
                    ? 'bg-stone-600'
                    : status.connected
                      ? 'bg-moss animate-pulse'
                      : 'bg-rune-red')
                }
                aria-hidden="true"
              />
              <span data-testid="online-count">
                {loading ? '...' : `${formatNumber(status?.online)} online`}
              </span>
            </span>
            <span
              className="hidden sm:flex items-center gap-1.5 text-text-muted"
              data-testid="registered-count"
            >
              {formatNumber(status?.registered)} accounts
            </span>
          </div>
          <div className="flex items-center gap-3 sm:gap-5">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-text-secondary hover:text-gold-400 transition-colors"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-2.17c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 5.8 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z"
                />
              </svg>
              <span className="hidden sm:inline">GitHub</span>
            </a>

            {!authLoading && (
              <>
                {isStaff(rank) && (
                  <Link
                    href="/admin"
                    className="text-gold-500 hover:text-gold-400 transition-colors uppercase tracking-wide"
                  >
                    Admin
                  </Link>
                )}
                {user ? (
                  <Link
                    href="/account"
                    className="flex items-center gap-1.5 text-text-secondary hover:text-gold-400 transition-colors"
                  >
                    {rank > 0 ? (
                      <Crown rank={rank} />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-gold-500" aria-hidden="true" />
                    )}
                    {formatUsername(user)}
                  </Link>
                ) : (
                  <>
                    <Link
                      href="/login"
                      className="text-text-secondary hover:text-gold-400 transition-colors"
                    >
                      Login
                    </Link>
                    <Link
                      href="/register"
                      className="text-text-secondary hover:text-gold-400 transition-colors"
                    >
                      Register
                    </Link>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </Container>
    </div>
  )
}
