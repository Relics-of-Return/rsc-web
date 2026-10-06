import 'server-only'

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { MessageChannel, Worker, receiveMessageOnPort } from 'node:worker_threads'

import { readDefinitions } from '@/lib/definitions'
import { encodeHei } from '@/lib/landscape/hei'
import { editorCheckout } from '@/lib/stage'
import {
  OBJECT_BASE as OBJECT_OFFSET,
  PLANE_HEIGHT as PLANE_ELEVATION,
  SECTOR_SIZE,
  SECTOR_TILES,
  gameToTile,
  tileToGame,
  type ItemSpawn,
  type NpcSpawn,
  type PlacedObject,
  type SectorData,
  type SectorRef,
  type SectorTiles,
  type TileEdit,
} from '@/lib/landscape/types'

/** The sector asked for is not in the world. */
export class SectorNotFound extends Error {}

/**
 * The sector changed since the editor loaded it — another tab, another staff
 * member. Saving anyway would silently throw their work away.
 */
export class SectorConflict extends Error {
  /** The entry names of every sector that moved on, e.g. m05050. */
  constructor(
    message: string,
    readonly sectors: string[] = [],
  ) {
    super(message)
  }
}

/** Something in the save does not describe a real object or position. */
export class InvalidSave extends Error {}

/* eslint-disable @typescript-eslint/no-explicit-any --
   rsc-landscape and rsc-archiver are untyped CommonJS. They are loaded
   through require rather than import so Next leaves the native canvas
   dependency alone (see serverExternalPackages in next.config.ts). */

/**
 * Reads and writes the world the game actually runs on.
 *
 * The four archives live in rsc-server/data/landscape — the project's own
 * copy, which rsc-server's model/world.js prefers over the one in
 * node_modules precisely so that edits survive an npm install. The client
 * serves its copy out of rsc-client/dist/data204, so a save has to land in
 * both or the two halves disagree about the world.
 */

// every file this module touches is runtime data outside the app, chosen at
// runtime, so Next's output tracer is told to keep out of it. it needs the
// /*turbopackIgnore*/ on both the path.join and the fs call that uses it -
// either one alone still has it give up and trace the whole project into the
// route (1,548 files, public/ included). found by bisecting the build

const ARCHIVES = [
  'land63.jag',
  'land63.mem',
  'maps63.jag',
  'maps63.mem',
] as const

type ArchiveName = (typeof ARCHIVES)[number]

/** Where the server reads the world from. Override for a different checkout. */
function serverLandscapeDir(): string {
  return (
    process.env.RSC_LANDSCAPE_DIR ??
    path.join(/*turbopackIgnore: true*/ editorCheckout('rsc-server'), 'data', 'landscape')
  )
}

/** Where the client serves its copy from. */
function clientLandscapeDir(): string {
  return (
    process.env.RSC_CLIENT_DATA_DIR ??
    path.join(/*turbopackIgnore: true*/ editorCheckout('rsc-client'), 'dist', 'data204')
  )
}

/**
 * Where the server reads its spawn lists from. rsc-server's model/world.js
 * prefers this copy over rsc-data's, the same way it does for the landscape.
 */
function locationsDir(): string {
  return (
    process.env.RSC_LOCATIONS_DIR ??
    path.join(/*turbopackIgnore: true*/ editorCheckout('rsc-server'), 'data', 'locations')
  )
}

/**
 * Writes through a temporary file and a rename, so a crash or a full disk
 * mid-write leaves the old file intact rather than half a new one. The
 * first overwrite of any file also keeps the original beside it.
 */
function writeAtomic(file: string, data: Buffer | string): void {
  if (fs.existsSync(/*turbopackIgnore: true*/ file) && !fs.existsSync(/*turbopackIgnore: true*/ `${file}.backup`)) {
    fs.copyFileSync(/*turbopackIgnore: true*/ file, `${file}.backup`)
  }

  const temporary = `${file}.${process.pid}.tmp`

  fs.writeFileSync(/*turbopackIgnore: true*/ temporary, data)
  fs.renameSync(/*turbopackIgnore: true*/ temporary, file)
}

function requireLandscape() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@2003scape/rsc-landscape')
}

function requireArchiver() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@2003scape/rsc-archiver')
}

/**
 * rsc-landscape's encoders hand back Int8Array and rsc-archiver's putEntry
 * silently truncates one — a nine-byte Int8Array comes back out of the
 * archive as three bytes. Everything written goes through here first.
 */
function toBuffer(encoded: any): Buffer {
  if (Buffer.isBuffer(encoded)) {
    return encoded
  }

  return Buffer.from(encoded.buffer, encoded.byteOffset, encoded.byteLength)
}

function readArchives(directory: string): Record<ArchiveName, Buffer> {
  const out = {} as Record<ArchiveName, Buffer>

  for (const name of ARCHIVES) {
    out[name] = fs.readFileSync(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ directory, name))
  }

  return out
}

/** Where the client's own build lives, for the 3D preview's bundle and art. */
function clientDistDir(): string {
  return (
    process.env.RSC_CLIENT_DIST_DIR ??
    path.join(/*turbopackIgnore: true*/ editorCheckout('rsc-client'), 'dist')
  )
}

