import type { TileArea } from '@/components/world-map/WorldCanvas'
import type { Working } from '@/components/world-map/useWorldEdits'
import { collisionOf, footprintOf } from '@/lib/landscape/geometry'
import {
  distancesTo,
  instanceOf,
  instantiate,
  runBiomes,
  runGraph,
  type PcgAttributeFilter,
  type PcgCoreResult,
  type PcgDifference,
  type PcgGraph,
  type PcgInstance,
  type PcgLayer,
  type PcgManualEdit,
  type PcgParameters,
  type PcgSelfPruning,
  type PcgSpatialNoise,
  type PcgSurface,
  type PcgToolTag,
  type PcgTransformPoints,
} from '@/lib/landscape/pcg-core'
import {
  MIN_REGION_X,
  MIN_REGION_Y,
  PLANE_HEIGHT,
  SECTOR_SIZE,
  gameToTile,
  type LandscapePalette,
  type PlacedObject,
} from '@/lib/landscape/types'

/**
 * The World Editor's PCG tool: a seeded stack of scenery layers (trees, rocks,
 * flowers) generated over an area of the map, after Unreal Engine's Procedural
 * Content Generation framework (documentation/suggestions/PCG_WORLD_EDITOR.md).
 *
 * The generator itself is pcg-core.ts, which works on plain arrays so it can
 * be tested without Next. This file has the built-in graphs, reads the
 * editor's open sectors and palette into those arrays, and turns the result
 * into the scenery to add to each sector: `PlacedObject`s, the same as ones
 * put down by hand.
 */

export type * from '@/lib/landscape/pcg-core'
export { instanceOf, instantiate, spatialNoise } from '@/lib/landscape/pcg-core'

/**
 * Where to generate: one shape per tool of Unreal's PCG Editor Mode. A
 * rectangle (Volume), the inside of a polygon drawn tile to tile (Draw Spline
 * Surface), a path so many tiles wide (Draw Spline), or painted tiles (Paint).
 */
export type PcgDomain =
  | { tool: 'VolumeTool'; area: TileArea }
  | { tool: 'SplineSurfaceTool'; points: { x: number; y: number }[] }
  | { tool: 'SplineTool'; points: { x: number; y: number }[]; width: number }
  | { tool: 'PaintTool'; tiles: { x: number; y: number }[] }

/**
 * Biomes: other graphs that each claim part of the domain, in order of
 * priority. The graph in hand grows on what they leave.
 */
export interface PcgBiomeSet {
  rows: {
    /** A built-in graph's id. */
    graph: string
    /** The ground it claims: the tiles these filters keep. */
    filters: PcgAttributeFilter[]
  }[]
  /** Tiles over which two biomes fade into each other at their border. */
  blend: number
  /** Tiles across one patch of the noise a row's `noise` filter reads. */
  noiseScale: number
}

export const NO_BIOMES: PcgBiomeSet = { rows: [], blend: 3, noiseScale: 32 }

/** What the generator reads of one open sector: its working copy. */
export type PcgSector = Pick<Working, 'tiles' | 'objects' | 'wallObjects' | 'npcs' | 'items'>

export interface PcgResult extends PcgCoreResult {
  /** Sector key -> the objects to add. */
  bySector: Map<string, PlacedObject[]>
  /** With Replace on: how many objects Apply takes out of the domain first. */
  removes: number
}

export interface PcgInput {
  domain: PcgDomain
  graph: PcgGraph
  /** Sector key -> working copy, for every sector the domain touches. */
  sectors: Map<string, PcgSector>
  palette: LandscapePalette
  manualEdits?: PcgManualEdit[]
  /** Where the view is: cells nearest to it are generated first. */
  generationSource?: { x: number; y: number }
  /** The sectors with unsaved changes already: they count toward what one save takes. */
  unsaved?: Iterable<string>
  biomes?: PcgBiomeSet
}

/** The batch route takes this many sectors a save, and the editor sends one request. */
export const SAVE_LIMIT = 64

// ## the built-in graphs

const BINARY: PcgDifference = {
  sources: ['water', 'walls', 'authored', 'layers'],
  densityFunction: 'Binary',
}

