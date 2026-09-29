'use client'

import { useCallback, useMemo, useReducer, useRef, useState } from 'react'

import type {
  ItemSpawn,
  NpcSpawn,
  PlacedObject,
  SectorData,
  SectorTiles,
  TileEdit,
} from '@/lib/landscape/types'

/**
 * The editor's working copy of the world: every sector it has opened, what
 * each looked like when loaded, what it looks like now, and an undo history
 * that runs across all of them — so a path painted over a sector boundary
 * is one stroke, one undo and one save.
 *
 * Working copies are never mutated. An edit copies only the arrays it
 * changes, which is what lets the history keep old copies by reference and
 * lets everything downstream tell what changed by identity alone.
 */

export type Loaded = SectorData & { version: string }

export interface Working {
  tiles: SectorTiles
  objects: PlacedObject[]
  wallObjects: PlacedObject[]
  npcs: NpcSpawn[]
  items: ItemSpawn[]
}

/** The spawn lists a sector carries, as the save sends them. */
export const SPAWN_FIELDS = ['objects', 'wallObjects', 'npcs', 'items'] as const

export type SpawnField = (typeof SPAWN_FIELDS)[number]

export interface OpenSector {
  loaded: Loaded
  working: Working
}

/** "plane.x.y" — the form the batch route takes, too. */
export type SectorKey = string

export function keyOf(ref: { plane: number; x: number; y: number }): SectorKey {
  return `${ref.plane}.${ref.x}.${ref.y}`
}

export function refOfKey(key: SectorKey): { plane: number; x: number; y: number } {
  const [plane, x, y] = key.split('.').map(Number)

  return { plane, x, y }
}

export const FIELDS = [
  'colour',
  'elevation',
  'overlay',
  'direction',
  'wallVertical',
  'wallHorizontal',
  'wallRoof',
  'diagonal',
] as const satisfies readonly (keyof SectorTiles)[]

export function tileEdit(tiles: SectorTiles, index: number): TileEdit {
  return {
    index,
    colour: tiles.colour[index],
    elevation: tiles.elevation[index],
    overlay: tiles.overlay[index],
    direction: tiles.direction[index],
    wallVertical: tiles.wallVertical[index],
    wallHorizontal: tiles.wallHorizontal[index],
    wallRoof: tiles.wallRoof[index],
    diagonal: tiles.diagonal[index],
  }
}

/** Only the arrays that actually change are copied. */
export function withTile(tiles: SectorTiles, edit: TileEdit): SectorTiles {
  let next: SectorTiles | null = null

  for (const field of FIELDS) {
    if (tiles[field][edit.index] !== edit[field]) {
      next ??= { ...tiles }

      if (next[field] === tiles[field]) {
        next[field] = tiles[field].slice()
      }

      next[field][edit.index] = edit[field]
    }
  }

  return next ?? tiles
}

/** Order-free comparison, the same multiset the server saves by. */
function bag(list: object[]): string {
  return list
    .map((entry) =>
      Object.entries(entry)
        .filter(([, value]) => value !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : 1))
        .map(([key, value]) => `${key}=${value}`)
        .join(','),
    )
    .sort()
    .join('|')
}

/** A fresh working copy shares the loaded arrays until something changes. */
function workingOf(data: Loaded): Working {
  return {
    tiles: data.tiles,
    objects: data.objects,
    wallObjects: data.wallObjects,
    npcs: data.npcs,
    items: data.items,
  }
}

export interface SectorChanges {
  /** Tile indices whose landscape differs from what was loaded. */
  tiles: Set<number>
  objects: boolean
  wallObjects: boolean
  npcs: boolean
  items: boolean
}

// keyed by the OpenSector object, which is replaced whenever that sector
// changes - so a sector nobody touched is never compared again
const changesCache = new WeakMap<OpenSector, SectorChanges | null>()

function changesOf(sector: OpenSector): SectorChanges | null {
  if (changesCache.has(sector)) {
    return changesCache.get(sector)!
  }

  const { loaded, working } = sector
  const tiles = new Set<number>()

  for (const field of FIELDS) {
    const before = loaded.tiles[field]
    const after = working.tiles[field]

    if (before === after) {
      continue
    }

    for (let i = 0; i < after.length; i++) {
      if (before[i] !== after[i]) {
        tiles.add(i)
      }
    }
  }

  const moved = (field: SpawnField) =>
    loaded[field] !== working[field] && bag(loaded[field]) !== bag(working[field])

  const changes: SectorChanges = {
    tiles,
    objects: moved('objects'),
    wallObjects: moved('wallObjects'),
    npcs: moved('npcs'),
    items: moved('items'),
  }

  const any = tiles.size || SPAWN_FIELDS.some((field) => changes[field])

  changesCache.set(sector, any ? changes : null)

  return any ? changes : null
}

