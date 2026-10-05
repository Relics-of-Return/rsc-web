import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

import { ServersOffline } from '@/components/play/ServersOffline'
import { WorldSelect } from '@/components/play/WorldSelect'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import { gameURL } from '@/lib/play'
import type { WorldEntry, WorldsData } from '@/lib/types'
import { fetchWwwJson } from '@/lib/www'

export const metadata = {
  title: 'Play',
}

export const dynamic = 'force-dynamic'

interface PlayPageProps {
  searchParams: Promise<{ world?: string | string[] }>
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto mt-12 max-w-2xl rounded-lg border border-stone-700 bg-stone-800/60 p-8 text-center text-sm leading-relaxed text-text-secondary">
      {children}
    </div>
  )
}

export default async function PlayPage({ searchParams }: PlayPageProps) {
  const { world: requested } = await searchParams
  let worlds: WorldEntry[] | null = null

  try {
    const data = await fetchWwwJson<WorldsData>('/api/worlds')
    worlds = data.worlds
  } catch {
    // shown as offline below
  }

  if (!worlds) {
    return (
      <Container className="py-6">
        <ServersOffline />
      </Container>
    )
  }

  if (requested === undefined) {
    return (
      <Container className="py-12">
        <WorldSelect initialWorlds={worlds} />
      </Container>
    )
  }

  const id = Number(Array.isArray(requested) ? requested[0] : requested)
  const world = worlds.find((entry) => entry.id === id)
  const name = world?.name ?? `World ${id}`
  const href = world ? gameURL(world) : null

  if (!world || !world.online || !href) {
    return (
      <Container className="py-6">
        <Notice>
          <p>
            {world ? `${name} is offline right now.` : `There is no world ${requested}.`}
          </p>
          <Button asChild variant="secondary" className="mt-6">
            <Link href="/play">Choose another world</Link>
          </Button>
        </Notice>
      </Container>
    )
  }

  // the game is a page of its own (rsc-client's world-endpoint.js), not a
  // frame on this one: nothing the site does - a deploy, a reload, a dev
  // recompile, a navigation - can end a game. /play?world=N just sends the
  // player there, for links and bookmarks made before
  redirect(href)
}
