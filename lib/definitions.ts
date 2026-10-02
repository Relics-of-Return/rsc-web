import 'server-only'

import fs from 'node:fs'
import path from 'node:path'

/**
 * rsc-data's definition tables (objects, doors, NPCs, items) as they are on
 * disk now, for the World Editor.
 *
 * They're read with fs, not require: a require is bundled, so an object the
 * model editor registered, or one added by hand, only showed after rsc-web
 * restarted. Each table is kept until its file's modified time changes.
 *
 * The copy is rsc-web's own node_modules/@2003scape/rsc-data, as the
 * requires used, unless RSC_DATA_CONFIG_DIR points somewhere else. Paths are
 * runtime data outside the app, so Next's tracer is told to keep out (see
 * lib/landscape/store.ts).
 */

export type DefinitionTable = 'objects' | 'wall-objects' | 'npcs' | 'items'

function configDir(): string {
  return (
    process.env.RSC_DATA_CONFIG_DIR ??
    path.join(/*turbopackIgnore: true*/ process.cwd(), 'node_modules', '@2003scape', 'rsc-data', 'config')
  )
}

const cache = new Map<DefinitionTable, { modified: number; entries: unknown[] }>()

/** The table's entries, in id order (an entry's id is its index). */
export function readDefinitions<T = Record<string, unknown>>(table: DefinitionTable): T[] {
  const file = path.join(/*turbopackIgnore: true*/ configDir(), `${table}.json`)
  const modified = fs.statSync(/*turbopackIgnore: true*/ file).mtimeMs
  const cached = cache.get(table)

  if (cached && cached.modified === modified) {
    return cached.entries as T[]
  }

  const entries = JSON.parse(fs.readFileSync(/*turbopackIgnore: true*/ file, 'utf8')) as unknown[]

  cache.set(table, { modified, entries })

  return entries as T[]
}
