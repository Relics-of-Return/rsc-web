/**
 * The core of the World Editor's PCG tool, after Unreal Engine's Procedural
 * Content Generation framework: a graph is a stack of layers, and a layer
 * samples points on the ground, takes away the ones a mask covers, keeps some
 * by a seeded roll, picks an object for each and prunes the ones that overlap
 * (documentation/suggestions/PCG_WORLD_EDITOR.md).
 *
 * Everything here works on plain numbers. It has no imports and only type
 * syntax Node can strip, so `node --test` runs it straight from
 * test/pcg.test.mjs. pcg.ts wraps it with the editor's sectors and palette.
 *
 * A layer's steps, in order: Surface Sampler (or Copy Points), the landscape's
 * attributes, Spatial Noise, Distance, the density nodes, Difference, the
 * attribute filters, Density Filter, Select Points, the mesh selector,
 * Transform Points, Self Pruning, manual edits. A point culled on the way is
 * kept, with the step that culled it.
 *
 * Where Epic's pages name a setting and do not define it, the definition here
 * is this tool's own: the Difference's density functions, a point's steepness
 * on a tile grid, the noise's brightness and contrast, and how the seeds mix.
 */

export interface PcgRange {
  min: number
  max: number
}

/** A rectangle of tiles, x and y its smallest corner: the editor's TileArea. */
export interface PcgArea {
  x: number
  y: number
  width: number
  height: number
}

/** A point: Unreal's point properties (FPCGPoint) on a tile grid. */
export interface PcgPoint {
  /** Transform: the anchor tile, and the facing 0-7. There is no scale. */
  x: number
  y: number
  rotation: number
  /** BoundsMin/BoundsMax: the tiles the object covers, turned with the facing. */
  bounds: PcgArea
  /** Density, 0-1: the probability that the point exists here. */
  density: number
  /** Steepness, 0-1: 1 masks exactly its bounds, 0 fades out to twice them. */
  steepness: number
  /** Color: the ground colour index under the point. */
  color: number
  /** Seed: from the point's position. */
  seed: number
  /** Metadata: the dynamic attributes the nodes write. */
  attributes: PcgAttributes

  // bookkeeping, not Unreal's
  /** Sector key, "plane.x.y". */
  sector: string
  /** The layer that sampled it. */
  layer: string
  /** '' while the point stands; otherwise the step that culled it. */
  culled: string
}

export interface PcgAttributes {
  /** 0-255. */
  elevation: number
  /** Largest elevation step to the 8 neighbours. */
  slope: number
  /** Overlay id, 0 for none. */
  overlay: number
  /** 1 when any wall, roof or diagonal field of the tile is set. */
  wall: number
  /** Spatial Noise's ValueTarget, 0-1. */
  noise: number
  /** Spatial Noise's VoronoiCellIDTarget. */
  cell: number
  /** Distance outputs, in tiles, capped at the node's maximumDistance. */
  distanceWater: number
  distanceAuthored: number
  distanceLayers: number
  /** The spawner's OutAttributeName: -1 until the selector has run (0 is a tree). */
  objectId: number
}

/** Anything a filter, a selector or a maths node can read. */
export type PcgAttributeName = keyof PcgAttributes | 'density' | 'color' | 'steepness'

/** Surface Sampler. */
export interface PcgSurfaceSampler {
  /** Point Extents: the side of a sample cell in tiles. One candidate per cell. */
  pointExtents: number
  /** Looseness, 0-1: 0 is the cell's centre tile, 1 is any tile of the cell. */
  looseness: number
  /** Point Steepness, 0-1, given to every point. */
  pointSteepness: number
}

/** Spatial Noise: writes a spatially consistent value to `noise` (and `cell`). */
export interface PcgSpatialNoise {
  mode: 'Perlin2D' | 'Voronoi2D'
  /** Stands in for Transform: the size of one feature of the noise, in tiles. */
  scale: number
  /** Iterations: octaves of detail. */
  iterations: number
  /** value = clamp((noise - 0.5) * contrast + 0.5 + brightness, 0, 1) */
  brightness: number
  contrast: number
  /** Random Offset: shifts the field by up to this many tiles, from the seed. */
  randomOffset: number
  /** Voronoi Cell Randomness, 0-1: 0 is a regular grid of cells. */
  voronoiCellRandomness: number
}

export type PcgMaskSource = 'water' | 'walls' | 'authored' | 'layers'

/** Distance: tiles from each point to the nearest tile of the target. */
export interface PcgDistance {
  target: 'water' | 'authored' | 'layers'
  /** Maximum Distance: where the search stops, and what counts as "far". */
  maximumDistance: number
  /** Set Density: density = distance / maximumDistance, 0 at the target. */
  setDensity: boolean
  /** Output Attribute, when the distance is wanted as an attribute too. */
  outputAttribute?: 'distanceWater' | 'distanceAuthored' | 'distanceLayers'
}

/** A curve as points, joined by straight lines; x and y are 0-1. */
export type PcgCurve = { x: number; y: number }[]

/** The density nodes, run in the order they are listed. */
export type PcgDensityNode =
  | {
      node: 'DensityRemap'
      inRangeMin: number
      inRangeMax: number
      outRangeMin: number
      outRangeMax: number
      excludeValuesOutsideInputRange: boolean
    }
  | { node: 'CurveRemapDensity'; curve: PcgCurve }
  | {
      node: 'AttributeMathsOp'
      op: 'Multiply' | 'Add' | 'Subtract' | 'Min' | 'Max' | 'Set'
      attribute: PcgAttributeName
    }
  | {
      node: 'DensityNoise'
      mode: 'Set' | 'Minimum' | 'Maximum' | 'Add' | 'Multiply'
      noiseMin: number
      noiseMax: number
      invertSource: boolean
    }
  | { node: 'NormalToDensity'; maxSlope: number }

/** Difference: the candidates minus the masks. */
export interface PcgDifference {
  /** What is subtracted; several sources are unioned. */
  sources: PcgMaskSource[]
  /** Epic spells the second one ClampedSubstraction. */
  densityFunction: 'Minimum' | 'ClampedSubtraction' | 'Binary'
}

/**
 * Attribute Filter (with `values`) or Attribute Filter Range (with `min` /
 * `max`, inclusive). `invert` keeps what the filter would have removed: the
 * node's outside output.
 */
export interface PcgAttributeFilter {
  attribute: PcgAttributeName
  min?: number
  max?: number
  values?: number[]
  invert?: boolean
}

/** Density Filter. */
export interface PcgDensityFilter {
  lowerBound: number
  upperBound: number
  invertFilter: boolean
}

/** One mesh entry of a spawner. */
export interface PcgMeshEntry {
  objectId: number
  /** The chance is weight / (sum of the weights), as in Unreal. */
  weight: number
  /** Bounds Modifier for this entry: tiles kept clear on every side. */
  spacing?: number
  /** Biome Core's Filter Options: where this entry may be chosen at all. */
  filterOptions?: { density?: PcgRange; height?: PcgRange; waterDistance?: PcgRange }
}

/** The spawner's Mesh Selector Type. */
export type PcgMeshSelector =
  | { type: 'Weighted'; meshEntries: PcgMeshEntry[] }
  | {
      type: 'ByAttribute'
      attribute: PcgAttributeName
      /** Attribute value -> object id. */
      meshes: Record<string, number>
    }
  | {
      type: 'WeightedByCategory'
      categoryAttribute: PcgAttributeName
      /** Attribute value -> that category's weighted entries. */
      entries: Record<string, PcgMeshEntry[]>
    }

/** Static Mesh Spawner. The chosen id always goes to the `objectId` attribute. */
export interface PcgStaticMeshSpawner {
  meshSelector: PcgMeshSelector
  /** Apply Mesh Bounds To Points: the footprint becomes the point's bounds. */
  applyMeshBoundsToPoints: boolean
  /** Objects switched off: never chosen, their entries and weights kept as they are. */
  excluded?: number[]
}