/**
 * The archives the 3D preview loads, and where each comes from. The map is
 * read from the server's copy — the world as saved, which is what the
 * preview's neighbouring sectors must show — and the game's art from the
 * client's build. Nothing outside this list is served.
 */
const PREVIEW_ARCHIVES: Record<string, 'client' | 'server'> = {
  'config85.jag': 'client',
  'textures17.jag': 'client',
  'models36.jag': 'client',
  'land63.jag': 'server',
  'land63.mem': 'server',
  'maps63.jag': 'server',
  'maps63.mem': 'server',
}

export function readPreviewArchive(name: string): Buffer | null {
  const source = PREVIEW_ARCHIVES[name]

  if (!source) {
    return null
  }

  const directory =
    source === 'server'
      ? serverLandscapeDir()
      : path.join(/*turbopackIgnore: true*/ clientDistDir(), 'data204')

  return fs.readFileSync(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ directory, name))
}

/**
 * The preview renderer, bundled from rsc-client (npm run build-preview
 * there). null when it has not been built.
 */
export function readPreviewBundle(): Buffer | null {
  const file = path.join(/*turbopackIgnore: true*/ clientDistDir(), 'editor-preview.bundle.js')

  return fs.existsSync(/*turbopackIgnore: true*/ file)
    ? fs.readFileSync(/*turbopackIgnore: true*/ file)
    : null
}

/** Every spawn in the world, for the 3D preview's neighbouring sectors. */
export function readAllLocations(): {
  objects: PlacedObject[]
  wallObjects: PlacedObject[]
} {
  return {
    objects: readLocations('objects'),
    wallObjects: readLocations('wall-objects'),
  }
}

/** Parses the world. Not cached: a save has to be visible immediately. */
export function loadLandscape(): any {
  const { Landscape } = requireLandscape()
  const files = readArchives(serverLandscapeDir())

  const landscape = new Landscape()

  landscape.loadJag(files['land63.jag'], files['maps63.jag'])
  landscape.loadMem(files['land63.mem'], files['maps63.mem'])
  landscape.parseArchives()

  return landscape
}

/**
 * Every sector with anything in it. Not rsc-landscape's getPopulatedSectors:
 * that loops up to its highest region x and y exclusively, so the last
 * column and row of the world never come out of it - nine members sectors
 * with real ground, walls and 1,579 spawns (m05555-m05755 and six under
 * them, and m36449-m36451 in the dungeons).
 */
function* sectorsOf(landscape: any): Generator<any> {
  for (const column of landscape.sectors) {
    for (const row of column ?? []) {
      for (const sector of row ?? []) {
        if (sector && !sector.empty) {
          yield sector
        }
      }
    }
  }
}

function refOf(sector: any): SectorRef {
  return {
    name: sector.getEntryName(),
    plane: sector.plane,
    x: sector.x,
    y: sector.y,
    members: !!sector.members,
  }
}

/** Every sector that has anything in it, for the navigator. */
export function listSectors(): SectorRef[] {
  const landscape = loadLandscape()
  const sectors: SectorRef[] = []

  for (const sector of sectorsOf(landscape)) {
    sectors.push(refOf(sector))
  }

  return sectors.sort(
    (a, b) => a.plane - b.plane || a.x - b.x || a.y - b.y,
  )
}

function findSector(landscape: any, plane: number, x: number, y: number): any {
  for (const sector of sectorsOf(landscape)) {
    if (sector.plane === plane && sector.x === x && sector.y === y) {
      return sector
    }
  }

  return null
}

/**
 * The tiles of one sector, columnar.
 *
 * Note the index: rsc-landscape reverses the outer array when it builds
 * tiles, so `tiles[x][y]` is already in the orientation its own
 * populateBuffers expects to read back. `x * 48 + y` keeps that ordering.
 */
export function readSector(
  plane: number,
  x: number,
  y: number,
): (SectorData & { version: string }) | null {
  const landscape = loadLandscape()
  const sector = findSector(landscape, plane, x, y)

  if (!sector) {
    return null
  }

  const data = sectorData(sector)

  return { ...data, version: versionOf(data) }
}

/**
 * Several sectors from one parse of the world — the editor's map shows a
 * window onto the world, not one sector at a time. Sectors that do not
 * exist are left out; the caller can tell from what came back.
 */
export function readSectors(
  refs: { plane: number; x: number; y: number }[],
): (SectorData & { version: string })[] {
  const landscape = loadLandscape()
  const spawns = readSpawns()
  const out: (SectorData & { version: string })[] = []

  for (const ref of refs) {
    const sector = findSector(landscape, ref.plane, ref.x, ref.y)

    if (sector) {
      const data = sectorData(sector, spawns)

      out.push({ ...data, version: versionOf(data) })
    }
  }

  return out
}

/**
 * A fingerprint of everything the editor shows for a sector. The editor
 * sends back the one it loaded, and a save is refused if the sector has
 * moved on since — two tabs, or two staff members, would otherwise quietly
 * overwrite each other.
 */
