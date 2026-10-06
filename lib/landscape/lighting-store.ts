import 'server-only'

import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

import { cleanArea, type LightingArea } from '@/lib/landscape/lighting'
import { editorCheckout } from '@/lib/stage'

/**
 * Reads and writes the lighting areas in rsc-client/assets/hd/
 * environments.json (see lib/landscape/lighting.ts). Only the areas are
 * the editor's to change; the times of day and seasons are kept as they
 * are. The client builds the file into its bundles, so a save shows in the
 * game after the next client build (npm run build-dev there), and in the
 * editor's 3D view at once.
 */

/** A save built on an older copy of the file than is there now. */
export class LightingConflict extends Error {}

/** Where the file is. Override for a different checkout. */
function environmentsFile(): string {
  return (
    process.env.RSC_ENVIRONMENTS_FILE ??
    path.join(
      /*turbopackIgnore: true*/ editorCheckout('rsc-client'),
      'assets',
      'hd',
      'environments.json',
    )
  )
}

function versionOf(text: string): string {
  return crypto.createHash('sha1').update(text).digest('hex').slice(0, 16)
}

export function readLighting(): { areas: LightingArea[]; version: string } {
  const text = fs.readFileSync(/*turbopackIgnore: true*/ environmentsFile(), 'utf8')
  const data = JSON.parse(text)

  return { areas: Array.isArray(data.areas) ? data.areas : [], version: versionOf(text) }
}

/**
 * JSON as the file is written by hand: four spaces, and a list of plain
 * numbers or words on one line, so the colours stay [1, 0.9, 0.86].
 */
function format(value: unknown, indent = ''): string {
  const inner = `${indent}    `

  if (Array.isArray(value)) {
    if (value.every((item) => item === null || typeof item !== 'object')) {
      return `[${value.map((item) => JSON.stringify(item)).join(', ')}]`
    }

    return `[\n${value.map((item) => inner + format(item, inner)).join(',\n')}\n${indent}]`
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(
      ([, item]) => item !== undefined,
    )

    if (!entries.length) {
      return '{}'
    }

    return `{\n${entries
      .map(([key, item]) => `${inner}${JSON.stringify(key)}: ${format(item, inner)}`)
      .join(',\n')}\n${indent}}`
  }

  return JSON.stringify(value)
}

/**
 * The areas saved in place of the file's, if the file is still the version
 * they were loaded from. Throws LightingConflict if it moved on, or an Error
 * saying what is wrong with an area.
 */
export function saveLighting(input: unknown, version: string): { version: string; areas: LightingArea[] } {
  if (!Array.isArray(input)) {
    throw new Error('areas must be a list')
  }

  if (input.length > 200) {
    throw new Error('too many areas')
  }

  const areas = input.map((area, index) => cleanArea(area, index))
  const file = environmentsFile()
  const text = fs.readFileSync(/*turbopackIgnore: true*/ file, 'utf8')

  if (versionOf(text) !== version) {
    throw new LightingConflict(
      'the lighting areas were changed since they were loaded - reload them and draw again',
    )
  }

  const data = JSON.parse(text)

  data.areas = areas

  const next = `${format(data)}\n`

  // through a temporary file and a rename, as the landscape's saves are,
  // with the original kept beside it the first time
  if (!fs.existsSync(/*turbopackIgnore: true*/ `${file}.backup`)) {
    fs.copyFileSync(/*turbopackIgnore: true*/ file, `${file}.backup`)
  }

  const temporary = `${file}.${process.pid}.tmp`

  fs.writeFileSync(/*turbopackIgnore: true*/ temporary, next)
  fs.renameSync(/*turbopackIgnore: true*/ temporary, file)

  return { version: versionOf(next), areas }
}
