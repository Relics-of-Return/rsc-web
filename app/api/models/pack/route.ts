import { NextResponse, type NextRequest } from 'next/server'

import { isRefusal, requireStaff } from '@/lib/landscape/auth'
import { canWrite, pack, type ObjectDetails } from '@/lib/models/store'

// runs rsc-client's pack-cache: every model source, texture and object
// definition into the archives the game loads. first, every model source no
// object uses gets a scenery object of its own - or, given { model, details },
// that one source gets an object as described - so it can be placed in the
// World Editor, which picks the new archives up by itself. players see a
// change after they reload the game page; new objects need the worlds
// restarted too
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const session = await requireStaff(request)

  if (isRefusal(session)) {
    return session
  }

  if (!canWrite()) {
    return NextResponse.json({ error: 'the model editor is read-only here' }, { status: 403 })
  }

  const body = (await request.json().catch(() => ({}))) as {
    model?: string
    details?: ObjectDetails
  }

  console.log(
    `[model editor] ${session.username} packed the cache${body.model ? `, adding ${body.model} as an object` : ''}`,
  )

  const result = await pack(body.model, body.details)

  return NextResponse.json(result, { status: result.ok ? 200 : 500 })
}
