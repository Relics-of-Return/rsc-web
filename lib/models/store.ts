import 'server-only'

import { execFile } from 'node:child_process'
import { EventEmitter } from 'node:events'
import fs from 'node:fs'
import path from 'node:path'

/**
 * The model editor's files: the model sources in rsc-client/assets/models
 * (ModelBuilder scripts, one model each, named as the model) and this
 * project's own textures in rsc-client/assets/textures. pack-cache turns both
 * into the archives the game loads.
 *
 * Nothing here runs a model. The browser runs a source to draw it
 * (rsc-client/src/editor/model-source.js); the server only reads and writes
 * the text. The one exception is packing, which runs rsc-client's own
 * pack-cache script, as `npm run build` does.
 *
 * Every path is chosen at runtime, outside the app, so Next's output tracer
 * is told to keep out of them (see lib/landscape/store.ts for why both the
 * join and the fs call need the comment).
 */

/** A model's name: what objects.json's model.name refers to. */
const NAME = /^[a-z0-9][a-z0-9_-]{0,39}$/

export class ModelNotFound extends Error {}
export class InvalidModel extends Error {}

/** The source changed on disk since the editor loaded it. */
export class ModelConflict extends Error {}

function clientDir(): string {
  return (
    process.env.RSC_CLIENT_DIR ??
    path.join(/*turbopackIgnore: true*/ process.cwd(), '..', 'rsc-client')
  )
}

function modelsDir(): string {
  return path.join(/*turbopackIgnore: true*/ clientDir(), 'assets', 'models')
}

function texturesDir(): string {
  return path.join(/*turbopackIgnore: true*/ clientDir(), 'assets', 'textures')
}

/** Where pack-cache writes the archives the game (and the World Editor) load. */
function archivesDir(): string {
  return path.join(
    /*turbopackIgnore: true*/ process.env.RSC_CLIENT_DIST_DIR ?? path.join(/*turbopackIgnore: true*/ clientDir(), 'dist'),
    'data204',
  )
}

export function checkName(name: string): string {
  if (!NAME.test(name)) {
    throw new InvalidModel(
      'a model name is lowercase letters, digits, - and _, starting with a letter or digit',
    )
  }

  return name
}

function sourceFile(name: string): string {
  return path.join(/*turbopackIgnore: true*/ modelsDir(), `${checkName(name)}.js`)
}

export interface ModelSourceInfo {
  name: string
  /** Repository-relative, for showing. */
  file: string
  size: number
  /** Milliseconds; also the version a save is checked against. */
  modified: number
}

export function listSources(): ModelSourceInfo[] {
  const directory = modelsDir()

  if (!fs.existsSync(/*turbopackIgnore: true*/ directory)) {
    return []
  }

  return fs
    .readdirSync(/*turbopackIgnore: true*/ directory)
    .filter((file) => file.endsWith('.js') && NAME.test(file.slice(0, -3)))
    .sort()
    .map((file) => {
      const stat = fs.statSync(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ directory, file))

      return {
        name: file.slice(0, -3),
        file: `rsc-client/assets/models/${file}`,
        size: stat.size,
        modified: Math.floor(stat.mtimeMs),
      }
    })
}

export function readSource(name: string): { source: string; modified: number } {
  const file = sourceFile(name)

  if (!fs.existsSync(/*turbopackIgnore: true*/ file)) {
    throw new ModelNotFound(`there is no model source named ${name}`)
  }

  return {
    source: fs.readFileSync(/*turbopackIgnore: true*/ file, 'utf8'),
    modified: Math.floor(fs.statSync(/*turbopackIgnore: true*/ file).mtimeMs),
  }
}

function writeAtomic(file: string, text: string): void {
  const temporary = `${file}.${process.pid}.tmp`

  fs.writeFileSync(/*turbopackIgnore: true*/ temporary, text)
  fs.renameSync(/*turbopackIgnore: true*/ temporary, file)
}

const MAX_SOURCE = 512 * 1024

/**
 * Saves a source. `expected` is the modified time the editor loaded it at:
 * if the file has moved on since (someone else, or Claude editing the file
 * directly), the save is refused rather than overwriting that work.
 * `create` saves a new model, and refuses one that already exists.
 */
