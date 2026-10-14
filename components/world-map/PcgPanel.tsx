'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, Bug, ChevronDown, Copy, Shuffle, Trash2, X } from 'lucide-react'

import { PcgInspector } from '@/components/world-map/PcgInspector'
import {
  BUTTON,
  Check,
  Filters,
  Group,
  INPUT,
  LABEL,
  NOTE,
  Num,
  PcgLayerEditor,
  Pick,
} from '@/components/world-map/PcgLayerEditor'
import { Choice, Slider } from '@/components/world-map/ToolPanel'
import { pcgLayerColour, pcgReasonColour } from '@/components/world-map/WorldCanvas'
import {
  PCG_GRAPHS,
  areaOfDomain,
  readSetup,
  setupOf,
  type PcgBiomeSet,
  type PcgDomain,
  type PcgGraph,
  type PcgLayer,
  type PcgManualEdit,
  type PcgMeshSelector,
  type PcgParameters,
  type PcgPoint,
  type PcgResult,
  type PcgRun,
  type PcgToolTag,
} from '@/lib/landscape/pcg'
import type { LandscapePalette } from '@/lib/landscape/types'
import { cn } from '@/lib/utils'

/**
 * The PCG tool's panel: the graph, as a list. Top to bottom it is Unreal's
 * PCG component (the area, the graph, Generate / Cleanup / Apply), the graph's
 * parameters, its layers - a selected one opens into its nodes - and the
 * debugging tools: what the map colours by, the Debug Tree, the manual edits
 * and the Attributes list.
 *
 * Generate shows what would be placed, and from then on the preview follows
 * every change. Cleanup drops it. Apply bakes it into the map as ordinary
 * scenery, one step to undo (Unreal's Clear PCG Link).
 */

/** What of the panel the editor keeps: the layer in hand, and how the map shows the points. */
export interface PcgUi {
  selectedLayer: string | null
  /** The layer whose Attributes list is open. */
  inspect: string | null
  /** The tile the list is narrowed to. */
  inspectTile: { x: number; y: number } | null
  /** The point ringed on the map. */
  highlight: { x: number; y: number } | null
  colourBy: 'layer' | 'density' | 'culled'
  showCulled: boolean
  /** Show what would be placed in the 3D view as well. */
  in3d: boolean
}

export const PCG_UI: PcgUi = {
  selectedLayer: null,
  inspect: null,
  inspectTile: null,
  highlight: null,
  colourBy: 'layer',
  showCulled: false,
  in3d: true,
}

// the ways to draw the area: the tools of Unreal's PCG Editor Mode
const AREA_TOOLS: { id: PcgToolTag; label: string; note: string }[] = [
  {
    id: 'VolumeTool',
    label: 'Rectangle',
    note: 'Drag across the map. A click asks what happened on a tile.',
  },
  {
    id: 'SplineSurfaceTool',
    label: 'Polygon',
    note: 'Click the map corner by corner. Enter or Finish closes it, Backspace takes a corner back, Esc drops it. Alt+click asks about a tile.',
  },
  {
    id: 'SplineTool',
    label: 'Path',
    note: 'Click the map point by point. Enter or Finish ends it, Backspace takes a point back, Esc drops it. Alt+click asks about a tile.',
  },
  {
    id: 'PaintTool',
    label: 'Paint',
    note: 'Paint the tiles to fill; hold Shift to rub them out. Alt+click asks about a tile.',
  },
]

/** Every object a selector can place, once each. */
function objectsOf(selector: PcgMeshSelector): number[] {
  return [
    ...new Set(
      selector.type === 'Weighted'
        ? selector.meshEntries.map((entry) => entry.objectId)
        : selector.type === 'ByAttribute'
          ? Object.values(selector.meshes)
          : Object.values(selector.entries).flatMap((list) => list.map((entry) => entry.objectId)),
    ),
  ]
}

/** A small picture of an object's model, drawn a moment after it is shown. */
function Thumb({ id, thumbnail }: { id: number; thumbnail: (id: number) => string | null }) {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    const timer = setTimeout(() => setUrl(thumbnail(id)), 0)

    return () => clearTimeout(timer)
  }, [id, thumbnail])

  return url ? (
    // eslint-disable-next-line @next/next/no-img-element -- a data: url drawn in the browser
    <img src={url} alt="" className="h-7 w-7 shrink-0 rounded bg-stone-950" style={{ imageRendering: 'pixelated' }} />
  ) : (
    <span className="h-7 w-7 shrink-0 rounded bg-stone-800" />
  )
}

