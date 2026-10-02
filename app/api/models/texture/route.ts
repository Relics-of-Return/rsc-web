import { NextResponse, type NextRequest } from 'next/server'

import { isRefusal, requireStaff } from '@/lib/landscape/auth'
import { ModelNotFound, readTexture } from '@/lib/models/store'

// one of this project's textures (rsc-client/assets/textures), as its PNG, so
// the editor shows a texture before it has been packed
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await requireStaff(request)

  if (isRefusal(session)) {
    return session
  }

  try {
    const png = readTexture(request.nextUrl.searchParams.get('name') ?? '')

    return new NextResponse(new Uint8Array(png), {
      headers: { 'content-type': 'image/png', 'cache-control': 'no-store' },
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'could not read the texture' },
      { status: error instanceof ModelNotFound ? 404 : 500 },
    )
  }
}
