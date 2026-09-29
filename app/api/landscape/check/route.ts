import { NextResponse, type NextRequest } from 'next/server'

import { isRefusal, requireStaff } from '@/lib/landscape/auth'
import { checkWorld } from '@/lib/landscape/store'

// the whole world, swept for likely mistakes (see checkWorld)
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await requireStaff(request)

  if (isRefusal(session)) {
    return session
  }

  try {
    return NextResponse.json(checkWorld())
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'could not check the world' },
      { status: 500 },
    )
  }
}
