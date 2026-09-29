import Link from 'next/link'
import type { ReactNode } from 'react'

import { GameFrame } from '@/components/play/GameFrame'
import { WorldSelect } from '@/components/play/WorldSelect'
import { Button } from '@/components/ui/Button'
import { Container } from '@/components/ui/Container'
import type { WorldEntry, WorldsData } from '@/lib/types'
import { fetchWwwJson } from '@/lib/www'

export const metadata = {
  title: 'Play',
}

export const dynamic = 'force-dynamic'

// /play is the world select; /play?world=N is the game, on world N

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
        <Notice>
          The game stack is currently offline. Start it with the root{' '}
          <code className="text-gold-400">manager.cmd</code> and refresh this page.
        </Notice>
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

  if (!world || !world.online || !world.clientURL) {
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

  return (
    <Container className="py-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-sm">
        <Link href="/play" className="text-gold-400 hover:text-gold-500">
          ← World select
        </Link>
        <p className="text-text-secondary">
          <span className="font-medium text-text-primary">{name}</span>
          {world.botting ? ' · botting allowed' : ''}
        </p>
      </div>
      <div className="rounded-lg border border-stone-700 bg-stone-950 p-2 shadow-[0_0_30px_rgba(212,175,55,0.12)]">
        {/* keyed on the world: two worlds' client urls differ only in the
            hash, which on its own wouldn't reload the frame */}
        <GameFrame key={world.id} clientURL={world.clientURL} title={`${name} game client`} />
      </div>
    </Container>
  )
}
