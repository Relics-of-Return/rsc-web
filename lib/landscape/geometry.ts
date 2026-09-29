import {
  PLANE_HEIGHT,
  SECTOR_SIZE,
  gameToTile,
  readDiagonal,
  sectorOfGame,
  writeDiagonal,
  type ItemSpawn,
  type LandscapePalette,
  type NpcSpawn,
  type PlacedObject,
  type SectorTiles,
} from '@/lib/landscape/types'

/**
 * The world's geometry, as the editor's tools need it: which edge of a tile
 * a wall sits on, how much ground an object covers, what stops a player, and
 * how a piece of the map turns and mirrors.
 *
 * Everything is in game coordinates. Game x grows westward, so on the
 * editor's map — west on the left, north at the top — x runs right to left
 * and y runs downward.
 */

// ## edges

/** A side of a tile, or one of its diagonals, as the map shows them. */
export type Edge = 'north' | 'south' | 'east' | 'west' | 'slash' | 'backslash'

/**
 * Where a wall on an edge is stored. A tile holds its own north and east
 * edges (`wallHorizontal`, `wallVertical`) and its diagonal; its south edge is
 * the north edge of the tile below, its west edge the east edge of the tile
 * to the west — which, x growing westward, is the tile at x + 1.
 */
export function edgeOwner(
  tile: { x: number; y: number },
  edge: Edge,
): { x: number; y: number; field: 'wallHorizontal' | 'wallVertical' | 'diagonal' } {
  switch (edge) {
    case 'north':
      return { x: tile.x, y: tile.y, field: 'wallHorizontal' }
    case 'south':
      return { x: tile.x, y: tile.y + 1, field: 'wallHorizontal' }
    case 'east':
      return { x: tile.x, y: tile.y, field: 'wallVertical' }
    case 'west':
      return { x: tile.x + 1, y: tile.y, field: 'wallVertical' }
    default:
      return { x: tile.x, y: tile.y, field: 'diagonal' }
  }
}

/**
 * The edge nearest a point inside a tile. `fx` and `fy` run 0 to 1 across the
 * tile as the map draws it, from its west (left) and north (top) sides.
 * With `diagonal`, the nearer of the two diagonals instead.
 */
export function nearestEdge(fx: number, fy: number, diagonal: boolean): Edge {
  if (diagonal) {
    return Math.abs(fx + fy - 1) < Math.abs(fx - fy) ? 'slash' : 'backslash'
  }

  const distances: [Edge, number][] = [
    ['north', fy],
    ['south', 1 - fy],
    ['west', fx],
    ['east', 1 - fx],
  ]

  return distances.reduce((best, next) => (next[1] < best[1] ? next : best))[0]
}

/**
 * The value a tile field takes for a wall of this type on this edge. Wall
 * object 0 is the plain stone wall, the commonest there is: the archive
 * stores a wall as its id + 1, and keeps 0 for "none".
 */
export function wallValue(edge: Edge, wall: number): number {
  return edge === 'slash' || edge === 'backslash'
    ? writeDiagonal('diagonal', edge === 'slash' ? '/' : '\\', wall + 1, 0)
    : wall + 1
}

/**
 * A door's (wall object's) direction for an edge, and the tile it goes on:
 * 0 is a north edge, 1 an east edge, 2 `\` and 3 `/` (mudclient#createModel).
 */
export function doorPlacement(
  tile: { x: number; y: number },
  edge: Edge,
): { x: number; y: number; direction: number } {
  switch (edge) {
    case 'north':
      return { ...tile, direction: 0 }
    case 'south':
      return { x: tile.x, y: tile.y + 1, direction: 0 }
    case 'east':
      return { ...tile, direction: 1 }
    case 'west':
      return { x: tile.x + 1, y: tile.y, direction: 1 }
    case 'backslash':
      return { ...tile, direction: 2 }
    default:
      return { ...tile, direction: 3 }
  }
}

// ## segments

/** Two tile corners, in game coordinates: corner (x, y) is tile (x, y)'s north-east corner. */
export interface Segment {
  a: { x: number; y: number }
  b: { x: number; y: number }
}

// a tile spans x..x+1 and y..y+1 in corner coordinates; its east side is at
// x (x grows westward) and its north side at y
const SEGMENT_OF: Record<Exclude<Edge, 'south' | 'west'>, (x: number, y: number) => Segment> = {
  north: (x, y) => ({ a: { x, y }, b: { x: x + 1, y } }),
  east: (x, y) => ({ a: { x, y }, b: { x, y: y + 1 } }),
  // on the map `/` climbs from the bottom-left (west, south) corner to the
  // top-right (east, north) one; `\` falls from the top-left to the bottom-right
  slash: (x, y) => ({ a: { x: x + 1, y: y + 1 }, b: { x, y } }),
  backslash: (x, y) => ({ a: { x: x + 1, y }, b: { x, y: y + 1 } }),
}

