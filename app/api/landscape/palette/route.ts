import { NextResponse, type NextRequest } from 'next/server'

import { readDefinitions } from '@/lib/definitions'
import { isRefusal, requireStaff } from '@/lib/landscape/auth'
import type { LandscapePalette } from '@/lib/landscape/types'

// Names and colours for everything the inspector can set: the 256 terrain
// colours, the overlay table, and the object/wall-object names. The names are
// read from disk each time they change, so an object the model editor adds
// shows up without a restart. Staff-gated like the rest of the editor.
export const dynamic = 'force-dynamic'

// the client's six roof definitions (config85.jag: GameData.roofHeight and
// roofNumVertices), named after the texture each is filled with
const ROOFS = [
  { id: 1, name: 'Tiled roof' },
  { id: 2, name: 'Plank roof' },
  { id: 3, name: 'Stone roof' },
  { id: 4, name: 'Leaf roof' },
  { id: 5, name: 'Marble roof' },
  { id: 6, name: 'Canvas roof' },
]

export async function GET(request: NextRequest) {
  const session = await requireStaff(request)

  if (isRefusal(session)) {
    return session
  }

  /* eslint-disable @typescript-eslint/no-require-imports */
  const { tileOverlays } = require('@2003scape/rsc-landscape')
  const terrainColours = require('@2003scape/rsc-landscape/src/terrain-colours')
  // what the server walks by: overlay n is its tile n - 1. the landscape
  // library's own table disagrees for mud floor (and logs), which it calls
  // walkable while the server won't let anyone onto it
  const serverTiles: { blocked?: boolean }[] = require('@2003scape/rsc-data/config/tiles')
  /* eslint-enable @typescript-eslint/no-require-imports */
  type Definition = Record<string, unknown> & { name?: string }
  const objects = readDefinitions<Definition>('objects')
  const wallObjects = readDefinitions<Definition>('wall-objects')
  const npcs = readDefinitions<Definition>('npcs')
  const items = readDefinitions<Definition>('items')

  const overlays: LandscapePalette['overlays'] = {}

  for (const [id, def] of Object.entries<Record<string, unknown>>(tileOverlays)) {
    overlays[id] = {
      name: String(def.name ?? `overlay ${id}`),
      colour: String(def.colour ?? 'rgb(0, 0, 0)'),
      blocked: serverTiles[Number(id) - 1] ? !!serverTiles[Number(id) - 1].blocked : !!def.blocked,
    }
  }

  const names = (table: Record<string, { name?: string }> | { name?: string }[]) => {
    const out: Record<string, string> = {}

    for (const [id, def] of Object.entries(table)) {
      out[id] = def?.name ?? `#${id}`
    }

    return out
  }

  const objectInfo: LandscapePalette['objectInfo'] = {}

  for (const [id, def] of Object.entries<Record<string, unknown>>(objects)) {
    objectInfo[id] = {
      width: Number(def.width ?? 1),
      height: Number(def.height ?? 1),
      type: (def.type as LandscapePalette['objectInfo'][string]['type']) ?? 'blocked',
    }
  }

  const wallInfo: LandscapePalette['wallInfo'] = {}

  for (const [id, def] of Object.entries<Record<string, unknown>>(wallObjects)) {
    wallInfo[id] = { blocked: !!def.blocked, invisible: !!def.invisible }
  }

  const palette: LandscapePalette = {
    terrain: terrainColours.rgb,
    overlays,
    objects: names(objects),
    wallObjects: names(wallObjects),
    objectInfo,
    wallInfo,
    roofs: ROOFS,
    npcs: names(npcs),
    items: names(items),
  }

  return NextResponse.json(palette)
}
