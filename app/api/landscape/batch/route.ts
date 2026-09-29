import { NextResponse, type NextRequest } from 'next/server'

import { isRefusal, requireStaff } from '@/lib/landscape/auth'
import { parseEdits, parseItems, parseNpcs, parseObjects } from '@/lib/landscape/parse'
import {
  InvalidSave,
  SectorConflict,
  SectorNotFound,
  readSectors,
  saveSectors,
  type SaveRequest,
} from '@/lib/landscape/store'

/**
 * Several sectors at once: the editor's map is a window onto the world, and
 * an edit that runs across a sector boundary has to be read, and saved, as
 * one thing.
 *
 * GET ?sectors=0.50.50,0.51.50 reads them from one parse of the world.
 * POST { sectors: [...] } saves them all or none, each checked against the
 * version it was loaded at.
 */
export const dynamic = 'force-dynamic'

/** More than a screenful at the smallest zoom, fewer than would hurt. */
const LIMIT = 64

function isCoordinate(value: number, max: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= max
}

export async function GET(request: NextRequest) {
  const session = await requireStaff(request)

  if (isRefusal(session)) {
    return session
  }

  const refs = (request.nextUrl.searchParams.get('sectors') ?? '')
    .split(',')
    .filter(Boolean)
    .map((part) => {
      const [plane, x, y] = part.split('.').map((n) => Number(n))

      return { plane, x, y }
    })

  if (!refs.length || refs.length > LIMIT) {
    return NextResponse.json(
      { error: `ask for 1 to ${LIMIT} sectors, as plane.x.y separated by commas` },
      { status: 400 },
    )
  }

  if (
    refs.some(
      (ref) =>
        !isCoordinate(ref.plane, 3) || !isCoordinate(ref.x, 255) || !isCoordinate(ref.y, 255),
    )
  ) {
    return NextResponse.json({ error: 'a sector is out of range' }, { status: 400 })
  }

  try {
    return NextResponse.json({ sectors: readSectors(refs) })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'failed to read the sectors' },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  const session = await requireStaff(request)

  if (isRefusal(session)) {
    return session
  }

  let body: { sectors?: unknown }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'expected JSON' }, { status: 400 })
  }

  if (!Array.isArray(body.sectors) || !body.sectors.length || body.sectors.length > LIMIT) {
    return NextResponse.json(
      { error: `sectors must list 1 to ${LIMIT} sectors` },
      { status: 400 },
    )
  }

  let requests: SaveRequest[]

  try {
    requests = body.sectors.map((raw: Record<string, unknown>) => {
      const plane = Number(raw.plane)
      const x = Number(raw.x)
      const y = Number(raw.y)

      if (!isCoordinate(plane, 3) || !isCoordinate(x, 255) || !isCoordinate(y, 255)) {
        throw new Error('each sector needs a plane, x and y')
      }

      if (typeof raw.version !== 'string' || !raw.version) {
        throw new Error(`the version of ${plane}.${x}.${y} is missing - reload it`)
      }

      const edits = parseEdits(raw.edits ?? [])
      const objects = parseObjects(raw.objects, 'objects')
      const wallObjects = parseObjects(raw.wallObjects, 'wallObjects')
      const npcs = parseNpcs(raw.npcs)
      const items = parseItems(raw.items)

      if (!edits.length && !objects && !wallObjects && !npcs && !items) {
        throw new Error(`nothing to save in ${plane}.${x}.${y}`)
      }

      return { plane, x, y, version: raw.version, edits, objects, wallObjects, npcs, items }
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'bad save' },
      { status: 400 },
    )
  }

  try {
    const result = saveSectors(requests)

    return NextResponse.json({ saved: true, ...result, by: session.username })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'failed to save the world'

    if (error instanceof SectorConflict) {
      return NextResponse.json({ error: message, sectors: error.sectors }, { status: 409 })
    }

    const status =
      error instanceof SectorNotFound ? 404 : error instanceof InvalidSave ? 400 : 500

    return NextResponse.json({ error: message }, { status })
  }
}