export function segmentOf(
  tile: { x: number; y: number },
  edge: 'north' | 'east' | 'slash' | 'backslash',
): Segment {
  return SEGMENT_OF[edge](tile.x, tile.y)
}

/** The inverse: which tile's field a segment is, whichever way round it was given. */
export function edgeOfSegment(segment: Segment): {
  x: number
  y: number
  edge: 'north' | 'east' | 'slash' | 'backslash'
} {
  const { a, b } = segment
  const x = Math.min(a.x, b.x)
  const y = Math.min(a.y, b.y)

  if (a.y === b.y) {
    return { x, y, edge: 'north' }
  }

  if (a.x === b.x) {
    return { x, y, edge: 'east' }
  }

  return { x, y, edge: Math.sign(b.x - a.x) === Math.sign(b.y - a.y) ? 'slash' : 'backslash' }
}

const DOOR_EDGES = ['north', 'east', 'backslash', 'slash'] as const

export function doorSegment(door: { x: number; y: number; direction: number }): Segment {
  return segmentOf(door, DOOR_EDGES[door.direction] ?? 'north')
}

export function doorOfSegment(segment: Segment): { x: number; y: number; direction: number } {
  const { x, y, edge } = edgeOfSegment(segment)

  return { x, y, direction: DOOR_EDGES.indexOf(edge) }
}

// ## footprints

/**
 * The tiles a scenery object covers. The client sizes it by the facing of the
 * tile it stands on, not by the object's own (region-objects.js): facing 0
 * or 4 takes the definition's width by height, anything else the other way.
 * Its origin is the corner with the smallest x and y.
 */
export function footprintOf(
  object: { id: number; x: number; y: number },
  facing: number,
  palette: LandscapePalette,
): { x: number; y: number; width: number; height: number } {
  const info = palette.objectInfo[String(object.id)]
  const width = info?.width ?? 1
  const height = info?.height ?? 1
  const turned = facing !== 0 && facing !== 4

  return {
    x: object.x,
    y: object.y,
    width: turned ? height : width,
    height: turned ? width : height,
  }
}

// ## what stops a player

/**
 * One sector's collision, as the client builds it (World#removeObject2,
 * #_setObjectAdjacency_from4, and blocked overlays): tiles nobody can stand
 * on, and edges nobody can cross. Scenery reaching in from a neighbouring
 * sector is not counted — the map only needs to show a sector's own.
 */
export interface Collision {
  /** Tile indices that cannot be entered. */
  tiles: Set<number>
  /** Blocking edges, as segments. */
  edges: Segment[]
}

export function collisionOf(
  sector: { plane: number; x: number; y: number },
  tiles: SectorTiles,
  objects: PlacedObject[],
  wallObjects: PlacedObject[],
  palette: LandscapePalette,
): Collision {
  const blocked = new Set<number>()
  const edges: Segment[] = []
  const minX = (sector.x - 48) * SECTOR_SIZE
  const minY = (sector.y - 37) * SECTOR_SIZE + sector.plane * PLANE_HEIGHT
  const wallBlocks = (value: number) => !!value && !!palette.wallInfo[String(value - 1)]?.blocked

  for (let column = 0; column < SECTOR_SIZE; column++) {
    for (let row = 0; row < SECTOR_SIZE; row++) {
      const index = column * SECTOR_SIZE + row
      const tile = { x: minX + (SECTOR_SIZE - 1 - column), y: minY + row }

      if (tiles.overlay[index] && palette.overlays[String(tiles.overlay[index])]?.blocked) {
        blocked.add(index)
      }

      if (wallBlocks(tiles.wallHorizontal[index])) {
        edges.push(segmentOf(tile, 'north'))
      }

      if (wallBlocks(tiles.wallVertical[index])) {
        edges.push(segmentOf(tile, 'east'))
      }

      const diagonal = readDiagonal(tiles.diagonal[index])

      // a diagonal wall takes the whole tile (0x10 / 0x20 in the client)
      if (diagonal.kind === 'diagonal' && wallBlocks(diagonal.overlay)) {
        blocked.add(index)
        edges.push(segmentOf(tile, diagonal.direction === '/' ? 'slash' : 'backslash'))
      }
    }
  }

  for (const object of objects) {
    const index = gameToTile(sector, object.x, object.y)

    if (index === null) {
      continue
    }

    const facing = tiles.direction[index]
    const type = palette.objectInfo[String(object.id)]?.type

    if (type === 'blocked') {
      const area = footprintOf(object, facing, palette)

      for (let x = area.x; x < area.x + area.width; x++) {
        for (let y = area.y; y < area.y + area.height; y++) {
          const covered = gameToTile(sector, x, y)

          if (covered !== null) {
            blocked.add(covered)
          }
        }
      }
    } else if (type === 'closed-door') {
      // a door-like object shuts one side of its tile: facing 0 the east
      // side, then round clockwise on the map - 2 south, 4 west, 6 north
      const side = ({ 0: 'east', 2: 'south', 4: 'west', 6: 'north' } as const)[facing]

      if (side) {
        const owner = edgeOwner(object, side)

        edges.push(segmentOf(owner, owner.field === 'wallHorizontal' ? 'north' : 'east'))
      }
    }
  }

  for (const door of wallObjects) {
    if (palette.wallInfo[String(door.id)]?.blocked) {
      edges.push(doorSegment(door))
    }
  }

  return { tiles: blocked, edges }
}

