'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Plus, X } from 'lucide-react'

import {
  spatialNoise,
  type PcgAttributeFilter,
  type PcgAttributeName,
  type PcgCurve,
  type PcgDensityNode,
  type PcgDistance,
  type PcgGraph,
  type PcgLayer,
  type PcgMeshEntry,
  type PcgMeshSelector,
  type PcgRange,
  type PcgSpatialNoise,
} from '@/lib/landscape/pcg'
import type { LandscapePalette } from '@/lib/landscape/types'
import { cn } from '@/lib/utils'

/**
 * A PCG layer's nodes, in the order the generator runs them, each a small
 * group headed by its Unreal name with Unreal's option names, so a setting
 * can be looked up in Epic's node reference. The small form fields the PCG
 * panel is made of are here too.
 */

export const LABEL = 'text-[11px] uppercase tracking-wide text-text-secondary'
export const NOTE = 'text-[11px] leading-relaxed text-text-secondary/80'
export const INPUT =
  'w-full min-w-0 rounded border border-stone-700 bg-stone-900 px-1.5 py-0.5 text-xs text-text-primary'
export const BUTTON =
  'rounded border border-stone-700 px-2 py-0.5 text-xs text-text-secondary hover:text-text-primary disabled:opacity-40'
const ICON =
  'rounded p-0.5 text-text-secondary hover:bg-white/10 hover:text-text-primary disabled:opacity-30'

/** Everything a filter, a selector or a maths node can read. */
export const ATTRIBUTES: PcgAttributeName[] = [
  'density',
  'color',
  'steepness',
  'elevation',
  'slope',
  'overlay',
  'wall',
  'noise',
  'cell',
  'distanceWater',
  'distanceAuthored',
  'distanceLayers',
  'objectId',
]

// ## fields

function Field({
  label,
  title,
  width = 'w-16',
  children,
}: {
  label: string
  title?: string
  /** The control's width; the label has the rest of the row. */
  width?: string
  children: React.ReactNode
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-text-secondary" title={title}>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className={cn('shrink-0', width)}>{children}</span>
    </label>
  )
}

/** A number that is always set. */
export function Num({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  title,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  title?: string
}) {
  return (
    <Field label={label} title={title}>
      <input
        type="number"
        className={INPUT}
        value={value}
        min={min}
        max={max}
        step={step}
        aria-label={label}
        onChange={(e) => {
          const next = Number(e.target.value)

          if (e.target.value !== '' && Number.isFinite(next)) {
            onChange(Math.max(min ?? -Infinity, Math.min(max ?? Infinity, next)))
          }
        }}
      />
    </Field>
  )
}

/** A number the graph may leave out: empty is "not set". */
export function Opt({
  label,
  value,
  onChange,
  step = 1,
  title,
}: {
  label: string
  value: number | undefined
  onChange: (value: number | undefined) => void
  step?: number
  title?: string
}) {
  return (
    <Field label={label} title={title}>
      <input
        type="number"
        className={INPUT}
        value={value ?? ''}
        step={step}
        placeholder="—"
        aria-label={label}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
      />
    </Field>
  )
}

export function Check({
  label,
  checked,
  onChange,
  title,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  title?: string
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-text-secondary" title={title}>
      <input
        type="checkbox"
        className="accent-gold-500"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label}
    </label>
  )
}

export function Pick<T extends string>({
  label,
  value,
  options,
  onChange,
  title,
}: {
  label: string
  value: T
  options: readonly (T | { id: T; label: string })[]
  onChange: (value: T) => void
  title?: string
}) {
  return (
    <Field label={label} title={title} width="w-40">
      <select
        className={INPUT}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((option) => {
          const id = typeof option === 'string' ? option : option.id

          return (
            <option key={id} value={id}>
              {typeof option === 'string' ? option : option.label}
            </option>
          )
        })}
      </select>
    </Field>
  )
}

/** A node: its Unreal name over its options. */
export function Group({
  title,
  action,
  children,
}: {
  title: string
  action?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <div className="space-y-1 rounded border border-stone-800 p-2">
      <div className="flex items-center justify-between gap-2">
        <span className={LABEL}>{title}</span>
        {action}
      </div>
      {children}
    </div>
  )
}

function Remove({ what, onClick }: { what: string; onClick: () => void }) {
  return (
    <button type="button" title={`Remove ${what}`} aria-label={`Remove ${what}`} onClick={onClick} className={ICON}>
      <X className="h-3 w-3" />
    </button>
  )
}

function Add({ what, onClick }: { what: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn(BUTTON, 'flex items-center gap-1')}>
      <Plus className="h-3 w-3" />
      {what}
    </button>
  )
}

/** A list with one item changed, or taken out when `next` is null. */
function patched<T>(list: T[], index: number, next: T | null): T[] {
  return next === null
    ? list.filter((_, i) => i !== index)
    : list.map((item, i) => (i === index ? next : item))
}

