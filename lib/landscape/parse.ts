import {
  SECTOR_TILES,
  type ItemSpawn,
  type NpcSpawn,
  type PlacedObject,
  type TileEdit,
} from '@/lib/landscape/types'

/**
 * What the save routes accept, checked field by field before the store sees
 * it. Each throws with a message fit to show the editor.
 */

/** Rejects anything that is not a whole, in-range tile edit. */
export function parseEdits(value: unknown): TileEdit[] {
  if (!Array.isArray(value)) {
    throw new Error('edits must be an array')
  }

  const byte = (name: string, raw: unknown): number => {
    const parsed = Number(raw)

    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 255) {
      throw new Error(`${name} must be a whole number from 0 to 255`)
    }

    return parsed
  }

  return value.map((raw) => {
    const edit = raw as Record<string, unknown>
    const index = Number(edit.index)

    if (!Number.isInteger(index) || index < 0 || index >= SECTOR_TILES) {
      throw new Error(`tile index ${edit.index} is outside the sector`)
    }

    const diagonal = Number(edit.diagonal)

    // the shared diagonal/scenery buffer is 32 bit, not a byte
    if (!Number.isInteger(diagonal) || diagonal < 0 || diagonal > 0xfffff) {
      throw new Error(`diagonal ${edit.diagonal} is out of range`)
    }

    return {
      index,
      colour: byte('colour', edit.colour),
      elevation: byte('elevation', edit.elevation),
      overlay: byte('overlay', edit.overlay),
      direction: byte('direction', edit.direction),
      wallVertical: byte('wallVertical', edit.wallVertical),
      wallHorizontal: byte('wallHorizontal', edit.wallHorizontal),
      wallRoof: byte('wallRoof', edit.wallRoof),
      diagonal,
    }
  })
}

/** The shape of a spawn list; the store checks ids and bounds. */
export function parseObjects(
  value: unknown,
  name: string,
): PlacedObject[] | undefined {
  if (value === undefined || value === null) {
    return undefined
  }

  if (!Array.isArray(value)) {
    throw new Error(`${name} must be an array`)
  }

  return value.map((raw) => {
    const entry = raw as Record<string, unknown>
    const out = {
      id: Number(entry.id),
      direction: Number(entry.direction),
      x: Number(entry.x),
      y: Number(entry.y),
    }

    for (const [field, number] of Object.entries(out)) {
      if (!Number.isInteger(number) || number < 0) {
        throw new Error(`${name}: ${field} must be a whole number`)
      }
    }

    return out
  })
}

/**
 * Whole numbers under exactly these names, in the order the entry gave them:
 * the shipped npcs.json is not consistent about key order, and an entry
 * saved back unchanged has to come out on the same line it went in on.
 */
function parseEntries<T>(
  value: unknown,
  name: string,
  required: readonly string[],
  optional: readonly string[] = [],
): T[] | undefined {
  if (value === undefined || value === null) {
    return undefined
  }

  if (!Array.isArray(value)) {
    throw new Error(`${name} must be an array`)
  }

  const allowed = new Set([...required, ...optional])

  return value.map((raw) => {
    const entry = raw as Record<string, unknown>
    const out: Record<string, number> = {}

    for (const [field, rawValue] of Object.entries(entry)) {
      if (!allowed.has(field) || rawValue === undefined || rawValue === null) {
        continue
      }

      const number = Number(rawValue)

      if (!Number.isInteger(number) || number < 0) {
        throw new Error(`${name}: ${field} must be a whole number`)
      }

      out[field] = number
    }

    for (const field of required) {
      if (!(field in out)) {
        throw new Error(`${name}: every entry needs ${field}`)
      }
    }

    return out as T
  })
}

export function parseNpcs(value: unknown): NpcSpawn[] | undefined {
  return parseEntries(value, 'npcs', ['id', 'x', 'y', 'minX', 'maxX', 'minY', 'maxY'])
}

export function parseItems(value: unknown): ItemSpawn[] | undefined {
  return parseEntries(value, 'items', ['id', 'respawn', 'x', 'y'], ['amount'])
}
