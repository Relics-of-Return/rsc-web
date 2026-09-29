import type { Metadata } from 'next'

import { Container } from '@/components/ui/Container'
import { SectionTitle } from '@/components/ui/SectionTitle'
import { WorldMapDisplay } from '@/components/world-map/WorldMap'
import { WorldMapTabs } from '@/components/world-map/WorldMapTabs'
import type { PlayersData } from '@/lib/types'
import { fetchWwwJson } from '@/lib/www'

export const metadata: Metadata = {
  title: 'World 1 Map',
}

export const dynamic = 'force-dynamic'

export default async function MapPage() {
  let playersData: PlayersData = { players: [], count: 0 }

  // a failed fetch only costs the first frame of markers — the client polls
  // /api/players straight after mounting
  try {
    playersData = await fetchWwwJson<PlayersData>('/api/players?world=1')
  } catch {
    playersData = { players: [], count: 0 }
  }

  return (
    <Container className="py-16">
      <SectionTitle
        eyebrow="Live — World 1"
        title="World Map"
        description="Every player online, plotted on the RuneScape Classic landscape from their in-game coordinates."
      />

      <div className="mt-8">
        <WorldMapTabs />
      </div>

      <div className="mt-8">
        <WorldMapDisplay
          initialPlayers={playersData.players}
          world={1}
          variant="classic"
        />
      </div>
    </Container>
  )
}