// ## turning and mirroring

/** How a piece of the map is turned: quarter turns clockwise on the map, then mirrors. */
export interface Turn {
  /** 0-3 quarter turns clockwise, as the map shows it. */
  quarters: number
  /** Mirrored west to east. */
  mirror: boolean
  /** Mirrored north to south. */
  flip: boolean
}

export const NO_TURN: Turn = { quarters: 0, mirror: false, flip: false }

/**
 * A point in a width x height box, turned. The box is in corner coordinates
 * relative to its own north-east corner; the result is relative to the
 * turned box's, which is height x width after an odd number of quarters.
 */
export function turnPoint(
  point: { x: number; y: number },
  width: number,
  height: number,
  turn: Turn,
): { x: number; y: number } {
  // to screen orientation: right and down are positive
  let sx = -point.x
  let sy = point.y

  for (let i = 0; i < ((turn.quarters % 4) + 4) % 4; i++) {
    const next = -sy

    sy = sx
    sx = next
  }

  if (turn.mirror) {
    sx = -sx
  }

  if (turn.flip) {
    sy = -sy
  }

  // back, then shifted so the turned box starts at 0, 0
  const corners = [
    [0, 0],
    [width, 0],
    [0, height],
    [width, height],
  ].map(([x, y]) => {
    let cx = -x
    let cy = y

    for (let i = 0; i < ((turn.quarters % 4) + 4) % 4; i++) {
      const next = -cy

      cy = cx
      cx = next
    }

    return { x: -(turn.mirror ? -cx : cx), y: turn.flip ? -cy : cy }
  })

  const minX = Math.min(...corners.map((c) => c.x))
  const minY = Math.min(...corners.map((c) => c.y))

  return { x: -sx - minX, y: sy - minY }
}

export function turnedSize(width: number, height: number, turn: Turn) {
  return turn.quarters % 2 ? { width: height, height: width } : { width, height }
}

/** A tile's offset in the box, turned: its middle goes round, then back to a corner. */
export function turnTile(
  tile: { x: number; y: number },
  width: number,
  height: number,
  turn: Turn,
): { x: number; y: number } {
  const middle = turnPoint({ x: tile.x + 0.5, y: tile.y + 0.5 }, width, height, turn)

  return { x: Math.floor(middle.x), y: Math.floor(middle.y) }
}

/**
 * A scenery facing, turned: each quarter clockwise is two steps on (see
 * collisionOf - facing 0 shuts the east side, 2 the south, 4 the west).
 * Mirroring west-east swaps 0 and 4; north-south swaps 2 and 6.
 */
export function turnFacing(facing: number, turn: Turn): number {
  let next = facing + 2 * turn.quarters

  if (turn.mirror) {
    next = 4 - next
  }

  if (turn.flip) {
    next = 8 - next
  }

  return ((next % 8) + 8) % 8
}

// ## the clipboard

/** Everything in a rectangle of the map, relative to its north-east corner. */
export interface Clip {
  width: number
  height: number
  /** Per tile, relative: the landscape fields other than walls. */
  tiles: {
    x: number
    y: number
    colour: number
    elevation: number
    overlay: number
    direction: number
    wallRoof: number
  }[]
  /** Walls, as segments, with the wall-object id + 1 they hold. */
  walls: { segment: Segment; value: number }[]
  objects: PlacedObject[]
  wallObjects: { segment: Segment; id: number }[]
  npcs: NpcSpawn[]
  items: ItemSpawn[]
}