const ANY_FACING: PcgTransformPoints = {
  rotationMin: 0,
  rotationMax: 7,
  absoluteRotation: true,
  offsetMin: [0, 0],
  offsetMax: [0, 0],
  recomputeSeed: false,
}

const BY_SIZE: PcgSelfPruning = {
  pruningType: 'LargeToSmall',
  radiusSimilarityFactor: 0,
  randomizedPruning: true,
  comparisonSource: 'extents',
}

const DUPLICATES: PcgSelfPruning = {
  pruningType: 'RemoveDuplicates',
  radiusSimilarityFactor: 0,
  randomizedPruning: false,
  comparisonSource: 'extents',
}

const PATCHES: PcgSpatialNoise = {
  mode: 'Perlin2D',
  scale: 24,
  iterations: 2,
  brightness: 0.2,
  contrast: 1,
  randomOffset: 0,
  voronoiCellRandomness: 1,
}

const PARAMETERS: PcgParameters = {
  seed: 1337,
  hiGenDefaultGridSize: 48,
  boundsExpansion: -1,
  filters: [{ attribute: 'slope', max: 12 }],
  booleans: {},
  replace: false,
}

const AREA_TOOLS: PcgToolTag[] = ['VolumeTool', 'SplineSurfaceTool', 'PaintTool']
const ANY_TOOL: PcgToolTag[] = [...AREA_TOOLS, 'SplineTool']

// object ids are indices into rsc-data's config/objects.json

/** Large, prominent objects: one pass over the whole domain. */
const TREES: PcgLayer = {
  id: 'trees',
  label: 'Trees',
  enabled: true,
  debug: false,
  seed: 1,
  gridSize: 'Unbounded',
  // one candidate per 4x4 tiles, anywhere in its cell
  sampler: { pointExtents: 4, looseness: 1, pointSteepness: 0.5 },
  spatialNoise: PATCHES,
  // no trees within 2 tiles of water, thinning out to 6
  distances: [
    { target: 'water', maximumDistance: 6, setDensity: true, outputAttribute: 'distanceWater' },
  ],
  density: [
    {
      node: 'DensityRemap',
      inRangeMin: 0.33,
      inRangeMax: 1,
      outRangeMin: 0,
      outRangeMax: 1,
      excludeValuesOutsideInputRange: false,
    },
    // clearings and thickets
    { node: 'AttributeMathsOp', op: 'Multiply', attribute: 'noise' },
  ],
  difference: BINARY,
  ratio: 0.9,
  spawner: {
    applyMeshBoundsToPoints: true,
    meshSelector: {
      type: 'Weighted',
      meshEntries: [
        { objectId: 0, weight: 30 },
        { objectId: 1, weight: 20 },
        { objectId: 1194, weight: 8 }, // Evergreen
        { objectId: 310, weight: 4 },
        { objectId: 306, weight: 12, spacing: 1 }, // Oak, 2x2
        { objectId: 308, weight: 5, spacing: 2 }, // Maple, 2x2
        { objectId: 309, weight: 3, spacing: 3 }, // Yew, 2x2
        // Willow, 2x2: only where water is close
        {
          objectId: 307,
          weight: 8,
          spacing: 2,
          filterOptions: { waterDistance: { min: 0, max: 5 } },
        },
      ],
    },
  },
  transform: ANY_FACING,
  boundsModifier: { expand: 1 },
  selfPruning: BY_SIZE,
}

const ROCKS: PcgLayer = {
  id: 'rocks',
  label: 'Rocks',
  enabled: true,
  debug: false,
  seed: 2,
  gridSize: 'Unbounded',
  sampler: { pointExtents: 6, looseness: 1, pointSteepness: 1 },
  difference: BINARY,
  ratio: 0.5,
  spawner: {
    applyMeshBoundsToPoints: true,
    meshSelector: {
      type: 'Weighted',
      meshEntries: [
        { objectId: 98, weight: 20 },
        { objectId: 164, weight: 20 },
        { objectId: 772, weight: 4, spacing: 2 }, // 2x2
        { objectId: 867, weight: 2, spacing: 2 }, // Boulder, 2x2
      ],
    },
  },
  transform: ANY_FACING,
  boundsModifier: { expand: 1 },
  selfPruning: BY_SIZE,
}