// ## filters

/** Attribute Filter and Attribute Filter Range: the graph's list, or a layer's. */
export function Filters({
  filters,
  onChange,
  palette,
}: {
  filters: PcgAttributeFilter[]
  onChange: (filters: PcgAttributeFilter[]) => void
  palette: LandscapePalette
}) {
  return (
    <div className="space-y-1.5">
      {filters.map((filter, index) => {
        const set = (patch: Partial<PcgAttributeFilter>) =>
          onChange(patched(filters, index, { ...filter, ...patch }))

        return (
          <div key={index} className="space-y-1 border-l border-stone-700 pl-2">
            <div className="flex items-center gap-1">
              <div className="min-w-0 flex-1">
                <Pick
                  label="Attribute"
                  value={filter.attribute}
                  options={ATTRIBUTES}
                  onChange={(attribute) => set({ attribute })}
                />
              </div>
              <Remove what="filter" onClick={() => onChange(patched(filters, index, null))} />
            </div>
            <div className="grid grid-cols-2 gap-1">
              <Opt label="Min" value={filter.min} onChange={(min) => set({ min })} />
              <Opt label="Max" value={filter.max} onChange={(max) => set({ max })} />
            </div>
            <Field label="Values" width="w-40" title="Keep only these values: numbers with commas between. Empty for any.">
              <input
                key={(filter.values ?? []).join()}
                className={INPUT}
                defaultValue={(filter.values ?? []).join(', ')}
                placeholder="any"
                aria-label="Values"
                onBlur={(e) => {
                  const values = e.target.value
                    .split(/[\s,]+/)
                    .filter(Boolean)
                    .map(Number)
                    .filter(Number.isFinite)

                  set({ values: values.length ? values : undefined })
                }}
              />
            </Field>
            {filter.attribute === 'color' && filter.values?.length ? (
              <div className="flex flex-wrap justify-end gap-0.5">
                {filter.values.map((colour) => (
                  <span
                    key={colour}
                    title={`Colour ${colour}`}
                    className="h-3.5 w-3.5 rounded-sm border border-stone-600"
                    style={{ background: palette.terrain[colour] }}
                  />
                ))}
              </div>
            ) : null}
            <Check
              label="Invert: keep what is outside"
              checked={!!filter.invert}
              onChange={(invert) => set({ invert })}
            />
          </div>
        )
      })}
      <Add what="Filter" onClick={() => onChange([...filters, { attribute: 'slope', max: 12 }])} />
    </div>
  )
}

// ## mesh entries

function Range({
  label,
  range,
  fallback,
  onChange,
}: {
  label: string
  range: PcgRange | undefined
  fallback: PcgRange
  onChange: (range: PcgRange | undefined) => void
}) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-text-secondary">
      <label className="flex min-w-0 flex-1 items-center gap-1.5">
        <input
          type="checkbox"
          className="accent-gold-500"
          checked={!!range}
          onChange={(e) => onChange(e.target.checked ? fallback : undefined)}
        />
        {label}
      </label>
      {(['min', 'max'] as const).map((end) => (
        <input
          key={end}
          type="number"
          className={cn(INPUT, 'w-16 shrink-0 disabled:opacity-40')}
          disabled={!range}
          value={(range ?? fallback)[end]}
          aria-label={`${label} ${end}`}
          onChange={(e) => onChange({ ...(range ?? fallback), [end]: Number(e.target.value) })}
        />
      ))}
    </div>
  )
}

