import { proxyGet } from '@/lib/admin-proxy'

// BFF: proxy rsc-www's /api/players (live player positions for map).
//
// `?world=N` picks which world's positions to read. Each world keeps its own
// data server, so this is not a filter — it decides which one rsc-www asks.
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const world = new URL(request.url).searchParams.get('world')
  const query = world && /^\d+$/.test(world) ? `?world=${world}` : ''

  // rsc-server sends positions every five seconds, so every map viewer can
  // share one answer for that long
  return proxyGet(`/api/players${query}`, { revalidate: 5 })
}