/** Transform Points, as far as a tile grid has a transform. */
export interface PcgTransformPoints {
  /** Rotation Min/Max, as facings 0-7. */
  rotationMin: number
  rotationMax: number
  /** Absolute Rotation: set the facing, where off would add to it. */
  absoluteRotation: boolean
  /** Offset Min/Max in whole tiles, x then y. */
  offsetMin: [number, number]
  offsetMax: [number, number]
  /** Recompute Seed: take a new seed from the tile the point moved to. */
  recomputeSeed: boolean
}

/** Bounds Modifier: grows the bounds by this many tiles before Self Pruning. */
export interface PcgBoundsModifier {
  expand: number
}

/** Self Pruning. */
export interface PcgSelfPruning {
  pruningType: 'LargeToSmall' | 'SmallToLarge' | 'AllEqual' | 'None' | 'RemoveDuplicates'
  /** Sizes within this fraction of each other count as equal. */
  radiusSimilarityFactor: number
  /** Among equals: by seed when on, by position when off. */
  randomizedPruning: boolean
  /** Comparison Source: what "large" means. */
  comparisonSource: 'extents' | 'density'
}

/**
 * Copy Points: in place of the sampler, a ring of candidates around every
 * object of an earlier layer (flowers round each tree).
 */
export interface PcgCopyPoints {
  /** The layer whose standing points are copied onto. */
  target: string
  /** How many tiles out from each one's bounds the ring is. */
  ring: number
}

/** Grid Size: where a layer executes. 48 tiles is one sector. */
export type PcgGridSize = 'Unbounded' | 48

/** A layer is a subgraph: it samples, shapes, filters and spawns. */
export interface PcgLayer {
  id: string
  label: string
  /** The node's Enabled checkbox. */
  enabled: boolean
  /** The node's Debug checkbox. */
  debug: boolean
  /** "This node's seed". */
  seed: number
  /** Branch: run only while this Boolean graph parameter is on. */
  branch?: string
  /** Grid Size; null takes the graph's HiGen default. */
  gridSize: PcgGridSize | null
  sampler: PcgSurfaceSampler
  /** When set, the candidates come from another layer's points, not the sampler. */
  copyPoints?: PcgCopyPoints
  spatialNoise?: PcgSpatialNoise
  distances?: PcgDistance[]
  density?: PcgDensityNode[]
  difference: PcgDifference
  filters?: PcgAttributeFilter[]
  densityFilter?: PcgDensityFilter
  /** Select Points' Ratio, 0-1. */
  ratio: number
  spawner: PcgStaticMeshSpawner
  transform: PcgTransformPoints
  boundsModifier?: PcgBoundsModifier
  selfPruning: PcgSelfPruning
}

/** Graph Parameters: the values an instance may override. */
export interface PcgParameters {
  /** "The component's seed". */
  seed: number
  /** HiGen Default Grid Size. */
  hiGenDefaultGridSize: PcgGridSize
  /** Cull Points Outside Actor Bounds: tiles added to the domain; negative trims. */
  boundsExpansion: number
  /** Filters every layer applies before its own. */
  filters: PcgAttributeFilter[]
  /** The switches that layers' `branch` names. */
  booleans: Record<string, boolean>
  /** Remove the scenery already inside the domain when applying. */
  replace: boolean
}

/** The tool tags of Unreal's PCG Editor Mode. */
export type PcgToolTag = 'VolumeTool' | 'SplineSurfaceTool' | 'SplineTool' | 'PaintTool'

export interface PcgGraph {
  id: string
  label: string
  /** The tools this graph may be drawn with. */
  toolTags: PcgToolTag[]
  parameters: PcgParameters
  /** In run order within a grid size. */
  layers: PcgLayer[]
}

/** A Graph Instance: a graph, and only what differs from it. */
export interface PcgInstance {
  graph: string
  label: string
  overrides: {
    parameters?: Partial<PcgParameters>
    /** Layer id -> the fields changed on it; the whole layer for one the graph has not. */
    layers?: Record<string, Partial<PcgLayer>>
    /** The layers' ids in order, when layers were added, removed or moved. */
    order?: string[]
  }
}

/** A manual edit of the preview (UE 5.8), reapplied on every generation. */
export interface PcgManualEdit {
  layer: string
  x: number
  y: number
  /** Leave this point out... */
  exclude?: boolean
  /** ...or give it this object. */
  objectId?: number
}

/**
 * The ground a graph generates on: one rectangle of world tiles, an array per
 * field. A tile is at `(tileY - y) * width + (tileX - x)`.
 */
export interface PcgSurface {
  x: number
  y: number
  width: number
  height: number
  /** The sector keys `sector` points into. */
  sectors: string[]
  /** The rectangle each of `sectors` covers: the cells of a layer on grid 48. */
  cells: PcgArea[]
  /** 1 + the place in `sectors` of the tile's sector; 0 where no ground was read. */
  sector: ArrayLike<number>
  elevation: ArrayLike<number>
  colour: ArrayLike<number>
  overlay: ArrayLike<number>
  /** The Difference's masks, 1 where set: a blocked overlay... */
  water: ArrayLike<number>
  /** ...a wall, roof or diagonal... */
  walls: ArrayLike<number>
  /** ...and what is there already: scenery's footprints, doors, NPCs, items. */
  authored: ArrayLike<number>
  /** The tiles nobody can walk onto as the map stands, for the route check. */
  blocked?: ArrayLike<number>
}

export interface PcgCoreInput {
  /** Where to generate. */
  domain: PcgArea
  graph: PcgGraph
  surface: PcgSurface
  /** Object id -> the tiles it covers at facing 0. An id not in here is unknown. */
  sizes: ReadonlyMap<number, { width: number; height: number }>
  manualEdits?: PcgManualEdit[]
  /** Where the view is: a layer's cells nearest to it are generated first. */
  generationSource?: { x: number; y: number }
  /** The most points a run may consider; 250,000 when not given. */
  pointLimit?: number
  /**
   * How much of the domain each tile of the surface is, 0-1, when the domain
   * is not all of its rectangle: a drawn shape, or a biome's share of one. A
   * tile at 0 gets no point, and one in between that share of the density.
   */
  mask?: ArrayLike<number>
  /** The objects that stop a player, for the route check; without it there is none. */
  blocking?: ReadonlySet<number>
}

export interface PcgStats {
  considered: number
  placed: number
  /** Cull reason -> count. */
  culled: Record<string, number>
  byLayer: Record<string, { considered: number; placed: number; ms: number; messages: string[] }>
  /** Sanity checks that failed. Any entry blocks Apply. */
  errors: string[]
  /** What Apply would do that is worth a second look, such as closing a route. */
  warnings: string[]
}

export interface PcgCoreResult {
  /** Every point, standing or culled. */
  points: PcgPoint[]
  stats: PcgStats
}

// ## seeds

/** Mixes whole numbers into one 32-bit value. */
export function hash(...values: number[]): number {
  let h = 0x9e3779b9

  for (const value of values) {
    h = Math.imul(h ^ (value | 0), 0x85ebca6b)
    h ^= h >>> 15
    h = Math.imul(h, 0xc2b2ae35)
    h ^= h >>> 13
  }

  return h >>> 0
}

/** mulberry32, the project's own seeded RNG (rsc-client-dev/scripts/lib/trees.js). */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0

  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// every node that rolls has a constant of its own, so adding a node to a
// layer never shifts the numbers the others draw
const NODE = {
  sampler: 1,
  select: 2,
  selector: 3,
  rotation: 4,
  pruning: 5,
  noise: 6,
  noiseOffset: 7,
  densityNoise: 8,
  offset: 9,
}

/**
 * A node's random numbers: from a seed (a point's, or a sample cell's), the
 * layer's, the graph's and the node's own - the four inputs of Unreal's
 * Mutate Seed.
 */
