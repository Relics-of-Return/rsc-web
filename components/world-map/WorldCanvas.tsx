'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { keyOf, type SectorKey } from '@/components/world-map/useWorldEdits'
import {
  collisionOf,
  nearestEdge,
  type Edge,
  type Segment,
} from '@/lib/landscape/geometry'
import {
  MIN_REGION_X,
  MIN_REGION_Y,
  PLANE_HEIGHT,
  SECTOR_SIZE,
  gameToTile,
  readDiagonal,
  type ItemSpawn,
  type LandscapePalette,
  type NpcSpawn,
  type PlacedObject,
  type SectorTiles,
} from '@/lib/landscape/types'

/**
 * The editor's map: a window onto the world that scrolls across sector
 * boundaries and zooms from a whole town down to single tiles, drawn from
 * the live working copies so an edit shows the moment it is made.
 *
 * It renders itself rather than reusing `@2003scape/rsc-world-map`, which
 * packs a pre-baked image of the world into its bundle: right for browsing,
 * useless for editing, because it cannot show a change nobody has baked.
 *
 * Orientation is the world map's own: west on the left, north at the top.
 * Game x grows westward, so it runs right to left on screen; rsc-landscape's
 * reversed tile array makes column 0 of a sector its westernmost tile.
 *
 * Edges follow mudclient: a "vertical" wall sits on a tile's east edge and a
 * "horizontal" one on its north edge (rsc-landscape's painter draws them at
 * x + 2 and y), and a wall object's direction is 0 north edge, 1 east edge,
 * 2 `\`, 3 `/` (mudclient#createModel).
 *
 * Each sector is painted once into an image of its own and reused until its
 * contents, the layers shown or the zoom change, so scrolling only moves
 * pictures around.
 */

export interface MapView {
  plane: number
  /** The game coordinates at the middle of the map; y carries the plane. */
  x: number
  y: number
  /** Screen pixels per tile: one of ZOOMS. */
  zoom: number
}

export const ZOOMS = [3, 4, 6, 8, 10, 12, 14, 18, 24, 32] as const

/** What the map draws, each of which can be switched off. */
export interface MapLayers {
  /** The ground by height rather than by colour. */
  heights: boolean
  overlays: boolean
  walls: boolean
  roofs: boolean
  scenery: boolean
  doors: boolean
  npcs: boolean
  items: boolean
  /** Tiles and edges nobody can walk through. */
  blocked: boolean
  grid: boolean
}

export const DEFAULT_LAYERS: MapLayers = {
  heights: false,
  overlays: true,
  walls: true,
  roofs: false,
  scenery: true,
  doors: true,
  npcs: true,
  items: true,
  blocked: false,
  grid: true,
}

export interface SectorLayer {
  ref: { plane: number; x: number; y: number }
  tiles: SectorTiles
  objects: PlacedObject[]
  wallObjects: PlacedObject[]
  npcs: NpcSpawn[]
  items: ItemSpawn[]
  /** Tiles whose landscape differs from what was loaded. */
  changed: ReadonlySet<number>
}

/** A tile the pointer is on, with the edge nearest it when the tool wants edges. */
export interface PointerTile {
  x: number
  y: number
  edge?: Edge
  /** The eyedropper: take what is here rather than change it. */
  alt: boolean
  shift: boolean
}

/** A rectangle of tiles, x and y its smallest corner. */
export interface TileArea {
  x: number
  y: number
  width: number
  height: number
}

/**
 * The tiles a brush of this width covers, centred on a tile the way the
 * outline under the pointer shows it. A round brush trims the corners off.
 */
export function footprint(
  at: { x: number; y: number },
  size: number,
  round = false,
): { x: number; y: number }[] {
  const reach = Math.floor((size - 1) / 2)
  const middle = (size - 1) / 2 - reach
  const limit = (size / 2 - 0.25) ** 2
  const out: { x: number; y: number }[] = []

  for (let dx = -reach; dx < size - reach; dx++) {
    for (let dy = -reach; dy < size - reach; dy++) {
      if (!round || (dx - middle) ** 2 + (dy - middle) ** 2 <= limit) {
        out.push({ x: at.x + dx, y: at.y + dy })
      }
    }
  }

  return out
}

