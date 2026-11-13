import type { NextRequest } from 'next/server'

import { cookieOf, proxyGet } from '@/lib/admin-proxy'

// BFF: proxy rsc-www's GET /api/session. The browser's session cookie is
// forwarded so rsc-www can resolve it. Response: { username, rank }.
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  return proxyGet('/api/session', { headers: cookieOf(request) })
}