function randomOf(seed: number, layer: PcgLayer, graph: PcgGraph, node: number): () => number {
  return mulberry32(hash(seed, layer.seed, graph.parameters.seed, node))
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

// ## the surface

/** A tile's place in the surface's arrays, or -1 when it is outside them. */
function tileOf(surface: PcgSurface, x: number, y: number): number {
  const column = x - surface.x
  const row = y - surface.y

  return column < 0 || row < 0 || column >= surface.width || row >= surface.height
    ? -1
    : row * surface.width + column
}

/** The places of every tile in a rectangle, -1 for the ones outside the surface. */
function tilesOf(surface: PcgSurface, area: PcgArea): number[] {
  const out: number[] = []

  for (let y = area.y; y < area.y + area.height; y++) {
    for (let x = area.x; x < area.x + area.width; x++) {
      out.push(tileOf(surface, x, y))
    }
  }

  return out
}

function inside(area: PcgArea, x: number, y: number): boolean {
  return x >= area.x && y >= area.y && x < area.x + area.width && y < area.y + area.height
}

/** The part two rectangles share, or null. */
function shared(a: PcgArea, b: PcgArea): PcgArea | null {
  const x = Math.max(a.x, b.x)
  const y = Math.max(a.y, b.y)
  const width = Math.min(a.x + a.width, b.x + b.width) - x
  const height = Math.min(a.y + a.height, b.y + b.height) - y

  return width > 0 && height > 0 ? { x, y, width, height } : null
}

/** Whether one rectangle lies wholly inside another. */
function holds(outer: PcgArea, inner: PcgArea): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  )
}

/** How many tiles out from a rectangle a tile is, over the eight neighbours; 0 inside it. */
function outFrom(area: PcgArea, x: number, y: number): number {
  return Math.max(
    area.x - x,
    x - (area.x + area.width - 1),
    area.y - y,
    y - (area.y + area.height - 1),
    0,
  )
}

/** The largest elevation step to the eight neighbours; ones with no ground read are left out. */
function slopeOf(surface: PcgSurface, x: number, y: number): number {
  const here = surface.elevation[tileOf(surface, x, y)]
  let slope = 0

  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const tile = tileOf(surface, x + dx, y + dy)

      if (tile !== -1 && surface.sector[tile]) {
        slope = Math.max(slope, Math.abs(surface.elevation[tile] - here))
      }
    }
  }

  return slope
}

/**
 * Tiles from every tile to the nearest one the target covers, counted over
 * the eight neighbours: one flood outwards from the target, stopped at
 * `maximum`, which is also what a tile further off is given.
 */
export function distancesTo(
  surface: PcgSurface,
  covers: (tile: number) => boolean,
  maximum: number,
): Uint16Array {
  const { width, height } = surface
  const out = new Uint16Array(width * height).fill(maximum)
  let edge: number[] = []

  for (let tile = 0; tile < out.length; tile++) {
    if (covers(tile)) {
      out[tile] = 0
      edge.push(tile)
    }
  }

  for (let distance = 1; distance < maximum && edge.length; distance++) {
    const next: number[] = []

    for (const tile of edge) {
      const x = tile % width
      const y = (tile - x) / width

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (x + dx < 0 || y + dy < 0 || x + dx >= width || y + dy >= height) {
            continue
          }

          const beside = tile + dy * width + dx

          if (out[beside] > distance) {
            out[beside] = distance
            next.push(beside)
          }
        }
      }
    }

    edge = next
  }

  return out
}

// ## the masks

// the Difference's sources, in the order that names a tile two of them
// cover, and what each culls as
const MASKS: [PcgMaskSource, string][] = [
  ['water', 'water'],
  ['walls', 'wall'],
  ['authored', 'occupied'],
  ['layers', 'layer'],
]

/** How much of a tile the sources cover, 0-1: the most any one of them does. */
function maskOn(
  surface: PcgSurface,
  layers: ArrayLike<number>,
  sources: PcgMaskSource[],
  tile: number,
): number {
  let mask = 0

  for (const source of sources) {
    mask = Math.max(mask, source === 'layers' ? layers[tile] : surface[source][tile] ? 1 : 0)
  }

  return mask
}

/** The source that covers a tile the most, as a cull reason. */
function maskName(
  surface: PcgSurface,
  layers: ArrayLike<number>,
  sources: PcgMaskSource[],
  tile: number,
): string {
  let name = ''
  let most = 0

  for (const [source, reason] of MASKS) {
    const mask = !sources.includes(source)
      ? 0
      : source === 'layers'
        ? layers[tile]
        : surface[source][tile]
          ? 1
          : 0

    if (mask > most) {
      most = mask
      name = reason
    }
  }

  return name
}

/**
 * Draws a standing point on the mask later layers subtract: 1 inside its
 * bounds and, when its steepness is below 1, a fade around them. Unreal fades
 * out to twice the bounds. On tiles that is a ring half the bounds wide, one
 * tile at least, which starts below 1 - steepness and falls to nothing.
 */
function drawOnMask(surface: PcgSurface, layers: Float32Array, point: PcgPoint) {
  const { bounds, steepness } = point
  const reach =
    steepness < 1 ? Math.max(1, Math.ceil(Math.max(bounds.width, bounds.height) / 2)) : 0

  for (let y = bounds.y - reach; y < bounds.y + bounds.height + reach; y++) {
    for (let x = bounds.x - reach; x < bounds.x + bounds.width + reach; x++) {
      const tile = tileOf(surface, x, y)

      if (tile === -1) {
        continue
      }

      const out = outFrom(bounds, x, y)
      const mask = out ? ((1 - steepness) * (reach - out + 1)) / (reach + 1) : 1

      if (mask > layers[tile]) {
        layers[tile] = mask
      }
    }
  }
}

// ## the nodes

/** What a filter, a selector or a maths node reads of a point. */
function read(point: PcgPoint, name: PcgAttributeName): number {
  return name === 'density'
    ? point.density
    : name === 'color'
      ? point.color
      : name === 'steepness'
        ? point.steepness
        : point.attributes[name]
}

/** A candidate on a tile, as the sampler hands it on: full density, 1x1 bounds. */
function pointAt(surface: PcgSurface, layer: PcgLayer, x: number, y: number): PcgPoint {
  const tile = tileOf(surface, x, y)

  return {
    x,
    y,
    rotation: 0,
    bounds: { x, y, width: 1, height: 1 },
    density: 1,
    steepness: clamp(layer.sampler.pointSteepness, 0, 1),
    color: surface.colour[tile],
    seed: hash(x, y),
    attributes: {
      elevation: surface.elevation[tile],
      slope: slopeOf(surface, x, y),
      overlay: surface.overlay[tile],
      wall: surface.walls[tile] ? 1 : 0,
      noise: 0,
      cell: 0,
      distanceWater: 0,
      distanceAuthored: 0,
      distanceLayers: 0,
      objectId: -1,
    },
    sector: surface.sectors[surface.sector[tile] - 1],
    layer: layer.id,
    culled: '',
  }
}

/**
 * Surface Sampler: one candidate per cell of a grid `pointExtents` tiles a
 * side. The grid is anchored to the world, not to the area, and a cell's tile
 * is rolled from the cell alone, so a tile gets the same answer wherever the
 * domain is drawn and however it is cut into cells. A tile outside the area,
 * or with no ground read, never becomes a point.
 */
function sample(input: PcgCoreInput, layer: PcgLayer, area: PcgArea): PcgPoint[] {
  const { surface, graph } = input
  const size = Math.max(1, Math.floor(layer.sampler.pointExtents))
  const looseness = clamp(layer.sampler.looseness, 0, 1)
  const middle = (size - 1) / 2
  const points: PcgPoint[] = []

  for (
    let cellY = Math.floor(area.y / size);
    cellY <= Math.floor((area.y + area.height - 1) / size);
    cellY++
  ) {
    for (
      let cellX = Math.floor(area.x / size);
      cellX <= Math.floor((area.x + area.width - 1) / size);
      cellX++
    ) {
      const random = randomOf(hash(cellX, cellY, size), layer, graph, NODE.sampler)
      // looseness 0 is the cell's centre tile, 1 any tile of the cell
      const within = () =>
        clamp(Math.floor(middle + (random() - 0.5) * looseness * size + 0.5), 0, size - 1)
      const x = cellX * size + within()
      const y = cellY * size + within()
      const tile = tileOf(surface, x, y)

      if (
        inside(area, x, y) &&
        tile !== -1 &&
        surface.sector[tile] &&
        (!input.mask || input.mask[tile] > 0)
      ) {
        points.push(pointAt(surface, layer, x, y))
      }
    }
  }

  return points
}