const VOID = '#07090b'
const LOADING = '#161a1e'
const BOUNDARY = 'rgba(232, 191, 74, 0.35)'
const GRID = 'rgba(255, 255, 255, 0.06)'
const WALL = '#e8d9a0'
const DIAGONAL = '#c9a227'
const SCENERY = '#7ad1ff'
const DOOR = '#ff9d3c'
const NPC = '#ff5cf0'
const ITEM = '#ffe14d'
const LEGACY = '#d68cff'
const SELECTED = '#ffffff'
const HOVER = 'rgba(255, 214, 90, 0.95)'
const BRUSH = 'rgba(255, 214, 90, 0.28)'
const CHANGED = '#ff5c5c'
const MISMATCH = '#ff3030'
const BLOCKED = 'rgba(255, 40, 40, 0.38)'
const BLOCKED_EDGE = '#ff3b3b'
const ROOF = 'rgba(160, 90, 255, 0.35)'
const AREA = '#4dd2ff'
const CAMERA = '#ffffff'

const DOOR_EDGES = ['north', 'east', 'backslash', 'slash'] as const

type Rgb = [number, number, number]

interface Colours {
  terrain: Rgb[]
  overlays: Map<number, Rgb>
}

function rgbOf(css: string): Rgb {
  if (css.startsWith('#')) {
    const n = Number.parseInt(css.slice(1), 16)

    return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff]
  }

  const parts = css.match(/\d+/g)

  return parts ? [Number(parts[0]), Number(parts[1]), Number(parts[2])] : [255, 0, 255]
}

const coloursCache = new WeakMap<LandscapePalette, Colours>()

function coloursOf(palette: LandscapePalette): Colours {
  let colours = coloursCache.get(palette)

  if (!colours) {
    colours = {
      terrain: palette.terrain.map(rgbOf),
      overlays: new Map(
        Object.entries(palette.overlays).map(([id, overlay]) => [
          Number(id),
          rgbOf(overlay.colour),
        ]),
      ),
    }

    coloursCache.set(palette, colours)
  }

  return colours
}

/**
 * Elevation as colour: deep blue at sea level through green and ochre to
 * white on the peaks, the way a relief map reads.
 */
const HEIGHT_RAMP: [number, Rgb][] = [
  [0, [20, 40, 110]],
  [40, [40, 120, 80]],
  [100, [120, 160, 60]],
  [160, [190, 150, 70]],
  [210, [150, 100, 70]],
  [254, [245, 245, 245]],
]

function heightColour(elevation: number): Rgb {
  for (let i = 1; i < HEIGHT_RAMP.length; i++) {
    const [top, to] = HEIGHT_RAMP[i]

    if (elevation <= top) {
      const [bottom, from] = HEIGHT_RAMP[i - 1]
      const t = (elevation - bottom) / (top - bottom)

      return [0, 1, 2].map((c) => Math.round(from[c] + (to[c] - from[c]) * t)) as Rgb
    }
  }

  return HEIGHT_RAMP[HEIGHT_RAMP.length - 1][1]
}

function drawEdge(
  context: CanvasRenderingContext2D,
  left: number,
  top: number,
  scale: number,
  edge: 'north' | 'east' | 'slash' | 'backslash',
) {
  context.beginPath()

  if (edge === 'north') {
    context.moveTo(left, top)
    context.lineTo(left + scale, top)
  } else if (edge === 'east') {
    context.moveTo(left + scale, top)
    context.lineTo(left + scale, top + scale)
  } else if (edge === 'slash') {
    context.moveTo(left, top + scale)
    context.lineTo(left + scale, top)
  } else {
    context.moveTo(left, top)
    context.lineTo(left + scale, top + scale)
  }

  context.stroke()
}

let groundScratch: HTMLCanvasElement | null = null

