import { proxyGet } from '@/lib/admin-proxy'

// BFF: expose rsc-www's /api/config (server name, browser client URL, skill list).
export const dynamic = 'force-dynamic'

export async function GET() {
  return proxyGet('/api/config')
}
