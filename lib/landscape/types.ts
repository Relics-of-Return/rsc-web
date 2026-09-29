/**
 * Shared shapes for the world editor.
 *
 * Tile data crosses the wire columnar rather than as 2304 objects per sector:
 * one array per field, indexed `x * 48 + y`. A sector is ~100KB that way
 * instead of megabytes, and the canvas renderer wants flat arrays anyway.
 */

/** Tiles along each edge of a sector. */
export const SECTOR_SIZE = 48

/** Tiles in a sector. */
export const SECTOR_TILES = SECTOR_SIZE * SECTOR_SIZE

/**
 * Diagonals and scenery share one buffer in the archive format, which is why
 * a tile can carry one or the other but never both:
 *
 *   1..11999      a `/` diagonal, value is its overlay
 *   12000..47999  a `\` diagonal, value is overlay + 12000
 *   48000+        scenery, value is objectId + 48001
 */
export const DIAGONAL_NW_SE = 12000
export const OBJECT_BASE = 48001

/** Where a sector sits, and what it is called in the archives. */
export interface SectorRef {
  /** Archive entry name, e.g. `m04847`. */
  name: string
  plane: number
  x: number
  y: number
  /** Whether it lives in the members half of the archives. */
  members: boolean
}

/** One sector's tiles, columnar. Every array is SECTOR_TILES long. */
export interface SectorTiles {
  /** Terrain palette index, 0-255. */
  colour: number[]
  /** Terrain height, 0-255. */
  elevation: number[]
  /** Overlay id — road, water, floors. 0 is none. */
  overlay: number[]
  /** Which way scenery on this tile faces, 0-7. */
  direction: number[]
  /** Wall overlay ids, 0 for none. */
  wallVertical: number[]
  wallHorizontal: number[]
  wallRoof: number[]
  /**
   * The shared diagonal/scenery buffer, stored raw so the client can present
   * whichever of the two a tile actually holds without a second array.
   */
  diagonal: number[]
}

/**
 * Something the server spawns: a piece of scenery (tree, rock, fishing spot)
 * or a wall object (door, gate, fence). These live in rsc-server's
 * data/locations/*.json, not in the landscape archives — the archives' own
 * `.loc` scenery is a leftover the server never spawns, and only two sectors
 * in the whole world have one.
 *
 * Coordinates are game coordinates, `y` including `plane * 944`, exactly as
 * the server stores them.
 */
export interface PlacedObject {
  id: number
  /** 0-7 for scenery; wall objects use 0-3. */
  direction: number
  x: number
  y: number
}

/**
 * Where an NPC appears, and the box it wanders in (rsc-server's
 * locations/npcs.json). Like everything else, y carries plane * 944.
 */
export interface NpcSpawn {
  id: number
  x: number
  y: number
  minX: number
  maxX: number
  minY: number
  maxY: number
}

/** An item lying on the ground, and how long it takes to come back, in ms. */
export interface ItemSpawn {
  id: number
  /** Present only for stacks of more than one. */
  amount?: number
  respawn: number
  x: number
  y: number
}

export interface SectorData extends SectorRef {
  tiles: SectorTiles
  objects: PlacedObject[]
  wallObjects: PlacedObject[]
  /** NPCs whose spawn point is in the sector. */
  npcs: NpcSpawn[]
  items: ItemSpawn[]
}

/** A single tile's editable state, as the inspector works with it. */
export interface TileEdit {
  /** Index into the columnar arrays: `x * 48 + y`. */
  index: number
  colour: number
  elevation: number
  overlay: number
  direction: number
  wallVertical: number
  wallHorizontal: number
  wallRoof: number
  diagonal: number
}

/**
 * What a save sends: only the tiles that actually moved, and — when the
 * sector's objects were touched — the complete list of objects inside it,
 * which replaces whatever the sector held before.
 */
export interface SectorSave {
  plane: number
  x: number
  y: number
  edits: TileEdit[]
  objects?: PlacedObject[]
  wallObjects?: PlacedObject[]
  npcs?: NpcSpawn[]
  items?: ItemSpawn[]
}

/**
 * The sector grid starts here rather than at 0 — the first populated sector
 * is (48, 37). Confirmed against rsc-landscape's own getGameCoords on all
 * 785,664 tiles in the world.
 */
export const MIN_REGION_X = 48
export const MIN_REGION_Y = 37

/** Game-coordinate height of one plane; `y` carries `plane * 944`. */
export const PLANE_HEIGHT = 944

