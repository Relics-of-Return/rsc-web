/**
 * HD graphics' lighting areas: the places that change the light the game's
 * Enhanced lighting draws with — the Wilderness's red haze, the desert's
 * glare, the dark underground. They're the `areas` of
 * rsc-client/assets/hd/environments.json (see src/gpu/environment.js there,
 * and docs/HD_RENDERER_117HD.md, A2), which the world editor draws and
 * edits on the map.
 *
 * The first area that matches where the player stands wins. x and y are the
 * server's tile coordinates, both ends included, and y carries the plane's
 * 944s — the same numbers the map shows.
 */

export type Rgb = [number, number, number]

export interface LightingArea {
  name: string
  /** 0 surface, 1-2 upstairs, 3 underground; a list for several; none for any. */
  plane?: number | number[]
  /** Tile ranges, both ends included. Without them the area is the whole plane. */
  x?: [number, number]
  y?: [number, number]
  /** Matches only the Black Hole's closed-in view (or only outside it, when false). */
  closedIn?: boolean
  /** 'none' keeps the dark around the region, as upstairs and underground. */
  sky?: 'none'
  /** Multiplies every colour. */
  tint?: Rgb
  /** Multiplies the sky's and the fog's colour. */
  haze?: Rgb
  /** Multiplies how strong the sun is. */
  sun?: number
  /** Light every point gets, added (negative darkens). */
  bias?: number
  /** How bright torches and fires are here, in place of the time of day's. */
  lightGain?: number
}

/** A rectangle of tiles, x and y its smallest corner, as the map's TileArea. */
export interface AreaRect {
  x: number
  y: number
  width: number
  height: number
}

export const PLANE_HEIGHT = 944

/** An area's rectangle on the map, or null if it has none (a whole plane). */
export function rectOf(area: LightingArea): AreaRect | null {
  if (!area.x || !area.y) {
    return null
  }

  return {
    x: area.x[0],
    y: area.y[0],
    width: area.x[1] - area.x[0] + 1,
    height: area.y[1] - area.y[0] + 1,
  }
}

/** The planes an area matches, or null for any. */
export function planesOf(area: LightingArea): number[] | null {
  if (area.plane === undefined) {
    return null
  }

  return Array.isArray(area.plane) ? area.plane : [area.plane]
}

/**
 * The area a tile is in, as the game finds it (Environment#findArea): the
 * first match, outside the Black Hole. -1 for none.
 */
export function areaAt(areas: LightingArea[], at: { x: number; y: number }): number {
  const plane = Math.max(0, Math.min(3, Math.floor(at.y / PLANE_HEIGHT)))

  return areas.findIndex((area) => {
    if (area.closedIn) {
      return false
    }

    const planes = planesOf(area)

    return (
      (!planes || planes.includes(plane)) &&
      (!area.x || (at.x >= area.x[0] && at.x <= area.x[1])) &&
      (!area.y || (at.y >= area.y[0] && at.y <= area.y[1]))
    )
  })
}

const NAME_LIMIT = 60

function finite(value: unknown, min: number, max: number, what: string): number {
  const n = Number(value)

  if (!Number.isFinite(n) || n < min || n > max) {
    throw new Error(`${what} must be between ${min} and ${max}`)
  }

  return Math.round(n * 1000) / 1000
}

function range(value: unknown, what: string): [number, number] {
  if (!Array.isArray(value) || value.length !== 2) {
    throw new Error(`${what} must be [from, to]`)
  }

  const from = Math.round(finite(value[0], 0, 4 * PLANE_HEIGHT, what))
  const to = Math.round(finite(value[1], 0, 4 * PLANE_HEIGHT, what))

  if (to < from) {
    throw new Error(`${what} runs backwards`)
  }

  return [from, to]
}

function colour(value: unknown, what: string): Rgb {
  if (!Array.isArray(value) || value.length !== 3) {
    throw new Error(`${what} must be three numbers`)
  }

  return value.map((part) => finite(part, 0, 3, what)) as Rgb
}

/**
 * An area as it may be saved: only the fields the game reads, each in
 * range. Throws with what is wrong.
 */
export function cleanArea(input: unknown, index: number): LightingArea {
  if (!input || typeof input !== 'object') {
    throw new Error(`area ${index + 1} is not an object`)
  }

  const raw = input as Record<string, unknown>
  const name = typeof raw.name === 'string' ? raw.name.trim().slice(0, NAME_LIMIT) : ''
  const label = name || `area ${index + 1}`

  if (!name) {
    throw new Error(`area ${index + 1} needs a name`)
  }

  const area: LightingArea = { name }

  if (raw.closedIn !== undefined) {
    area.closedIn = raw.closedIn === true
  }

  if (raw.plane !== undefined) {
    const planes = (Array.isArray(raw.plane) ? raw.plane : [raw.plane]).map((plane) =>
      Math.round(finite(plane, 0, 3, `${label}'s plane`)),
    )

    area.plane = planes.length === 1 ? planes[0] : [...new Set(planes)].sort()
  }

  if (raw.x !== undefined || raw.y !== undefined) {
    area.x = range(raw.x, `${label}'s x`)
    area.y = range(raw.y, `${label}'s y`)
  }

  if (raw.sky !== undefined) {
    if (raw.sky !== 'none') {
      throw new Error(`${label}'s sky can only be 'none'`)
    }

    area.sky = 'none'
  }

  if (raw.tint !== undefined) area.tint = colour(raw.tint, `${label}'s tint`)
  if (raw.haze !== undefined) area.haze = colour(raw.haze, `${label}'s haze`)
  if (raw.sun !== undefined) area.sun = finite(raw.sun, 0, 3, `${label}'s sun`)
  if (raw.bias !== undefined) area.bias = finite(raw.bias, -1, 1, `${label}'s bias`)
  if (raw.lightGain !== undefined) area.lightGain = finite(raw.lightGain, 0, 3, `${label}'s light gain`)

  return area
}

/** A colour as the editor's colour picker takes it: 1 is #808080's worth doubled. */
export function toHex(rgb: Rgb | undefined): string {
  const [r, g, b] = rgb ?? [1, 1, 1]
  const byte = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value * 127.5)))
      .toString(16)
      .padStart(2, '0')

  return `#${byte(r)}${byte(g)}${byte(b)}`
}

export function fromHex(hex: string): Rgb {
  const n = Number.parseInt(hex.slice(1), 16)

  return [((n >> 16) & 0xff) / 127.5, ((n >> 8) & 0xff) / 127.5, (n & 0xff) / 127.5].map(
    (value) => Math.round(value * 100) / 100,
  ) as Rgb
}