export function writeSource(
  name: string,
  source: string,
  { expected = null, create = false }: { expected?: number | null; create?: boolean } = {},
): { modified: number } {
  const file = sourceFile(name)

  if (typeof source !== 'string' || !source.trim()) {
    throw new InvalidModel('the source is empty')
  }

  if (source.length > MAX_SOURCE) {
    throw new InvalidModel(`the source is over ${MAX_SOURCE / 1024} KB`)
  }

  const exists = fs.existsSync(/*turbopackIgnore: true*/ file)

  if (create && exists) {
    throw new ModelConflict(`there is already a model named ${name}`)
  }

  if (!create && !exists) {
    throw new ModelNotFound(`there is no model source named ${name}`)
  }

  if (!create && expected !== null) {
    const current = Math.floor(fs.statSync(/*turbopackIgnore: true*/ file).mtimeMs)

    if (current !== expected) {
      throw new ModelConflict(`${name}.js changed on disk since it was opened`)
    }
  }

  writeAtomic(file, source.replace(/\r\n/g, '\n'))

  return { modified: Math.floor(fs.statSync(/*turbopackIgnore: true*/ file).mtimeMs) }
}

/** This project's textures, in id order after the original 55. */
export function listTextures(): string[] {
  const manifest = path.join(/*turbopackIgnore: true*/ texturesDir(), 'textures.json')

  if (!fs.existsSync(/*turbopackIgnore: true*/ manifest)) {
    return []
  }

  const parsed = JSON.parse(fs.readFileSync(/*turbopackIgnore: true*/ manifest, 'utf8'))

  return Array.isArray(parsed.textures) ? parsed.textures.filter((name: unknown) => typeof name === 'string') : []
}

export function readTexture(name: string): Buffer {
  if (!listTextures().includes(name) || !NAME.test(name)) {
    throw new ModelNotFound(`there is no texture named ${name}`)
  }

  return fs.readFileSync(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ texturesDir(), `${name}.png`))
}

// --- packing ------------------------------------------------------------

export interface PackResult {
  ok: boolean
  output: string
  milliseconds: number
  /** Objects made for model sources that nothing used, before packing. */
  registered: RegisteredObject[]
}

/** A scenery object made for a model source (scripts/register-objects.js). */
export interface RegisteredObject {
  id: number
  model: string
  name: string
  width: number
  height: number
  type: 'blocked' | 'unblocked'
}

/** What to call a new object, and how big it is; left out, it's made up. */
export interface ObjectDetails {
  name?: string
  description?: string
  width?: number
  height?: number
  type?: 'blocked' | 'unblocked'
}

let packing: Promise<PackResult> | null = null

function runScript(
  script: string,
  args: string[],
  timeout: number,
): Promise<{ ok: boolean; stdout: string; stderr: string; message: string }> {
  return new Promise((resolve) => {
    execFile(
      process.execPath,
      [path.join(/*turbopackIgnore: true*/ clientDir(), 'scripts', script), ...args],
      { cwd: clientDir(), timeout, maxBuffer: 4 * 1024 * 1024 },
      (error, stdout, stderr) => {
        resolve({ ok: !error, stdout: String(stdout), stderr: String(stderr), message: error?.message ?? '' })
      },
    )
  })
}

/**
 * Gives model sources an object each (all of them nothing uses, or the one
 * `model` with `details`), in all four copies of objects.json, so they can
 * be placed in the World Editor once packed. Throws what the script said.
 */
async function registerObjects(model?: string, details: ObjectDetails = {}): Promise<RegisteredObject[]> {
  const args = ['--json']

  if (model) {
    args.push('--model', checkName(model))

    for (const [key, value] of Object.entries(details)) {
      if (value !== undefined && value !== '') {
        args.push(`--${key}`, String(value))
      }
    }
  }

  const run = await runScript('register-objects.js', args, 60_000)
  let result: { ok: boolean; added?: RegisteredObject[]; error?: string }

  try {
    result = JSON.parse(run.stdout.trim().split('\n').pop() ?? '')
  } catch {
    throw new InvalidModel(`${run.stderr || run.message || 'registering the objects failed'}`.trim())
  }

  if (!result.ok) {
    throw new InvalidModel(result.error ?? 'registering the objects failed')
  }

  return result.added ?? []
}

