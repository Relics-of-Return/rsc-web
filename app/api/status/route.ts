import { proxyGet } from '@/lib/admin-proxy'

// BFF: proxy rsc-www's /api/status so the browser never talks to it directly
// and no CORS/session-cookie issues arise.
export const dynamic = 'force-dynamic'

export async function GET() {
  return proxyGet('/api/status')
}
