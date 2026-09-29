import { NextResponse, type NextRequest } from 'next/server'

import { isRefusal, requireStaff } from '@/lib/landscape/auth'
import { listSectors } from '@/lib/landscape/store'

// Every sector with anything in it, for the editor's navigator.
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await requireStaff(request)

  if (isRefusal(session)) {
    return session
  }

  try {
    return NextResponse.json({ sectors: listSectors() })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'failed to read the world' },
      { status: 500 },
    )
  }
}
