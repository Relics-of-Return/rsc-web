import { NextResponse, type NextRequest } from 'next/server'

import { isRefusal, requireStaff } from '@/lib/landscape/auth'
import { readPreviewGround } from '@/lib/landscape/store'

// the client's ground textures at the sizes it keeps as files (2048 and
// 4096 square), for the 3D preview's Ground texture size setting. the
// renderer falls back to the ones it carries when one isn't there
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await requireStaff(request)

  if (isRefusal(session)) {
    return session
  }

  const size = Number(request.nextUrl.searchParams.get('size'))
  const name = request.nextUrl.searchParams.get('name') ?? ''
  const data = readPreviewGround(size, name)

  if (!data) {
    return NextResponse.json({ error: `no ground texture ${name} at ${size}` }, { status: 404 })
  }

  return new NextResponse(new Uint8Array(data), {
    headers: { 'content-type': 'image/webp', 'cache-control': 'no-store' },
  })
}
