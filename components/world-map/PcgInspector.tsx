'use client'

import { useMemo, useState } from 'react'
import { X } from 'lucide-react'

import { BUTTON, INPUT, LABEL, NOTE } from '@/components/world-map/PcgLayerEditor'
import type { PcgPoint } from '@/lib/landscape/pcg'
import { cn } from '@/lib/utils'

/**
 * The PCG tool's Attributes list, as Unreal shows for an inspected node: a
 * row for every point of a layer, culled ones too, with its properties
 * (Epic's `$` names), its attributes, and the step that culled it. A click on
 * the map narrows it to that tile, which answers "why is there nothing
 * here?"; a row can be taken out of the result by hand, or given another
 * object.
 */

const round = (value: number) => Math.round(value * 100) / 100

const COLUMNS: { name: string; title?: string; of: (point: PcgPoint) => number | string }[] = [
  { name: '$Position', of: (point) => `${point.x}, ${point.y}` },
  { name: '$Rotation', title: 'The facing, 0-7', of: (point) => point.rotation },
  { name: '$Density', title: 'When it was culled, or as it stands', of: (point) => round(point.density) },
  { name: '$Steepness', of: (point) => round(point.steepness) },
  { name: '$Seed', of: (point) => point.seed },
  { name: 'elevation', of: (point) => point.attributes.elevation },
  { name: 'slope', of: (point) => point.attributes.slope },
  { name: 'noise', of: (point) => round(point.attributes.noise) },
  { name: 'distanceWater', of: (point) => point.attributes.distanceWater },
  { name: 'objectId', of: (point) => (point.attributes.objectId < 0 ? '' : point.attributes.objectId) },
  { name: 'culled', title: 'The step that removed it; empty while it stands', of: (point) => point.culled },
]

/** More rows than this are not drawn; the filter and the map narrow them down. */
const ROWS = 200

interface PcgInspectorProps {
  /** The inspected layer's name, and its points. */
  label: string
  points: PcgPoint[]
  /** The tile the list is narrowed to. */
  tile: { x: number; y: number } | null
  onClearTile: () => void
  /** The point ringed on the map. */
  highlight: { x: number; y: number } | null
  onPick: (point: PcgPoint) => void
  /** The objects a point can be given by hand: the layer's own entries. */
  swaps: { id: number; name: string }[]
  /** The tiles with a manual edit, as "x,y". */
  edited: ReadonlySet<string>
  onExclude: (point: PcgPoint) => void
  onSwap: (point: PcgPoint, objectId: number) => void
  onRestore: (point: PcgPoint) => void
  onClose: () => void
}

export function PcgInspector({
  label,
  points,
  tile,
  onClearTile,
  highlight,
  onPick,
  swaps,
  edited,
  onExclude,
  onSwap,
  onRestore,
  onClose,
}: PcgInspectorProps) {
  const [sort, setSort] = useState<{ column: number; down: boolean } | null>(null)
  const [filter, setFilter] = useState('')

  const rows = useMemo(() => {
    const wanted = filter.trim().toLowerCase()
    const found = points.filter(
      (point) =>
        (!tile || (point.x === tile.x && point.y === tile.y)) &&
        (!wanted || COLUMNS.some((column) => String(column.of(point)).toLowerCase().includes(wanted))),
    )

    if (sort) {
      const { of } = COLUMNS[sort.column]

      found.sort((a, b) => {
        const [one, other] = [of(a), of(b)]
        const order =
          typeof one === 'number' && typeof other === 'number'
            ? one - other
            : String(one).localeCompare(String(other), 'en', { numeric: true })

        return sort.down ? -order : order
      })
    }

    return found
  }, [points, tile, filter, sort])

  return (
    <div className="space-y-1.5 rounded border border-stone-800 p-2">
      <div className="flex items-center justify-between gap-2">
        <span className={LABEL}>Attributes · {label}</span>
        <button type="button" title="Close (A)" aria-label="Close the attributes list" onClick={onClose} className={BUTTON}>
          <X className="h-3 w-3" />
        </button>
      </div>

      <div className="flex items-center gap-1">
        <input
          className={INPUT}
          value={filter}
          placeholder="filter: pruned, water, 306…"
          aria-label="Filter the points"
          onChange={(e) => setFilter(e.target.value)}
        />
        {tile && (
          <button type="button" title="Show every tile again" onClick={onClearTile} className={cn(BUTTON, 'shrink-0')}>
            tile {tile.x}, {tile.y} ×
          </button>
        )}
      </div>

      <p className={NOTE}>
        {rows.length.toLocaleString('en-US')} of {points.length.toLocaleString('en-US')} points
        {rows.length > ROWS ? `, the first ${ROWS} shown` : ''}. Click the map to narrow to a tile.
        {tile && !rows.length ? ' No point of this layer was sampled on that tile.' : ''}
      </p>

      <div className="max-h-72 overflow-auto">
        <table className="w-max border-collapse font-mono text-[10px] text-text-secondary">
          <thead className="sticky top-0 bg-stone-900">
            <tr>
              {COLUMNS.map((column, index) => (
                <th key={column.name} title={column.title} className="px-1.5 py-0.5 text-left font-normal">
                  <button
                    type="button"
                    className={cn('hover:text-text-primary', sort?.column === index && 'text-gold-400')}
                    onClick={() =>
                      setSort((last) =>
                        last?.column === index
                          ? last.down
                            ? null
                            : { column: index, down: true }
                          : { column: index, down: false },
                      )
                    }
                  >
                    {column.name}
                    {sort?.column === index ? (sort.down ? ' ↓' : ' ↑') : ''}
                  </button>
                </th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, ROWS).map((point, row) => {
              const picked = highlight?.x === point.x && highlight.y === point.y
              const byHand = edited.has(`${point.x},${point.y}`)

              return (
                <tr
                  // an offset can put two of a layer's points on one tile
                  key={`${point.x},${point.y}:${row}`}
                  onClick={() => onPick(point)}
                  className={cn(
                    'cursor-pointer border-t border-stone-800 hover:bg-white/5',
                    picked && 'bg-gold-500/15',
                    !point.culled && 'text-text-primary',
                  )}
                >
                  {COLUMNS.map((column) => (
                    <td key={column.name} className="px-1.5 py-0.5 whitespace-nowrap">
                      {column.of(point)}
                    </td>
                  ))}
                  <td className="px-1.5 py-0.5 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    {byHand ? (
                      <button type="button" onClick={() => onRestore(point)} className="text-gold-400 hover:underline">
                        Restore
                      </button>
                    ) : point.culled ? null : (
                      <span className="flex items-center gap-1.5">
                        <button type="button" onClick={() => onExclude(point)} className="hover:text-text-primary hover:underline">
                          Exclude
                        </button>
                        {swaps.length > 1 && (
                          <select
                            className="rounded border border-stone-700 bg-stone-900 text-[10px]"
                            value=""
                            aria-label="Swap object"
                            onChange={(e) => e.target.value && onSwap(point, Number(e.target.value))}
                          >
                            <option value="">Swap object…</option>
                            {swaps
                              .filter((swap) => swap.id !== point.attributes.objectId)
                              .map((swap) => (
                                <option key={swap.id} value={swap.id}>
                                  {swap.name} #{swap.id}
                                </option>
                              ))}
                          </select>
                        )}
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
