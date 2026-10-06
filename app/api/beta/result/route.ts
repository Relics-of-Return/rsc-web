import type { NextRequest } from 'next/server'

import { proxyAdminPost } from '@/lib/admin-proxy'

// BFF: proxy rsc-www's POST /api/beta/result (a player's works/broken for one
// checklist item). rsc-www takes the player from the session cookie.
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  return proxyAdminPost(request, '/api/beta/result')
}