/**
 * Copy Points: a candidate on every tile of the ring around each standing
 * point of the target layer, a tile once however many rings cross it.
 */
function copy(
  surface: PcgSurface,
  layer: PcgLayer,
  targets: PcgPoint[],
  ring: number,
  area: PcgArea,
  mask: ArrayLike<number> | undefined,
): PcgPoint[] {
  const seen = new Set<number>()
  const tiles: { x: number; y: number }[] = []

  for (const { bounds } of targets) {
    for (let y = bounds.y - ring; y < bounds.y + bounds.height + ring; y++) {
      for (let x = bounds.x - ring; x < bounds.x + bounds.width + ring; x++) {
        const tile = tileOf(surface, x, y)

        if (
          outFrom(bounds, x, y) === ring &&
          inside(area, x, y) &&
          tile !== -1 &&
          surface.sector[tile] &&
          (!mask || mask[tile] > 0) &&
          !seen.has(tile)
        ) {
          seen.add(tile)
          tiles.push({ x, y })
        }
      }
    }
  }

  // the order the targets came in must not show
  return tiles
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .map(({ x, y }) => pointAt(surface, layer, x, y))
}

/**
 * Spatial Noise for a layer: a function of a tile's position and the seeds,
 * nothing else. Perlin2D is hashed lattice values, smoothly joined, a feature
 * every `scale` tiles, `iterations` octaves; Voronoi2D is the distance to the
 * nearest cell centre, with that cell's id. Either is then
 * clamp((value - 0.5) * contrast + 0.5 + brightness, 0, 1).
 */
export function spatialNoise(
  noise: PcgSpatialNoise,
  layerSeed: number,
  graphSeed: number,
): (x: number, y: number) => { value: number; cell: number } {
  const seed = hash(layerSeed, graphSeed, NODE.noise)
  const scale = Math.max(1, noise.scale)
  const shift = mulberry32(hash(seed, NODE.noiseOffset))
  const shiftX = (shift() * 2 - 1) * noise.randomOffset
  const shiftY = (shift() * 2 - 1) * noise.randomOffset
  const randomness = clamp(noise.voronoiCellRandomness, 0, 1)
  const smooth = (t: number) => t * t * (3 - 2 * t)

  const lattice = (x: number, y: number, octave: number) => {
    const x0 = Math.floor(x)
    const y0 = Math.floor(y)
    const at = (cornerX: number, cornerY: number) =>
      hash(cornerX, cornerY, seed, octave) / 4294967296
    const fx = smooth(x - x0)
    const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * fx
    const bottom = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * fx

    return top + (bottom - top) * smooth(y - y0)
  }

  return (tileX, tileY) => {
    // a tile's middle, in features
    const x = (tileX + 0.5 + shiftX) / scale
    const y = (tileY + 0.5 + shiftY) / scale
    let value = 0
    let cell = 0

    if (noise.mode === 'Voronoi2D') {
      let nearest = Infinity

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const id = hash(Math.floor(x) + dx, Math.floor(y) + dy, seed)
          const place = mulberry32(id)
          const distance = Math.hypot(
            Math.floor(x) + dx + 0.5 + (place() - 0.5) * randomness - x,
            Math.floor(y) + dy + 0.5 + (place() - 0.5) * randomness - y,
          )

          if (distance < nearest) {
            nearest = distance
            cell = id % 65536
          }
        }
      }

      value = Math.min(1, nearest)
    } else {
      let weight = 0

      for (let octave = 0; octave < Math.max(1, Math.round(noise.iterations)); octave++) {
        value += lattice(x * 2 ** octave, y * 2 ** octave, octave) / 2 ** octave
        weight += 1 / 2 ** octave
      }

      value /= weight
    }

    return { value: clamp((value - 0.5) * noise.contrast + 0.5 + noise.brightness, 0, 1), cell }
  }
}

/** A point's density after one density node. `index` is the node's place in the list. */
function densityAfter(
  node: PcgDensityNode,
  index: number,
  point: PcgPoint,
  layer: PcgLayer,
  graph: PcgGraph,
): number {
  const density = point.density

  switch (node.node) {
    case 'DensityRemap': {
      // Epic's formula, and its two rules: equal input bounds map to the
      // middle of the output's, and the exclude flag leaves the rest alone
      const { inRangeMin, inRangeMax, outRangeMin, outRangeMax } = node
      const outside =
        density < Math.min(inRangeMin, inRangeMax) || density > Math.max(inRangeMin, inRangeMax)

      if (node.excludeValuesOutsideInputRange && outside) {
        return density
      }

      if (inRangeMin === inRangeMax) {
        return clamp(
          density === inRangeMin
            ? (outRangeMin + outRangeMax) / 2
            : density < inRangeMin
              ? outRangeMin
              : outRangeMax,
          0,
          1,
        )
      }

      return clamp(
        ((outRangeMax - outRangeMin) * (density - inRangeMin)) / (inRangeMax - inRangeMin) +
          outRangeMin,
        0,
        1,
      )
    }

    case 'CurveRemapDensity': {
      const curve = [...node.curve].sort((a, b) => a.x - b.x)
      const after = curve.findIndex((knot) => knot.x >= density)

      if (!curve.length) {
        return density
      }

      if (after === -1) {
        return clamp(curve[curve.length - 1].y, 0, 1)
      }

      const to = curve[after]
      const from = curve[after - 1]

      return clamp(
        from && to.x > from.x
          ? from.y + ((to.y - from.y) * (density - from.x)) / (to.x - from.x)
          : to.y,
        0,
        1,
      )
    }

    case 'AttributeMathsOp': {
      const value = read(point, node.attribute)
      const next = {
        Multiply: density * value,
        Add: density + value,
        Subtract: density - value,
        Min: Math.min(density, value),
        Max: Math.max(density, value),
        Set: value,
      }[node.op]

      return clamp(next, 0, 1)
    }

    case 'DensityNoise': {
      // one random number a point: this roughens, it does not make patches
      const random = randomOf(point.seed, layer, graph, hash(NODE.densityNoise, index))()
      const noise = node.noiseMin + random * (node.noiseMax - node.noiseMin)
      const source = node.invertSource ? 1 - density : density
      const next = {
        Set: noise,
        Minimum: Math.min(source, noise),
        Maximum: Math.max(source, noise),
        Add: source + noise,
        Multiply: source * noise,
      }[node.mode]

      return clamp(next, 0, 1)
    }

    case 'NormalToDensity':
      // a tile has a slope where Unreal's point has a normal
      return node.maxSlope > 0
        ? density * clamp(1 - point.attributes.slope / node.maxSlope, 0, 1)
        : density
  }
}

/** Attribute Filter and Attribute Filter Range: whether a value is kept. */
function passes(filter: PcgAttributeFilter, value: number): boolean {
  const within =
    (!filter.values || filter.values.includes(value)) &&
    (typeof filter.min !== 'number' || value >= filter.min) &&
    (typeof filter.max !== 'number' || value <= filter.max)

  return filter.invert ? !within : within
}

const withinRange = (range: PcgRange | undefined, value: number) =>
  !range || (value >= range.min && value <= range.max)

/**
 * A layer's mesh selector: the entries a point may be given, by the selector
 * type. An id the palette does not know is left out, with a message. A
 * Voronoi `cell` that is not among a selector's keys takes one of them in
 * turn, which is what plants one species a stand.
 */
