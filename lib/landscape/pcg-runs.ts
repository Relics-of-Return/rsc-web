import 'server-only'

import fs from 'node:fs'
import path from 'node:path'

import type { PcgRun } from '@/lib/landscape/pcg'

/**
 * The World Editor's record of what its PCG tool placed (pcg-runs.json, at
 * rsc-web's root): for each saved run, what it was generated from and every
 * object it put down. objects.json holds four numbers an object and nothing
 * about who placed it, so this is what lets a past run be cleaned up or made
 * again later. It is the editor's own file: the game never reads it, and a
 * push never copies it.
 */

/** A list longer than this drops its oldest runs. */
const KEPT = 200

/** A run with more objects than this is refused. */
const OBJECTS = 100000

/** Where the file is. Override for a different one. */
function runsFile(): string {
  return (
    process.env.RSC_PCG_RUNS_FILE ??
    path.join(/*turbopackIgnore: true*/ process.cwd(), 'pcg-runs.json')
  )
}

/** The runs on record, newest first. None when there is no file yet. */
export function readRuns(): PcgRun[] {
  const file = runsFile()

  if (!fs.existsSync(/*turbopackIgnore: true*/ file)) {
    return []
  }

  const data = JSON.parse(fs.readFileSync(/*turbopackIgnore: true*/ file, 'utf8'))

  return Array.isArray(data.runs) ? data.runs : []
}

function writeRuns(runs: PcgRun[]): PcgRun[] {
  const file = runsFile()
  // through a temporary file and a rename, as the landscape's saves are
  const temporary = `${file}.${process.pid}.tmp`

  fs.writeFileSync(/*turbopackIgnore: true*/ temporary, `${JSON.stringify({ runs })}\n`)
  fs.renameSync(/*turbopackIgnore: true*/ temporary, file)

  return runs
}

const whole = (value: unknown) => Number.isInteger(value) && (value as number) >= 0

/** A run as it may be kept: only the fields this file knows, each checked. */
function cleanRun(input: unknown, by: string): PcgRun {
  const run = input as Partial<PcgRun> | null

  if (
    !run ||
    typeof run.id !== 'string' ||
    !run.id ||
    typeof run.at !== 'string' ||
    typeof run.label !== 'string' ||
    typeof run.seed !== 'number' ||
    typeof run.domain?.tool !== 'string' ||
    typeof run.setup?.instance?.graph !== 'string' ||
    !Array.isArray(run.objects)
  ) {
    throw new Error('that is not a PCG run')
  }

  if (run.objects.length > OBJECTS) {
    throw new Error('a run with that many objects is not kept')
  }

  return {
    id: run.id.slice(0, 64),
    at: run.at.slice(0, 40),
    by,
    label: run.label.slice(0, 80),
    seed: run.seed,
    domain: run.domain,
    setup: run.setup,
    objects: run.objects.map((object) => {
      if (![object?.id, object?.direction, object?.x, object?.y].every(whole)) {
        throw new Error('a run holds an object that is not one')
      }

      return { id: object.id, direction: object.direction, x: object.x, y: object.y }
    }),
  }
}

/** Runs put on record, newest first. One on record already is replaced. */
export function addRuns(input: unknown, by: string): PcgRun[] {
  if (!Array.isArray(input)) {
    throw new Error('runs must be a list')
  }

  const added = input.map((run) => cleanRun(run, by))
  const ids = new Set(added.map((run) => run.id))

  return writeRuns(
    [...added.reverse(), ...readRuns().filter((run) => !ids.has(run.id))].slice(0, KEPT),
  )
}

/** A run taken off the record. What it placed stays on the map. */
export function forgetRun(id: string): PcgRun[] {
  return writeRuns(readRuns().filter((run) => run.id !== id))
}