/** Small detail: per tile, a sector at a time. */
const FLOWERS: PcgLayer = {
  id: 'flowers',
  label: 'Flowers & ferns',
  enabled: true,
  debug: false,
  seed: 3,
  gridSize: 48,
  sampler: { pointExtents: 1, looseness: 0, pointSteepness: 1 },
  spatialNoise: { ...PATCHES, scale: 12, iterations: 1, brightness: 0 },
  distances: [
    { target: 'water', maximumDistance: 6, setDensity: false, outputAttribute: 'distanceWater' },
  ],
  density: [{ node: 'AttributeMathsOp', op: 'Multiply', attribute: 'noise' }],
  // thinner near the trunks, not a hard hole: the trees' steepness is 0.5
  difference: { ...BINARY, densityFunction: 'ClampedSubtraction' },
  ratio: 0.1,
  spawner: {
    applyMeshBoundsToPoints: true,
    meshSelector: {
      type: 'Weighted',
      meshEntries: [
        { objectId: 37, weight: 20 },
        { objectId: 188, weight: 20 },
        { objectId: 34, weight: 14 },
        { objectId: 396, weight: 10 },
        { objectId: 38, weight: 6 },
        // Tall Reeds: by the water only
        { objectId: 1163, weight: 4, filterOptions: { waterDistance: { min: 0, max: 3 } } },
      ],
    },
  },
  transform: ANY_FACING,
  selfPruning: DUPLICATES,
}

const BUSHES: PcgLayer = {
  id: 'bushes',
  label: 'Bushes',
  enabled: true,
  debug: false,
  seed: 4,
  gridSize: 48,
  sampler: { pointExtents: 3, looseness: 1, pointSteepness: 1 },
  difference: BINARY,
  ratio: 0.2,
  spawner: {
    applyMeshBoundsToPoints: true,
    meshSelector: {
      type: 'Weighted',
      meshEntries: [
        { objectId: 283, weight: 10 },
        { objectId: 960, weight: 10 },
      ],
    },
  },
  transform: ANY_FACING,
  selfPruning: DUPLICATES,
}

/** A layer of trees like the forest's, of other species. */
const treesOf = (
  label: string,
  pointExtents: number,
  ratio: number,
  meshEntries: { objectId: number; weight: number; spacing?: number }[],
  patch: Partial<PcgLayer> = {},
): PcgLayer => ({
  ...TREES,
  label,
  sampler: { ...TREES.sampler, pointExtents },
  ratio,
  spawner: { applyMeshBoundsToPoints: true, meshSelector: { type: 'Weighted', meshEntries } },
  ...patch,
})

/**
 * The graphs the panel offers: templates, each a complete graph. Their
 * numbers are starting points, to be tuned with the debug view.
 */