/** What a paste writes, in game coordinates, before it is split into sectors. */
export interface Stamp {
  area: { x: number; y: number; width: number; height: number }
  tiles: Clip['tiles']
  walls: { x: number; y: number; field: 'wallHorizontal' | 'wallVertical' | 'diagonal'; value: number }[]
  objects: PlacedObject[]
  wallObjects: PlacedObject[]
  npcs: NpcSpawn[]
  items: ItemSpawn[]
}

/**
 * A clip, turned and set down with its middle on a tile. Scenery keeps its
 * footprint in place: the origin of a turned object is whichever of its
 * tiles has the smallest x and y afterwards.
 */
export function stampOf(
  clip: Clip,
  at: { x: number; y: number },
  turn: Turn,
  palette: LandscapePalette,
): Stamp {
  const size = turnedSize(clip.width, clip.height, turn)
  const originX = at.x - Math.floor(size.width / 2)
  const originY = at.y - Math.floor(size.height / 2)
  const place = (point: { x: number; y: number }) => ({
    x: originX + point.x,
    y: originY + point.y,
  })
  const turnCorner = (point: { x: number; y: number }) =>
    place(turnPoint(point, clip.width, clip.height, turn))
  const turnSegment = (segment: Segment): Segment => ({
    a: turnCorner(segment.a),
    b: turnCorner(segment.b),
  })

  const tiles = clip.tiles.map((tile) => ({
    ...tile,
    ...place(turnTile(tile, clip.width, clip.height, turn)),
    direction: turnFacing(tile.direction, turn),
  }))

  const walls = clip.walls.map(({ segment, value }) => {
    const { x, y, edge } = edgeOfSegment(turnSegment(segment))
    const diagonal = edge === 'slash' || edge === 'backslash'
    const wall = diagonal ? readDiagonal(value).overlay : value

    return {
      x,
      y,
      field: diagonal ? ('diagonal' as const) : edge === 'north' ? ('wallHorizontal' as const) : ('wallVertical' as const),
      value: diagonal ? writeDiagonal('diagonal', edge === 'slash' ? '/' : '\\', wall, 0) : wall,
    }
  })

  const facingAt = new Map(clip.tiles.map((t) => [`${t.x},${t.y}`, t.direction]))

  const objects = clip.objects.map((object) => {
    // turn every tile of the footprint and take the new corner
    const facing = facingAt.get(`${object.x},${object.y}`) ?? object.direction
    const area = footprintOf(object, facing, palette)
    let minX = Infinity
    let minY = Infinity

    for (let x = area.x; x < area.x + area.width; x++) {
      for (let y = area.y; y < area.y + area.height; y++) {
        const turned = turnTile({ x, y }, clip.width, clip.height, turn)

        minX = Math.min(minX, turned.x)
        minY = Math.min(minY, turned.y)
      }
    }

    return {
      id: object.id,
      direction: turnFacing(object.direction, turn),
      ...place({ x: minX, y: minY }),
    }
  })

  const wallObjects = clip.wallObjects.map(({ segment, id }) => ({
    id,
    ...doorOfSegment(turnSegment(segment)),
  }))

  const npcs = clip.npcs.map((npc) => {
    const at = place(turnTile(npc, clip.width, clip.height, turn))
    // the wander box turns about the spawn point
    const corners = [
      { x: npc.minX - npc.x, y: npc.minY - npc.y },
      { x: npc.maxX - npc.x, y: npc.maxY - npc.y },
    ].map((offset) => {
      const turned = turnPoint(offset, 0, 0, turn)

      return { x: at.x + turned.x, y: at.y + turned.y }
    })

    return {
      ...npc,
      ...at,
      minX: Math.min(corners[0].x, corners[1].x),
      maxX: Math.max(corners[0].x, corners[1].x),
      minY: Math.min(corners[0].y, corners[1].y),
      maxY: Math.max(corners[0].y, corners[1].y),
    }
  })

  const items = clip.items.map((item) => ({
    ...item,
    ...place(turnTile(item, clip.width, clip.height, turn)),
  }))

  return {
    area: { x: originX, y: originY, ...size },
    tiles,
    walls,
    objects,
    wallObjects,
    npcs,
    items,
  }
}

/** The sector of a game coordinate, as a key the editor's maps use. */
export function sectorKeyOf(x: number, y: number): string {
  const ref = sectorOfGame(x, y)

  return `${ref.plane}.${ref.x}.${ref.y}`
}
