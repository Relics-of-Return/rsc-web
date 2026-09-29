import Link from 'next/link'

import { Container } from '@/components/ui/Container'
import { SectionTitle } from '@/components/ui/SectionTitle'
import { UptimeTimer } from '@/components/ui/UptimeTimer'
import type { WorldsData } from '@/lib/types'
import { formatNumber } from '@/lib/utils'
import { fetchWwwJson } from '@/lib/www'

export const metadata = {
  title: 'Server Status',
}

export const dynamic = 'force-dynamic'

export default async function StatusPage() {
  let worlds: WorldsData['worlds'] = []
  let loadError = false

  try {
    const data = await fetchWwwJson<WorldsData>('/api/worlds')
    worlds = data.worlds
  } catch {
    loadError = true
  }

  const onlinePlayers = worlds.reduce(
    (total, world) => total + (world.players ?? 0),
    0,
  )

  return (
    <Container className="py-16">
      <SectionTitle
        eyebrow="Live"
        title="Server Status"
        description="World availability and player counts, updated live from each world's own data server."
      />

      <div className="mt-8 flex flex-wrap items-center gap-6">
        <UptimeTimer />
        {!loadError && (
          <p className="text-sm text-text-secondary">
            <span className="text-text-primary">{formatNumber(onlinePlayers)}</span>{' '}
            player{onlinePlayers === 1 ? '' : 's'} online across{' '}
            {worlds.length} world{worlds.length === 1 ? '' : 's'}
          </p>
        )}
      </div>

      {loadError ? (
        <p className="mt-12 text-center text-text-secondary">
          Unable to reach the data server. It may be offline.
        </p>
      ) : worlds.length === 0 ? (
        <p className="mt-12 text-center text-text-secondary">
          No game worlds are currently online.
        </p>
      ) : (
        <div className="mt-10 overflow-x-auto rounded-lg border border-stone-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-stone-700 bg-stone-800/80">
                <th className="px-4 py-3 text-left font-adventure uppercase tracking-wide text-gold-400">World</th>
                <th className="px-4 py-3 text-left font-adventure uppercase tracking-wide text-gold-400">Country</th>
                <th className="px-4 py-3 text-left font-adventure uppercase tracking-wide text-gold-400">Type</th>
                <th className="px-4 py-3 text-left font-adventure uppercase tracking-wide text-gold-400">Rules</th>
                <th className="px-4 py-3 text-right font-adventure uppercase tracking-wide text-gold-400">Players</th>
                <th className="px-4 py-3 text-right font-adventure uppercase tracking-wide text-gold-400">Map</th>
                <th className="px-4 py-3 text-right font-adventure uppercase tracking-wide text-gold-400">Status</th>
              </tr>
            </thead>
            <tbody>
              {worlds.map((world) => (
                <tr
                  key={world.id}
                  className="border-b border-stone-800 last:border-0 hover:bg-stone-800/50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gold-400">
                    {world.name ?? `World ${world.id}`}
                  </td>
                  <td className="px-4 py-3 text-text-secondary">{world.country ?? '???'}</td>
                  <td className="px-4 py-3 text-text-secondary">{world.members ? 'Members' : 'Free'}</td>
                  <td className="px-4 py-3">
                    {world.botting ? (
                      <span className="inline-flex items-center gap-1.5 rounded border border-moss/50 bg-moss/10 px-2 py-0.5 text-xs text-moss">
                        Botting allowed
                      </span>
                    ) : (
                      <span className="text-xs text-text-muted">No botting</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right text-text-primary">{formatNumber(world.players)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={world.botting ? '/map/world-2' : '/map'}
                      className={
                        'text-xs hover:underline ' +
                        (world.botting ? 'text-moss' : 'text-gold-400')
                      }
                    >
                      View map
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={
                        'inline-flex items-center gap-1.5 ' + (world.online ? 'text-moss' : 'text-rune-red')
                      }
                    >
                      <span className={'w-2 h-2 rounded-full ' + (world.online ? 'bg-moss' : 'bg-rune-red')} />
                      {world.online ? 'Online' : 'Offline'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loadError && worlds.some((world) => world.botting) && (
        <p className="mt-6 text-sm text-text-secondary">
          Worlds keep separate databases: a character on a botting world has its
          own items, skills and hiscores, and nothing moves between worlds in
          either direction.
        </p>
      )}
    </Container>
  )
}