function versionOf(data: SectorData): string {
  return crypto
    .createHash('sha1')
    .update(
      JSON.stringify([data.tiles, data.objects, data.wallObjects]),
    )
    .digest('hex')
    .slice(0, 16)
}

/**
 * The four spawn lists: each file in data/locations, and the field the
 * editor sends it in.
 */
const SPAWN_KINDS = [
  { file: 'objects', field: 'objects' },
  { file: 'wall-objects', field: 'wallObjects' },
  { file: 'npcs', field: 'npcs' },
  { file: 'items', field: 'items' },
] as const

type SpawnFile = (typeof SPAWN_KINDS)[number]['file']
type SpawnField = (typeof SPAWN_KINDS)[number]['field']
type Spawn = PlacedObject | NpcSpawn | ItemSpawn

/** Every spawn list, read once for a batch of sectors. */
interface Spawns {
  objects: PlacedObject[]
  wallObjects: PlacedObject[]
  npcs: NpcSpawn[]
  items: ItemSpawn[]
}

function readSpawns(): Spawns {
  return {
    objects: readLocations('objects'),
    wallObjects: readLocations('wall-objects'),
    npcs: readLocations('npcs'),
    items: readLocations('items'),
  }
}

function sectorData(sector: any, spawns: Spawns = readSpawns()): SectorData {
  const ref = refOf(sector)

  const tiles: SectorTiles = {
    colour: new Array(SECTOR_TILES).fill(0),
    elevation: new Array(SECTOR_TILES).fill(0),
    overlay: new Array(SECTOR_TILES).fill(0),
    direction: new Array(SECTOR_TILES).fill(0),
    wallVertical: new Array(SECTOR_TILES).fill(0),
    wallHorizontal: new Array(SECTOR_TILES).fill(0),
    wallRoof: new Array(SECTOR_TILES).fill(0),
    diagonal: new Array(SECTOR_TILES).fill(0),
  }

  for (let tx = 0; tx < SECTOR_SIZE; tx++) {
    for (let ty = 0; ty < SECTOR_SIZE; ty++) {
      const tile = sector.tiles[tx][ty]
      const index = tx * SECTOR_SIZE + ty

      tiles.colour[index] = tile.colour
      tiles.elevation[index] = tile.elevation
      tiles.overlay[index] = tile.overlay
      tiles.direction[index] = tile.direction
      tiles.wallVertical[index] = tile.wall.vertical ?? 0
      tiles.wallHorizontal[index] = tile.wall.horizontal ?? 0
      tiles.wallRoof[index] = tile.wall.roof ?? 0

      // the raw shared buffer, read back out of the parsed tile
      if (tile.objectId !== null && tile.objectId !== undefined) {
        tiles.diagonal[index] = tile.objectId + 48001
      } else if (tile.wall.diagonal) {
        const { direction, overlay } = tile.wall.diagonal
        tiles.diagonal[index] = direction === '\\' ? overlay + 12000 : overlay
      }
    }
  }

  return {
    ...ref,
    tiles,
    objects: spawns.objects.filter((e) => gameToTile(ref, e.x, e.y) !== null),
    wallObjects: spawns.wallObjects.filter(
      (e) => gameToTile(ref, e.x, e.y) !== null,
    ),
    npcs: spawns.npcs.filter((e) => gameToTile(ref, e.x, e.y) !== null),
    items: spawns.items.filter((e) => gameToTile(ref, e.x, e.y) !== null),
  }
}

function readLocations(kind: SpawnFile): any[] {
  return JSON.parse(
    fs.readFileSync(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ locationsDir(), `${kind}.json`), 'utf8'),
  )
}

/**
 * rsc-data's own layouts, each proved to reproduce its shipped file byte for
 * byte, so a save that changes one tree shows up as one changed line:
 * scenery and doors one entry a line, with a blank line at the end; ground
 * items one a line without it; NPCs as indented JSON, each entry's keys in
 * the order they came in (the shipped file is not consistent about it).
 */
function formatLocations(kind: SpawnFile, entries: Spawn[]): string {
  if (kind === 'npcs') {
    return `${JSON.stringify(entries, null, 4)}\n`
  }

  if (kind === 'items') {
    const lines = (entries as ItemSpawn[]).map(
      (e) =>
        `    { "id": ${e.id}, ` +
        (e.amount !== undefined ? `"amount": ${e.amount}, ` : '') +
        `"respawn": ${e.respawn}, "x": ${e.x}, "y": ${e.y} }`,
    )

    return `[\n${lines.join(',\n')}\n]\n`
  }

  const lines = (entries as PlacedObject[]).map(
    (e) =>
      `    { "id": ${e.id}, "direction": ${e.direction}, ` +
      `"x": ${e.x}, "y": ${e.y} }`,
  )

  return `[\n${lines.join(',\n')}\n]\n\n`
}

/**
 * Replaces one sector's entries in a spawn list while disturbing nothing
 * else.
 *
 * Entries are matched as a multiset rather than a set: objects.json holds 27
 * exact duplicates, and they are real data. Anything that survives stays on
 * the line it was on. New or changed entries go in at their sorted position
 * when the file is sorted by id (objects.json is) and at the end when it is
 * not (wall-objects.json).
 */