export const PCG_GRAPHS: PcgGraph[] = [
  {
    id: 'forest',
    label: 'Forest',
    toolTags: AREA_TOOLS,
    parameters: { ...PARAMETERS, booleans: { bushes: false } },
    // the bushes are off unless the switch is on
    layers: [TREES, ROCKS, FLOWERS, { ...BUSHES, branch: 'bushes' }],
  },
  {
    id: 'rocks',
    label: 'Rocks',
    toolTags: ANY_TOOL,
    // rocks sit on slopes too
    parameters: { ...PARAMETERS, filters: [] },
    layers: [
      {
        ...ROCKS,
        sampler: { pointExtents: 3, looseness: 1, pointSteepness: 1 },
        spatialNoise: { ...PATCHES, scale: 16 },
        density: [{ node: 'AttributeMathsOp', op: 'Multiply', attribute: 'noise' }],
        ratio: 0.6,
        spawner: {
          applyMeshBoundsToPoints: true,
          meshSelector: {
            type: 'Weighted',
            meshEntries: [
              { objectId: 98, weight: 20 },
              { objectId: 164, weight: 20 },
              { objectId: 195, weight: 10 },
              { objectId: 515, weight: 10 },
              { objectId: 772, weight: 5, spacing: 1 }, // 2x2
              { objectId: 819, weight: 5, spacing: 1 }, // 2x2
              { objectId: 867, weight: 3, spacing: 2 }, // Boulder, 2x2
              { objectId: 1184, weight: 3, spacing: 2 }, // Boulder, 2x2
            ],
          },
        },
      },
    ],
  },
  {
    id: 'meadow',
    label: 'Meadow',
    toolTags: ANY_TOOL,
    parameters: PARAMETERS,
    layers: [
      {
        ...FLOWERS,
        ratio: 0.25,
        spawner: {
          applyMeshBoundsToPoints: true,
          meshSelector: {
            type: 'Weighted',
            meshEntries: [
              { objectId: 37, weight: 20 },
              { objectId: 188, weight: 20 },
              { objectId: 34, weight: 10 },
              { objectId: 396, weight: 8 },
              { objectId: 397, weight: 8 },
              { objectId: 401, weight: 6 },
              { objectId: 38, weight: 6 }, // Mushroom
              // Tall Reeds: by the water only
              { objectId: 1163, weight: 8, filterOptions: { waterDistance: { min: 0, max: 3 } } },
            ],
          },
        },
      },
      { ...BUSHES, ratio: 0.15 },
    ],
  },
  {
    id: 'mixed',
    label: 'Mixed',
    toolTags: AREA_TOOLS,
    parameters: { ...PARAMETERS, booleans: { bushes: true } },
    layers: [TREES, ROCKS, FLOWERS, { ...BUSHES, branch: 'bushes' }],
  },
  {
    // only what rsc-data's skills/woodcutting.json lets a player chop
    id: 'woodcutting',
    label: 'Woodcutting',
    toolTags: ANY_TOOL,
    parameters: PARAMETERS,
    layers: [
      treesOf('Choppable trees', 4, 0.9, [
        { objectId: 0, weight: 24 },
        { objectId: 1, weight: 16 },
        { objectId: 70, weight: 6 },
        { objectId: 310, weight: 6 },
        { objectId: 1194, weight: 8 }, // Evergreen
        { objectId: 306, weight: 12, spacing: 1 }, // Oak
        { objectId: 307, weight: 8, spacing: 2 }, // Willow
        { objectId: 308, weight: 5, spacing: 2 }, // Maple
        { objectId: 309, weight: 3, spacing: 3 }, // Yew
        { objectId: 1196, weight: 4, spacing: 2 }, // Teak
        { objectId: 1197, weight: 3, spacing: 2 }, // Mahogany
      ]),
    ],
  },
  {
    id: 'jungle',
    label: 'Jungle',
    toolTags: ANY_TOOL,
    parameters: PARAMETERS,
    layers: [
      treesOf(
        'Jungle trees',
        3,
        0.9,
        [
          { objectId: 1086, weight: 20 },
          { objectId: 1091, weight: 20 },
          { objectId: 1092, weight: 20 },
          { objectId: 1099, weight: 12 },
          { objectId: 1100, weight: 12 },
          { objectId: 1087, weight: 4 }, // stump
        ],
        { boundsModifier: undefined, spatialNoise: { ...PATCHES, brightness: 0.35 } },
      ),
    ],
  },
  {
    id: 'desert',
    label: 'Desert',
    toolTags: ANY_TOOL,
    parameters: PARAMETERS,
    layers: [
      treesOf(
        'Cacti & palms',
        6,
        0.5,
        [
          { objectId: 1028, weight: 20 }, // Dried Cactus
          { objectId: 35, weight: 20 }, // Cactus
          { objectId: 553, weight: 6 }, // PalmTree
        ],
        // nothing here minds the water
        { distances: undefined, density: [{ node: 'AttributeMathsOp', op: 'Multiply', attribute: 'noise' }] },
      ),
    ],
  },
  {
    // made for a path: a hedge along it, a tree every few tiles
    id: 'hedgerow',
    label: 'Hedgerow',
    toolTags: ['SplineTool', 'PaintTool', 'VolumeTool'],
    parameters: { ...PARAMETERS, boundsExpansion: 0, filters: [] },
    layers: [
      treesOf(
        'Trees along it',
        5,
        0.6,
        [
          { objectId: 0, weight: 30 },
          { objectId: 1, weight: 20 },
          { objectId: 306, weight: 6 }, // Oak, 2x2
        ],
        { spatialNoise: undefined, distances: undefined, density: undefined, boundsModifier: undefined },
      ),
      {
        ...BUSHES,
        id: 'hedge',
        label: 'Hedge',
        gridSize: 'Unbounded',
        sampler: { pointExtents: 1, looseness: 0, pointSteepness: 1 },
        ratio: 0.9,
        spawner: {
          applyMeshBoundsToPoints: true,
          meshSelector: {
            type: 'Weighted',
            meshEntries: [
              { objectId: 284, weight: 30 }, // hedge
              { objectId: 283, weight: 4 }, // bush
            ],
          },
        },
      },
    ],
  },
]