/** One sector, painted at one zoom into an image of its own. */
function paintSector(
  layer: SectorLayer,
  palette: LandscapePalette,
  colours: Colours,
  show: MapLayers,
  scale: number,
  dpr: number,
): HTMLCanvasElement {
  const { ref, tiles, objects, wallObjects, npcs, items, changed } = layer
  const pixels = Math.round(SECTOR_SIZE * scale * dpr)
  const canvas = document.createElement('canvas')

  canvas.width = pixels
  canvas.height = pixels

  const context = canvas.getContext('2d')!
  const upper = ref.plane === 1 || ref.plane === 2
  const minX = (ref.x - MIN_REGION_X) * SECTOR_SIZE
  const minY = (ref.y - MIN_REGION_Y) * SECTOR_SIZE + ref.plane * PLANE_HEIGHT
  // a game coordinate to this image's pixels (x runs right to left)
  const left = (gameX: number) => (minX + SECTOR_SIZE - gameX) * scale
  const top = (gameY: number) => (gameY - minY) * scale

  // the ground at a pixel a tile, stretched square: an overlay covers the
  // ground entirely, the way roads and water cover terrain in the game, and
  // upper floors have no visible ground
  const ground = new ImageData(SECTOR_SIZE, SECTOR_SIZE)

  for (let column = 0; column < SECTOR_SIZE; column++) {
    for (let row = 0; row < SECTOR_SIZE; row++) {
      const index = column * SECTOR_SIZE + row
      const overlay = show.overlays ? tiles.overlay[index] : 0
      const rgb: Rgb = show.heights
        ? heightColour(tiles.elevation[index])
        : overlay
          ? (colours.overlays.get(overlay) ?? [255, 0, 255])
          : upper
            ? [0, 0, 0]
            : (colours.terrain[tiles.colour[index]] ?? [0, 0, 0])
      const at = (row * SECTOR_SIZE + column) * 4

      ground.data[at] = rgb[0]
      ground.data[at + 1] = rgb[1]
      ground.data[at + 2] = rgb[2]
      ground.data[at + 3] = 255
    }
  }

  groundScratch ??= Object.assign(document.createElement('canvas'), {
    width: SECTOR_SIZE,
    height: SECTOR_SIZE,
  })
  groundScratch.getContext('2d')!.putImageData(ground, 0, 0)
  context.imageSmoothingEnabled = false
  context.drawImage(groundScratch, 0, 0, pixels, pixels)

  context.scale(dpr, dpr)
  context.lineCap = 'square'

  if (show.roofs) {
    context.fillStyle = ROOF

    for (let index = 0; index < tiles.wallRoof.length; index++) {
      if (tiles.wallRoof[index]) {
        context.fillRect(
          Math.floor(index / SECTOR_SIZE) * scale,
          (index % SECTOR_SIZE) * scale,
          scale,
          scale,
        )
      }
    }
  }

  if (show.walls) {
    context.lineWidth = Math.max(1, scale / 7)

    for (let column = 0; column < SECTOR_SIZE; column++) {
      for (let row = 0; row < SECTOR_SIZE; row++) {
        const index = column * SECTOR_SIZE + row
        const x = column * scale
        const y = row * scale

        context.strokeStyle = WALL

        if (tiles.wallHorizontal[index]) {
          drawEdge(context, x, y, scale, 'north')
        }

        if (tiles.wallVertical[index]) {
          drawEdge(context, x, y, scale, 'east')
        }

        const diagonal = readDiagonal(tiles.diagonal[index])

        if (diagonal.kind === 'diagonal') {
          context.strokeStyle = DIAGONAL
          drawEdge(context, x, y, scale, diagonal.direction === '/' ? 'slash' : 'backslash')
        } else if (diagonal.kind === 'object' && scale >= 6) {
          const inset = scale * 0.3

          context.fillStyle = LEGACY
          context.fillRect(x + inset, y + inset, scale - inset * 2, scale - inset * 2)
        }
      }
    }
  }

  if (show.blocked) {
    const collision = collisionOf(ref, tiles, objects, wallObjects, palette)

    context.fillStyle = BLOCKED

    for (const index of collision.tiles) {
      context.fillRect(
        Math.floor(index / SECTOR_SIZE) * scale,
        (index % SECTOR_SIZE) * scale,
        scale,
        scale,
      )
    }

    context.strokeStyle = BLOCKED_EDGE
    context.lineWidth = Math.max(1.5, scale / 5)

    for (const { a, b } of collision.edges as Segment[]) {
      context.beginPath()
      context.moveTo(left(a.x), top(a.y))
      context.lineTo(left(b.x), top(b.y))
      context.stroke()
    }
  }

  // scenery is drawn on its origin tile; a large object's full footprint is
  // not shown
  if (show.scenery && scale >= 6) {
    for (const object of objects) {
      const index = gameToTile(ref, object.x, object.y)

      if (index === null) {
        continue
      }

      const centreX = Math.floor(index / SECTOR_SIZE) * scale + scale / 2
      const centreY = (index % SECTOR_SIZE) * scale + scale / 2

      context.fillStyle = SCENERY
      context.beginPath()
      context.arc(centreX, centreY, scale / 4, 0, Math.PI * 2)
      context.fill()

      // the client draws scenery at the tile's facing, not the object's
      // (region-objects.js) — so the tick shows what players will see, and
      // a red ring marks an object whose server copy disagrees
      const facing = tiles.direction[index]

      if (facing !== object.direction) {
        context.strokeStyle = MISMATCH
        context.lineWidth = Math.max(1, scale / 9)
        context.beginPath()
        context.arc(centreX, centreY, scale / 2.4, 0, Math.PI * 2)
        context.stroke()
      }

      if (scale >= 10) {
        const angle = (facing / 8) * Math.PI * 2

        context.strokeStyle = '#0b2530'
        context.lineWidth = 1.5
        context.beginPath()
        context.moveTo(centreX, centreY)
        context.lineTo(
          centreX + Math.sin(angle) * (scale / 4),
          centreY - Math.cos(angle) * (scale / 4),
        )
        context.stroke()
      }
    }
  }

  if (show.doors) {
    context.strokeStyle = DOOR
    context.lineWidth = Math.max(1.5, scale / 3.5)

    for (const door of wallObjects) {
      const index = gameToTile(ref, door.x, door.y)

      if (index === null) {
        continue
      }

      drawEdge(
        context,
        Math.floor(index / SECTOR_SIZE) * scale,
        (index % SECTOR_SIZE) * scale,
        scale,
        DOOR_EDGES[door.direction] ?? 'north',
      )
    }
  }

  if (show.items && scale >= 4) {
    context.fillStyle = ITEM
    context.strokeStyle = '#3a2f00'
    context.lineWidth = 1

    for (const item of items) {
      const size = Math.max(3, scale / 3)
      const x = left(item.x + 1) + scale / 2 - size / 2
      const y = top(item.y) + scale / 2 - size / 2

      context.fillRect(x, y, size, size)
      context.strokeRect(x, y, size, size)
    }
  }

  if (show.npcs && scale >= 4) {
    context.fillStyle = NPC
    context.strokeStyle = '#3a0036'
    context.lineWidth = 1

    for (const npc of npcs) {
      const x = left(npc.x + 1) + scale / 2
      const y = top(npc.y) + scale / 2
      const r = Math.max(2.5, scale / 3)

      context.beginPath()
      context.moveTo(x, y - r)
      context.lineTo(x + r, y)
      context.lineTo(x, y + r)
      context.lineTo(x - r, y)
      context.closePath()
      context.fill()
      context.stroke()
    }
  }

  if (show.grid && scale >= 8) {
    context.strokeStyle = GRID
    context.lineWidth = 1

    for (let i = 1; i < SECTOR_SIZE; i++) {
      context.beginPath()
      context.moveTo(i * scale + 0.5, 0)
      context.lineTo(i * scale + 0.5, SECTOR_SIZE * scale)
      context.stroke()

      context.beginPath()
      context.moveTo(0, i * scale + 0.5)
      context.lineTo(SECTOR_SIZE * scale, i * scale + 0.5)
      context.stroke()
    }
  }

  if (changed.size) {
    context.strokeStyle = CHANGED
    context.lineWidth = 1

    for (const index of changed) {
      const x = Math.floor(index / SECTOR_SIZE) * scale
      const y = (index % SECTOR_SIZE) * scale

      if (scale >= 6) {
        context.strokeRect(x + 1.5, y + 1.5, scale - 3, scale - 3)
      } else {
        context.fillStyle = CHANGED
        context.fillRect(x, y, scale, scale)
      }
    }
  }

  return canvas
}

