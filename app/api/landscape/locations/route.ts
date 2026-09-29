import { NextResponse, type NextRequest } from 'next/server'

import { isRefusal, requireStaff } from '@/lib/landscape/auth'
import { readAllLocations } from '@/lib/landscape/store'

// every scenery object and door in the world, so the 3D view can show the
// sectors around the one being edited
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await requireStaff(request)

  if (isRefusal(session)) {
    return session
  }

  try {
    return NextResponse.json(readAllLocations())
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'could not read the spawns' },
      { status: 500 },
    )
  }
}