// ## setups

/** A saved setup: a graph instance, and the manual edits made with it. */
export interface PcgSetup {
  version: 1
  instance: PcgInstance
  manualEdits: PcgManualEdit[]
  biomes?: PcgBiomeSet
}

/**
 * A past run, as the editor keeps it once it is saved: what was generated
 * from, and what it placed. With it a run can be cleaned up or made again
 * later, touching only the objects that are still as it left them.
 */
export interface PcgRun {
  id: string
  /** When it was applied. */
  at: string
  by?: string
  label: string
  seed: number
  domain: PcgDomain
  setup: PcgSetup
  objects: PlacedObject[]
}

/** The setup that brings a working graph back: only what differs from its template. */
export function setupOf(
  graph: PcgGraph,
  manualEdits: PcgManualEdit[],
  biomes: PcgBiomeSet = NO_BIOMES,
): PcgSetup {
  const template = PCG_GRAPHS.find((built) => built.id === graph.id) ?? graph

  return {
    version: 1,
    instance: instanceOf(graph, template),
    manualEdits,
    ...(biomes.rows.length ? { biomes } : {}),
  }
}

/** A setup file's graph, edits and biomes. Throws when the file is not one. */
export function readSetup(file: unknown): {
  graph: PcgGraph
  manualEdits: PcgManualEdit[]
  biomes: PcgBiomeSet
} {
  const setup = file as Partial<PcgSetup> | null
  const template = PCG_GRAPHS.find((built) => built.id === setup?.instance?.graph)

  if (!setup?.instance?.overrides || !template) {
    throw new Error('that file is not a PCG setup for a graph this editor has')
  }

  const graph = instantiate(template, setup.instance)

  // a layer added by hand in the file has to be a whole one
  if (
    !graph.layers.every(
      (layer) =>
        layer.sampler && layer.difference?.sources && layer.spawner?.meshSelector &&
        layer.transform?.offsetMin && layer.transform?.offsetMax && layer.selfPruning,
    )
  ) {
    throw new Error('a layer in that setup is missing some of its nodes')
  }

  return {
    graph,
    manualEdits: Array.isArray(setup.manualEdits)
      ? setup.manualEdits.filter(
          (edit) => typeof edit?.layer === 'string' && Number.isInteger(edit.x) && Number.isInteger(edit.y),
        )
      : [],
    biomes: Array.isArray(setup.biomes?.rows)
      ? {
          ...NO_BIOMES,
          ...setup.biomes,
          rows: setup.biomes.rows.filter(
            (row) => PCG_GRAPHS.some((built) => built.id === row?.graph) && Array.isArray(row.filters),
          ),
        }
      : NO_BIOMES,
  }
}

// ## domains

function inArea(area: TileArea, at: { x: number; y: number }) {
  return (
    at.x >= area.x && at.x < area.x + area.width && at.y >= area.y && at.y < area.y + area.height
  )
}

