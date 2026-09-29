import { NextResponse, type NextRequest } from 'next/server'

import { getWwwApiUrl } from '@/lib/www'

// BFF: proxy rsc-www's /api/news (paginated list or single article by id).
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id')
  const page = request.nextUrl.searchParams.get('page') ?? '0'

  const params = new URLSearchParams({ page })
  if (id !== null) {
    params.set('id', id)
  }

  try {
    const res = await fetch(`${getWwwApiUrl()}/api/news?${params.toString()}`, {
      cache: 'no-store',
    })

    if (!res.ok) {
      return NextResponse.json(
        { error: 'failed to fetch news' },
        { status: res.status },
      )
    }

    const data = await res.json()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json(
      { error: 'the website API is unreachable' },
      { status: 502 },
    )
  }
}
