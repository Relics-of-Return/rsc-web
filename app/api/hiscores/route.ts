import { NextResponse, type NextRequest } from 'next/server'

import { getWwwApiUrl } from '@/lib/www'

// BFF: proxy rsc-www's /api/hiscores (skill rankings with pagination).
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const skill = request.nextUrl.searchParams.get('skill') ?? 'overall'
  const page = request.nextUrl.searchParams.get('page') ?? '0'

  try {
    const res = await fetch(
      `${getWwwApiUrl()}/api/hiscores?skill=${encodeURIComponent(skill)}&page=${encodeURIComponent(page)}`,
      { cache: 'no-store' },
    )

    if (!res.ok) {
      return NextResponse.json(
        { error: 'failed to fetch hiscores' },
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