/** The rectangle round a domain, or null while it has no tile. */
export function areaOfDomain(domain: PcgDomain): TileArea | null {
  if (domain.tool === 'VolumeTool') {
    return domain.area
  }

  const tiles = domain.tool === 'PaintTool' ? domain.tiles : domain.points
  // a path reaches half its width to either side
  const reach = domain.tool === 'SplineTool' ? Math.ceil(Math.max(1, domain.width) / 2) : 0

  if (!tiles.length) {
    return null
  }

  const minX = Math.min(...tiles.map((tile) => tile.x)) - reach
  const minY = Math.min(...tiles.map((tile) => tile.y)) - reach

  return {
    x: minX,
    y: minY,
    width: Math.max(...tiles.map((tile) => tile.x)) + reach - minX + 1,
    height: Math.max(...tiles.map((tile) => tile.y)) + reach - minY + 1,
  }
}

/** How far a tile is from the line between two others. */
function fromSegment(
  x: number,
  y: number,
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const length = (b.x - a.x) ** 2 + (b.y - a.y) ** 2
  const along = length
    ? Math.max(0, Math.min(1, ((x - a.x) * (b.x - a.x) + (y - a.y) * (b.y - a.y)) / length))
    : 0

  return Math.hypot(x - (a.x + (b.x - a.x) * along), y - (a.y + (b.y - a.y) * along))
}

/**
 * Whether a tile is in a domain as it was drawn. A polygon has the tiles
 * inside it and the ones its outline runs through; a path the tiles within
 * half its width of its line.
 */
export function coverOf(domain: PcgDomain): (x: number, y: number) => boolean {
  if (domain.tool === 'VolumeTool') {
    return (x, y) => inArea(domain.area, { x, y })
  }

  if (domain.tool === 'PaintTool') {
    const tiles = new Set(domain.tiles.map((tile) => `${tile.x},${tile.y}`))

    return (x, y) => tiles.has(`${x},${y}`)
  }

  const { points } = domain
  // a polygon closes back on its first point
  const lines = points
    .map((point, i) => [point, points[(i + 1) % points.length]] as const)
    .slice(0, domain.tool === 'SplineTool' ? Math.max(1, points.length - 1) : points.length)
  const reach = domain.tool === 'SplineTool' ? Math.max(0.5, domain.width / 2) : 0.5

  return (x, y) => {
    if (lines.some(([a, b]) => fromSegment(x, y, a, b) <= reach)) {
      return true
    }

    if (domain.tool === 'SplineTool') {
      return false
    }

    // inside: a ray to the west crosses the outline an odd number of times
    let inside = false

    for (const [a, b] of lines) {
      if (a.y > y !== b.y > y && x < a.x + ((y - a.y) * (b.x - a.x)) / (b.y - a.y)) {
        inside = !inside
      }
    }

    return inside
  }
}

/**
 * The ground a graph reads for a domain: the rectangle round it, and what a
 * positive bounds expansion adds. The editor opens the sectors under this.
 */
export function reachOf(domain: PcgDomain, boundsExpansion: number): TileArea | null {
  const area = areaOfDomain(domain)

  if (!area) {
    return null
  }

  const more = Math.max(0, Math.round(boundsExpansion))

  return {
    x: area.x - more,
    y: area.y - more,
    width: area.width + more * 2,
    height: area.height + more * 2,
  }
}

// ## reading the map

/**
 * The open sectors as one surface: the rectangle around them all, with the
 * ground of each read in and the Difference's masks drawn on it. A tile of
 * the rectangle that is in none of them stays unread. `leaving` is the
 * scenery Replace is about to take away, which is no mask.
 */
