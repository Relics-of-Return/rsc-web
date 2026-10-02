import { NextResponse, type NextRequest } from 'next/server'

import { isRefusal, requireStaff } from '@/lib/landscape/auth'
import { LightingConflict, readLighting, saveLighting } from '@/lib/landscape/lighting-store'

// HD graphics' lighting areas (rsc-client/assets/hd/environments.json), for
// the world editor to draw on the map and change
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await requireStaff(request)

  if (isRefusal(session)) {
    return session
  }

  try {
    return NextResponse.json(readLighting())
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'could not read the lighting areas' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  const session = await requireStaff(request)

  if (isRefusal(session)) {
    return session
  }

  let body: Record<string, unknown>

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'expected JSON' }, { status: 400 })
  }

  if (typeof body.version !== 'string' || !body.version) {
    return NextResponse.json(
      { error: 'version is required - reload the lighting areas' },
      { status: 400 },
    )
  }

  try {
    const result = saveLighting(body.areas, body.version)

    return NextResponse.json({ saved: true, ...result, by: session.username })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'could not save the lighting areas'

    return NextResponse.json(
      { error: message },
      { status: error instanceof LightingConflict ? 409 : 400 },
    )
  }
}