function selectorOf(
  layer: PcgLayer,
  sizes: PcgCoreInput['sizes'],
  messages: string[],
): (point: PcgPoint) => PcgMeshEntry[] {
  const selector = layer.spawner.meshSelector
  const unknown = new Set<number>()
  const excluded = new Set(layer.spawner.excluded ?? [])
  const known = (entries: PcgMeshEntry[]) =>
    entries.filter((entry) => {
      if (!sizes.has(entry.objectId)) {
        unknown.add(entry.objectId)
      }

      return sizes.has(entry.objectId) && entry.weight > 0 && !excluded.has(entry.objectId)
    })

  let choose: (point: PcgPoint) => PcgMeshEntry[]

  if (selector.type === 'Weighted') {
    const entries = known(selector.meshEntries)

    choose = () => entries
  } else {
    const attribute =
      selector.type === 'ByAttribute' ? selector.attribute : selector.categoryAttribute
    const table = new Map<string, PcgMeshEntry[]>()

    if (selector.type === 'ByAttribute') {
      for (const [key, objectId] of Object.entries(selector.meshes)) {
        table.set(key, known([{ objectId, weight: 1 }]))
      }
    } else {
      for (const [key, entries] of Object.entries(selector.entries)) {
        table.set(key, known(entries))
      }
    }

    const keys = [...table.keys()]

    choose = (point) => {
      const value = read(point, attribute)

      return (
        table.get(String(value)) ??
        (attribute === 'cell' && keys.length ? table.get(keys[value % keys.length]) : undefined) ??
        []
      )
    }
  }

  for (const id of unknown) {
    messages.push(`Object #${id} is not in the palette and was left out.`)
  }

  return choose
}

/**
 * Self Pruning. The points are sorted first (Sort Points), so the result
 * never depends on the order they were made in: by size as the pruning type
 * says, sizes within the similarity factor counting as equal, then by a
 * seeded roll or by position. A point then stands unless its bounds, grown by
 * its spacing (Bounds Modifier), overlap those of one already standing. Both
 * are grown, so two objects end up the sum of their spacings apart.
 */
function prune(
  run: Run,
  layer: PcgLayer,
  standing: { point: PcgPoint; spacing: number }[],
) {
  const { surface, graph } = run.input
  const { pruningType, randomizedPruning, radiusSimilarityFactor, comparisonSource } =
    layer.selfPruning

  if (pruningType === 'None') {
    return
  }

  const sizeOf = (point: PcgPoint) =>
    comparisonSource === 'density' ? point.density : point.bounds.width * point.bounds.height
  const ranks = new Map<number, number>()

  if (pruningType === 'LargeToSmall' || pruningType === 'SmallToLarge') {
    const sizes = [...new Set(standing.map(({ point }) => sizeOf(point)))].sort((a, b) => b - a)
    let largest = 0
    let rank = -1

    for (const size of sizes) {
      if (rank === -1 || largest - size > radiusSimilarityFactor * largest) {
        largest = size
        rank += 1
      }

      ranks.set(size, pruningType === 'LargeToSmall' ? rank : -rank)
    }
  }

  const ranked = standing.map(({ point, spacing }) => ({
    point,
    spacing,
    rank: ranks.get(sizeOf(point)) ?? 0,
    tie: randomizedPruning ? randomOf(point.seed, layer, graph, NODE.pruning)() : 0,
  }))

  ranked.sort(
    (a, b) => a.rank - b.rank || a.tie - b.tie || a.point.y - b.point.y || a.point.x - b.point.x,
  )

  const marked: number[] = []

  for (const { point, spacing } of ranked) {
    const { bounds } = point
    const tiles =
      pruningType === 'RemoveDuplicates'
        ? [tileOf(surface, point.x, point.y)]
        : tilesOf(surface, {
            x: bounds.x - spacing,
            y: bounds.y - spacing,
            width: bounds.width + spacing * 2,
            height: bounds.height + spacing * 2,
          }).filter((tile) => tile !== -1)

    if (tiles.some((tile) => run.taken[tile])) {
      point.culled = 'pruned'
      continue
    }

    for (const tile of tiles) {
      run.taken[tile] = 1
      marked.push(tile)
    }
  }

  // the cells of a layer do not see each other
  for (const tile of marked) {
    run.taken[tile] = 0
  }
}

// ## a run

/** The most points a run considers before it stops with an error. */
export const POINT_LIMIT = 250000

/** What a run carries from layer to layer. */
interface Run {
  input: PcgCoreInput
  /** The domain, with the graph's bounds expansion. */
  domain: PcgArea
  /** Where earlier layers' objects stand, 0-1 a tile: the `layers` mask. */
  layers: Float32Array
  /** Layer id -> its standing points, for Copy Points. */
  standing: Map<string, PcgPoint[]>
  /** "layer:x,y" -> the manual edit there. */
  edits: Map<string, PcgManualEdit>
  /** The pruning's scratch: the tiles standing bounds cover in the cell at hand. */
  taken: Uint8Array
  /** "target:maximum" -> a Distance flood that later layers can reuse. */
  floods: Map<string, Uint16Array>
}

/** What is worked out for a layer once, before its cells. */
interface Ready {
  layer: PcgLayer
  noise: ((x: number, y: number) => { value: number; cell: number }) | null
  distances: { node: PcgDistance; maximum: number; field: Uint16Array }[]
  filters: PcgAttributeFilter[]
  entries: (point: PcgPoint) => PcgMeshEntry[]
  /** Whether a Distance to water writes `distanceWater`, which an entry's water range reads. */
  water: boolean
  /** Copy Points' targets, when the layer has it. */
  targets: PcgPoint[] | null
  messages: string[]
}

function prepare(run: Run, layer: PcgLayer): Ready {
  const { surface, graph, sizes } = run.input
  const messages: string[] = []

  const distances = (layer.distances ?? []).map((node) => {
    const maximum = clamp(Math.round(node.maximumDistance), 1, 65535)
    const key = `${node.target}:${maximum}`
    // the map does not change during a run; where the layers stand does
    const kept = node.target === 'layers' ? undefined : run.floods.get(key)
    const field =
      kept ??
      distancesTo(
        surface,
        node.target === 'layers'
          ? (tile) => run.layers[tile] >= 1
          : node.target === 'water'
            ? (tile) => !!surface.water[tile]
            : (tile) => !!surface.authored[tile],
        maximum,
      )

    if (node.target !== 'layers') {
      run.floods.set(key, field)
    }

    return { node, maximum, field }
  })

  const water = distances.some(
    ({ node }) => node.target === 'water' && node.outputAttribute === 'distanceWater',
  )
  const selector = layer.spawner.meshSelector
  const listed =
    selector.type === 'Weighted'
      ? selector.meshEntries
      : selector.type === 'WeightedByCategory'
        ? Object.values(selector.entries).flat()
        : []

  if (!water && listed.some((entry) => entry.filterOptions?.waterDistance)) {
    messages.push(
      'An entry has a water distance, and the layer has no Distance to water that outputs distanceWater: the range is ignored.',
    )
  }

  let targets: PcgPoint[] | null = null

  if (layer.copyPoints) {
    targets = run.standing.get(layer.copyPoints.target) ?? []

    if (!run.standing.has(layer.copyPoints.target)) {
      messages.push(
        `Copy Points' target "${layer.copyPoints.target}" has not run before this layer, so there is nothing to copy onto.`,
      )
    }
  }

  return {
    layer,
    noise: layer.spatialNoise
      ? spatialNoise(layer.spatialNoise, layer.seed, graph.parameters.seed)
      : null,
    distances,
    filters: [...graph.parameters.filters, ...(layer.filters ?? [])],
    entries: selectorOf(layer, sizes, messages),
    water,
    targets,
    messages,
  }
}

/**
 * One layer over one cell: the whole domain, or the part of it in one sector
 * (`cell`), which the layer's objects then stay inside.
 */