function surfaceOf(
  sectors: Map<string, PcgSector>,
  palette: LandscapePalette,
  leaving: (object: PlacedObject) => boolean,
): PcgSurface {
  const refs = [...sectors].map(([key, sector]) => {
    const [plane, x, y] = key.split('.').map(Number)

    return {
      sector,
      ref: { plane, x, y },
      minX: (x - MIN_REGION_X) * SECTOR_SIZE,
      minY: (y - MIN_REGION_Y) * SECTOR_SIZE + plane * PLANE_HEIGHT,
    }
  })

  // with nothing open there is no ground at all
  const left = refs.length ? Math.min(...refs.map((ref) => ref.minX)) : 0
  const top = refs.length ? Math.min(...refs.map((ref) => ref.minY)) : 0
  const width = refs.length ? Math.max(...refs.map((ref) => ref.minX)) + SECTOR_SIZE - left : 0
  const height = refs.length ? Math.max(...refs.map((ref) => ref.minY)) + SECTOR_SIZE - top : 0
  const size = width * height

  const surface = {
    x: left,
    y: top,
    width,
    height,
    sectors: [...sectors.keys()],
    cells: refs.map(({ minX, minY }) => ({
      x: minX,
      y: minY,
      width: SECTOR_SIZE,
      height: SECTOR_SIZE,
    })),
    sector: new Uint16Array(size),
    elevation: new Uint8Array(size),
    colour: new Uint8Array(size),
    overlay: new Uint16Array(size),
    water: new Uint8Array(size),
    walls: new Uint8Array(size),
    authored: new Uint8Array(size),
    blocked: new Uint8Array(size),
  }

  const blocked = new Set(
    Object.entries(palette.overlays)
      .filter(([, overlay]) => overlay.blocked)
      .map(([id]) => Number(id)),
  )

  /** Marks a tile as taken, if the surface reaches it. */
  const occupy = (x: number, y: number) => {
    if (x >= left && y >= top && x < left + width && y < top + height) {
      surface.authored[(y - top) * width + (x - left)] = 1
    }
  }

  refs.forEach(({ sector, minX, minY }, n) => {
    const { tiles } = sector

    // column 0 of a sector is its westernmost tile, the one with the highest x
    for (let column = 0; column < SECTOR_SIZE; column++) {
      for (let row = 0; row < SECTOR_SIZE; row++) {
        const index = column * SECTOR_SIZE + row
        const at = (minY + row - top) * width + (minX + SECTOR_SIZE - 1 - column - left)

        surface.sector[at] = n + 1
        surface.elevation[at] = tiles.elevation[index]
        surface.colour[at] = tiles.colour[index]
        surface.overlay[at] = tiles.overlay[index]
        surface.water[at] = blocked.has(tiles.overlay[index]) ? 1 : 0
        surface.walls[at] =
          tiles.wallVertical[index] ||
          tiles.wallHorizontal[index] ||
          tiles.wallRoof[index] ||
          tiles.diagonal[index]
            ? 1
            : 0
      }
    }
  })

  for (const { sector, ref, minX, minY } of refs) {
    // where nobody can walk as the map stands, for the route check
    const staying = sector.objects.filter((object) => !leaving(object))

    for (const index of collisionOf(ref, sector.tiles, staying, sector.wallObjects, palette).tiles) {
      const x = minX + SECTOR_SIZE - 1 - Math.floor(index / SECTOR_SIZE)
      const y = minY + (index % SECTOR_SIZE)

      surface.blocked[(y - top) * width + (x - left)] = 1
    }

    for (const object of staying) {

      // an object is sized by the facing of the tile it stands on
      const index = gameToTile(ref, object.x, object.y)
      const facing = index === null ? object.direction : sector.tiles.direction[index]
      const area = footprintOf(object, facing, palette)

      for (let x = area.x; x < area.x + area.width; x++) {
        for (let y = area.y; y < area.y + area.height; y++) {
          occupy(x, y)
        }
      }
    }

    for (const spawn of [...sector.wallObjects, ...sector.npcs, ...sector.items]) {
      occupy(spawn.x, spawn.y)
    }
  }

  return surface
}

// ## generating