/**
 * Runs rsc-client's pack-cache, which rebuilds the archives the game loads
 * (dist/data204). First, any model source no object uses gets an object of
 * its own, or - with `model` - that one source gets an object as `details`
 * describes it. One at a time; a second request joins the first. They run in
 * child processes: pack-cache bzips the archives, and inside next dev that
 * runs into the console.assert wrapping that once froze World Editor saves.
 */
export function pack(model?: string, details?: ObjectDetails): Promise<PackResult> {
  packing ??= (async () => {
    const started = Date.now()
    let registered: RegisteredObject[] = []

    try {
      registered = await registerObjects(model, details)
    } catch (error) {
      return {
        ok: false,
        output: error instanceof Error ? error.message : String(error),
        milliseconds: Date.now() - started,
        registered,
      }
    }

    const run = await runScript('pack-cache.js', [], 180_000)
    const notes = registered.map(
      (object) =>
        `registered ${object.model}.js as object ${object.id}, "${object.name}" (${object.width}x${object.height}, ${object.type})`,
    )

    return {
      ok: run.ok,
      output: [...notes, `${run.stdout}${run.stderr}${!run.ok && !run.stderr ? run.message : ''}`.trim()]
        .filter(Boolean)
        .join('\n'),
      milliseconds: Date.now() - started,
      registered,
    }
  })().finally(() => {
    packing = null
  })

  return packing
}

// --- watching ---------------------------------------------------------

export interface ModelEvent {
  /**
   * model: a source; texture: a texture PNG (or '*', textures.json); archive:
   * one of the game's art archives in rsc-client/dist/data204 was packed
   * again (config85, models36 or textures17), by the Pack button or by
   * pack-cache from anywhere
   */
  kind: 'model' | 'texture' | 'archive'
  name: string
  /** Gone, or there. */
  removed: boolean
  at: number
}

interface Watching {
  events: EventEmitter
  watchers: fs.FSWatcher[]
  pending: Map<string, NodeJS.Timeout>
}

// one watcher for the whole server, however many editors are open, and it
// has to outlive next dev's reloads of this module
const holder = globalThis as unknown as { __rscModelWatch?: Watching }

function startWatching(): Watching {
  const watching: Watching = { events: new EventEmitter(), watchers: [], pending: new Map() }

  watching.events.setMaxListeners(100)

  const watch = (
    directory: string,
    kind: ModelEvent['kind'],
    extension: string,
    only: string[] | null = null,
  ) => {
    if (!fs.existsSync(/*turbopackIgnore: true*/ directory)) {
      return
    }

    try {
      const watcher = fs.watch(/*turbopackIgnore: true*/ directory, (_type, file) => {
        const base = typeof file === 'string' ? file : ''
        const name =
          base === 'textures.json' ? '*' : base.endsWith(extension) ? base.slice(0, -extension.length) : null

        if (!name || (name !== '*' && !NAME.test(name)) || (only && !only.includes(name))) {
          return
        }

        // editors write a file in several steps; tell the page once it settles
        const key = `${kind}:${name}`

        clearTimeout(watching.pending.get(key))
        watching.pending.set(
          key,
          setTimeout(() => {
            watching.pending.delete(key)

            const removed =
              name !== '*' &&
              !fs.existsSync(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ directory, `${name}${extension}`))

            watching.events.emit('change', { kind, name, removed, at: Date.now() } satisfies ModelEvent)
          }, 120),
        )
      })

      watching.watchers.push(watcher)
    } catch {
      // a directory that can't be watched just doesn't update live
    }
  }

  watch(modelsDir(), 'model', '.js')
  watch(texturesDir(), 'texture', '.png')
  // the map archives in the same place change on every World Editor save,
  // and aren't art
  watch(archivesDir(), 'archive', '.jag', ['config85', 'models36', 'textures17'])

  return watching
}

/** Calls `listener` whenever a model source or texture changes on disk. */
export function onChange(listener: (event: ModelEvent) => void): () => void {
  holder.__rscModelWatch ??= startWatching()

  const events = holder.__rscModelWatch.events

  events.on('change', listener)

  return () => events.off('change', listener)
}

/** Whether saving and packing are open (RSC_MODEL_EDITOR_READONLY=1 shuts them). */
export function canWrite(): boolean {
  return process.env.RSC_MODEL_EDITOR_READONLY !== '1'
}