const count = (value: number) => value.toLocaleString('en-US')

const plural = (value: number, word: string) => `${count(value)} ${word}${value === 1 ? '' : 's'}`

interface PcgPanelProps {
  /** The editor's working copy of a graph. */
  graph: PcgGraph
  onGraph: (graph: PcgGraph) => void
  palette: LandscapePalette
  /** A picture of an object's model, once the 3D view is up. */
  thumbnail: ((id: number) => string | null) | null
  /** How the area is drawn. */
  tool: PcgToolTag
  onTool: (tool: PcgToolTag) => void
  /** The polygon or path being drawn: its points so far. */
  drawing: { x: number; y: number }[] | null
  onFinish: () => void
  /** A path's width in tiles. */
  width: number
  onWidth: (width: number) => void
  /** The paint brush's width in tiles. */
  brush: number
  onBrush: (size: number) => void
  domain: PcgDomain | null
  /** How many sectors the domain reads. */
  sectors: number
  /** What was generated last for this area. */
  preview: PcgResult | null
  /** Whether that is of the graph and the map as they are now. */
  fresh: boolean
  /** A run in progress: the cells done, of how many. */
  progress: { done: number; total: number } | null
  ui: PcgUi
  onUi: (patch: Partial<PcgUi>) => void
  edits: PcgManualEdit[]
  onEdits: (edits: PcgManualEdit[]) => void
  onGenerate: () => void
  onCancel: () => void
  onCleanup: () => void
  onApply: () => void
  /** A setup file was read. */
  onLoad: (graph: PcgGraph, edits: PcgManualEdit[], biomes: PcgBiomeSet) => void
  onError: (message: string) => void
  biomes: PcgBiomeSet
  onBiomes: (biomes: PcgBiomeSet) => void
  /** The runs on record, newest first, and how many more a save will add. */
  runs: PcgRun[]
  pending: number
  onRun: (run: PcgRun, what: 'show' | 'cleanup' | 'regenerate' | 'forget') => void
}

