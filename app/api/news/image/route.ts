import { NextResponse, type NextRequest } from 'next/server'

import { getWwwApiUrl } from '@/lib/www'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get('name')

  if (!name) {
    return NextResponse.json({ error: 'missing news image name' }, { status: 400 })
  }

  try {
    const response = await fetch(
      `${getWwwApiUrl()}/api/news/image?name=${encodeURIComponent(name)}`,
      { cache: 'no-store' },
    )

    if (!response.ok) {
      return NextResponse.json(
        { error: response.status === 404 ? 'news image not found' : 'unable to load news image' },
        { status: response.status },
      )
    }

    return new NextResponse(await response.arrayBuffer(), {
      headers: {
        'content-type': response.headers.get('content-type') ?? 'application/octet-stream',
        'cache-control': 'public, max-age=31536000, immutable',
        'x-content-type-options': 'nosniff',
      },
    })
  } catch {
    return NextResponse.json({ error: 'the website API is unreachable' }, { status: 502 })
  }
}
