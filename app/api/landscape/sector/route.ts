import { NextResponse, type NextRequest } from 'next/server'

import { isRefusal, requireStaff } from '@/lib/landscape/auth'
import {
  InvalidSave,
  SectorConflict,
  SectorNotFound,
  readSector,
  saveSector,
} from '@/lib/landscape/store'
import { parseEdits, parseObjects } from '@/lib/landscape/parse'
import type { PlacedObject, TileEdit } from '@/lib/landscape/types'

/**
 * One sector's tiles, and the save that writes them back.
 *
 * A save rebuilds all four archives and writes them to both the server's copy
 * and the client's, so it is deliberately a whole-sector operation rather
 * than a per-tile one — there is no cheaper unit in this format.
 */
export const dynamic = 'force-dynamic'

function coords(request: NextRequest) {
  const params = request.nextUrl.searchParams

  return {
    plane: Number.parseInt(params.get('plane') ?? '', 10),
    x: Number.parseInt(params.get('x') ?? '', 10),
    y: Number.parseInt(params.get('y') ?? '', 10),
  }
}

export async function GET(request: NextRequest) {
  const session = await requireStaff(request)

  if (isRefusal(session)) {
    return session
  }

  const { plane, x, y } = coords(request)

  if (!Number.isFinite(plane) || !Number.isFinite(x) || !Number.isFinite(y)) {
    return NextResponse.json(
      { error: 'plane, x and y are required' },
      { status: 400 },
    )
  }

  try {
    const sector = readSector(plane, x, y)

    if (!sector) {
      return NextResponse.json(
        { error: `no sector at plane ${plane}, ${x}, ${y}` },
        { status: 404 },
      )
    }

    return NextResponse.json(sector)
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'failed to read the sector',
      },
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

  const plane = Number(body.plane)
  const x = Number(body.x)
  const y = Number(body.y)

  if (!Number.isFinite(plane) || !Number.isFinite(x) || !Number.isFinite(y)) {
    return NextResponse.json(
      { error: 'plane, x and y are required' },
      { status: 400 },
    )
  }

  if (typeof body.version !== 'string' || !body.version) {
    return NextResponse.json(
      { error: 'version is required - reload the sector' },
      { status: 400 },
    )
  }

  let edits: TileEdit[]
  let objects: PlacedObject[] | undefined
  let wallObjects: PlacedObject[] | undefined

  try {
    edits = parseEdits(body.edits ?? [])
    objects = parseObjects(body.objects, 'objects')
    wallObjects = parseObjects(body.wallObjects, 'wallObjects')
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'bad save' },
      { status: 400 },
    )
  }

  if (!edits.length && !objects && !wallObjects) {
    return NextResponse.json({ error: 'nothing to save' }, { status: 400 })
  }

  try {
    const result = saveSector({
      plane,
      x,
      y,
      version: body.version,
      edits,
      objects,
      wallObjects,
    })

    return NextResponse.json({ saved: true, ...result, by: session.username })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'failed to save the world'

    const status =
      error instanceof SectorConflict
        ? 409
        : error instanceof SectorNotFound
          ? 404
          : error instanceof InvalidSave
            ? 400
            : 500

    return NextResponse.json({ error: message }, { status })
  }
}
