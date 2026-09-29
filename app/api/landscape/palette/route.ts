import { NextResponse, type NextRequest } from 'next/server'

import { isRefusal, requireStaff } from '@/lib/landscape/auth'
import type { LandscapePalette } from '@/lib/landscape/types'

// Names and colours for everything the inspector can set: the 256 terrain
// colours, the overlay table, and the object/wall-object names. Static for a
// given build, but staff-gated like the rest of the editor.
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
  const objects = require('@2003scape/rsc-data/config/objects.json')
  const wallObjects = require('@2003scape/rsc-data/config/wall-objects.json')
  const npcs = require('@2003scape/rsc-data/config/npcs.json')
  const items = require('@2003scape/rsc-data/config/items.json')
  /* eslint-enable @typescript-eslint/no-require-imports */

  const overlays: LandscapePalette['overlays'] = {}

  for (const [id, def] of Object.entries<Record<string, unknown>>(tileOverlays)) {
    overlays[id] = {
      name: String(def.name ?? `overlay ${id}`),
      colour: String(def.colour ?? 'rgb(0, 0, 0)'),
      blocked: !!def.blocked,
    }
  }

  const names = (table: Record<string, { name?: string }>) => {
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