interface Painted {
  image: HTMLCanvasElement
  layer: SectorLayer
  palette: LandscapePalette
  show: MapLayers
  zoom: number
  dpr: number
}

/** Enough for a screenful at the smallest zoom, and some back. */
const PAINTED_LIMIT = 96

interface WorldCanvasProps {
  view: MapView
  onView: (view: MapView) => void
  /** The open sectors, drawn from their working copies. */
  layers: Map<SectorKey, SectorLayer>
  /** Which parts of the map to draw. */
  show: MapLayers
  /** Sectors being fetched. */
  loading: ReadonlySet<SectorKey>
  /** Whether anything is built at a sector at all. */
  exists: (key: SectorKey) => boolean
  palette: LandscapePalette
  selected: { x: number; y: number } | null
  /** Where the 3D view looks (x.5 is a tile's middle), and its heading. */
  camera?: { x: number; y: number; yaw: number } | null
  /**
   * What a drag does: 'select' clicks select and drags scroll, 'paint'
   * presses and drags stroke, 'area' drags out a rectangle.
   */
  mode: 'select' | 'paint' | 'area'
  /** Whether the tool works on tiles or on their edges (walls, doors). */
  pick?: 'tile' | 'edge'
  /** The brush under the pointer when painting: its width, and whether it is round. */
  brush?: { size: number; round: boolean }
  /** While a stroke is held still, repeat it this often (ms): raising ground. */
  repeat?: number
  /** A selected rectangle, outlined. */
  area?: TileArea | null
  /** Where a paste would land, outlined in place of the brush. */
  stamp?: TileArea | null
  /** Wander boxes to outline, for the NPCs on the selected tile. */
  boxes?: { minX: number; maxX: number; minY: number; maxY: number }[]
  /** The sectors in view changed: time to fetch any not open yet. */
  onVisible?: (keys: SectorKey[]) => void
  /** A click in select mode, or the start of a stroke in paint mode. */
  onPress: (tile: PointerTile) => void
  /** Each further tile a stroke reaches, in order, none skipped. */
  onDrag?: (tile: PointerTile) => void
  /** The stroke ended, so it is one undo step. */
  onRelease?: () => void
  /** The rectangle being dragged out, from where it started to where it is. */
  onArea?: (area: TileArea) => void
  onHover?: (tile: PointerTile | null) => void
}