function replaceInSector<T extends Spawn>(
  all: T[],
  sector: { plane: number; x: number; y: number },
  next: T[],
): T[] {
  // every field, whatever order the keys came in
  const key = (e: T) =>
    Object.keys(e)
      .sort()
      .map((k) => `${k}=${(e as unknown as Record<string, number>)[k]}`)
      .join(',')

  const wanted = new Map<string, number>()

  for (const entry of next) {
    wanted.set(key(entry), (wanted.get(key(entry)) ?? 0) + 1)
  }

  const kept: T[] = []

  for (const entry of all) {
    if (gameToTile(sector, entry.x, entry.y) === null) {
      kept.push(entry)
      continue
    }

    const remaining = wanted.get(key(entry)) ?? 0

    // still wanted exactly as it is: leave it where it was. otherwise it was
    // removed or changed, and a changed one comes back below
    if (remaining > 0) {
      wanted.set(key(entry), remaining - 1)
      kept.push(entry)
    }
  }

  const added: T[] = []

  for (const entry of next) {
    const remaining = wanted.get(key(entry)) ?? 0

    if (remaining > 0) {
      wanted.set(key(entry), remaining - 1)
      added.push(entry)
    }
  }

  const sorted = all.every((e, i) => i === 0 || all[i - 1].id <= e.id)

  if (!sorted) {
    return [...kept, ...added]
  }

  for (const entry of added) {
    let low = 0
    let high = kept.length

    while (low < high) {
      const middle = (low + high) >> 1

      if (kept[middle].id <= entry.id) {
        low = middle + 1
      } else {
        high = middle
      }
    }

    kept.splice(low, 0, entry)
  }

  return kept
}

/** Which of a sector's files an edit reaches: .hei holds height and colour, .dat the rest. */
interface Touched {
  hei: boolean
  dat: boolean
}

/** Applies edits to a live sector's tile objects, and says which files they reach. */
function applyEdits(sector: any, edits: TileEdit[]): Touched {
  const touched = { hei: false, dat: false }

  for (const edit of edits) {
    const tx = Math.floor(edit.index / SECTOR_SIZE)
    const ty = edit.index % SECTOR_SIZE

    if (tx < 0 || tx >= SECTOR_SIZE || ty < 0 || ty >= SECTOR_SIZE) {
      throw new Error(`tile index ${edit.index} is outside the sector`)
    }

    const tile = sector.tiles[tx][ty]
    const before = JSON.stringify([tile.overlay, tile.direction, tile.wall, tile.objectId ?? null])

    touched.hei ||=
      (edit.colour & 0xfe) !== tile.colour || (edit.elevation & 0xfe) !== tile.elevation

    // both are 7 bits doubled in the .hei format, so only even values can be
    // stored — snapping here keeps what is held equal to what gets written
    tile.colour = edit.colour & 0xfe
    tile.elevation = edit.elevation & 0xfe
    tile.overlay = edit.overlay & 0xff
    tile.direction = edit.direction & 0xff
    tile.wall.vertical = edit.wallVertical || null
    tile.wall.horizontal = edit.wallHorizontal || null
    tile.wall.roof = edit.wallRoof || null

    // one buffer holds both, so setting either clears the other
    const diagonal = edit.diagonal

    if (diagonal >= 48000) {
      tile.objectId = diagonal - 48001
      tile.wall.diagonal = null
    } else if (diagonal >= 12000) {
      tile.objectId = null
      tile.wall.diagonal = { direction: '\\', overlay: diagonal - 12000 }
    } else if (diagonal > 0) {
      tile.objectId = null
      tile.wall.diagonal = { direction: '/', overlay: diagonal }
    } else {
      tile.objectId = null
      tile.wall.diagonal = null
    }

    touched.dat ||=
      JSON.stringify([tile.overlay, tile.direction, tile.wall, tile.objectId ?? null]) !== before
  }

  // push the tile objects back into the buffers the encoders read
  sector.populateBuffers()

  return touched
}

/** Which source archive an entry came from, so it goes back where it was. */
function homeOf(
  archives: Record<string, any>,
  entry: string,
  kind: 'hei' | 'dat' | 'loc',
): ArchiveName | null {
  const family = kind === 'hei' ? 'land63' : 'maps63'

  for (const suffix of ['.jag', '.mem'] as const) {
    const name = (family + suffix) as ArchiveName

    if (archives[name].hasEntry(entry)) {
      return name
    }
  }

  return null
}

function hasTerrain(sector: any): boolean {
  for (let x = 0; x < SECTOR_SIZE; x++) {
    for (let y = 0; y < SECTOR_SIZE; y++) {
      const tile = sector.tiles[x][y]

      if (tile.elevation !== 0 || tile.colour !== 0) {
        return true
      }
    }
  }

  return false
}

/** Compressing takes about three seconds; this only stops a dead worker hanging a save for good. */
const COMPRESS_TIMEOUT = 120_000

