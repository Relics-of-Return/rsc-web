'use client'

import Link from 'next/link'

import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { SectionTitle } from '@/components/ui/SectionTitle'
import { WorldEditor } from '@/components/world-map/WorldEditor'
import { canEditWorld } from '@/lib/landscape/access'
import { useAuth } from '@/hooks/useAuth'

/**
 * Administrators only (see lib/landscape/access). This only decides what to
 * draw — every /api/landscape route checks the rank again with rsc-www
 * before it reads or writes a thing, so forcing this open gets nothing.
 */
export function WorldEditorGate() {
  const { user, rank, loading } = useAuth()

  if (loading) {
    return (
      <Container className="py-16">
        <p className="text-center text-sm text-text-secondary">Loading…</p>
      </Container>
    )
  }

  if (!user || !canEditWorld(rank)) {
    return (
      <Container className="py-16">
        <div className="mx-auto max-w-lg rounded-lg border border-stone-700 bg-stone-800/60 p-8 text-center">
          <h1 className="font-adventure text-2xl uppercase tracking-wide text-gold-500">
            Administrators Only
          </h1>
          <p className="mt-4 text-sm text-text-secondary">
            {user ? (
              <>
                The account <span className="text-gold-400">{user}</span>{' '}
                is not an administrator, so the world editor is closed to it.
              </>
            ) : (
              'Log in with an administrator account to use the world editor.'
            )}
          </p>
          <div className="mt-6 flex justify-center">
            <Button asChild variant={user ? 'outline' : 'primary'}>
              <Link href={user ? '/map' : '/login'}>
                {user ? 'Back to the map' : 'Log In'}
              </Link>
            </Button>
          </div>
        </div>
      </Container>
    )
  }

  // wider than the site's usual column: the map, the game's view and the
  // inspector sit side by side on a large screen
  return (
    <div className="mx-auto w-full max-w-[120rem] px-4 py-12 sm:px-6 lg:px-8">
      <SectionTitle
        eyebrow="Administration — World editing"
        title="World Editor"
        description="Change the ground, walls, scenery and doors of the world both game servers run on. Saves go to rsc-server/data and the client's copy of the map; restart the game servers to see them in-game."
      />

      <div className="mt-8">
        <WorldEditor />
      </div>
    </div>
  )
}
