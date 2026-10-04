import { NextResponse, type NextRequest } from 'next/server'

import { getWwwApiUrl } from '@/lib/www'

// Serves a wiki article's uploaded image. The bytes live in rsc-www's uploads
// table; this passes them through for the editor's preview and any page on
// the site that shows an article.
export const dynamic = 'force-dynamic'

const NAME = /^guide\/[a-f0-9]{32}\.(png|jpe?g|gif|webp)$/

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get('name') ?? ''

  if (!NAME.test(name)) {
    return NextResponse.json({ error: 'invalid guide image' }, { status: 400 })
  }

  try {
    const res = await fetch(
      `${getWwwApiUrl()}/api/guides/image?name=${encodeURIComponent(name)}`,
      { cache: 'no-store' },
    )

    if (!res.ok) {
      return NextResponse.json({ error: 'guide image not found' }, { status: res.status })
    }

    return new NextResponse(await res.arrayBuffer(), {
      headers: {
        'content-type': res.headers.get('content-type') ?? 'image/png',
        'cache-control': 'public, max-age=3600',
        'x-content-type-options': 'nosniff',
      },
    })
  } catch {
    return NextResponse.json({ error: 'the website API is unreachable' }, { status: 502 })
  }
}