// ## history

interface Step {
  /** Consecutive edits under one key - a slider drag, a stroke - are one step. */
  key: string
  /** The working copies of the sectors the step touched, from before it. */
  sectors: Map<SectorKey, Working>
}

interface State {
  open: Map<SectorKey, OpenSector>
  undo: Step[]
  redo: Step[]
}

export type Update = (open: Map<SectorKey, OpenSector>) => Map<SectorKey, Working>

type Action =
  /** Newly read sectors; never replaces one already open. */
  | { type: 'loaded'; sectors: Loaded[] }
  /** Re-read sectors, replacing what was open - their changes are gone. */
  | { type: 'fresh'; sectors: Loaded[] }
  /**
   * Sectors as saved. One still holding exactly what was sent takes the
   * saved copy whole; one edited while the save was in flight keeps its
   * newer changes, now measured against the saved copy.
   */
  | { type: 'saved'; sectors: Loaded[]; sent: Map<SectorKey, Working> }
  /** Returns the new working copy of each sector it changes. */
  | { type: 'edit'; key: string; update: Update }
  | { type: 'undo' }
  | { type: 'redo' }

const UNDO_LIMIT = 100

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'loaded': {
      let open: Map<SectorKey, OpenSector> | null = null

      for (const data of action.sectors) {
        const key = keyOf(data)

        if (!state.open.has(key)) {
          open ??= new Map(state.open)
          open.set(key, { loaded: data, working: workingOf(data) })
        }
      }

      return open ? { ...state, open } : state
    }

    case 'fresh':
    case 'saved': {
      const open = new Map(state.open)

      for (const data of action.sectors) {
        const key = keyOf(data)
        const current = open.get(key)
        const untouched =
          action.type === 'fresh' ||
          !current ||
          action.sent.get(key) === current.working

        open.set(key, {
          loaded: data,
          working: untouched ? workingOf(data) : current.working,
        })
      }

      return { ...state, open }
    }

    case 'edit': {
      const changes = action.update(state.open)

      if (!changes.size) {
        return state
      }

      const open = new Map(state.open)
      const last = state.undo[state.undo.length - 1]
      let undo: Step[]

      if (last && last.key === action.key) {
        // the step already holds the "before" of every sector it touched
        // so far; a sector the stroke has only now reached joins it
        const before = new Map(last.sectors)

        for (const key of changes.keys()) {
          if (!before.has(key) && state.open.has(key)) {
            before.set(key, state.open.get(key)!.working)
          }
        }

        undo = [...state.undo.slice(0, -1), { key: last.key, sectors: before }]
      } else {
        const before = new Map<SectorKey, Working>()

        for (const key of changes.keys()) {
          if (state.open.has(key)) {
            before.set(key, state.open.get(key)!.working)
          }
        }

        undo = [...state.undo, { key: action.key, sectors: before }].slice(-UNDO_LIMIT)
      }

      for (const [key, working] of changes) {
        const current = open.get(key)

        if (current) {
          open.set(key, { ...current, working })
        }
      }

      return { open, undo, redo: [] }
    }

    case 'undo':
    case 'redo': {
      const from = action.type === 'undo' ? state.undo : state.redo
      const step = from[from.length - 1]

      if (!step) {
        return state
      }

      const open = new Map(state.open)
      const other = new Map<SectorKey, Working>()

      for (const [key, working] of step.sectors) {
        const current = open.get(key)

        if (current) {
          other.set(key, current.working)
          open.set(key, { ...current, working })
        }
      }

      // the way back is a step of its own; 'history' is never an edit key,
      // so the next edit starts a new step rather than joining this one
      const back = { key: 'history', sectors: other }

      return action.type === 'undo'
        ? { open, undo: state.undo.slice(0, -1), redo: [...state.redo, back] }
        : { open, undo: [...state.undo, back], redo: state.redo.slice(0, -1) }
    }
  }
}

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', ...init })
  const body = await response.json().catch(() => null)

  if (!response.ok) {
    const error = new Error(body?.error ?? `request failed (${response.status})`)

    Object.assign(error, { status: response.status, sectors: body?.sectors })

    throw error
  }

  return body as T
}