/** A layer on a grid cell per step, so the caller can paint in between. */
export function* runPcg(input: PcgInput): Generator<{ done: number; total: number }, PcgResult> {
  const { domain, sectors, palette, biomes } = input
  // a path and painted tiles are taken as drawn: a bounds expansion would
  // trim a stroke one tile wide to nothing
  const asDrawn = (made: PcgGraph): PcgGraph =>
    domain.tool === 'SplineTool' || domain.tool === 'PaintTool'
      ? { ...made, parameters: { ...made.parameters, boundsExpansion: 0 } }
      : made
  const graph = asDrawn(input.graph)
  const area = areaOfDomain(domain)
  const covers = coverOf(domain)

  // Replace takes the scenery standing in the drawn area away at Apply
  const leaving = (object: PlacedObject) => graph.parameters.replace && covers(object.x, object.y)

  // every object the palette knows, sized as footprintOf sizes it, and the
  // ones that stop a player
  const sizes = new Map<number, { width: number; height: number }>()
  const blocking = new Set<number>()

  for (const id of Object.keys(palette.objects)) {
    const info = palette.objectInfo[id]

    sizes.set(Number(id), { width: info?.width ?? 1, height: info?.height ?? 1 })

    if (info?.type === 'blocked') {
      blocking.add(Number(id))
    }
  }

  const surface = surfaceOf(sectors, palette, leaving)
  let mask: ArrayLike<number> | undefined

  // a rectangle is all of itself; any other shape is drawn onto the surface,
  // and a polygon's bounds expansion grows or trims the shape, not its rectangle
  if (domain.tool !== 'VolumeTool' && area) {
    const more = Math.round(graph.parameters.boundsExpansion)
    const drawn = new Uint8Array(surface.width * surface.height)

    for (let tile = 0; tile < drawn.length; tile++) {
      const x = surface.x + (tile % surface.width)
      const y = surface.y + Math.floor(tile / surface.width)

      drawn[tile] = inArea(area, { x, y }) && covers(x, y) ? 1 : 0
    }

    if (more > 0) {
      mask = distancesTo(surface, (tile) => !!drawn[tile], more + 1).map((far) => (far <= more ? 1 : 0))
    } else if (more < 0) {
      const inward = distancesTo(surface, (tile) => !drawn[tile], 1 - more)

      mask = drawn.map((on, tile) => (on && inward[tile] > -more ? 1 : 0))
    } else {
      mask = drawn
    }
  }

  const shared = {
    domain: area ?? { x: 0, y: 0, width: 0, height: 0 },
    surface,
    sizes,
    blocking,
    mask,
    manualEdits: input.manualEdits,
    generationSource: input.generationSource,
  }
  // the other biomes first, each on the ground it claims; the graph in hand
  // has what they leave
  const claims = (biomes?.rows ?? []).flatMap((row, i) => {
    const template = PCG_GRAPHS.find((built) => built.id === row.graph)

    return template ? [{ graph: asDrawn(template), filters: row.filters, prefix: `${i + 1}:` }] : []
  })

  const result = yield* claims.length && biomes
    ? runBiomes({
        ...shared,
        biomes: [...claims, { graph, filters: [], prefix: '' }],
        blend: biomes.blend,
        noise: {
          mode: 'Perlin2D',
          scale: biomes.noiseScale,
          iterations: 2,
          brightness: 0,
          contrast: 1,
          randomOffset: 0,
          voronoiCellRandomness: 1,
        },
      })
    : runGraph({ ...shared, graph })

  // an object lands in the sector that owns its anchor tile
  const bySector = new Map<string, PlacedObject[]>()

  for (const point of result.points) {
    if (point.culled) {
      continue
    }

    const placed = bySector.get(point.sector) ?? []

    placed.push({
      id: point.attributes.objectId,
      direction: point.rotation,
      x: point.x,
      y: point.y,
    })
    bySector.set(point.sector, placed)
  }

  // the sectors Apply would change, with the ones changed already: one save
  const saving = new Set([...bySector.keys(), ...(input.unsaved ?? [])])
  let removes = 0

  for (const [key, sector] of sectors) {
    const gone = sector.objects.filter(leaving).length

    if (gone) {
      removes += gone
      saving.add(key)
    }
  }

  if (saving.size > SAVE_LIMIT) {
    result.stats.errors.push(
      `Applying this would leave ${saving.size} sectors with unsaved changes, and a save takes ${SAVE_LIMIT} at most. Save what is changed already, or draw a smaller area.`,
    )
  }

  return { ...result, bySector, removes }
}

/** `runPcg`, run to the end. */
export function generatePcg(input: PcgInput): PcgResult {
  const run = runPcg(input)
  let step = run.next()

  while (!step.done) {
    step = run.next()
  }

  return step.value
}