/**
 * The game coordinates of a tile, from its index in the columnar arrays.
 *
 * The x axis is reversed inside a sector: rsc-landscape builds its tile
 * array and then reverses it, so array column 0 is the tile with the
 * highest game x. Checked against the real object placements — under this
 * mapping 3.9% of objects sit on blocked tiles (fishing spots, mostly); with
 * the axis the other way round it is 15.9%.
 */
export function tileToGame(
  sector: { plane: number; x: number; y: number },
  index: number,
): { x: number; y: number } {
  const column = Math.floor(index / SECTOR_SIZE)
  const row = index % SECTOR_SIZE

  return {
    x: (sector.x - MIN_REGION_X) * SECTOR_SIZE + (SECTOR_SIZE - 1 - column),
    y:
      (sector.y - MIN_REGION_Y) * SECTOR_SIZE +
      row +
      sector.plane * PLANE_HEIGHT,
  }
}

/** The inverse: a tile index, or null when the point is in another sector. */
export function gameToTile(
  sector: { plane: number; x: number; y: number },
  x: number,
  y: number,
): number | null {
  const localX = x - (sector.x - MIN_REGION_X) * SECTOR_SIZE
  const localY =
    y - sector.plane * PLANE_HEIGHT - (sector.y - MIN_REGION_Y) * SECTOR_SIZE

  if (
    localX < 0 ||
    localX >= SECTOR_SIZE ||
    localY < 0 ||
    localY >= SECTOR_SIZE
  ) {
    return null
  }

  return (SECTOR_SIZE - 1 - localX) * SECTOR_SIZE + localY
}

/** Which sector holds a game coordinate. */
export function sectorOfGame(
  x: number,
  y: number,
): { plane: number; x: number; y: number } {
  const plane = Math.max(0, Math.min(3, Math.floor(y / PLANE_HEIGHT)))
  const localY = y - plane * PLANE_HEIGHT

  return {
    plane,
    x: Math.floor(x / SECTOR_SIZE) + MIN_REGION_X,
    y: Math.floor(localY / SECTOR_SIZE) + MIN_REGION_Y,
  }
}

/** Everything the inspector needs to name what it is showing. */
export interface LandscapePalette {
  /** 256 CSS colours, indexed by a tile's `colour`. */
  terrain: string[]
  /** Overlay id -> name and colour. */
  overlays: Record<string, { name: string; colour: string; blocked: boolean }>
  /** Object id -> name, for the scenery picker. */
  objects: Record<string, string>
  /** Wall object id -> name, for the wall pickers. */
  wallObjects: Record<string, string>
  /**
   * Object id -> footprint and what it does to movement: `blocked` scenery
   * stops you, `unblocked` does not, doors block while closed.
   */
  objectInfo: Record<
    string,
    { width: number; height: number; type: 'blocked' | 'unblocked' | 'closed-door' | 'open-door' }
  >
  /** Wall object id -> whether it stops you, and whether it is drawn. */
  wallInfo: Record<string, { blocked: boolean; invisible: boolean }>
  /** The roof definitions a tile's `wallRoof` points at, 1-based. */
  roofs: { id: number; name: string }[]
  /** NPC id -> name. */
  npcs: Record<string, string>
  /** Item id -> name. */
  items: Record<string, string>
}

/** Reads the diagonal/scenery buffer into something the UI can show. */
export function readDiagonal(value: number): {
  kind: 'none' | 'diagonal' | 'object'
  direction: '/' | '\\' | null
  overlay: number
  objectId: number | null
} {
  if (value >= OBJECT_BASE - 1) {
    return {
      kind: 'object',
      direction: null,
      overlay: 0,
      objectId: value - OBJECT_BASE,
    }
  }

  if (value >= DIAGONAL_NW_SE) {
    return {
      kind: 'diagonal',
      direction: '\\',
      overlay: value - DIAGONAL_NW_SE,
      objectId: null,
    }
  }

  if (value > 0) {
    return { kind: 'diagonal', direction: '/', overlay: value, objectId: null }
  }

  return { kind: 'none', direction: null, overlay: 0, objectId: null }
}

/** The inverse, for writing the buffer back. */
export function writeDiagonal(
  kind: 'none' | 'diagonal' | 'object',
  direction: '/' | '\\',
  overlay: number,
  objectId: number,
): number {
  if (kind === 'object') {
    return objectId + OBJECT_BASE
  }

  if (kind === 'diagonal' && overlay > 0) {
    return direction === '\\' ? overlay + DIAGONAL_NW_SE : overlay
  }

  return 0
}