function runCell(run: Run, ready: Ready, area: PcgArea, cell: PcgArea | null): PcgPoint[] {
  const { surface, graph, sizes } = run.input
  const { layer } = ready
  const { transform, difference } = layer
  const sources = difference.sources
  const ratio = clamp(layer.ratio, 0, 1)
  const whole = (a: number, b: number, roll: number) => {
    const low = Math.round(Math.min(a, b))

    return low + Math.floor(roll * (Math.round(Math.max(a, b)) - low + 1))
  }
  const moves = [...transform.offsetMin, ...transform.offsetMax].some((offset) => offset !== 0)
  const points = ready.targets
    ? copy(
        surface,
        layer,
        ready.targets,
        Math.max(1, Math.round(layer.copyPoints!.ring)),
        area,
        run.input.mask,
      )
    : sample(run.input, layer, area)
  const standing: { point: PcgPoint; spacing: number }[] = []

  for (const point of points) {
    const tile = tileOf(surface, point.x, point.y)

    // Spatial Noise: an attribute, and nothing to the density by itself
    if (ready.noise) {
      const noise = ready.noise(point.x, point.y)

      point.attributes.noise = noise.value
      point.attributes.cell = noise.cell
    }

    // Distance: 0 at the target, 1 at the maximum or beyond
    for (const { node, maximum, field } of ready.distances) {
      if (node.outputAttribute) {
        point.attributes[node.outputAttribute] = field[tile]
      }

      if (node.setDensity) {
        point.density = field[tile] / maximum
      }
    }

    // the density nodes, in list order
    for (const [index, node] of (layer.density ?? []).entries()) {
      point.density = densityAfter(node, index, point, layer, graph)
    }

    // a tile only partly the domain's - the edge of a biome - has that share
    if (run.input.mask) {
      point.density *= run.input.mask[tile]
    }

    // Difference: the masks take density away, by the density function
    const mask = maskOn(surface, run.layers, sources, tile)

    if (mask > 0) {
      point.density =
        difference.densityFunction === 'Binary'
          ? 0
          : difference.densityFunction === 'Minimum'
            ? Math.min(point.density, 1 - mask)
            : Math.max(0, point.density - mask)

      if (point.density <= 0) {
        point.density = 0
        point.culled = maskName(surface, run.layers, sources, tile)
        continue
      }
    }

    // Attribute Filter and Attribute Filter Range: the graph's, then the layer's
    const failed = ready.filters.find((filter) => !passes(filter, read(point, filter.attribute)))

    if (failed) {
      point.culled = failed.attribute
      continue
    }

    // Density Filter
    if (layer.densityFilter) {
      const { lowerBound, upperBound, invertFilter } = layer.densityFilter

      if ((point.density >= lowerBound && point.density <= upperBound) === invertFilter) {
        point.culled = 'density-filter'
        continue
      }
    }

    // Select Points: density is the chance that the point exists
    if (randomOf(point.seed, layer, graph, NODE.select)() >= ratio * point.density) {
      point.culled = 'select'
      continue
    }

    // Transform Points' offset is rolled here, so that a manual edit is
    // found by the tile the point ends up on
    const shift = moves ? randomOf(point.seed, layer, graph, NODE.offset) : null
    const x = point.x + (shift ? whole(transform.offsetMin[0], transform.offsetMax[0], shift()) : 0)
    const y = point.y + (shift ? whole(transform.offsetMin[1], transform.offsetMax[1], shift()) : 0)
    const edit = run.edits.get(`${layer.id}:${x},${y}`)

    // the mesh selector, ahead of the pruning: how much room a point needs
    // depends on what stands on it. an entry's filter options say where it
    // may be chosen at all
    const entries = ready.entries(point).filter(
      ({ filterOptions: options }) =>
        !options ||
        (withinRange(options.density, point.density) &&
          withinRange(options.height, point.attributes.elevation) &&
          (!ready.water || withinRange(options.waterDistance, point.attributes.distanceWater))),
    )
    let left =
      randomOf(point.seed, layer, graph, NODE.selector)() *
      entries.reduce((sum, entry) => sum + entry.weight, 0)
    const rolled = entries.find((next) => (left -= next.weight) < 0) ?? entries[entries.length - 1]
    // a manual edit gives the point its object, whatever the roll said
    const swapped = edit?.objectId !== undefined && sizes.has(edit.objectId) ? edit.objectId : null
    const entry =
      swapped === null
        ? rolled
        : (ready.entries(point).find((next) => next.objectId === swapped) ?? {
            objectId: swapped,
            weight: 1,
          })

    if (!entry) {
      point.culled = 'entries'
      continue
    }

    point.attributes.objectId = entry.objectId

    // Transform Points: the facing, and the move
    const turn = whole(
      transform.rotationMin,
      transform.rotationMax,
      randomOf(point.seed, layer, graph, NODE.rotation)(),
    )

    point.rotation = ((((transform.absoluteRotation ? 0 : point.rotation) + turn) % 8) + 8) % 8

    if (x !== point.x || y !== point.y) {
      point.x = x
      point.y = y

      if (transform.recomputeSeed) {
        point.seed = hash(x, y)
      }
    }

    // the mesh's bounds on the point. the client sizes scenery by its facing:
    // 0 or 4 takes width by height, anything else the other way (footprintOf
    // in geometry.ts)
    const { width, height } = sizes.get(entry.objectId)!
    const turned = point.rotation !== 0 && point.rotation !== 4

    point.bounds = { x, y, width: turned ? height : width, height: turned ? width : height }

    // the Difference again, over every tile the object covers: none may be
    // unread ground, outside the layer's cell, or fully masked
    const anchor = tileOf(surface, x, y)
    const clear =
      (!cell || holds(cell, point.bounds)) &&
      tilesOf(surface, point.bounds).every((covered) => {
        const over = covered === -1 ? 1 : maskOn(surface, run.layers, sources, covered)

        return (
          covered !== -1 &&
          !!surface.sector[covered] &&
          (difference.densityFunction === 'Binary' ? over === 0 : over < 1)
        )
      })

    if (!clear) {
      point.culled = 'footprint'
      continue
    }

    point.sector = surface.sectors[surface.sector[anchor] - 1]
    standing.push({
      point,
      spacing: Math.max(0, Math.round(entry.spacing ?? layer.boundsModifier?.expand ?? 0)),
    })
  }

  prune(run, layer, standing)

  // manual edits: a point taken out by hand, after it has kept its room
  for (const { point } of standing) {
    if (!point.culled && run.edits.get(`${layer.id}:${point.x},${point.y}`)?.exclude) {
      point.culled = 'manual'
    }
  }

  return points
}

/**
 * Sanity Check Point Data: what must hold of the standing points before they
 * may be applied. The generator keeps all of these itself, bar a layer whose
 * pruning is switched off, so a failure is the tool's own fault or the
 * graph's.
 */
export function sanityErrors(
  points: PcgPoint[],
  surface: PcgSurface,
  sizes: PcgCoreInput['sizes'],
): string[] {
  const taken = new Uint8Array(surface.width * surface.height)
  const failed = { unknown: 0, sector: 0, ground: 0, overlap: 0 }

  for (const point of points) {
    if (point.culled) {
      continue
    }

    const anchor = tileOf(surface, point.x, point.y)
    const tiles = tilesOf(surface, point.bounds)

    if (!sizes.has(point.attributes.objectId)) {
      failed.unknown += 1
    }

    if (anchor === -1 || surface.sectors[surface.sector[anchor] - 1] !== point.sector) {
      failed.sector += 1
    }

    if (tiles.some((tile) => tile === -1 || !surface.sector[tile])) {
      failed.ground += 1
    }

    if (tiles.some((tile) => tile !== -1 && taken[tile])) {
      failed.overlap += 1
    }

    for (const tile of tiles) {
      if (tile !== -1) {
        taken[tile] = 1
      }
    }
  }

  const count = (n: number) => `${n} object${n === 1 ? '' : 's'}`

  return [
    failed.unknown ? `${count(failed.unknown)} with an id the palette does not know.` : '',
    failed.sector ? `${count(failed.sector)} outside the sector that would hold it.` : '',
    failed.ground ? `${count(failed.ground)} reaching onto ground that was not read.` : '',
    failed.overlap
      ? `${count(failed.overlap)} overlapping another. A layer with Self Pruning off, or without the layers mask, lets that happen.`
      : '',
  ].filter(Boolean)
}

/**
 * The walkable-route check, after Unreal's Pathfinding: whether new objects
 * close a way across an area. The walkable tiles round the area's edge are
 * grouped by what can be walked between, four ways a step, as the map stands
 * (`before`) and with the objects on it (`after`). Two that were in one group
 * and are in two now are a route cut. Only tiles count: a wall on a tile's
 * edge is not looked at.
 */
