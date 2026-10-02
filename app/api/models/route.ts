import { NextResponse, type NextRequest } from 'next/server'

import { isRefusal, requireStaff } from '@/lib/landscape/auth'
import { canWrite, listSources, listTextures } from '@/lib/models/store'

// the model editor's catalogue: every model source in rsc-client/assets/models
// and this project's textures, in id order. the game's own models come from
// the archives the page loads through /api/landscape/archive
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await requireStaff(request)

  if (isRefusal(session)) {
    return session
  }

  try {
    return NextResponse.json({
      sources: listSources(),
      textures: listTextures(),
      canWrite: canWrite(),
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'could not list the models' },
      { status: 500 },
    )
  }
}
