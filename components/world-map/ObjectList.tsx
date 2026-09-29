'use client'

import { useMemo, useState } from 'react'

import type { PlacedObject } from '@/lib/landscape/types'

/**
 * The scenery or the doors standing on one tile, with controls to add,
 * change, turn and remove them.
 *
 * These are the spawn lists the server actually reads (rsc-server's
 * data/locations), so what is placed here is what exists in the game — once
 * the world restarts.
 */

const FIELD =
  'w-full rounded border border-stone-700 bg-stone-900 px-2 py-1 text-sm text-text-primary focus:border-gold-500 focus:outline-none'

const LABEL = 'text-xs uppercase tracking-wide text-text-secondary'

/** Scenery turns in eighths; a wall object sits on an edge or a diagonal. */
const SCENERY_FACINGS = [0, 1, 2, 3, 4, 5, 6, 7].map((value) => ({
  value,
  label: `${value} · ${value * 45}°`,
}))

// mudclient#createModel: 0 spans x..x+1 (north edge), 1 spans y..y+1 (east
// edge), 2 and 3 are the two diagonals
const DOOR_FACINGS = [
  { value: 0, label: '0 · north edge' },
  { value: 1, label: '1 · east edge' },
  { value: 2, label: '2 · \\ diagonal' },
  { value: 3, label: '3 · / diagonal' },
]

interface ObjectListProps {
  kind: 'scenery' | 'doors'
  /** id -> name, from the definitions. */
  names: Record<string, string>
  /** What stands on this tile now. */
  entries: PlacedObject[]
  /** Where a new one goes. */
  at: { x: number; y: number }
  /**
   * For scenery: the facing the client will actually draw, which it reads
   * from the tile rather than from the object. Doors carry their own in the
   * server's packet, so they have no such second copy.
   */
  tileFacing?: number
  onChange: (entries: PlacedObject[]) => void
}

function Picker({
  names,
  onPick,
  placeholder,
}: {
  names: Record<string, string>
  onPick: (id: number) => void
  placeholder: string
}) {
  const [query, setQuery] = useState('')

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()

    if (!needle) {
      return []
    }

    const exactId = /^#?\d+$/.test(needle) ? needle.replace('#', '') : null

    return Object.entries(names)
      .filter(
        ([id, name]) =>
          id === exactId || name.toLowerCase().includes(needle),
      )
      .slice(0, 40)
  }, [names, query])

  return (
    <div className="space-y-1">
      <input
        className={FIELD}
        value={query}
        placeholder={placeholder}
        onChange={(e) => setQuery(e.target.value)}
      />

      {matches.length > 0 && (
        <ul className="max-h-48 overflow-y-auto rounded border border-stone-700 bg-stone-950 text-sm">
          {matches.map(([id, name]) => (
            <li key={id}>
              <button
                type="button"
                className="flex w-full justify-between px-2 py-1 text-left hover:bg-stone-800"
                onClick={() => {
                  onPick(Number(id))
                  setQuery('')
                }}
              >
                <span>{name}</span>
                <span className="text-text-secondary">#{id}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function ObjectList({
  kind,
  names,
  entries,
  at,
  tileFacing,
  onChange,
}: ObjectListProps) {
  const facings = kind === 'scenery' ? SCENERY_FACINGS : DOOR_FACINGS
  const noun = kind === 'scenery' ? 'scenery' : 'door or wall object'

  const replace = (index: number, patch: Partial<PlacedObject>) =>
    onChange(entries.map((e, i) => (i === index ? { ...e, ...patch } : e)))

  return (
    <div className="space-y-3">
      {entries.length === 0 && (
        <p className="text-xs text-text-secondary/70">No {noun} on this tile.</p>
      )}

      {entries.map((entry, index) => (
        <div
          key={`${entry.id}-${index}`}
          className="space-y-2 rounded border border-stone-700 p-2"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="text-sm text-text-primary">
              {names[String(entry.id)] ?? 'unknown'}{' '}
              <span className="text-text-secondary">#{entry.id}</span>
            </div>
            <button
              type="button"
              className="text-xs text-red-400 hover:underline"
              onClick={() => onChange(entries.filter((_, i) => i !== index))}
            >
              Remove
            </button>
          </div>

          {tileFacing !== undefined && entry.direction !== tileFacing && (
            <div className="space-y-1 rounded border border-amber-700/60 bg-amber-950/30 p-2 text-[11px] text-amber-200">
              <p>
                The game client will draw this facing {tileFacing}, but the
                server thinks it faces {entry.direction} — so it looks one way
                and blocks another. 140 objects in the shipped world are like
                this.
              </p>
              <button
                type="button"
                className="underline"
                onClick={() =>
                  // the tile follows the first object on it, so putting this
                  // one first makes the client agree with it
                  onChange([entry, ...entries.filter((_, i) => i !== index)])
                }
              >
                Make both say {entry.direction}
              </button>
            </div>
          )}

          <label className={LABEL}>
            Facing
            <select
              className={`${FIELD} mt-1`}
              value={entry.direction}
              onChange={(e) =>
                replace(index, { direction: Number(e.target.value) })
              }
            >
              {facings.map((facing) => (
                <option key={facing.value} value={facing.value}>
                  {facing.label}
                </option>
              ))}
            </select>
          </label>

          <Picker
            names={names}
            placeholder="Change to… (name or #id)"
            onPick={(id) => replace(index, { id })}
          />
        </div>
      ))}

      <Picker
        names={names}
        placeholder={`Add ${noun}… (name or #id)`}
        onPick={(id) => onChange([...entries, { id, direction: 0, ...at }])}
      />
    </div>
  )
}