// the worker's side of compressArchives: each archive rebuilt from its
// entries and bzipped as a whole, which is what the originals do - entry by
// entry costs about 30% more, and these are served to every client
const COMPRESS_WORKER = `
const { workerData } = require('node:worker_threads')
const { createRequire } = require('node:module')
const { done, port, base, archives } = workerData

try {
  const { JagArchive } = createRequire(base)('@2003scape/rsc-archiver')
  const compressed = {}

  for (const [name, entries] of Object.entries(archives)) {
    const archive = new JagArchive()

    for (const [hash, data] of entries) {
      archive.entries.set(hash, Buffer.from(data.buffer, data.byteOffset, data.byteLength))
    }

    compressed[name] = archive.toArchive(false)
  }

  port.postMessage({ compressed })
} catch (error) {
  port.postMessage({ error: String((error && error.stack) || error) })
}

Atomics.store(done, 0, 1)
Atomics.notify(done, 0)
`

/**
 * Compresses the rebuilt archives on a worker thread, and waits for it.
 *
 * rsc-archiver bzips with compressjs, which calls console.assert about 13
 * million times for these four archives. next dev wraps console.assert to
 * copy every call, passing or not, into a log queue that is only flushed
 * once the event loop is free - and a save holds the event loop until it's
 * done, so one save grew the dev server past 6GB without finishing.
 * compressjs binds console.assert when it's first loaded, by whichever route
 * gets there first, so it can't be swapped out around the call. a worker has
 * its own console and its own compressjs, and the save still waits for it,
 * so two saves still can't overlap.
 */
function compressArchives(built: Record<string, any>): Record<ArchiveName, Buffer> {
  const done = new Int32Array(new SharedArrayBuffer(4))
  const { port1, port2 } = new MessageChannel()
  const archives: Record<string, Map<number, Buffer>> = {}

  for (const name of ARCHIVES) {
    archives[name] = built[name].entries
  }

  const worker = new Worker(COMPRESS_WORKER, {
    eval: true,
    workerData: {
      done,
      port: port2,
      base: path.join(/*turbopackIgnore: true*/ process.cwd(), 'package.json'),
      archives,
    },
    transferList: [port2],
  })

  // without a listener, an error the worker didn't catch would take the
  // server down with it. the save reports it as a timeout instead
  worker.on('error', () => {})

  try {
    if (Atomics.wait(done, 0, 0, COMPRESS_TIMEOUT) === 'timed-out') {
      throw new Error('compressing the world took too long')
    }

    const reply = receiveMessageOnPort(port1)?.message

    if (!reply || reply.error) {
      throw new Error(`failed to compress the world: ${reply?.error ?? 'no reply'}`)
    }

    const out = {} as Record<ArchiveName, Buffer>

    for (const name of ARCHIVES) {
      const data: Uint8Array = reply.compressed[name]
      out[name] = Buffer.from(data.buffer, data.byteOffset, data.byteLength)
    }

    return out
  } finally {
    port1.close()
    void worker.terminate()
  }
}

/**
 * Rebuilds the four archives with the edited sectors re-encoded, and writes
 * them to both the server's copy and the client's.
 *
 * Everything else is copied across from the source archives entry for entry.
 * Re-encoding an untouched sector would come out the same once decoded but
 * not byte for byte - rsc-landscape's encoders pick their own runs - which
 * would turn a one-tile save into a 180-entry diff.
 */
function saveLandscape(
  landscape: any,
  edited: Map<any, Touched>,
): { written: string[]; bytes: number } {
  const { JagArchive } = requireArchiver()

  const serverDir = serverLandscapeDir()
  const source = readArchives(serverDir)

  const sourceArchives: Record<string, any> = {}
  const built: Record<string, any> = {}

  for (const name of ARCHIVES) {
    const reader = new JagArchive()
    reader.readArchive(source[name])
    sourceArchives[name] = reader

    const writer = new JagArchive()

    for (const [hash, data] of reader.entries) {
      writer.entries.set(hash, data)
    }

    built[name] = writer
  }

  for (const [sector, touched] of edited) {
    const name = sector.getEntryName()

    const place = (kind: 'hei' | 'dat' | 'loc', encoded: any) => {
      const entry = `${name}.${kind}`

      const home =
        homeOf(sourceArchives, entry, kind) ??
        (((kind === 'hei' ? 'land63' : 'maps63') +
          (sector.members ? '.mem' : '.jag')) as ArchiveName)

      built[home].putEntry(entry, toBuffer(encoded))
    }

    if (touched.hei && (homeOf(sourceArchives, `${name}.hei`, 'hei') || hasTerrain(sector))) {
      // encodeHei rather than sector.toHei(): the library's encoder desyncs
      // from its own decoder as soon as an elevation changes. see hei.ts
      place('hei', encodeHei(sector.terrainHeight, sector.terrainColour))
    }

    if (touched.dat) {
      place('dat', sector.toDat())

      const loc = sector.toLoc()

      if (loc) {
        place('loc', loc)
      }
    }
  }

  // encoded once, then written to each place
  const encoded = compressArchives(built)

  const written: string[] = []
  let bytes = 0

  for (const directory of [serverDir, clientLandscapeDir()]) {
    if (!fs.existsSync(/*turbopackIgnore: true*/ directory)) {
      continue
    }

    for (const name of ARCHIVES) {
      const file = path.join(/*turbopackIgnore: true*/ directory, name)

      writeAtomic(file, encoded[name])

      written.push(file)
      bytes += encoded[name].length
    }
  }

  return { written, bytes }
}

