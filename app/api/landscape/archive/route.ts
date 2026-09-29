import { NextResponse, type NextRequest } from 'next/server'

import { isRefusal, requireStaff } from '@/lib/landscape/auth'
import { readPreviewArchive } from '@/lib/landscape/store'

// the game archives the 3D preview needs: the client's art, and the world as
// the server has it saved. only names on the store's list are served
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await requireStaff(request)

  if (isRefusal(session)) {
    return session
  }

  const name = request.nextUrl.searchParams.get('name') ?? ''

  try {
    const data = readPreviewArchive(name)

    if (!data) {
      return NextResponse.json({ error: `not an archive the preview uses: ${name}` }, { status: 404 })
    }

    return new NextResponse(new Uint8Array(data), {
      headers: {
        'content-type': 'application/octet-stream',
        // the map changes on every save, so never serve a stale one
        'cache-control': 'no-store',
      },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'could not read the archive' },
      { status: 500 },
    )
  }
}