export function PcgPanel({
  graph,
  onGraph,
  palette,
  thumbnail,
  tool,
  onTool,
  drawing,
  onFinish,
  width,
  onWidth,
  brush,
  onBrush,
  domain,
  sectors,
  preview,
  fresh,
  progress,
  ui,
  onUi,
  edits,
  onEdits,
  onGenerate,
  onCancel,
  onCleanup,
  onApply,
  onLoad,
  onError,
  biomes,
  onBiomes,
  runs,
  pending,
  onRun,
}: PcgPanelProps) {
  const fileRef = useRef<HTMLInputElement | null>(null)
  // the layer whose list of objects is open
  const [listed, setListed] = useState<string | null>(null)
  const area = domain ? areaOfDomain(domain) : null
  const stats = preview?.stats
  const { parameters, layers } = graph
  // a graph says which tools it is made for, as in Unreal
  const graphs = PCG_GRAPHS.filter((template) => template.toolTags.includes(tool))

  const setExcluded = (layer: PcgLayer, excluded: number[]) =>
    setLayer(layer.id, {
      spawner: { ...layer.spawner, excluded: excluded.length ? excluded : undefined },
    })

  const setParameters = (patch: Partial<PcgParameters>) =>
    onGraph({ ...graph, parameters: { ...parameters, ...patch } })

  function setLayers(next: PcgLayer[]) {
    onGraph({ ...graph, layers: next })
  }

  function setLayer(id: string, patch: Partial<PcgLayer>) {
    setLayers(layers.map((layer) => (layer.id === id ? { ...layer, ...patch } : layer)))
  }

  const moveLayer = (index: number, by: number) => {
    const next = [...layers]

    next.splice(index + by, 0, ...next.splice(index, 1))
    setLayers(next)
  }

  const duplicate = (layer: PcgLayer) => {
    let id = `${layer.id}-2`

    for (let n = 3; layers.some((other) => other.id === id); n++) {
      id = `${layer.id}-${n}`
    }

    // a seed of its own, or it would roll the very same points
    const seed = Math.max(...layers.map((other) => other.seed)) + 1
    const next = [...layers]

    next.splice(layers.indexOf(layer) + 1, 0, { ...layer, id, label: `${layer.label} copy`, seed })
    setLayers(next)
    onUi({ selectedLayer: id })
  }

  // ## setups

  const saveSetup = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(setupOf(graph, edits, biomes), null, 2)], {
        type: 'application/json',
      }),
    )
    const link = document.createElement('a')

    link.href = url
    link.download = `pcg-${graph.id}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const loadSetup = async (file: File) => {
    try {
      const setup = readSetup(JSON.parse(await file.text()))

      onLoad(setup.graph, setup.manualEdits, setup.biomes)
    } catch (error) {
      onError(error instanceof Error ? error.message : 'that file could not be read')
    }
  }

  // ## manual edits

  const at = (edit: { layer: string; x: number; y: number }, point: { layer: string; x: number; y: number }) =>
    edit.layer === point.layer && edit.x === point.x && edit.y === point.y

  const editPoint = (point: PcgPoint, change: { exclude: true } | { objectId: number } | null) =>
    onEdits([
      ...edits.filter((edit) => !at(edit, point)),
      ...(change ? [{ layer: point.layer, x: point.x, y: point.y, ...change }] : []),
    ])

  // ## what was generated

  const culled = Object.entries(stats?.culled ?? {})
  const took = Object.values(stats?.byLayer ?? {}).reduce((sum, layer) => sum + layer.ms, 0)
  const inspected = layers.find((layer) => layer.id === ui.inspect)
  const swaps = (inspected ? objectsOf(inspected.spawner.meshSelector) : [])
    .filter((id) => String(id) in palette.objects)
    .map((id) => ({ id, name: palette.objects[String(id)] }))
  // the layers of the other biomes' graphs, by the ids they run under
  const biomeLayers = new Map<string, string>(
    biomes.rows.flatMap((row, i) => {
      const template = PCG_GRAPHS.find((built) => built.id === row.graph)

      return (template?.layers ?? []).map(
        (layer) => [`${i + 1}:${layer.id}`, `${template!.label}: ${layer.label}`] as const,
      )
    }),
  )

  const blocked = !stats || !fresh || !!progress || stats.errors.length > 0
  const nothing = !!stats && !stats.placed && !preview?.removes

  return (
    <div className="space-y-2">
      <p className={NOTE}>
        Draw an area on the map. The preview shows what the graph would place
        there and follows every change. Apply puts it down as one step to
        undo; nothing changes before that.
      </p>

      <div className="space-y-1">
        <span className={LABEL}>Area</span>
        <Choice
          options={AREA_TOOLS.map(({ id, label }) => ({ id, label }))}
          value={tool}
          onChange={onTool}
        />
        <p className={NOTE}>{AREA_TOOLS.find(({ id }) => id === tool)?.note}</p>
        {tool === 'SplineTool' && (
          <Num label="Width" title="How many tiles wide the path is" value={width} min={1} max={24} onChange={onWidth} />
        )}
        {tool === 'PaintTool' && (
          <Slider label="Brush" value={brush} min={1} max={10} shown={`${brush}×${brush}`} onChange={onBrush} />
        )}
        {drawing && (
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <span className="min-w-0 flex-1">{plural(drawing.length, 'point')} so far</span>
            <button
              type="button"
              disabled={drawing.length < (tool === 'SplineSurfaceTool' ? 3 : 2)}
              onClick={onFinish}
              className={BUTTON}
            >
              Finish
            </button>
          </div>
        )}
        <p className="text-xs text-text-secondary">
          {area && domain
            ? `${area.width} × ${area.height} tiles${
                domain.tool === 'PaintTool' ? `, ${count(domain.tiles.length)} painted` : ''
              }, ${plural(sectors, 'sector')}`
            : 'No area chosen'}
        </p>
      </div>

      <div className="space-y-1">
        <span className={LABEL}>Graph</span>
        <Choice
          options={graphs.map((template) => ({ id: template.id, label: template.label }))}
          value={graph.id}
          onChange={(id) => onGraph(graphs.find((template) => template.id === id) ?? graph)}
        />
        <div className="flex flex-wrap gap-1">
          <button type="button" onClick={saveSetup} className={BUTTON} title="Save what differs from the graph, as a file">
            Save setup
          </button>
          <button type="button" onClick={() => fileRef.current?.click()} className={BUTTON}>
            Load setup
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            aria-label="A setup file to load"
            onChange={(e) => {
              const file = e.target.files?.[0]

              if (file) {
                loadSetup(file)
              }

              // the same file can be picked again
              e.target.value = ''
            }}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1">
        <button type="button" disabled={!area || !!progress} onClick={onGenerate} className={BUTTON}>
          Generate
        </button>
        <button type="button" disabled={!domain} onClick={onCleanup} className={BUTTON}>
          Cleanup
        </button>
        <button
          type="button"
          disabled={blocked || nothing}
          onClick={onApply}
          className="rounded border border-gold-500 bg-gold-500 px-2 py-0.5 text-xs text-stone-950 disabled:opacity-40"
        >
          {!preview || !stats
            ? 'Apply'
            : preview.removes
              ? `Remove ${plural(preview.removes, 'object')} and place ${count(stats.placed)}`
              : `Place ${plural(stats.placed, 'object')} in ${plural(preview.bySector.size, 'sector')}`}
        </button>
      </div>

      {progress && (
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded bg-stone-800">
            <div
              className="h-full bg-gold-500"
              style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%` }}
            />
          </div>
          <span>
            {progress.done}/{progress.total}
          </span>
          <button type="button" onClick={onCancel} className={BUTTON}>
            Cancel
          </button>
        </div>
      )}

      {(stats?.errors ?? []).map((error) => (
        <p key={error} className="rounded border border-red-900 bg-red-950/40 px-2 py-1 text-[11px] leading-relaxed text-red-300">
          {error}
        </p>
      ))}

      {(stats?.warnings ?? []).map((warning) => (
        <p key={warning} className="rounded border border-amber-900 bg-amber-950/40 px-2 py-1 text-[11px] leading-relaxed text-amber-300">
          {warning}
        </p>
      ))}

      <Group title="Graph parameters">
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <label htmlFor="pcg-seed" className="min-w-0 flex-1">
            Seed
          </label>
          <input
            id="pcg-seed"
            type="number"
            step={1}
            value={parameters.seed}
            onChange={(e) => setParameters({ seed: Math.trunc(Number(e.target.value)) || 0 })}
            className={cn(INPUT, 'w-24 shrink-0')}
          />
          <button
            type="button"
            title="A new seed"
            aria-label="A new seed"
            onClick={() => setParameters({ seed: Math.floor(Math.random() * 1_000_000) })}
            className={BUTTON}
          >
            <Shuffle className="h-3.5 w-3.5" />
          </button>
        </div>
        <Pick
          label="HiGen Default Grid Size"
          title="Where a layer with no grid size of its own executes"
          value={String(parameters.hiGenDefaultGridSize)}
          options={[
            { id: 'Unbounded', label: 'Unbounded' },
            { id: '48', label: '48: a sector' },
          ]}
          onChange={(id) => setParameters({ hiGenDefaultGridSize: id === '48' ? 48 : 'Unbounded' })}
        />
        <Num
          label="Bounds Expansion"
          title="Tiles added round the area; negative trims its edge"
          value={parameters.boundsExpansion}
          min={-24}
          max={24}
          onChange={(boundsExpansion) => setParameters({ boundsExpansion })}
        />
        {Object.entries(parameters.booleans).map(([name, on]) => (
          <Check
            key={name}
            label={`Switch: ${name}`}
            title="A layer whose Branch names this switch runs only while it is on"
            checked={on}
            onChange={(next) => setParameters({ booleans: { ...parameters.booleans, [name]: next } })}
          />
        ))}
        <Check
          label="Replace"
          title="Remove the scenery already inside the area when applying"
          checked={parameters.replace}
          onChange={(replace) => setParameters({ replace })}
        />
        {parameters.replace && (
          <p className="text-[11px] leading-relaxed text-amber-300">
            Apply first removes all the scenery standing in the area, what was
            placed by hand included.
          </p>
        )}
        <span className={LABEL}>Filters, for every layer</span>
        <Filters filters={parameters.filters} onChange={(filters) => setParameters({ filters })} palette={palette} />
      </Group>

      <Group title="Biomes">
        <p className={NOTE}>
          Other graphs can each claim part of the area, the first in the list
          first. This graph grows on what they leave.
        </p>
        {biomes.rows.map((row, index) => {
          const setRow = (patch: Partial<PcgBiomeSet['rows'][number]>) =>
            onBiomes({
              ...biomes,
              rows: biomes.rows.map((other, i) => (i === index ? { ...row, ...patch } : other)),
            })

          return (
            <div key={index} className="space-y-1 rounded border border-stone-800 p-1.5">
              <div className="flex items-center gap-1">
                <div className="min-w-0 flex-1">
                  <Pick
                    label="Graph"
                    value={row.graph}
                    options={PCG_GRAPHS.map(({ id, label }) => ({ id, label }))}
                    onChange={(id) => setRow({ graph: id })}
                  />
                </div>
                <button
                  type="button"
                  title="Remove this biome"
                  onClick={() => onBiomes({ ...biomes, rows: biomes.rows.filter((_, i) => i !== index) })}
                  className="rounded p-0.5 text-text-secondary hover:bg-white/10 hover:text-text-primary"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <span className={LABEL}>Where it grows</span>
              <Filters filters={row.filters} onChange={(filters) => setRow({ filters })} palette={palette} />
            </div>
          )
        })}
        <button
          type="button"
          onClick={() =>
            onBiomes({
              ...biomes,
              rows: [
                ...biomes.rows,
                {
                  graph: PCG_GRAPHS.find((built) => built.id !== graph.id)?.id ?? graph.id,
                  // patches that follow no ground colour, about half the area
                  filters: [{ attribute: 'noise', min: 0.5 }],
                },
              ],
            })
          }
          className={BUTTON}
        >
          + Biome
        </button>
        {biomes.rows.length > 0 && (
          <>
            <Num
              label="Blend range"
              title="Tiles over which two biomes fade into each other at their border; 0 is a hard border"
              value={biomes.blend}
              min={0}
              max={12}
              onChange={(blend) => onBiomes({ ...biomes, blend })}
            />
            <Num
              label="Noise scale"
              title="Tiles across one patch of the noise a filter on the noise attribute reads"
              value={biomes.noiseScale}
              min={4}
              max={128}
              onChange={(noiseScale) => onBiomes({ ...biomes, noiseScale })}
            />
          </>
        )}
      </Group>

      <div className="space-y-1.5">
        <span className={LABEL}>Layers</span>
        {layers.map((layer, index) => {
          const selected = ui.selectedLayer === layer.id
          const off = !!layer.branch && !parameters.booleans[layer.branch]
          const made = stats?.byLayer[layer.id]
          const objects = objectsOf(layer.spawner.meshSelector)
          const excluded = (layer.spawner.excluded ?? []).filter((id) => objects.includes(id))

          return (
            <div
              key={layer.id}
              className={cn('space-y-1 rounded border p-1.5', selected ? 'border-gold-500/60' : 'border-stone-800')}
            >
              <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                <input
                  type="checkbox"
                  className="accent-gold-500"
                  title="Enabled (E)"
                  aria-label={`${layer.label} enabled`}
                  checked={layer.enabled}
                  onChange={(e) => setLayer(layer.id, { enabled: e.target.checked })}
                />
                <button
                  type="button"
                  title="Debug (D): show this layer's points alone"
                  aria-pressed={layer.debug}
                  onClick={() => setLayer(layer.id, { debug: !layer.debug })}
                  className={cn('rounded p-0.5 hover:bg-white/10', layer.debug ? 'text-gold-400' : 'text-stone-600')}
                >
                  <Bug className="h-3 w-3" />
                </button>
                <span
                  aria-hidden
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ background: pcgLayerColour(index) }}
                />
                <button
                  type="button"
                  title="Select: its nodes open below, and D, E and A act on it"
                  onClick={() => onUi({ selectedLayer: selected ? null : layer.id })}
                  className={cn(
                    'min-w-0 flex-1 truncate text-left hover:text-gold-400',
                    layer.enabled && !off ? 'text-text-primary' : 'opacity-60',
                  )}
                >
                  {layer.label}
                  {off ? ` · off (${layer.branch})` : ''}
                </button>
                <span>{made ? count(made.placed) : ''}</span>
                <button
                  type="button"
                  title="Which of its objects may be placed"
                  aria-expanded={listed === layer.id}
                  onClick={() => setListed(listed === layer.id ? null : layer.id)}
                  className={cn(
                    'flex items-center rounded border border-stone-700 px-1 hover:text-text-primary',
                    excluded.length && 'border-amber-700 text-amber-300',
                  )}
                >
                  {objects.length - excluded.length}/{objects.length}
                  <ChevronDown className="h-3 w-3" />
                </button>
                <button type="button" title="Earlier" disabled={index === 0} onClick={() => moveLayer(index, -1)} className="disabled:opacity-30 hover:text-text-primary">
                  <ArrowUp className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  title="Later"
                  disabled={index === layers.length - 1}
                  onClick={() => moveLayer(index, 1)}
                  className="disabled:opacity-30 hover:text-text-primary"
                >
                  <ArrowDown className="h-3 w-3" />
                </button>
                <button type="button" title="Duplicate" onClick={() => duplicate(layer)} className="hover:text-text-primary">
                  <Copy className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  title="Remove"
                  disabled={layers.length === 1}
                  onClick={() => setLayers(layers.filter((other) => other.id !== layer.id))}
                  className="disabled:opacity-30 hover:text-red-300"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              {listed === layer.id && (
                <div className="space-y-1 rounded border border-stone-800 p-1.5">
                  <div className="flex items-center gap-2 text-[11px] text-text-secondary">
                    <span className="min-w-0 flex-1">Untick what must not be placed</span>
                    <button type="button" onClick={() => setExcluded(layer, [])} className="hover:text-text-primary hover:underline">
                      All
                    </button>
                    <button type="button" onClick={() => setExcluded(layer, objects)} className="hover:text-text-primary hover:underline">
                      None
                    </button>
                  </div>
                  <div className="max-h-56 space-y-0.5 overflow-y-auto">
                    {objects.map((id) => {
                      const on = !excluded.includes(id)
                      const info = palette.objectInfo[String(id)]

                      return (
                        <label key={id} className="flex cursor-pointer items-center gap-2 text-xs text-text-secondary">
                          <input
                            type="checkbox"
                            className="accent-gold-500"
                            checked={on}
                            onChange={() =>
                              setExcluded(layer, on ? [...excluded, id] : excluded.filter((other) => other !== id))
                            }
                          />
                          {thumbnail && <Thumb id={id} thumbnail={thumbnail} />}
                          <span className={cn('min-w-0 flex-1 truncate', on ? 'text-text-primary' : 'line-through opacity-60')}>
                            {palette.objects[String(id)] ?? 'not in the palette'}
                          </span>
                          <span className="shrink-0 text-[11px]">
                            {info && (info.width > 1 || info.height > 1) ? `${info.width}×${info.height} · ` : ''}#{id}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}
              <Slider
                label="Ratio"
                value={layer.ratio}
                min={0}
                max={1}
                step={0.05}
                shown={`${Math.round(layer.ratio * 100)}%`}
                onChange={(ratio) => setLayer(layer.id, { ratio })}
              />
              {selected && (
                <PcgLayerEditor
                  layer={layer}
                  graph={graph}
                  palette={palette}
                  origin={area ?? { x: 0, y: 0 }}
                  onChange={(patch) => setLayer(layer.id, patch)}
                />
              )}
            </div>
          )
        })}
      </div>

      <Group title="Debug">
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <span className="shrink-0">Colour by</span>
          <Choice
            options={[
              { id: 'layer', label: 'Layer' },
              { id: 'density', label: 'Density' },
              { id: 'culled', label: 'Cull reason' },
            ]}
            value={ui.colourBy}
            onChange={(colourBy) => onUi({ colourBy })}
          />
        </div>
        <Check label="Show culled points" checked={ui.showCulled} onChange={(showCulled) => onUi({ showCulled })} />
        <Check
          label="Preview in the 3D view"
          title="The 3D view shows the scenery as Apply would leave it"
          checked={ui.in3d}
          onChange={(in3d) => onUi({ in3d })}
        />
        <p className={NOTE}>On the selected layer: D debug · E enable · A inspect</p>

        {stats &&
          layers.map((layer) => {
            const made = stats.byLayer[layer.id]

            return (
              <div key={layer.id} className="text-[11px] leading-relaxed text-text-secondary">
                <span className={made ? 'text-text-primary' : 'opacity-60'}>{layer.label}</span>
                {made
                  ? ` · ${count(made.placed)} of ${count(made.considered)} · ${Math.round(made.ms)} ms`
                  : ' · did not run'}
                {made?.messages.map((message) => (
                  <p key={message} className="pl-2 text-amber-300">
                    {message}
                  </p>
                ))}
              </div>
            )
          })}

        {stats &&
          Object.entries(stats.byLayer)
            .filter(([id]) => biomeLayers.has(id))
            .map(([id, made]) => (
              <div key={id} className="text-[11px] leading-relaxed text-text-secondary">
                <span className="text-text-primary">{biomeLayers.get(id)}</span>
                {` · ${count(made.placed)} of ${count(made.considered)} · ${Math.round(made.ms)} ms`}
                {made.messages.map((message) => (
                  <p key={message} className="pl-2 text-amber-300">
                    {message}
                  </p>
                ))}
              </div>
            ))}

        {stats && (
          <p className={NOTE}>
            Placed {count(stats.placed)} of {count(stats.considered)}
            {culled.length ? ' · culled: ' : ''}
            {culled.map(([reason, n], i) => (
              <span key={reason}>
                {i ? ', ' : ''}
                <span style={ui.colourBy === 'culled' ? { color: pcgReasonColour(reason) } : undefined}>
                  {reason}
                </span>{' '}
                {count(n)}
              </span>
            ))}
            {` · ${Math.round(took)} ms`}
            {fresh || progress ? '' : ' · out of date'}
          </p>
        )}
      </Group>

      {edits.length > 0 && (
        <Group title="Manual edits">
          {edits.map((edit) => (
            <div key={`${edit.layer}:${edit.x},${edit.y}`} className="flex items-center gap-2 text-[11px] text-text-secondary">
              <span className="min-w-0 flex-1 truncate">
                {layers.find((layer) => layer.id === edit.layer)?.label ?? edit.layer} at {edit.x}, {edit.y}:{' '}
                {edit.exclude
                  ? 'left out'
                  : `${palette.objects[String(edit.objectId)] ?? 'object'} #${edit.objectId}`}
              </span>
              <button
                type="button"
                onClick={() => onEdits(edits.filter((other) => other !== edit))}
                className="text-gold-400 hover:underline"
              >
                Restore
              </button>
            </div>
          ))}
        </Group>
      )}

      {(runs.length > 0 || pending > 0) && (
        <Group title="Past runs">
          <p className={NOTE}>
            What Apply placed, kept once it is saved, so a run can be cleaned
            up or made again. Only objects still as the run left them are
            touched.
            {pending ? ` ${plural(pending, 'run')} will be recorded by the next save.` : ''}
          </p>
          {runs.map((run) => (
            <div key={run.id} className="space-y-0.5 border-l border-stone-700 pl-2 text-[11px] text-text-secondary">
              <p>
                <span className="text-text-primary">{run.label}</span> · seed {run.seed} ·{' '}
                {plural(run.objects.length, 'object')} · {run.at.slice(0, 10)}
                {run.by ? ` · ${run.by}` : ''}
              </p>
              <div className="flex flex-wrap gap-x-3">
                {(
                  [
                    ['show', 'Show', 'Go to where it is'],
                    ['cleanup', 'Clean up', 'Remove what it placed, as one step to undo'],
                    ['regenerate', 'Regenerate', 'Clean it up, and bring back its area and graph to make it again'],
                    ['forget', 'Forget', 'Take it off this list; what it placed stays'],
                  ] as const
                ).map(([what, label, title]) => (
                  <button
                    key={what}
                    type="button"
                    title={title}
                    onClick={() => onRun(run, what)}
                    className="text-gold-400 hover:underline"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </Group>
      )}

      {inspected && (
        <PcgInspector
          label={inspected.label}
          points={(preview?.points ?? []).filter((point) => point.layer === inspected.id)}
          tile={ui.inspectTile}
          onClearTile={() => onUi({ inspectTile: null })}
          highlight={ui.highlight}
          onPick={(point) => onUi({ highlight: { x: point.x, y: point.y } })}
          swaps={swaps}
          edited={new Set(edits.filter((edit) => edit.layer === inspected.id).map((edit) => `${edit.x},${edit.y}`))}
          onExclude={(point) => editPoint(point, { exclude: true })}
          onSwap={(point, objectId) => editPoint(point, { objectId })}
          onRestore={(point) => editPoint(point, null)}
          onClose={() => onUi({ inspect: null, inspectTile: null, highlight: null })}
        />
      )}
    </div>
  )
}