// read from disk as they are now, so a save can place an object the model
// editor added since rsc-web started
const DEFINITIONS: Record<SpawnFile, () => Record<string, unknown>> = {
  objects: () => readDefinitions('objects') as unknown as Record<string, unknown>,
  'wall-objects': () => readDefinitions('wall-objects') as unknown as Record<string, unknown>,
  npcs: () => readDefinitions('npcs') as unknown as Record<string, unknown>,
  items: () => readDefinitions('items') as unknown as Record<string, unknown>,
}

const SINGULAR: Record<SpawnFile, string> = {
  objects: 'object',
  'wall-objects': 'wall object',
  npcs: 'NPC',
  items: 'item',
}

/** Checks a spawn list for a sector against the definitions and the bounds. */
function validateSpawns(
  entries: Spawn[],
  sector: { plane: number; x: number; y: number },
  kind: SpawnFile,
): void {
  const definitions = DEFINITIONS[kind]()
  const whole = (value: unknown, min = 0) =>
    Number.isInteger(value) && (value as number) >= min

  for (const entry of entries) {
    const what = `${SINGULAR[kind]} #${entry.id}`

    if (!(entry.id in definitions)) {
      throw new InvalidSave(`there is no ${what}`)
    }

    if (kind === 'objects' || kind === 'wall-objects') {
      // scenery faces any of eight ways; doors and walls only four
      const maxDirection = kind === 'objects' ? 7 : 3
      const { direction } = entry as PlacedObject

      if (!whole(direction) || direction > maxDirection) {
        throw new InvalidSave(`direction ${direction} is not 0-${maxDirection} for ${what}`)
      }
    } else if (kind === 'npcs') {
      const npc = entry as NpcSpawn

      if (
        ![npc.minX, npc.maxX, npc.minY, npc.maxY].every((n) => whole(n)) ||
        npc.minX > npc.maxX ||
        npc.minY > npc.maxY
      ) {
        throw new InvalidSave(`the wander box of ${what} at ${npc.x},${npc.y} is not a box`)
      }
    } else {
      const item = entry as ItemSpawn

      if (!whole(item.respawn) || (item.amount !== undefined && !whole(item.amount, 1))) {
        throw new InvalidSave(
          `${what} at ${item.x},${item.y} needs a respawn time and a positive amount`,
        )
      }
    }

    if (gameToTile(sector, entry.x, entry.y) === null) {
      throw new InvalidSave(`${what} at ${entry.x},${entry.y} is outside this sector`)
    }
  }
}

export interface SaveRequest {
  plane: number
  x: number
  y: number
  /** The version the editor loaded. A save against any other is refused. */
  version: string
  edits: TileEdit[]
  /** The sector's complete scenery, when it was touched. */
  objects?: PlacedObject[]
  /** The sector's complete wall objects, when they were touched. */
  wallObjects?: PlacedObject[]
  /** The sector's complete NPC spawns, when they were touched. */
  npcs?: NpcSpawn[]
  /** The sector's complete ground items, when they were touched. */
  items?: ItemSpawn[]
}

export interface SaveResult {
  /** The entry names of the sectors written, e.g. m05050. */
  sectors: string[]
  tiles: number
  /** Scenery entries now in the sectors whose scenery was saved. */
  objects: number | null
  /** Doors now in the sectors whose doors were saved. */
  wallObjects: number | null
  npcs: number | null
  items: number | null
  files: string[]
  bytes: number
}

/** Applies one sector's changes and writes the world. */
export function saveSector(request: SaveRequest): SaveResult {
  return saveSectors([request])
}

/**
 * Applies changes to any number of sectors and writes the world once.
 *
 * All or nothing: every sector's version is checked, and every spawn
 * validated, before anything is written — so an edit that runs across a
 * sector boundary is never saved half on one side of it.
 *
 * Entirely synchronous on purpose: Node cannot interleave two of these, so
 * two saves arriving at once are serialised for free instead of racing each
 * other through the same four archives.
 */
