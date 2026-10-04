import type { NextRequest } from 'next/server'

import { proxyAdminGet, proxyAdminPost } from '@/lib/admin-proxy'

export const dynamic = 'force-dynamic'

// BFF for the wiki article editor. ?id= reads one article, ?revisions= its
// snapshots, nothing lists them all; POST creates, updates, deletes or
// restores. rsc-www checks the caller is an administrator on every one.
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')
  const slug = request.nextUrl.searchParams.get('slug')
  const revisions = request.nextUrl.searchParams.get('revisions')
  const params = new URLSearchParams()

  if (id !== null) params.set('id', id)
  if (slug !== null) params.set('slug', slug)
  if (revisions !== null) params.set('revisions', revisions)

  return proxyAdminGet(
    request,
    `/api/admin/guides${params.size ? `?${params.toString()}` : ''}`,
  )
}

export async function POST(request: NextRequest) {
  return proxyAdminPost(request, '/api/admin/guides')
}