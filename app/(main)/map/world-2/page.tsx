import type { Metadata } from 'next'
import Link from 'next/link'

import { Container } from '@/components/ui/Container'
import { SectionTitle } from '@/components/ui/SectionTitle'
import { WorldMapDisplay } from '@/components/world-map/WorldMap'
import { WorldMapTabs } from '@/components/world-map/WorldMapTabs'
import type { PlayersData } from '@/lib/types'
import { fetchWwwJson } from '@/lib/www'

export const metadata: Metadata = {
  title: 'World 2 Map',
}

export const dynamic = 'force-dynamic'

export default async function MapWorldTwoPage() {
  let playersData: PlayersData = { players: [], count: 0 }

  // world 2 keeps its own data server, so this is a different feed rather than
  // a filter over world 1's
  try {
    playersData = await fetchWwwJson<PlayersData>('/api/players?world=2')
  } catch {
    playersData = { players: [], count: 0 }
  }

  return (
    <Container className="py-16">
      <SectionTitle
        eyebrow="Live — World 2"
        title="Botting World Map"
        description="World 2 runs the same landscape with its own accounts, items and economy. Botting is allowed here, so most of the green pins below are scripts at work."
      />

      <div className="mt-8">
        <WorldMapTabs />
      </div>

      <div className="mt-8">
        <WorldMapDisplay
          initialPlayers={playersData.players}
          world={2}
          variant="botting"
        />
      </div>

      <div className="mt-10 rounded-lg border border-moss/40 bg-stone-900/60 p-5">
        <h3 className="font-adventure text-lg uppercase tracking-wide text-moss">
          About world 2
        </h3>
        <ul className="mt-3 space-y-2 text-sm text-text-secondary">
          <li>
            <span className="text-text-primary">Nothing carries over.</span>{' '}
            Separate accounts, bank, skills and hiscores — a world 2 character
            is not a world 1 character, in either direction.
          </li>
          <li>
            <span className="text-text-primary">Fatigue is off,</span> so
            scripts never meet a sleep word.
          </li>
          <li>
            <span className="text-text-primary">Play it by hand if you like.</span>{' '}
            The game rules are the same; botting simply is not against them
            here.
          </li>
        </ul>
        <p className="mt-4 text-sm text-text-secondary">
          Check which worlds are up on the{' '}
          <Link href="/status" className="text-moss hover:underline">
            server status page
          </Link>
          .
        </p>
      </div>
    </Container>
  )
}
