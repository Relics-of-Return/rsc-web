import type { NextRequest } from 'next/server'

import { proxyAdminPost } from '@/lib/admin-proxy'

export const dynamic = 'force-dynamic'

// BFF for wiki article image uploads. rsc-www checks the caller is an
// administrator and that the bytes really are the image type they claim.
export async function POST(request: NextRequest) {
  return proxyAdminPost(request, '/api/admin/guides/image')
}