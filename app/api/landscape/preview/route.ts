import { NextResponse, type NextRequest } from 'next/server'

import { isRefusal, requireStaff } from '@/lib/landscape/auth'
import { readPreviewBundle } from '@/lib/landscape/store'

// the game client's renderer, bundled on its own for the editor's 3D view
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await requireStaff(request)

  if (isRefusal(session)) {
    return session
  }

  const bundle = readPreviewBundle()

  if (!bundle) {
    return new NextResponse(
      'console.error("the 3D preview is not built - run npm run build-preview in rsc-client")',
      { status: 404, headers: { 'content-type': 'text/javascript' } },
    )
  }

  return new NextResponse(new Uint8Array(bundle), {
    headers: { 'content-type': 'text/javascript', 'cache-control': 'no-store' },
  })
}