export function routeCuts(
  surface: PcgSurface,
  before: ArrayLike<number>,
  after: ArrayLike<number>,
  area: PcgArea,
): { from: { x: number; y: number }; to: { x: number; y: number } }[] {
  // the area, and the ring of tiles round it
  const region = shared(
    { x: area.x - 1, y: area.y - 1, width: area.width + 2, height: area.height + 2 },
    surface,
  )

  if (!region) {
    return []
  }

  const { width, height } = region
  const tileAt = (cell: number) =>
    tileOf(surface, region.x + (cell % width), region.y + Math.floor(cell / width))

  /** Every cell of the region numbered by the group it can be walked in; 0 for none. */
  const groups = (blocked: ArrayLike<number>) => {
    const walkable = (cell: number) => !!surface.sector[tileAt(cell)] && !blocked[tileAt(cell)]
    const group = new Int32Array(width * height)
    let count = 0

    for (let start = 0; start < group.length; start++) {
      if (group[start] || !walkable(start)) {
        continue
      }

      const stack = [start]

      group[start] = ++count

      while (stack.length) {
        const cell = stack.pop()!
        const x = cell % width

        for (const next of [
          x > 0 ? cell - 1 : -1,
          x < width - 1 ? cell + 1 : -1,
          cell - width,
          cell + width,
        ]) {
          if (next >= 0 && next < group.length && !group[next] && walkable(next)) {
            group[next] = count
            stack.push(next)
          }
        }
      }
    }

    return group
  }

  const was = groups(before)
  const now = groups(after)
  // a group as it was -> the groups its edge tiles are in now, a tile of each
  const split = new Map<number, Map<number, number>>()

  for (let cell = 0; cell < was.length; cell++) {
    const x = cell % width
    const y = Math.floor(cell / width)

    if ((x > 0 && y > 0 && x < width - 1 && y < height - 1) || !was[cell] || !now[cell]) {
      continue
    }

    const parts = split.get(was[cell]) ?? new Map<number, number>()

    if (!parts.has(now[cell])) {
      parts.set(now[cell], cell)
    }

    split.set(was[cell], parts)
  }

  const place = (cell: number) => ({
    x: region.x + (cell % width),
    y: region.y + Math.floor(cell / width),
  })

  return [...split.values()].flatMap((parts) => {
    const [from, ...rest] = [...parts.values()]

    return rest.map((to) => ({ from: place(from), to: place(to) }))
  })
}

/** What the route check has to say of a run's standing points. */
function routeWarnings(
  surface: PcgSurface,
  points: PcgPoint[],
  blocking: ReadonlySet<number> | undefined,
  area: PcgArea,
): string[] {
  if (!surface.blocked || !blocking) {
    return []
  }

  const after = Uint8Array.from(surface.blocked)

  for (const point of points) {
    if (!point.culled && blocking.has(point.attributes.objectId)) {
      for (const tile of tilesOf(surface, point.bounds)) {
        after[tile] = 1
      }
    }
  }

  const cuts = routeCuts(surface, surface.blocked, after, area)

  return cuts.length
    ? [
        `This closes ${cuts.length === 1 ? 'a way' : `${cuts.length} ways`} across the area: nobody could walk from ${cuts[0].from.x}, ${cuts[0].from.y} to ${cuts[0].to.x}, ${cuts[0].to.y} any more. A lower ratio, a larger Point Extents or a spacing opens it up.`,
      ]
    : []
}

/**
 * Runs a graph, a layer on a grid cell per step, so the caller can paint in
 * between. Layers whose branch is off are left out. The rest run as Unreal's
 * Hierarchical Generation has it: Unbounded layers first, each once over the
 * whole domain, then the layers on grid 48, each once per sector, all in list
 * order. A layer finishes its cells before the next begins and its cells do
 * not see each other, so the order of the cells never shows.
 */
export function* runGraph(
  input: PcgCoreInput,
): Generator<{ done: number; total: number }, PcgCoreResult> {
  const { surface, graph, generationSource: source } = input
  const { parameters } = graph
  const more = Math.round(parameters.boundsExpansion)
  // Cull Points Outside Actor Bounds
  const domain = {
    x: input.domain.x - more,
    y: input.domain.y - more,
    width: input.domain.width + more * 2,
    height: input.domain.height + more * 2,
  }
  const run: Run = {
    input,
    domain,
    layers: new Float32Array(surface.width * surface.height),
    standing: new Map(),
    edits: new Map(
      (input.manualEdits ?? []).map((edit) => [`${edit.layer}:${edit.x},${edit.y}`, edit]),
    ),
    taken: new Uint8Array(surface.width * surface.height),
    floods: new Map(),
  }
  const points: PcgPoint[] = []
  const stats: PcgStats = {
    considered: 0,
    placed: 0,
    culled: {},
    byLayer: {},
    errors: [],
    warnings: [],
  }
  const limit = input.pointLimit ?? POINT_LIMIT

  const gridOf = (layer: PcgLayer) => layer.gridSize ?? parameters.hiGenDefaultGridSize
  const running = graph.layers.filter(
    (layer) => layer.enabled && (!layer.branch || parameters.booleans[layer.branch]),
  )

  // a sector's part of the domain, in an order of their own: north to south,
  // then by x. they are generated nearest the view first
  const sectorCells = surface.cells
    .flatMap((cell) => {
      const area = shared(cell, domain)

      return area ? [{ area, cell }] : []
    })
    .sort((a, b) => a.cell.y - b.cell.y || a.cell.x - b.cell.x)
    .map((entry, place) => ({ ...entry, place }))
  const far = ({ cell }: { cell: PcgArea }) =>
    source
      ? Math.hypot(cell.x + cell.width / 2 - source.x, cell.y + cell.height / 2 - source.y)
      : 0
  const nearestFirst = [...sectorCells].sort((a, b) => far(a) - far(b) || a.place - b.place)

  const plans = [
    ...running.filter((layer) => gridOf(layer) === 'Unbounded'),
    ...running.filter((layer) => gridOf(layer) !== 'Unbounded'),
  ].map((layer) => ({
    layer,
    cells:
      gridOf(layer) === 'Unbounded'
        ? domain.width > 0 && domain.height > 0
          ? [{ area: domain, cell: null as PcgArea | null, place: 0 }]
          : []
        : nearestFirst,
  }))
  const total = plans.reduce((sum, plan) => sum + plan.cells.length, 0)
  let done = 0
  let stopped = false

  for (const { layer, cells } of plans) {
    const started = performance.now()
    const ready = prepare(run, layer)
    const made: PcgPoint[][] = []
    const size = Math.max(1, Math.floor(layer.sampler.pointExtents))
    let considered = 0

    for (const { area, cell, place } of cells) {
      // a mis-set sampler is stopped before it freezes the page
      const coming = ready.targets
        ? 0
        : Math.ceil(area.width / size) * Math.ceil(area.height / size)

      if (stats.considered + considered + coming > limit) {
        stats.errors.push(
          `More than ${limit.toLocaleString('en-US')} points to consider: the run was stopped. Draw a smaller area, or give "${layer.label}" a larger Point Extents.`,
        )
        stopped = true
        break
      }

      made[place] = runCell(run, ready, area, cell)
      considered += made[place].length
      done += 1

      yield { done, total }
    }

    if (stopped) {
      break
    }

    const standing: PcgPoint[] = []

    for (const point of made.flat()) {
      points.push(point)

      if (point.culled) {
        stats.culled[point.culled] = (stats.culled[point.culled] ?? 0) + 1
      } else {
        standing.push(point)
      }
    }

    // only now, so that the layer's own cells never saw each other
    for (const point of standing) {
      drawOnMask(surface, run.layers, point)
    }

    run.standing.set(layer.id, standing)
    stats.considered += considered
    stats.placed += standing.length
    stats.byLayer[layer.id] = {
      considered,
      placed: standing.length,
      ms: performance.now() - started,
      messages: ready.messages,
    }
  }

  stats.errors.push(...sanityErrors(points, surface, input.sizes))
  stats.warnings.push(...routeWarnings(surface, points, input.blocking, domain))

  return { points, stats }
}