/** The batch route takes this many sectors a request. */
const BATCH = 64

async function readSectors(keys: SectorKey[]): Promise<Loaded[]> {
  const out: Loaded[] = []

  for (let i = 0; i < keys.length; i += BATCH) {
    const { sectors } = await fetchJson<{ sectors: Loaded[] }>(
      `/api/landscape/batch?sectors=${keys.slice(i, i + BATCH).join(',')}`,
    )

    out.push(...sectors)
  }

  return out
}

export interface SaveOutcome {
  sectors: string[]
  tiles: number
  objects: number | null
  wallObjects: number | null
  npcs: number | null
  items: number | null
  files: string[]
}

export function useWorldEdits() {
  const [state, dispatch] = useReducer(reducer, {
    open: new Map(),
    undo: [],
    redo: [],
  })

  // sectors asked for, answered or not - so a sector is fetched once
  const requested = useRef(new Set<SectorKey>())
  const [pending, setPending] = useState<ReadonlySet<SectorKey>>(new Set())

  const changes = useMemo(() => {
    const out = new Map<SectorKey, SectorChanges>()

    for (const [key, sector] of state.open) {
      const found = changesOf(sector)

      if (found) {
        out.set(key, found)
      }
    }

    return out
  }, [state.open])

  /** Opens whichever of these sectors are not open yet. */
  const ensure = useCallback(async (keys: SectorKey[]) => {
    const wanted = keys.filter((key) => !requested.current.has(key))

    if (!wanted.length) {
      return
    }

    for (const key of wanted) {
      requested.current.add(key)
    }

    setPending((last) => new Set([...last, ...wanted]))

    try {
      dispatch({ type: 'loaded', sectors: await readSectors(wanted) })
    } catch (error) {
      // let a later look try again
      for (const key of wanted) {
        requested.current.delete(key)
      }

      throw error
    } finally {
      setPending((last) => {
        const next = new Set(last)

        for (const key of wanted) {
          next.delete(key)
        }

        return next
      })
    }
  }, [])

  const edit = useCallback((key: string, update: Update) => {
    dispatch({ type: 'edit', key, update })
  }, [])

  const undo = useCallback(() => dispatch({ type: 'undo' }), [])
  const redo = useCallback(() => dispatch({ type: 'redo' }), [])

  /** Throws away the changes to these sectors, re-reading them. */
  const reload = useCallback(async (keys: SectorKey[]) => {
    dispatch({ type: 'fresh', sectors: await readSectors(keys) })
  }, [])

  /** Every unsaved change, reverted as one undoable step. */
  const discard = useCallback(() => {
    dispatch({
      type: 'edit',
      key: `discard:${Date.now()}`,
      update: (open) => {
        const out = new Map<SectorKey, Working>()

        for (const [key, sector] of open) {
          if (changesOf(sector)) {
            out.set(key, workingOf(sector.loaded))
          }
        }

        return out
      },
    })
  }, [])

  /**
   * Saves every changed sector in one request - all or nothing - and then
   * re-reads them, so each carries its new version.
   */
  const save = useCallback(async (): Promise<SaveOutcome | null> => {
    const sent = new Map<SectorKey, Working>()
    const sectors = []

    for (const [key, sector] of state.open) {
      const found = changesOf(sector)

      if (!found) {
        continue
      }

      sent.set(key, sector.working)
      sectors.push({
        plane: sector.loaded.plane,
        x: sector.loaded.x,
        y: sector.loaded.y,
        version: sector.loaded.version,
        edits: [...found.tiles].map((i) => tileEdit(sector.working.tiles, i)),
        objects: found.objects ? sector.working.objects : undefined,
        wallObjects: found.wallObjects ? sector.working.wallObjects : undefined,
        npcs: found.npcs ? sector.working.npcs : undefined,
        items: found.items ? sector.working.items : undefined,
      })
    }

    if (!sectors.length) {
      return null
    }

    const result = await fetchJson<SaveOutcome>('/api/landscape/batch', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ sectors }),
    })

    dispatch({ type: 'saved', sectors: await readSectors([...sent.keys()]), sent })

    return result
  }, [state.open])

  return {
    open: state.open,
    changes,
    pending,
    canUndo: state.undo.length,
    canRedo: state.redo.length,
    ensure,
    edit,
    undo,
    redo,
    reload,
    discard,
    save,
  }
}
