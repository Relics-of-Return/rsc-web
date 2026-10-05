'use client'

import Link from 'next/link'

import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { SectionTitle } from '@/components/ui/SectionTitle'
import { ModelEditor } from '@/components/model-editor/ModelEditor'
import { canEditWorld } from '@/lib/landscape/access'
import { useAuth } from '@/hooks/useAuth'
import { formatUsername } from '@/lib/utils'

/**
 * Administrators only, like the World Editor (lib/landscape/access): a
 * saved model goes into the files the game is built from. This only decides
 * what to draw - every /api/models route checks the rank again with rsc-www.
 */
export function ModelEditorGate() {
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
                The account <span className="text-gold-400">{formatUsername(user)}</span> is not an administrator,
                so the model editor is closed to it.
              </>
            ) : (
              'Log in with an administrator account to use the model editor.'
            )}
          </p>
          <div className="mt-6 flex justify-center">
            <Button asChild variant={user ? 'outline' : 'primary'}>
              <Link href={user ? '/' : '/login'}>{user ? 'Back to the site' : 'Log In'}</Link>
            </Button>
          </div>
        </div>
      </Container>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[120rem] px-4 py-12 sm:px-6 lg:px-8">
      <SectionTitle
        eyebrow="Administration — Scenery models"
        title="Model Editor"
        description="The scenery models in rsc-client/assets/models, drawn live by the game's own renderer as you edit them, or as they change on disk. Save writes the source; Pack puts every model into the game's archives, and players see it after reloading."
      />

      <div className="mt-8">
        <ModelEditor />
      </div>
    </div>
  )
}