/** The sectors a view shows, as refs. */
function sectorsInView(view: MapView, width: number, height: number) {
  const halfWidth = width / 2 / view.zoom
  const halfHeight = height / 2 / view.zoom
  const localY = view.y - view.plane * PLANE_HEIGHT

  const minX = Math.floor((view.x - halfWidth) / SECTOR_SIZE) + MIN_REGION_X
  const maxX = Math.floor((view.x + halfWidth) / SECTOR_SIZE) + MIN_REGION_X
  const minY = Math.floor((localY - halfHeight) / SECTOR_SIZE) + MIN_REGION_Y
  const maxY = Math.floor((localY + halfHeight) / SECTOR_SIZE) + MIN_REGION_Y

  const out: { plane: number; x: number; y: number }[] = []

  for (let x = minX; x <= maxX; x++) {
    for (let y = minY; y <= maxY; y++) {
      if (x >= 0 && y >= 0) {
        out.push({ plane: view.plane, x, y })
      }
    }
  }

  return out
}

/** Every tile on the straight line between two, both ends included. */
function lineOfTiles(from: { x: number; y: number }, to: { x: number; y: number }) {
  const out: { x: number; y: number }[] = []
  const steps = Math.max(Math.abs(to.x - from.x), Math.abs(to.y - from.y))

  for (let i = 0; i <= steps; i++) {
    const t = steps ? i / steps : 0
    const tile = {
      x: Math.round(from.x + (to.x - from.x) * t),
      y: Math.round(from.y + (to.y - from.y) * t),
    }
    const last = out[out.length - 1]

    if (!last || last.x !== tile.x || last.y !== tile.y) {
      out.push(tile)
    }
  }

  return out
}

function areaBetween(a: { x: number; y: number }, b: { x: number; y: number }): TileArea {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x) + 1,
    height: Math.abs(a.y - b.y) + 1,
  }
}