/** A spawner's mesh entries: an object, its weight, its room, and where it may go. */
function Entries({
  entries,
  onChange,
  palette,
}: {
  entries: PcgMeshEntry[]
  onChange: (entries: PcgMeshEntry[]) => void
  palette: LandscapePalette
}) {
  const [adding, setAdding] = useState('')
  const [open, setOpen] = useState<number | null>(null)
  const total = entries.reduce((sum, entry) => sum + Math.max(0, entry.weight), 0)
  const addId = Number.parseInt(adding, 10)

  return (
    <div className="space-y-1">
      {entries.map((entry, index) => {
        const set = (patch: Partial<PcgMeshEntry>) =>
          onChange(patched(entries, index, { ...entry, ...patch }))
        const name = palette.objects[String(entry.objectId)]
        const options = entry.filterOptions

        return (
          <div key={index} className="space-y-0.5 border-l border-stone-700 pl-2">
            <div className="flex items-center gap-1 text-xs">
              <span className={cn('min-w-0 flex-1 truncate', name ? 'text-text-primary' : 'text-amber-300')}>
                {name ?? 'not in the palette'} <span className="text-text-secondary">#{entry.objectId}</span>
              </span>
              <span className="text-text-secondary" title="The chance: its weight over the sum of the weights">
                {total ? `${Math.round((Math.max(0, entry.weight) / total) * 100)}%` : '—'}
              </span>
              <button
                type="button"
                title="Filter Options: where this entry may be chosen at all"
                onClick={() => setOpen(open === index ? null : index)}
                className={cn(ICON, options && 'text-gold-400')}
              >
                {open === index ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              </button>
              <Remove what="entry" onClick={() => onChange(patched(entries, index, null))} />
            </div>
            <div className="grid grid-cols-2 gap-1">
              <Num label="Weight" value={entry.weight} min={0} onChange={(weight) => set({ weight })} />
              <Opt
                label="Spacing"
                title="Tiles kept clear on every side. Empty takes the layer's Bounds Modifier."
                value={entry.spacing}
                onChange={(spacing) => set({ spacing })}
              />
            </div>
            {open === index && (
              <div className="space-y-0.5">
                {(
                  [
                    ['density', 'Density', { min: 0, max: 1 }],
                    ['height', 'Height', { min: 0, max: 255 }],
                    ['waterDistance', 'Water distance', { min: 0, max: 3 }],
                  ] as const
                ).map(([key, label, fallback]) => (
                  <Range
                    key={key}
                    label={label}
                    range={options?.[key]}
                    fallback={fallback}
                    onChange={(range) => {
                      const next = { ...options, [key]: range }

                      set({ filterOptions: Object.values(next).some(Boolean) ? next : undefined })
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
      <div className="flex items-center gap-1">
        <input
          type="number"
          className={INPUT}
          value={adding}
          min={0}
          placeholder="object id"
          aria-label="Object id to add"
          onChange={(e) => setAdding(e.target.value)}
        />
        <span className="w-24 shrink-0 truncate text-[11px] text-text-secondary">
          {adding === '' ? '' : (palette.objects[String(addId)] ?? 'unknown')}
        </span>
        <button
          type="button"
          disabled={!(String(addId) in palette.objects)}
          onClick={() => {
            onChange([...entries, { objectId: addId, weight: 10 }])
            setAdding('')
          }}
          className={BUTTON}
        >
          Add
        </button>
      </div>
    </div>
  )
}

// ## the nodes

const NOISE: PcgSpatialNoise = {
  mode: 'Perlin2D',
  scale: 16,
  iterations: 2,
  brightness: 0,
  contrast: 1,
  randomOffset: 0,
  voronoiCellRandomness: 1,
}

// ready-made curves; the names are this tool's, not Unreal's
const CURVES: Record<string, PcgCurve> = {
  'Ease in': [
    { x: 0, y: 0 },
    { x: 0.5, y: 0.2 },
    { x: 1, y: 1 },
  ],
  'Ease out': [
    { x: 0, y: 0 },
    { x: 0.5, y: 0.8 },
    { x: 1, y: 1 },
  ],
  Stairs: [
    { x: 0, y: 0 },
    { x: 0.33, y: 0 },
    { x: 0.34, y: 0.5 },
    { x: 0.66, y: 0.5 },
    { x: 0.67, y: 1 },
    { x: 1, y: 1 },
  ],
}

const DENSITY_NODES: Record<PcgDensityNode['node'], { label: string; make: () => PcgDensityNode }> = {
  DensityRemap: {
    label: 'Density Remap',
    make: () => ({
      node: 'DensityRemap',
      inRangeMin: 0,
      inRangeMax: 1,
      outRangeMin: 0,
      outRangeMax: 1,
      excludeValuesOutsideInputRange: false,
    }),
  },
  CurveRemapDensity: {
    label: 'Curve Remap Density',
    make: () => ({ node: 'CurveRemapDensity', curve: CURVES['Ease in'] }),
  },
  AttributeMathsOp: {
    label: 'Attribute Maths Op',
    make: () => ({ node: 'AttributeMathsOp', op: 'Multiply', attribute: 'noise' }),
  },
  DensityNoise: {
    label: 'Density Noise',
    make: () => ({ node: 'DensityNoise', mode: 'Multiply', noiseMin: 0.5, noiseMax: 1, invertSource: false }),
  },
  NormalToDensity: {
    label: 'Normal To Density',
    make: () => ({ node: 'NormalToDensity', maxSlope: 12 }),
  },
}

/** The noise as it lies on the ground: 48 tiles a side from `origin`, light where it is high. */
function Swatch({
  noise,
  layerSeed,
  graphSeed,
  origin,
}: {
  noise: PcgSpatialNoise
  layerSeed: number
  graphSeed: number
  origin: { x: number; y: number }
}) {
  const ref = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const context = ref.current?.getContext('2d')

    if (!context) {
      return
    }

    const at = spatialNoise(noise, layerSeed, graphSeed)
    const image = context.createImageData(48, 48)

    for (let row = 0; row < 48; row++) {
      for (let column = 0; column < 48; column++) {
        // game x grows westward, so it runs right to left, as on the map
        const { value, cell } = at(origin.x + 47 - column, origin.y + row)
        const pixel = (row * 48 + column) * 4

        image.data[pixel] = value * 255
        image.data[pixel + 1] = noise.mode === 'Voronoi2D' ? (cell % 200) + 40 : value * 255
        image.data[pixel + 2] = value * 255
        image.data[pixel + 3] = 255
      }
    }

    context.putImageData(image, 0, 0)
  }, [noise, layerSeed, graphSeed, origin.x, origin.y])

  return (
    <canvas
      ref={ref}
      width={48}
      height={48}
      title="The noise over 48 tiles of the area"
      className="h-24 w-24 shrink-0 rounded border border-stone-700"
      style={{ imageRendering: 'pixelated' }}
    />
  )
}

function DensityNode({ node, onChange }: { node: PcgDensityNode; onChange: (node: PcgDensityNode) => void }) {
  switch (node.node) {
    case 'DensityRemap':
      return (
        <>
          <div className="grid grid-cols-2 gap-1">
            {(['inRangeMin', 'inRangeMax', 'outRangeMin', 'outRangeMax'] as const).map((key) => (
              <Num
                key={key}
                label={key.replace('Range', ' ').replace(/^./, (c) => c.toUpperCase())}
                value={node[key]}
                min={0}
                max={1}
                step={0.01}
                onChange={(value) => onChange({ ...node, [key]: value })}
              />
            ))}
          </div>
          <Check
            label="Exclude Values Outside Input Range"
            checked={node.excludeValuesOutsideInputRange}
            onChange={(excludeValuesOutsideInputRange) => onChange({ ...node, excludeValuesOutsideInputRange })}
          />
        </>
      )

    case 'CurveRemapDensity':
      return (
        <>
          <div className="flex flex-wrap gap-1">
            {Object.entries(CURVES).map(([name, curve]) => (
              <button key={name} type="button" onClick={() => onChange({ ...node, curve })} className={BUTTON}>
                {name}
              </button>
            ))}
          </div>
          <Field label="Curve" width="w-48" title="Points as density:new density, joined by straight lines">
            <input
              key={JSON.stringify(node.curve)}
              className={INPUT}
              defaultValue={node.curve.map((knot) => `${knot.x}:${knot.y}`).join(' ')}
              aria-label="Curve"
              onBlur={(e) => {
                const curve = e.target.value
                  .split(/[\s,]+/)
                  .map((pair) => pair.split(':').map(Number))
                  .filter((pair) => pair.length === 2 && pair.every(Number.isFinite))
                  .map(([x, y]) => ({ x, y }))

                if (curve.length) {
                  onChange({ ...node, curve })
                }
              }}
            />
          </Field>
        </>
      )

    case 'AttributeMathsOp':
      return (
        <div className="space-y-1">
          <Pick
            label="Operation"
            value={node.op}
            options={['Multiply', 'Add', 'Subtract', 'Min', 'Max', 'Set']}
            onChange={(op) => onChange({ ...node, op })}
          />
          <Pick
            label="Attribute"
            value={node.attribute}
            options={ATTRIBUTES}
            onChange={(attribute) => onChange({ ...node, attribute })}
          />
        </div>
      )

    case 'DensityNoise':
      return (
        <>
          <Pick
            label="Mode"
            value={node.mode}
            options={['Set', 'Minimum', 'Maximum', 'Add', 'Multiply']}
            onChange={(mode) => onChange({ ...node, mode })}
          />
          <div className="grid grid-cols-2 gap-1">
            <Num label="Noise Min" value={node.noiseMin} step={0.05} onChange={(noiseMin) => onChange({ ...node, noiseMin })} />
            <Num label="Noise Max" value={node.noiseMax} step={0.05} onChange={(noiseMax) => onChange({ ...node, noiseMax })} />
          </div>
          <Check
            label="Invert Source"
            checked={node.invertSource}
            onChange={(invertSource) => onChange({ ...node, invertSource })}
          />
        </>
      )

    case 'NormalToDensity':
      return (
        <Num
          label="Max slope"
          title="No density at this slope or steeper; full density on flat ground"
          value={node.maxSlope}
          min={1}
          onChange={(maxSlope) => onChange({ ...node, maxSlope })}
        />
      )
  }
}

/** The entries of whichever selector a spawner has, as one list. */
function entriesOf(selector: PcgMeshSelector): PcgMeshEntry[] {
  return selector.type === 'Weighted'
    ? selector.meshEntries
    : selector.type === 'WeightedByCategory'
      ? Object.values(selector.entries).flat()
      : Object.values(selector.meshes).map((objectId) => ({ objectId, weight: 1 }))
}

/** A record with one key renamed, its place in the order kept. */
function renamed<T>(record: Record<string, T>, from: string, to: string): Record<string, T> {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [key === from ? to : key, value]))
}

function without<T>(record: Record<string, T>, key: string): Record<string, T> {
  return Object.fromEntries(Object.entries(record).filter(([other]) => other !== key))
}

/** The first whole number that is not a key yet. */
function freeKey(record: Record<string, unknown>): string {
  let key = 0

  while (String(key) in record) {
    key += 1
  }

  return String(key)
}

interface PcgLayerEditorProps {
  layer: PcgLayer
  graph: PcgGraph
  palette: LandscapePalette
  /** Where the noise swatch looks: a corner of the area. */
  origin: { x: number; y: number }
  onChange: (patch: Partial<PcgLayer>) => void
}

export function PcgLayerEditor({ layer, graph, palette, origin, onChange }: PcgLayerEditorProps) {
  const [adding, setAdding] = useState<PcgDensityNode['node']>('AttributeMathsOp')
  const { sampler, spatialNoise: noise, difference, transform, selfPruning } = layer
  const distances = layer.distances ?? []
  const density = layer.density ?? []
  const selector = layer.spawner.meshSelector
  const setSelector = (meshSelector: PcgMeshSelector) =>
    onChange({ spawner: { ...layer.spawner, meshSelector } })
  const others = graph.layers.filter((other) => other.id !== layer.id)
  const move = (index: number, by: number) => {
    const next = [...density]

    next.splice(index + by, 0, ...next.splice(index, 1))
    onChange({ density: next })
  }

  return (
    <div className="space-y-1.5">
      <Group title="Grid Size">
        <Pick
          label="Grid Size"
          title="Where the layer executes: once over the whole area, or once per sector"
          value={layer.gridSize === null ? 'default' : String(layer.gridSize)}
          options={[
            { id: 'default', label: `Graph default (${graph.parameters.hiGenDefaultGridSize})` },
            { id: 'Unbounded', label: 'Unbounded' },
            { id: '48', label: '48: a sector' },
          ]}
          onChange={(id) => onChange({ gridSize: id === 'default' ? null : id === '48' ? 48 : 'Unbounded' })}
        />
      </Group>

      <Group title="Surface Sampler">
        <div className="grid grid-cols-2 gap-1">
          <Num
            label="Point Extents"
            title="The side of a sample cell in tiles: one candidate per cell"
            value={sampler.pointExtents}
            min={1}
            max={24}
            onChange={(pointExtents) => onChange({ sampler: { ...sampler, pointExtents } })}
          />
          <Num
            label="Looseness"
            title="0 is the cell's centre tile, 1 any tile of the cell"
            value={sampler.looseness}
            min={0}
            max={1}
            step={0.1}
            onChange={(looseness) => onChange({ sampler: { ...sampler, looseness } })}
          />
        </div>
        <Num
          label="Point Steepness"
          title="How hard the edge of an object is to later layers: 1 masks its tiles only, lower fades out around them"
          value={sampler.pointSteepness}
          min={0}
          max={1}
          step={0.1}
          onChange={(pointSteepness) => onChange({ sampler: { ...sampler, pointSteepness } })}
        />
        <p className={NOTE}>
          {(100 / Math.max(1, Math.floor(sampler.pointExtents)) ** 2).toFixed(1)} points per 100 tiles
        </p>
      </Group>

      <Group title="Copy Points">
        <Pick
          label="Target"
          title="In place of the sampler: a ring of candidates around each object of another layer"
          value={layer.copyPoints?.target ?? ''}
          options={[{ id: '', label: 'none: use the sampler' }, ...others.map(({ id, label }) => ({ id, label }))]}
          onChange={(target) =>
            onChange({ copyPoints: target ? { target, ring: layer.copyPoints?.ring ?? 1 } : undefined })
          }
        />
        {layer.copyPoints && (
          <Num
            label="Ring"
            title="How many tiles out from each object's bounds"
            value={layer.copyPoints.ring}
            min={1}
            max={8}
            onChange={(ring) => onChange({ copyPoints: { ...layer.copyPoints!, ring } })}
          />
        )}
      </Group>

      <Group
        title="Spatial Noise"
        action={
          <Check label="On" checked={!!noise} onChange={(on) => onChange({ spatialNoise: on ? NOISE : undefined })} />
        }
      >
        {noise && (
          <Pick
            label="Mode"
            value={noise.mode}
            options={['Perlin2D', 'Voronoi2D']}
            onChange={(mode) => onChange({ spatialNoise: { ...noise, mode } })}
          />
        )}
        {noise && (
          <div className="flex gap-2">
            <div className="min-w-0 flex-1 space-y-1">
              {(
                [
                  ['scale', 'Scale', 1, 1, 96, 'Tiles across one feature of the noise'],
                  ['iterations', 'Iterations', 1, 1, 6, 'Octaves of detail'],
                  ['brightness', 'Brightness', 0.05, -1, 1, ''],
                  ['contrast', 'Contrast', 0.1, 0, 8, 'Higher is sharper clearings'],
                  ['randomOffset', 'Random Offset', 1, 0, 9999, 'Shifts the field by up to this many tiles'],
                  ['voronoiCellRandomness', 'Cell Randomness', 0.1, 0, 1, '0 is a regular grid of cells'],
                ] as const
              ).map(([key, label, step, min, max, title]) => (
                <Num
                  key={key}
                  label={label}
                  title={title}
                  value={noise[key]}
                  step={step}
                  min={min}
                  max={max}
                  onChange={(value) => onChange({ spatialNoise: { ...noise, [key]: value } })}
                />
              ))}
            </div>
            <Swatch noise={noise} layerSeed={layer.seed} graphSeed={graph.parameters.seed} origin={origin} />
          </div>
        )}
        {noise && <p className={NOTE}>It writes the noise attribute. An Attribute Maths Op puts it in the density.</p>}
      </Group>

      <Group title="Distance">
        {distances.map((distance, index) => {
          const set = (patch: Partial<PcgDistance>) =>
            onChange({ distances: patched(distances, index, { ...distance, ...patch }) })
          const attribute = `distance${distance.target[0].toUpperCase()}${distance.target.slice(1)}` as NonNullable<
            PcgDistance['outputAttribute']
          >

          return (
            <div key={index} className="space-y-1 border-l border-stone-700 pl-2">
              <div className="flex items-center gap-1">
                <div className="min-w-0 flex-1">
                  <Pick
                    label="Target"
                    value={distance.target}
                    options={[
                      { id: 'water', label: 'Water' },
                      { id: 'authored', label: 'What is there already' },
                      { id: 'layers', label: 'Earlier layers' },
                    ]}
                    onChange={(target) =>
                      set({
                        target,
                        outputAttribute: distance.outputAttribute
                          ? (`distance${target[0].toUpperCase()}${target.slice(1)}` as typeof attribute)
                          : undefined,
                      })
                    }
                  />
                </div>
                <Remove what="distance" onClick={() => onChange({ distances: patched(distances, index, null) })} />
              </div>
              <Num
                label="Maximum Distance"
                value={distance.maximumDistance}
                min={1}
                max={64}
                onChange={(maximumDistance) => set({ maximumDistance })}
              />
              <Check
                label="Set Density: 0 at the target, 1 at the maximum"
                checked={distance.setDensity}
                onChange={(setDensity) => set({ setDensity })}
              />
              <Check
                label={`Output To Attribute (${attribute})`}
                checked={!!distance.outputAttribute}
                onChange={(on) => set({ outputAttribute: on ? attribute : undefined })}
              />
            </div>
          )
        })}
        <Add
          what="Distance"
          onClick={() =>
            onChange({
              distances: [
                ...distances,
                { target: 'water', maximumDistance: 6, setDensity: false, outputAttribute: 'distanceWater' },
              ],
            })
          }
        />
      </Group>

      <Group title="Density">
        {density.map((node, index) => (
          <div key={index} className="space-y-1 border-l border-stone-700 pl-2">
            <div className="flex items-center gap-1 text-xs text-text-primary">
              <span className="min-w-0 flex-1 truncate">{DENSITY_NODES[node.node].label}</span>
              <button type="button" title="Earlier" disabled={index === 0} onClick={() => move(index, -1)} className={ICON}>
                <ArrowUp className="h-3 w-3" />
              </button>
              <button
                type="button"
                title="Later"
                disabled={index === density.length - 1}
                onClick={() => move(index, 1)}
                className={ICON}
              >
                <ArrowDown className="h-3 w-3" />
              </button>
              <Remove what="node" onClick={() => onChange({ density: patched(density, index, null) })} />
            </div>
            <DensityNode node={node} onChange={(next) => onChange({ density: patched(density, index, next) })} />
          </div>
        ))}
        <div className="flex items-center gap-1">
          <select
            className={INPUT}
            value={adding}
            aria-label="Density node to add"
            onChange={(e) => setAdding(e.target.value as PcgDensityNode['node'])}
          >
            {Object.entries(DENSITY_NODES).map(([id, { label }]) => (
              <option key={id} value={id}>
                {label}
              </option>
            ))}
          </select>
          <Add what="Add" onClick={() => onChange({ density: [...density, DENSITY_NODES[adding].make()] })} />
        </div>
      </Group>

      <Group title="Difference">
        <div className="grid grid-cols-2 gap-1">
          {(
            [
              ['water', 'Water'],
              ['walls', 'Walls and roofs'],
              ['authored', 'What is there'],
              ['layers', 'Earlier layers'],
            ] as const
          ).map(([source, label]) => (
            <Check
              key={source}
              label={label}
              checked={difference.sources.includes(source)}
              onChange={(on) =>
                onChange({
                  difference: {
                    ...difference,
                    sources: on
                      ? [...difference.sources, source]
                      : difference.sources.filter((other) => other !== source),
                  },
                })
              }
            />
          ))}
        </div>
        <Pick
          label="Density Function"
          title="Binary: none where a mask is. Clamped Subtraction: density less the mask. Minimum: the lesser of density and what the mask leaves."
          value={difference.densityFunction}
          options={['Binary', 'ClampedSubtraction', 'Minimum']}
          onChange={(densityFunction) => onChange({ difference: { ...difference, densityFunction } })}
        />
      </Group>

      <Group title="Attribute Filter">
        <Filters filters={layer.filters ?? []} onChange={(filters) => onChange({ filters })} palette={palette} />
      </Group>

      <Group
        title="Density Filter"
        action={
          <Check
            label="On"
            checked={!!layer.densityFilter}
            onChange={(on) =>
              onChange({ densityFilter: on ? { lowerBound: 0.5, upperBound: 1, invertFilter: false } : undefined })
            }
          />
        }
      >
        {layer.densityFilter && (
          <>
            <div className="grid grid-cols-2 gap-1">
              <Num
                label="Lower Bound"
                value={layer.densityFilter.lowerBound}
                min={0}
                max={1}
                step={0.05}
                onChange={(lowerBound) => onChange({ densityFilter: { ...layer.densityFilter!, lowerBound } })}
              />
              <Num
                label="Upper Bound"
                value={layer.densityFilter.upperBound}
                min={0}
                max={1}
                step={0.05}
                onChange={(upperBound) => onChange({ densityFilter: { ...layer.densityFilter!, upperBound } })}
              />
            </div>
            <Check
              label="Invert Filter"
              checked={layer.densityFilter.invertFilter}
              onChange={(invertFilter) => onChange({ densityFilter: { ...layer.densityFilter!, invertFilter } })}
            />
          </>
        )}
      </Group>

      <Group title="Static Mesh Spawner">
        <Pick
          label="Mesh Selector"
          value={selector.type}
          options={[
            { id: 'Weighted', label: 'Weighted' },
            { id: 'ByAttribute', label: 'By Attribute' },
            { id: 'WeightedByCategory', label: 'Weighted By Category' },
          ]}
          onChange={(type) => {
            const entries = entriesOf(selector)

            if (type === selector.type) {
              return
            }

            setSelector(
              type === 'Weighted'
                ? { type, meshEntries: entries }
                : type === 'ByAttribute'
                  ? {
                      type,
                      attribute: 'cell',
                      meshes: Object.fromEntries(entries.map((entry, i) => [String(i), entry.objectId])),
                    }
                  : { type, categoryAttribute: 'cell', entries: { 0: entries } },
            )
          }}
        />

        {selector.type === 'Weighted' && (
          <Entries
            entries={selector.meshEntries}
            onChange={(meshEntries) => setSelector({ ...selector, meshEntries })}
            palette={palette}
          />
        )}

        {selector.type === 'ByAttribute' && (
          <>
            <Pick
              label="Attribute"
              title="The value that picks the object. A Voronoi cell takes the rows in turn."
              value={selector.attribute}
              options={ATTRIBUTES}
              onChange={(attribute) => setSelector({ ...selector, attribute })}
            />
            {Object.entries(selector.meshes).map(([key, objectId]) => (
              <div key={key} className="flex items-center gap-1 text-xs text-text-secondary">
                <input
                  className={cn(INPUT, 'w-14 shrink-0')}
                  defaultValue={key}
                  aria-label="Attribute value"
                  title="The attribute's value"
                  onBlur={(e) =>
                    e.target.value &&
                    e.target.value !== key &&
                    setSelector({ ...selector, meshes: renamed(selector.meshes, key, e.target.value) })
                  }
                />
                <input
                  type="number"
                  className={cn(INPUT, 'w-16 shrink-0')}
                  value={objectId}
                  min={0}
                  aria-label="Object id"
                  onChange={(e) =>
                    setSelector({ ...selector, meshes: { ...selector.meshes, [key]: Number(e.target.value) } })
                  }
                />
                <span className={cn('min-w-0 flex-1 truncate', !palette.objects[String(objectId)] && 'text-amber-300')}>
                  {palette.objects[String(objectId)] ?? 'not in the palette'}
                </span>
                <Remove what="row" onClick={() => setSelector({ ...selector, meshes: without(selector.meshes, key) })} />
              </div>
            ))}
            <Add
              what="Value"
              onClick={() => setSelector({ ...selector, meshes: { ...selector.meshes, [freeKey(selector.meshes)]: 0 } })}
            />
          </>
        )}

        {selector.type === 'WeightedByCategory' && (
          <>
            <Pick
              label="Category Attribute"
              title="The value that picks the category. A Voronoi cell takes the categories in turn."
              value={selector.categoryAttribute}
              options={ATTRIBUTES}
              onChange={(categoryAttribute) => setSelector({ ...selector, categoryAttribute })}
            />
            {Object.entries(selector.entries).map(([key, entries]) => (
              <div key={key} className="space-y-1 rounded border border-stone-800 p-1.5">
                <div className="flex items-center gap-1 text-xs text-text-secondary">
                  <span className="shrink-0">Category</span>
                  <input
                    className={INPUT}
                    defaultValue={key}
                    aria-label="Category value"
                    onBlur={(e) =>
                      e.target.value &&
                      e.target.value !== key &&
                      setSelector({ ...selector, entries: renamed(selector.entries, key, e.target.value) })
                    }
                  />
                  <Remove
                    what="category"
                    onClick={() => setSelector({ ...selector, entries: without(selector.entries, key) })}
                  />
                </div>
                <Entries
                  entries={entries}
                  onChange={(next) => setSelector({ ...selector, entries: { ...selector.entries, [key]: next } })}
                  palette={palette}
                />
              </div>
            ))}
            <Add
              what="Category"
              onClick={() =>
                setSelector({ ...selector, entries: { ...selector.entries, [freeKey(selector.entries)]: [] } })
              }
            />
          </>
        )}
      </Group>

      <Group title="Transform Points">
        <div className="grid grid-cols-2 gap-1">
          <Num
            label="Rotation Min"
            title="A facing, 0-7: each step is 45 degrees"
            value={transform.rotationMin}
            min={0}
            max={7}
            onChange={(rotationMin) => onChange({ transform: { ...transform, rotationMin } })}
          />
          <Num
            label="Rotation Max"
            value={transform.rotationMax}
            min={0}
            max={7}
            onChange={(rotationMax) => onChange({ transform: { ...transform, rotationMax } })}
          />
          {([0, 1] as const).flatMap((axis) =>
            (['offsetMin', 'offsetMax'] as const).map((key) => (
              <Num
                key={key + axis}
                label={`Offset ${key === 'offsetMin' ? 'Min' : 'Max'} ${axis ? 'Y' : 'X'}`}
                title="Whole tiles the point is moved by"
                value={transform[key][axis]}
                min={-8}
                max={8}
                onChange={(value) => {
                  const next: [number, number] = [...transform[key]]

                  next[axis] = value
                  onChange({ transform: { ...transform, [key]: next } })
                }}
              />
            )),
          )}
        </div>
        <Check
          label="Absolute Rotation"
          checked={transform.absoluteRotation}
          onChange={(absoluteRotation) => onChange({ transform: { ...transform, absoluteRotation } })}
        />
        <Check
          label="Recompute Seed: from the tile it moved to"
          checked={transform.recomputeSeed}
          onChange={(recomputeSeed) => onChange({ transform: { ...transform, recomputeSeed } })}
        />
      </Group>

      <Group title="Bounds Modifier">
        <Num
          label="Expand"
          title="Tiles kept clear round every object of the layer, before Self Pruning. An entry's own Spacing wins."
          value={layer.boundsModifier?.expand ?? 0}
          min={0}
          max={8}
          onChange={(expand) => onChange({ boundsModifier: expand ? { expand } : undefined })}
        />
      </Group>

      <Group title="Self Pruning">
        <Pick
          label="Pruning Type"
          title="Which of two overlapping objects stays. None lets them overlap, which the sanity check then refuses."
          value={selfPruning.pruningType}
          options={['LargeToSmall', 'SmallToLarge', 'AllEqual', 'RemoveDuplicates', 'None']}
          onChange={(pruningType) => onChange({ selfPruning: { ...selfPruning, pruningType } })}
        />
        <div className="space-y-1">
          <Num
            label="Similarity"
            title="Radius Similarity Factor: sizes within this fraction of each other count as equal"
            value={selfPruning.radiusSimilarityFactor}
            min={0}
            max={1}
            step={0.05}
            onChange={(radiusSimilarityFactor) => onChange({ selfPruning: { ...selfPruning, radiusSimilarityFactor } })}
          />
          <Pick
            label="Compare"
            title="Comparison Source: what large means"
            value={selfPruning.comparisonSource}
            options={['extents', 'density']}
            onChange={(comparisonSource) => onChange({ selfPruning: { ...selfPruning, comparisonSource } })}
          />
        </div>
        <Check
          label="Randomized Pruning: among equals, by seed"
          checked={selfPruning.randomizedPruning}
          onChange={(randomizedPruning) => onChange({ selfPruning: { ...selfPruning, randomizedPruning } })}
        />
      </Group>
    </div>
  )
}