// ## biomes

/** One graph's share of a domain, after Unreal's Biome Core. */
export interface PcgBiome {
  graph: PcgGraph
  /** Where it grows: the tiles these filters keep. A biome with none takes any tile. */
  filters: PcgAttributeFilter[]
  /** Put before its layers' ids, so two biomes' layers are told apart. */
  prefix: string
}

export interface PcgBiomeInput extends Omit<PcgCoreInput, 'graph'> {
  /** In order of priority: the first biome to keep a tile has it. */
  biomes: PcgBiome[]
  /** The field a filter on `noise` reads: regions that follow no ground colour. */
  noise?: PcgSpatialNoise
  /** Tiles over which a biome's edge fades into its neighbour's; 0 is a hard border. */
  blend: number
}

/**
 * Several graphs over one domain. Every tile goes to the first biome whose
 * filters keep it, each biome's graph then runs over its own tiles, and a
 * later one's objects keep off an earlier one's. With a blend range the two
 * sides of a border each reach into the other, thinning out as they go, so
 * that together they are as dense as either is alone.
 */
export function* runBiomes(
  input: PcgBiomeInput,
): Generator<{ done: number; total: number }, PcgCoreResult> {
  const { surface, biomes, domain } = input
  const size = surface.width * surface.height
  const blend = Math.max(0, Math.round(input.blend))
  const field = input.noise
    ? spatialNoise(input.noise, 0, biomes[0]?.graph.parameters.seed ?? 0)
    : null
  // a filter reads a point, so every tile is made one, by a layer of no kind
  const ground = { id: '', sampler: { pointExtents: 1, looseness: 0, pointSteepness: 1 } } as PcgLayer
  const owner = new Uint8Array(size)

  for (let y = domain.y; y < domain.y + domain.height; y++) {
    for (let x = domain.x; x < domain.x + domain.width; x++) {
      const tile = tileOf(surface, x, y)

      if (tile === -1 || !surface.sector[tile] || (input.mask && !input.mask[tile])) {
        continue
      }

      const point = pointAt(surface, ground, x, y)

      if (field) {
        point.attributes.noise = field(x, y).value
        point.attributes.cell = field(x, y).cell
      }

      owner[tile] =
        1 +
        biomes.findIndex((biome) =>
          biome.filters.every((filter) => passes(filter, read(point, filter.attribute))),
        )
    }
  }

  // what earlier biomes placed is "there already" to the later ones
  const occupied = Uint8Array.from(surface.authored)
  const points: PcgPoint[] = []
  const stats: PcgStats = {
    considered: 0,
    placed: 0,
    culled: {},
    byLayer: {},
    errors: [],
    warnings: [],
  }

  for (const [index, biome] of biomes.entries()) {
    const mine = index + 1
    // tiles from each of its own to the nearest tile of another biome, and
    // from each of the others' to its nearest own
    const inward = blend
      ? distancesTo(surface, (tile) => !!owner[tile] && owner[tile] !== mine, blend + 1)
      : null
    const outward = blend ? distancesTo(surface, (tile) => owner[tile] === mine, blend + 1) : null
    const mask = new Float32Array(size)

    for (let tile = 0; tile < size; tile++) {
      if (!owner[tile]) {
        continue
      }

      // half and half on the border, all its own a blend range in, none a
      // blend range out
      const share =
        owner[tile] === mine
          ? inward
            ? clamp(0.5 + (inward[tile] - 0.5) / (blend * 2), 0, 1)
            : 1
          : outward
            ? clamp(0.5 - (outward[tile] - 0.5) / (blend * 2), 0, 1)
            : 0

      mask[tile] = share * (input.mask ? input.mask[tile] : 1)
    }

    const { graph, prefix } = biome
    const run = runGraph({
      ...input,
      graph: {
        ...graph,
        // two biomes of one graph must not roll the same numbers
        parameters: {
          ...graph.parameters,
          seed: prefix ? hash(graph.parameters.seed, mine) : graph.parameters.seed,
        },
        layers: graph.layers.map((layer) => ({
          ...layer,
          id: prefix + layer.id,
          label: prefix ? `${graph.label}: ${layer.label}` : layer.label,
          copyPoints: layer.copyPoints && {
            ...layer.copyPoints,
            target: prefix + layer.copyPoints.target,
          },
        })),
      },
      surface: { ...surface, authored: occupied },
      mask,
      // the routes are checked once, of all the biomes together
      blocking: undefined,
    })
    let step = run.next()

    while (!step.done) {
      yield { done: index + step.value.done / Math.max(1, step.value.total), total: biomes.length }
      step = run.next()
    }

    for (const point of step.value.points) {
      points.push(point)

      if (!point.culled) {
        for (const tile of tilesOf(surface, point.bounds)) {
          occupied[tile] = 1
        }
      }
    }

    stats.considered += step.value.stats.considered
    stats.placed += step.value.stats.placed
    Object.assign(stats.byLayer, step.value.stats.byLayer)

    for (const [reason, count] of Object.entries(step.value.stats.culled)) {
      stats.culled[reason] = (stats.culled[reason] ?? 0) + count
    }

    stats.errors.push(...step.value.stats.errors)
  }

  stats.errors = [...new Set([...stats.errors, ...sanityErrors(points, surface, input.sizes)])]
  stats.warnings.push(...routeWarnings(surface, points, input.blocking, domain))

  return { points, stats }
}

// ## instances

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/** The fields of `now` that differ from `base`'s; a field `base` has and `now` has not is null. */
function changed<T extends object>(now: T, base: T): Partial<T> | undefined {
  const out: Record<string, unknown> = {}

  for (const key of new Set([...Object.keys(now), ...Object.keys(base)])) {
    const value = (now as Record<string, unknown>)[key]

    if (!same(value, (base as Record<string, unknown>)[key])) {
      out[key] = value ?? null
    }
  }

  return Object.keys(out).length ? (out as Partial<T>) : undefined
}

/** A graph with an instance's overrides laid over it. */
export function instantiate(graph: PcgGraph, instance: PcgInstance): PcgGraph {
  const { parameters, layers = {}, order } = instance.overrides
  const templates = new Map(graph.layers.map((layer) => [layer.id, layer]))
  // null is how a file says a field was taken away. a grid size is the one
  // field where null is a value: the graph's default
  const merged = <T extends object>(base: T, patch: Partial<T> | undefined): T =>
    Object.fromEntries(
      Object.entries({ ...base, ...patch }).filter(
        ([key, value]) => value !== null || key === 'gridSize',
      ),
    ) as T

  return {
    ...graph,
    label: instance.label || graph.label,
    parameters: merged(graph.parameters, parameters),
    layers: (order ?? graph.layers.map((layer) => layer.id)).flatMap((id) => {
      const template = templates.get(id)
      const patch = layers[id]

      // a layer the graph has not comes whole
      return template
        ? [merged(template, patch)]
        : patch && 'sampler' in patch
          ? [merged(patch as PcgLayer, { id })]
          : []
    }),
  }
}

/** The instance that turns `template` into `graph`: only what was changed. */
export function instanceOf(graph: PcgGraph, template: PcgGraph): PcgInstance {
  const templates = new Map(template.layers.map((layer) => [layer.id, layer]))
  const overrides: PcgInstance['overrides'] = {}
  const parameters = changed(graph.parameters, template.parameters)
  const layers: Record<string, Partial<PcgLayer>> = {}

  for (const layer of graph.layers) {
    const base = templates.get(layer.id)
    const patch = base ? changed(layer, base) : layer

    if (patch) {
      layers[layer.id] = patch
    }
  }

  if (parameters) {
    overrides.parameters = parameters
  }

  if (Object.keys(layers).length) {
    overrides.layers = layers
  }

  if (
    !same(
      graph.layers.map((layer) => layer.id),
      template.layers.map((layer) => layer.id),
    )
  ) {
    overrides.order = graph.layers.map((layer) => layer.id)
  }

  return { graph: template.id, label: graph.label, overrides }
}