export function saveSectors(requests: SaveRequest[]): SaveResult {
  if (!requests.length) {
    throw new InvalidSave('nothing to save')
  }

  const seen = new Set<string>()

  for (const request of requests) {
    const key = `${request.plane}/${request.x}/${request.y}`

    if (seen.has(key)) {
      throw new InvalidSave(`sector ${key} appears twice in one save`)
    }

    seen.add(key)
  }

  const landscape = loadLandscape()
  const spawns = readSpawns()

  const found = requests.map((request) => {
    const sector = findSector(landscape, request.plane, request.x, request.y)

    if (!sector) {
      throw new SectorNotFound(
        `no sector at plane ${request.plane}, ${request.x}, ${request.y}`,
      )
    }

    return { request, sector, ref: refOf(sector) }
  })

  const moved = found.filter(
    ({ request, sector }) =>
      versionOf(sectorData(sector, spawns)) !== request.version,
  )

  if (moved.length) {
    const names = moved.map(({ ref }) => ref.name)

    throw new SectorConflict(
      `${names.join(', ')} changed since ${names.length === 1 ? 'it was' : 'they were'} loaded - reload before saving`,
      names,
    )
  }

  for (const { request, ref } of found) {
    for (const { file, field } of SPAWN_KINDS) {
      const next = request[field]

      if (next) {
        validateSpawns(next, ref, file)
      }
    }
  }

  const files: string[] = []
  let bytes = 0
  let tiles = 0

  const edited = new Map<any, Touched>()

  for (const { request, sector } of found) {
    if (request.edits.length) {
      edited.set(sector, applyEdits(sector, request.edits))
      tiles += request.edits.length
    }
  }

  if ([...edited.values()].some((touched) => touched.hei || touched.dat)) {
    const landscapeResult = saveLandscape(landscape, edited)

    files.push(...landscapeResult.written)
    bytes += landscapeResult.bytes
  }

  const counts: Record<SpawnField, number | null> = {
    objects: null,
    wallObjects: null,
    npcs: null,
    items: null,
  }

  for (const { file: kind, field } of SPAWN_KINDS) {
    const touched = found.filter(({ request }) => request[field])

    if (!touched.length) {
      continue
    }

    let entries: Spawn[] = spawns[field]

    for (const { request, ref } of touched) {
      const next: Spawn[] = request[field]!

      entries = replaceInSector(entries, ref, next)
      counts[field] = (counts[field] ?? 0) + next.length
    }

    const file = path.join(/*turbopackIgnore: true*/ locationsDir(), `${kind}.json`)
    const text = formatLocations(kind, entries)

    writeAtomic(file, text)

    files.push(file)
    bytes += Buffer.byteLength(text)

    // the client's HD graphics draw the scenery and doors past the region the
    // server has sent from their own copy (rsc-client/scripts/copy-locations.js)
    if (kind === 'objects' || kind === 'wall-objects') {
      const clientFile = path.join(
        /*turbopackIgnore: true*/ clientLandscapeDir(),
        '..',
        'locations',
        `${kind}.json`,
      )

      if (fs.existsSync(/*turbopackIgnore: true*/ path.dirname(clientFile))) {
        const compact = JSON.stringify(
          (entries as PlacedObject[]).map(({ id, x, y, direction }) => ({ id, x, y, direction })),
        )

        writeAtomic(clientFile, compact)
        files.push(clientFile)
      }
    }
  }

  return {
    sectors: found.map(({ ref }) => ref.name),
    tiles,
    objects: counts.objects,
    wallObjects: counts.wallObjects,
    npcs: counts.npcs,
    items: counts.items,
    files,
    bytes,
  }
}

// ## checking the world

/** Something in the world that is probably a mistake, and where it is. */
export interface Issue {
  kind: IssueKind
  x: number
  y: number
  text: string
}

export type IssueKind =
  | 'facing'
  | 'duplicate'
  | 'stacked'
  | 'npc-blocked'
  | 'npc-wander'
  | 'item-in-water'
  | 'no-ground'
  | 'unknown-id'
  | 'legacy-loc'

/** More than anyone reads; the counts stay exact beyond it. */
const ISSUE_LIMIT = 3000

/**
 * Whether the server stops anyone stepping on an overlay: its own tile table
 * (overlay n is tile n - 1) decides, which is not what the landscape
 * library's says for mud floor and logs.
 */
function overlayWalkBlocked(
  overlay: number,
  fallback: Record<string, { blocked?: boolean }>,
): boolean {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const serverTiles: { blocked?: boolean }[] = require('@2003scape/rsc-data/config/tiles')
  const tile = serverTiles[overlay - 1]

  return tile ? !!tile.blocked : !!fallback[String(overlay)]?.blocked
}

/**
 * Sweeps the whole world for the kinds of mistake an editor makes, or the
 * shipped data already has:
 *
 * - scenery the client and the server see facing different ways (the
 *   client turns a model by its tile's facing, the server by the object's)
 * - the same spawn listed twice, or two pieces of scenery on one tile
 * - NPCs that spawn on ground they cannot stand on, or outside the box they
 *   wander in; items dropped in water
 * - spawns in sectors with no ground at all, or of things that do not exist
 * - the old .loc scenery baked into two map squares, which nothing draws
 */
