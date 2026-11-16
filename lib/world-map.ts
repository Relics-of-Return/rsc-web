/**
 * Coordinate helpers for the RuneScape Classic world map.
 *
 * `@2003scape/rsc-world-map` draws every plane as an image in which one game
 * tile is three pixels and the x axis runs east-to-west (mirrored). The site
 * gives it the dev stage's baked planes (public/world-map), which keep the
 * library's west edge and run further east, to Solmara's negative x.
 */

/** Pixel x of game x 0: the library's own 2448px width, kept by the bake. */
export const MAP_X_ORIGIN = 2448

/** Width of a baked plane image (sectors 22..64), in pixels. */
export const MAP_IMAGE_WIDTH = 6192

/** Height of a rendered plane image, in pixels. */
export const MAP_IMAGE_HEIGHT = 2736

/** Pixels per game tile. */
export const TILE_SIZE = 3

/**
 * Game-coordinate height of a single plane — rsc-server's
 * `world.planeElevation`. Player `y` carries `plane * 944` on top of the
 * plane-local coordinate, which is how the game encodes upstairs/dungeons.
 */
export const PLANE_ELEVATION = 944

/** Offsets the library uses so a tile lines up with the rendered landscape. */
const X_OFFSET = 2
const Y_OFFSET = 1

/** A position in world-map image pixels, plus the plane it belongs to. */
export interface MapPoint {
  x: number
  y: number
  plane: number
}

/**
 * Converts in-game coordinates to world-map image pixels.
 *
 * `y` is expected to include the plane offset (`plane * 944`), as reported by
 * rsc-server. When an explicit `plane` disagrees with that encoding the `y` is
 * treated as already plane-local, so both conventions land in the right place.
 */
export function gameToMap(x: number, y: number, plane?: number): MapPoint {
  const encodedPlane = Math.floor(y / PLANE_ELEVATION)
  const resolvedPlane = plane === undefined || !Number.isFinite(plane) ? encodedPlane : plane
  const localY = encodedPlane === resolvedPlane ? y - resolvedPlane * PLANE_ELEVATION : y

  return {
    x: MAP_X_ORIGIN - x * TILE_SIZE - X_OFFSET,
    y: localY * TILE_SIZE - Y_OFFSET,
    plane: resolvedPlane,
  }
}

/** Whether a converted point actually falls inside the rendered map image. */
export function isOnMap({ x, y, plane }: MapPoint): boolean {
  return (
    plane >= 0 &&
    plane <= 3 &&
    x >= 0 &&
    x < MAP_IMAGE_WIDTH &&
    y >= 0 &&
    y < MAP_IMAGE_HEIGHT
  )
}

/** Human-readable name for a plane level, used in marker tooltips. */
export function planeLabel(plane: number): string {
  switch (plane) {
    case 0:
      return 'Surface'
    case 1:
      return 'Upstairs'
    case 2:
      return 'Top floor'
    case 3:
      return 'Underground'
    default:
      return `Plane ${plane}`
  }
}