export function WorldCanvas(props: WorldCanvasProps) {
  const { view, onView, onVisible, mode } = props

  const wrapRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0, dpr: 1 })

  const latest = useRef({ props, size })
  const painted = useRef(new Map<SectorKey, Painted>())
  const hover = useRef<PointerTile | null>(null)
  const frame = useRef(0)

  useEffect(() => {
    latest.current = { props, size }
  })

  // the map fills its box; the box decides the size
  useEffect(() => {
    const wrap = wrapRef.current

    if (!wrap) {
      return
    }

    const observer = new ResizeObserver(([entry]) => {
      setSize({
        width: Math.round(entry.contentRect.width),
        height: Math.round(entry.contentRect.height),
        dpr: window.devicePixelRatio || 1,
      })
    })

    observer.observe(wrap)

    return () => observer.disconnect()
  }, [])

  // ## drawing

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    const { props: current, size: box } = latest.current

    if (!canvas || !context || !box.width || !box.height) {
      return
    }

    const { view: at, layers, show, loading, exists, palette, selected, camera } = current
    const { width, height, dpr } = box
    const zoom = at.zoom
    const colours = coloursOf(palette)

    // game coordinates to CSS pixels: x runs right to left
    const toX = (gameX: number) => width / 2 - (gameX - at.x) * zoom
    const toY = (gameY: number) => height / 2 + (gameY - at.y) * zoom
    // whole device pixels, so the sector images land crisp
    const snap = (value: number) => Math.round(value * dpr) / dpr

    context.setTransform(dpr, 0, 0, dpr, 0, 0)
    context.imageSmoothingEnabled = false
    context.fillStyle = VOID
    context.fillRect(0, 0, width, height)

    const span = SECTOR_SIZE * zoom
    const visible = sectorsInView(at, width, height)

    for (const ref of visible) {
      const key = keyOf(ref)
      const minX = (ref.x - MIN_REGION_X) * SECTOR_SIZE
      const minY = (ref.y - MIN_REGION_Y) * SECTOR_SIZE + ref.plane * PLANE_HEIGHT
      const left = snap(toX(minX + SECTOR_SIZE))
      const top = snap(toY(minY))
      const layer = layers.get(key)

      if (layer) {
        let entry = painted.current.get(key)

        if (
          !entry ||
          entry.layer.tiles !== layer.tiles ||
          entry.layer.objects !== layer.objects ||
          entry.layer.wallObjects !== layer.wallObjects ||
          entry.layer.npcs !== layer.npcs ||
          entry.layer.items !== layer.items ||
          entry.layer.changed !== layer.changed ||
          entry.palette !== palette ||
          entry.show !== show ||
          entry.zoom !== zoom ||
          entry.dpr !== dpr
        ) {
          entry = {
            image: paintSector(layer, palette, colours, show, zoom, dpr),
            layer,
            palette,
            show,
            zoom,
            dpr,
          }
        }

        // most recently used last, so the oldest go first
        painted.current.delete(key)
        painted.current.set(key, entry)

        context.drawImage(entry.image, left, top, span, span)
      } else if (loading.has(key) || exists(key)) {
        context.fillStyle = LOADING
        context.fillRect(left, top, span, span)
      }
    }

    while (painted.current.size > PAINTED_LIMIT) {
      painted.current.delete(painted.current.keys().next().value!)
    }

    // sector boundaries, and names once there is room for them
    context.strokeStyle = BOUNDARY
    context.lineWidth = 1
    context.font = '11px ui-monospace, monospace'
    context.textBaseline = 'top'

    for (const ref of visible) {
      if (!exists(keyOf(ref))) {
        continue
      }

      const minX = (ref.x - MIN_REGION_X) * SECTOR_SIZE
      const minY = (ref.y - MIN_REGION_Y) * SECTOR_SIZE + ref.plane * PLANE_HEIGHT
      const left = snap(toX(minX + SECTOR_SIZE))
      const top = snap(toY(minY))

      context.strokeRect(left + 0.5, top + 0.5, span, span)

      if (zoom >= 4) {
        const name = `m${ref.plane}${String(ref.x).padStart(2, '0')}${String(ref.y).padStart(2, '0')}`

        context.fillStyle = 'rgba(0, 0, 0, 0.55)'
        context.fillRect(left + 3, top + 3, context.measureText(name).width + 6, 15)
        context.fillStyle = 'rgba(232, 191, 74, 0.9)'
        context.fillText(name, left + 6, top + 5)
      }
    }

    /** A rectangle of tiles, outlined. */
    const outline = (
      area: TileArea,
      colour: string,
      lineWidth: number,
      dash: number[] = [],
    ) => {
      context.strokeStyle = colour
      context.lineWidth = lineWidth
      context.setLineDash(dash)
      context.strokeRect(
        toX(area.x + area.width) - lineWidth / 2,
        toY(area.y) - lineWidth / 2,
        area.width * zoom + lineWidth,
        area.height * zoom + lineWidth,
      )
      context.setLineDash([])
    }

    for (const box of current.boxes ?? []) {
      outline(
        { x: box.minX, y: box.minY, width: box.maxX - box.minX + 1, height: box.maxY - box.minY + 1 },
        NPC,
        1.5,
        [6, 4],
      )
    }

    if (current.area) {
      context.fillStyle = 'rgba(77, 210, 255, 0.12)'
      context.fillRect(
        toX(current.area.x + current.area.width),
        toY(current.area.y),
        current.area.width * zoom,
        current.area.height * zoom,
      )
      outline(current.area, AREA, 1.5, [5, 3])
    }

    const pointer = hover.current

    if (current.stamp) {
      context.fillStyle = 'rgba(255, 214, 90, 0.14)'
      context.fillRect(
        toX(current.stamp.x + current.stamp.width),
        toY(current.stamp.y),
        current.stamp.width * zoom,
        current.stamp.height * zoom,
      )
      outline(current.stamp, HOVER, 2, [6, 3])
    } else if (pointer) {
      if (current.pick === 'edge' && pointer.edge) {
        // the edge a wall or door would go on
        const x = toX(pointer.x + 1)
        const y = toY(pointer.y)
        const edge = pointer.edge

        context.strokeStyle = HOVER
        context.lineWidth = Math.max(3, zoom / 3)
        context.lineCap = 'round'

        if (edge === 'south') {
          drawEdge(context, x, y + zoom, zoom, 'north')
        } else if (edge === 'west') {
          drawEdge(context, x - zoom, y, zoom, 'east')
        } else {
          drawEdge(context, x, y, zoom, edge)
        }

        context.lineCap = 'butt'
        outline({ x: pointer.x, y: pointer.y, width: 1, height: 1 }, 'rgba(255, 214, 90, 0.35)', 1)
      } else if (current.mode === 'paint' && current.brush) {
        const tiles = footprint(pointer, current.brush.size, current.brush.round)

        context.fillStyle = BRUSH

        for (const tile of tiles) {
          context.fillRect(toX(tile.x + 1), toY(tile.y), zoom, zoom)
        }

        if (tiles.length === 1) {
          outline({ x: pointer.x, y: pointer.y, width: 1, height: 1 }, HOVER, 1.5)
        }
      } else {
        outline({ x: pointer.x, y: pointer.y, width: 1, height: 1 }, HOVER, 1.5)
      }
    }

    if (selected) {
      outline({ x: selected.x, y: selected.y, width: 1, height: 1 }, SELECTED, 2)
    }

    if (camera && Math.floor(camera.y / PLANE_HEIGHT) === at.plane) {
      const left = toX(camera.x)
      const top = toY(camera.y)

      if (left >= -20 && left <= width + 20 && top >= -20 && top <= height + 20) {
        // at yaw 0 the camera looks south; the cone spreads 30 degrees
        // either side of where it looks
        const heading = (camera.yaw / 1024) * Math.PI * 2
        const reach = Math.max(24, zoom * 4)

        context.fillStyle = 'rgba(255, 255, 255, 0.16)'
        context.strokeStyle = CAMERA
        context.lineWidth = 1.5
        context.beginPath()
        context.moveTo(left, top)

        for (const spread of [-Math.PI / 6, Math.PI / 6]) {
          context.lineTo(
            left - Math.sin(heading + spread) * reach,
            top + Math.cos(heading + spread) * reach,
          )
        }

        context.closePath()
        context.fill()
        context.stroke()

        context.fillStyle = CAMERA
        context.beginPath()
        context.arc(left, top, 3.5, 0, Math.PI * 2)
        context.fill()
      }
    }
  }, [])

  const schedule = useCallback(() => {
    if (frame.current) {
      return
    }

    frame.current = requestAnimationFrame(() => {
      frame.current = 0
      draw()
    })
  }, [draw])

  // anything the map shows may have changed
  useEffect(() => {
    schedule()
  })

  // the frame has to be forgotten as well as cancelled: in development React
  // runs this cleanup straight after mounting, and a stale id left behind
  // would make schedule() believe a frame is always on its way
  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current)
      frame.current = 0
    },
    [],
  )

  // tell the editor which sectors are in view, when that changes
  const visibleKeys = size.width
    ? sectorsInView(view, size.width, size.height).map(keyOf).join(',')
    : ''

  useEffect(() => {
    if (visibleKeys) {
      onVisible?.(visibleKeys.split(','))
    }
  }, [visibleKeys, onVisible])

  // ## input

  /** A pointer position on the map, in CSS pixels, and what is under it. */
  const locate = (event: {
    clientX: number
    clientY: number
    altKey: boolean
    shiftKey: boolean
  }) => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const { props: current, size: box } = latest.current
    const at = current.view
    // continuous game coordinates under the pointer
    const gameX = at.x - (x - box.width / 2) / at.zoom
    const gameY = at.y + (y - box.height / 2) / at.zoom
    const tile: PointerTile = {
      x: Math.floor(gameX),
      y: Math.floor(gameY),
      alt: event.altKey,
      shift: event.shiftKey,
    }

    if (current.pick === 'edge') {
      // across the tile as drawn: 0 at its west (left) side, 1 at its east
      const fx = 1 - (gameX - tile.x)
      const fy = gameY - tile.y

      tile.edge = nearestEdge(fx, fy, event.shiftKey)
    }

    return { x, y, tile }
  }

  const gesture = useRef<{
    kind: 'pending' | 'pan' | 'paint' | 'area'
    startX: number
    startY: number
    view: MapView
    first: PointerTile
    last: PointerTile
    timer: ReturnType<typeof setInterval> | 0
  } | null>(null)

  const endGesture = () => {
    const g = gesture.current

    if (g?.timer) {
      clearInterval(g.timer)
    }

    gesture.current = null

    return g
  }

  useEffect(() => () => void endGesture(), [])

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const point = locate(event)

    event.currentTarget.setPointerCapture(event.pointerId)
    event.currentTarget.focus()

    const pan = event.button === 1 || event.button === 2

    if (!pan && event.button !== 0) {
      return
    }

    endGesture()

    const kind = pan
      ? 'pan'
      : mode === 'paint' || (event.altKey && mode !== 'area')
        ? 'paint'
        : mode === 'area'
          ? 'area'
          : 'pending'

    gesture.current = {
      kind,
      startX: point.x,
      startY: point.y,
      view,
      first: point.tile,
      last: point.tile,
      timer: 0,
    }

    if (kind === 'paint') {
      props.onPress(point.tile)

      // the eyedropper takes one look; a held brush keeps working
      if (props.repeat && !point.tile.alt) {
        const g = gesture.current

        g.timer = setInterval(() => {
          latest.current.props.onDrag?.(g.last)
        }, props.repeat)
      }
    } else if (kind === 'area') {
      props.onArea?.(areaBetween(point.tile, point.tile))
    }
  }

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const point = locate(event)
    const tile = point.tile
    const g = gesture.current
    const last = hover.current

    if (!last || last.x !== tile.x || last.y !== tile.y || last.edge !== tile.edge) {
      hover.current = tile
      props.onHover?.(tile)
      schedule()
    }

    if (!g) {
      return
    }

    if (
      g.kind === 'pending' &&
      Math.hypot(point.x - g.startX, point.y - g.startY) >= 4
    ) {
      g.kind = 'pan'
    }

    if (g.kind === 'pan') {
      onView({
        ...g.view,
        x: g.view.x + (point.x - g.startX) / g.view.zoom,
        y: g.view.y - (point.y - g.startY) / g.view.zoom,
      })
    } else if (g.kind === 'area') {
      if (tile.x !== g.last.x || tile.y !== g.last.y) {
        g.last = tile
        props.onArea?.(areaBetween(g.first, tile))
      }
    } else if (
      g.kind === 'paint' &&
      !g.first.alt &&
      (tile.x !== g.last.x || tile.y !== g.last.y || tile.edge !== g.last.edge)
    ) {
      // a wall stroke keeps the kind of edge it started on
      const edge = g.first.edge

      for (const step of lineOfTiles(g.last, tile).slice(1)) {
        props.onDrag?.({ ...tile, ...step, edge })
      }

      g.last = { ...tile, edge }
    }
  }

  const onPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const g = endGesture()

    if (!g) {
      return
    }

    if (g.kind === 'pending') {
      props.onPress(locate(event).tile)
    } else if (g.kind === 'paint' || g.kind === 'area') {
      props.onRelease?.()
    }
  }

  // the wheel zooms the map, not the page - which takes a listener React
  // cannot give, since its own wheel listeners are passive. the point under
  // the pointer stays under it
  useEffect(() => {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    let travel = 0

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()

      // trackpads send a stream of small steps; a notch is about 100
      travel += event.deltaY

      if (Math.abs(travel) < 50) {
        return
      }

      const direction = travel < 0 ? 1 : -1

      travel = 0

      const { props: current, size: box } = latest.current
      const at = current.view
      const index = ZOOMS.indexOf(at.zoom as (typeof ZOOMS)[number])
      const zoom = ZOOMS[Math.max(0, Math.min(ZOOMS.length - 1, index + direction))]

      if (zoom === at.zoom) {
        return
      }

      const rect = canvas.getBoundingClientRect()
      const x = event.clientX - rect.left - box.width / 2
      const y = event.clientY - rect.top - box.height / 2
      const gameX = at.x - x / at.zoom
      const gameY = at.y + y / at.zoom

      current.onView({ ...at, zoom, x: gameX + x / zoom, y: gameY - y / zoom })
    }

    canvas.addEventListener('wheel', onWheel, { passive: false })

    return () => canvas.removeEventListener('wheel', onWheel)
  }, [])

  const onKeyDown = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
    const step = Math.max(4, Math.round(size.width / view.zoom / 6))
    const index = ZOOMS.indexOf(view.zoom as (typeof ZOOMS)[number])
    let next: MapView | null = null

    switch (event.key) {
      case 'ArrowLeft':
        next = { ...view, x: view.x + step }
        break
      case 'ArrowRight':
        next = { ...view, x: view.x - step }
        break
      case 'ArrowUp':
        next = { ...view, y: view.y - step }
        break
      case 'ArrowDown':
        next = { ...view, y: view.y + step }
        break
      case '+':
      case '=':
        next = { ...view, zoom: ZOOMS[Math.min(ZOOMS.length - 1, index + 1)] }
        break
      case '-':
      case '_':
        next = { ...view, zoom: ZOOMS[Math.max(0, index - 1)] }
        break
    }

    if (next) {
      event.preventDefault()
      onView(next)
    }
  }

  return (
    <div ref={wrapRef} className="relative aspect-square max-h-[80vh] w-full overflow-hidden rounded border border-stone-700 bg-black">
      <canvas
        ref={canvasRef}
        width={Math.max(1, Math.round(size.width * size.dpr))}
        height={Math.max(1, Math.round(size.height * size.dpr))}
        tabIndex={0}
        aria-label="Map of the world, west on the left and north at the top"
        data-view-x={view.x}
        data-view-y={view.y}
        data-zoom={view.zoom}
        className={
          'absolute inset-0 h-full w-full touch-none outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60 ' +
          (mode === 'select' ? 'cursor-default' : 'cursor-crosshair')
        }
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => void endGesture()}
        onPointerLeave={() => {
          hover.current = null
          props.onHover?.(null)
          schedule()
        }}
        onKeyDown={onKeyDown}
        onContextMenu={(event) => event.preventDefault()}
      />
    </div>
  )
}