export function checkWorld(): { counts: Record<IssueKind, number>; issues: Issue[] } {
  const landscape = loadLandscape()
  const spawns = readSpawns()
  const { tileOverlays } = requireLandscape() as {
    tileOverlays: Record<string, { blocked?: boolean }>
  }

  const counts: Record<IssueKind, number> = {
    facing: 0,
    duplicate: 0,
    stacked: 0,
    'npc-blocked': 0,
    'npc-wander': 0,
    'item-in-water': 0,
    'no-ground': 0,
    'unknown-id': 0,
    'legacy-loc': 0,
  }
  const issues: Issue[] = []
  const report = (kind: IssueKind, x: number, y: number, text: string) => {
    counts[kind]++

    if (issues.length < ISSUE_LIMIT) {
      issues.push({ kind, x, y, text })
    }
  }

  // every sector's tiles, by key, read once
  const sectors = new Map<string, SectorTiles>()
  const tileOf = (x: number, y: number) => {
    const plane = Math.floor(y / PLANE_ELEVATION)
    const ref = {
      plane,
      x: Math.floor(x / SECTOR_SIZE) + 48,
      y: Math.floor((y - plane * PLANE_ELEVATION) / SECTOR_SIZE) + 37,
    }
    const tiles = sectors.get(`${ref.plane}.${ref.x}.${ref.y}`)
    const index = gameToTile(ref, x, y)

    return tiles && index !== null ? { tiles, index } : null
  }

  const none: Spawns = { objects: [], wallObjects: [], npcs: [], items: [] }

  for (const sector of sectorsOf(landscape)) {
    const data = sectorData(sector, none)

    sectors.set(`${data.plane}.${data.x}.${data.y}`, data.tiles)

    data.tiles.diagonal.forEach((value, index) => {
      if (value >= OBJECT_OFFSET - 1) {
        const at = tileToGame(data, index)

        report(
          'legacy-loc',
          at.x,
          at.y,
          `old .loc scenery #${value - OBJECT_OFFSET} in ${data.name}, which nothing draws`,
        )
      }
    })
  }

  const definitions = {} as Record<
    SpawnFile,
    Record<string, { name?: string; width?: number; height?: number; type?: string }>
  >

  for (const { file } of SPAWN_KINDS) {
    definitions[file] = DEFINITIONS[file]() as (typeof definitions)[SpawnFile]
  }

  const name = (kind: SpawnFile, id: number) => definitions[kind][id]?.name ?? `#${id}`

  // where blocked scenery stands, as the client sizes it
  const blocked = new Set<string>()

  for (const object of spawns.objects) {
    const found = tileOf(object.x, object.y)
    const definition = definitions.objects[object.id]

    if (!found || definition?.type !== 'blocked') {
      continue
    }

    const facing = found.tiles.direction[found.index]
    const turned = facing !== 0 && facing !== 4
    const width = (turned ? definition.height : definition.width) ?? 1
    const height = (turned ? definition.width : definition.height) ?? 1

    for (let x = object.x; x < object.x + width; x++) {
      for (let y = object.y; y < object.y + height; y++) {
        blocked.add(`${x},${y}`)
      }
    }
  }

  const overlayBlocked = (x: number, y: number) => {
    const found = tileOf(x, y)
    const overlay = found?.tiles.overlay[found.index]

    return !!overlay && overlayWalkBlocked(overlay, tileOverlays)
  }

  const lists: [SpawnFile, Spawn[]][] = [
    ['objects', spawns.objects],
    ['wall-objects', spawns.wallObjects],
    ['npcs', spawns.npcs],
    ['items', spawns.items],
  ]

  for (const [kind, entries] of lists) {
    const seen = new Map<string, number>()

    for (const entry of entries) {
      const what = `${SINGULAR[kind]} ${name(kind, entry.id)}`

      if (!(entry.id in definitions[kind])) {
        report('unknown-id', entry.x, entry.y, `there is no ${SINGULAR[kind]} #${entry.id}`)
      }

      if (!tileOf(entry.x, entry.y)) {
        report('no-ground', entry.x, entry.y, `${what} spawns where no sector is built`)
      }

      const key = Object.keys(entry)
        .sort()
        .map((k) => `${k}=${(entry as unknown as Record<string, number>)[k]}`)
        .join(',')

      seen.set(key, (seen.get(key) ?? 0) + 1)

      if (seen.get(key) === 2) {
        report('duplicate', entry.x, entry.y, `${what} is listed more than once, exactly the same`)
      }
    }
  }

  const onTile = new Map<string, number[]>()

  for (const object of spawns.objects) {
    const found = tileOf(object.x, object.y)
    const where = `${object.x},${object.y}`

    onTile.set(where, [...(onTile.get(where) ?? []), object.id])

    if (found && found.tiles.direction[found.index] !== object.direction) {
      report(
        'facing',
        object.x,
        object.y,
        `${name('objects', object.id)}: the game draws it facing ` +
          `${found.tiles.direction[found.index]}, the server has ${object.direction}`,
      )
    }
  }

  for (const [where, ids] of onTile) {
    if (new Set(ids).size > 1) {
      const [x, y] = where.split(',').map(Number)

      report('stacked', x, y, `${ids.map((id) => name('objects', id)).join(' and ')} share one tile`)
    }
  }

  for (const npc of spawns.npcs) {
    if (blocked.has(`${npc.x},${npc.y}`) || overlayBlocked(npc.x, npc.y)) {
      report('npc-blocked', npc.x, npc.y, `${name('npcs', npc.id)} spawns on a tile nobody can stand on`)
    }

    if (npc.x < npc.minX || npc.x > npc.maxX || npc.y < npc.minY || npc.y > npc.maxY) {
      report('npc-wander', npc.x, npc.y, `${name('npcs', npc.id)} spawns outside the box it wanders in`)
    }
  }

  for (const item of spawns.items) {
    if (overlayBlocked(item.x, item.y)) {
      report('item-in-water', item.x, item.y, `${name('items', item.id)} lies on blocked ground (water, a hole)`)
    }
  }

  return { counts, issues }
}
