'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { ModelViewport } from '@/components/model-editor/ModelViewport'
import { SourceEditor } from '@/components/model-editor/SourceEditor'
import {
  fetchArchive,
  fetchTexture,
  loadModelPreview,
  type CheckReport,
  type Evaluation,
  type FaceHit,
  type Footprint,
  type ModelPreviewConstructor,
  type ModelPreviewInstance,
  type ModelView,
  type PlainModel,
} from '@/components/model-editor/preview'
import { cn } from '@/lib/utils'

/**
 * The model editor. The model sources in rsc-client/assets/models are
 * ModelBuilder scripts; this runs one in the browser as you type and draws
 * it with the game's renderer, so every change shows at once. Changes made
 * to the file anywhere else - another editor, or the file edited directly -
 * arrive over /api/models/events and redraw it too.
 *
 * Saving writes the source back. Packing runs pack-cache, which puts every
 * model into the archives the game loads; players see it once they reload.
 * A source no object uses gets a scenery object of its own when it's packed
 * (named here, or made up from the model), so it can be placed with the
 * World Editor, which picks up the new archives by itself.
 */

interface Catalog {
  sources: { name: string; file: string; size: number; modified: number }[]
  textures: string[]
  canWrite: boolean
}

type Selection = { kind: 'source' | 'game'; name: string }

/** A scenery object for a model no object uses yet, as the form has it. */
interface Placing {
  name: string
  description: string
  solid: boolean
}

interface PackResult {
  ok: boolean
  output?: string
  error?: string
  milliseconds?: number
  registered?: { id: number; model: string; name: string; width: number; height: number }[]
}

// how long after the last packed archive changes the object table is read
// again: pack-cache writes three of them in a row
const ARCHIVE_SETTLE = 400

// "pumpkin-candy" -> "Pumpkin candy", as scripts/register-objects.js names them
function titleOf(name: string): string {
  const words = name.replace(/[-_]+/g, ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

const SELECTION_KEY = 'model-editor:selected'
const EVALUATE_DELAY = 150

// the colour a picked face or a face with a problem is painted, to find it
const HIGHLIGHT = rgb(255, 64, 200)

function rgb(r: number, g: number, b: number): number {
  return -1 - (r >> 3) * 1024 - (g >> 3) * 32 - (b >> 3)
}

function template(name: string): string {
  return `// ${name}: a new piece of scenery. see docs/MODEL_CREATION.md for the rules
// the renderer imposes, and assets/models/tradepost.js or magictree.js for
// bigger examples. a tile is 128 units and y points down, so -96 is 96 above
// the ground; the model stands centred on its footprint

const { ModelBuilder, rgb, texture } = require('../../scripts/lib/ob3');

const PLANKS = texture(3);
const TRIM = rgb(184, 128, 16);

const model = new ModelBuilder();

// a crate
model.box([-48, 48], [0, -96], [-48, 48], { sides: PLANKS, top: PLANKS });

// a band round it, standing 5 proud so it never sinks into the planks
model.box([-53, 53], [-40, -56], [-53, 53], { sides: TRIM });

module.exports = model.build();
`
}

function highlighted(model: PlainModel, face: number | null): PlainModel {
  if (face === null || face < 0 || face >= model.faces.length) {
    return model
  }

  const front = model.front.slice()
  const back = model.back.slice()

  front[face] = HIGHLIGHT
  back[face] = HIGHLIGHT

  return { ...model, front, back }
}

async function readJson<T>(response: Response): Promise<T> {
  const body = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(body.error || `the server said ${response.status}`)
  }

  return body as T
}

export function ModelEditor() {
  const [Preview, setPreviewClass] = useState<ModelPreviewConstructor | null>(null)
  const [preview, setPreview] = useState<ModelPreviewInstance | null>(null)
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null)
  const [failure, setFailure] = useState<string | null>(null)

  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [gameNames, setGameNames] = useState<string[]>([])
  const [filter, setFilter] = useState('')

  const [selected, setSelected] = useState<Selection | null>(null)
  const [source, setSource] = useState('')
  const [saved, setSaved] = useState('')
  const [modified, setModified] = useState<number | null>(null)
  const [diskChanged, setDiskChanged] = useState(false)

  const [evaluation, setEvaluation] = useState<Evaluation | null>(null)
  const [report, setReport] = useState<CheckReport | null>(null)
  const [footprint, setFootprint] = useState<Footprint>({ width: 1, height: 1 })
  const [objects, setObjects] = useState<{ id: number; name: string; width: number; height: number }[]>([])

  const [view, setView] = useState<ModelView | null>(null)
  const [hit, setHit] = useState<FaceHit | null>(null)
  const [pickedFace, setPickedFace] = useState<number | null>(null)

  const [message, setMessage] = useState<{ kind: 'good' | 'bad'; text: string } | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [packOutput, setPackOutput] = useState<string | null>(null)
  const [newName, setNewName] = useState<string | null>(null)
  // bumped when the textures change, so the model runs again with them
  const [textureVersion, setTextureVersion] = useState(0)
  const [placing, setPlacing] = useState<Placing | null>(null)

  const dirty = selected?.kind === 'source' && source !== saved
  // what the change listener reads, which lives longer than one render
  const state = useRef({ source, saved, selected })

  useEffect(() => {
    state.current = { source, saved, selected }
  }, [source, saved, selected])

  // --- the renderer ---------------------------------------------------

  useEffect(() => {
    let cancelled = false
    let instance: ModelPreviewInstance | null = null

    ;(async () => {
      try {
        const [PreviewClass, list] = await Promise.all([
          loadModelPreview(),
          fetch('/api/models', { cache: 'no-store' }).then((r) => readJson<Catalog>(r)),
        ])

        const textures = await Promise.all(list.textures.map(fetchTexture))
        const element = document.createElement('canvas')

        element.className = 'block h-full w-full cursor-grab [image-rendering:pixelated]'
        instance = new PreviewClass(element)
        await instance.load(fetchArchive, textures)
        await instance.loadGameModels(fetchArchive)

        if (cancelled) {
          instance.destroy()
          return
        }

        let lastFace: number | null = null

        instance.onFrame = (frameHit) => {
          const face = frameHit ? frameHit.face : null

          if (face !== lastFace) {
            lastFace = face
            setHit(frameHit)
          }
        }

        instance.start()

        setPreviewClass(() => PreviewClass)
        setPreview(instance)
        setCanvas(element)
        setView({ ...instance.view })
        setCatalog(list)
        setGameNames(instance.modelNames())

        // where the last visit left off
        let last: Selection | null = null

        try {
          last = JSON.parse(localStorage.getItem(SELECTION_KEY) ?? 'null')
        } catch {
          // storage off: start with the first source
        }

        if (last && (last.kind === 'game' || list.sources.some((s) => s.name === last!.name))) {
          setSelected(last)
        } else if (list.sources.length) {
          setSelected({ kind: 'source', name: list.sources[0].name })
        }
      } catch (error) {
        if (!cancelled) {
          setFailure(error instanceof Error ? error.message : 'the editor could not start')
        }
      }
    })()

    return () => {
      cancelled = true
      instance?.destroy()
    }
  }, [])

  const updateView = useCallback(
    (patch: Partial<ModelView>) => {
      preview?.setView(patch)
      setView((current) => (current ? { ...current, ...patch } : current))
    },
    [preview],
  )

  // --- the catalogue and the selection -----------------------------------

  const refreshCatalog = useCallback(async () => {
    const list = await fetch('/api/models', { cache: 'no-store' }).then((r) => readJson<Catalog>(r))
    setCatalog(list)
    return list
  }, [])

  const openSource = useCallback(async (name: string) => {
    const body = await fetch(`/api/models/source?name=${encodeURIComponent(name)}`, {
      cache: 'no-store',
    }).then((r) => readJson<{ source: string; modified: number }>(r))

    setSource(body.source)
    setSaved(body.source)
    setModified(body.modified)
    setDiskChanged(false)
  }, [])

  useEffect(() => {
    if (!preview || !selected) {
      return
    }

    try {
      localStorage.setItem(SELECTION_KEY, JSON.stringify(selected))
    } catch {
      // not remembered
    }

    setPickedFace(null)
    setMessage(null)

    const using = preview.objectsUsing(selected.name)
    setObjects(using)
    setFootprint(using[0] ? { width: using[0].width, height: using[0].height } : { width: 1, height: 1 })

    if (selected.kind === 'source') {
      openSource(selected.name).catch((error) =>
        setMessage({ kind: 'bad', text: error instanceof Error ? error.message : String(error) }),
      )
    } else {
      setSource('')
      setSaved('')
      setModified(null)
      setDiskChanged(false)
    }
  }, [preview, selected, openSource])

  // --- running the source, and checking what it makes ---------------------

  useEffect(() => {
    if (!preview || !Preview || !selected) {
      return
    }

    const timer = setTimeout(
      () => {
        let result: Evaluation

        if (selected.kind === 'game') {
          const model = preview.gameModel(selected.name)
          result = model ? { model } : { error: `the game has no ${selected.name}.ob3` }
        } else {
          result = Preview.Source.evaluate(source, { textureNames: preview.textureNames() })
        }

        setEvaluation(result)

        if (result.model) {
          setReport(Preview.Source.check(result.model, { footprint }))
        } else {
          setReport(null)
        }
      },
      selected.kind === 'source' ? EVALUATE_DELAY : 0,
    )

    return () => clearTimeout(timer)
  }, [preview, Preview, selected, source, footprint, textureVersion])

  // what the view shows: the last model that ran, with the picked face lit up
  useEffect(() => {
    if (!preview) {
      return
    }

    if (evaluation?.model) {
      preview.setModel(highlighted(evaluation.model, pickedFace), footprint)
    } else if (!evaluation) {
      preview.setModel(null, footprint)
    }
  }, [preview, evaluation, pickedFace, footprint])

  // --- changes on disk -------------------------------------------------

  useEffect(() => {
    if (!preview) {
      return
    }

    const events = new EventSource('/api/models/events')

    let archiveTimer: ReturnType<typeof setTimeout> | undefined

    events.addEventListener('change', async (event) => {
      let change: { kind: 'model' | 'texture' | 'archive'; name: string; removed: boolean }

      try {
        change = JSON.parse((event as MessageEvent).data)
      } catch {
        return
      }

      // packed again, here or anywhere: new objects, and models they use
      if (change.kind === 'archive') {
        clearTimeout(archiveTimer)
        archiveTimer = setTimeout(async () => {
          try {
            await preview.reloadObjects(fetchArchive)
            setGameNames(preview.modelNames())

            // the objects standing on the model now
            const shown = state.current.selected

            if (shown) {
              const using = preview.objectsUsing(shown.name)

              setObjects(using)

              if (using[0]) {
                setFootprint({ width: using[0].width, height: using[0].height })
              }
            }
          } catch {
            // the next pack will try again
          }
        }, ARCHIVE_SETTLE)
        return
      }

      try {
        const list = await refreshCatalog()

        if (change.kind === 'texture') {
          preview.setCustomTextures(await Promise.all(list.textures.map(fetchTexture)))
          // the ids may have moved, and a model may name the new one: run it again
          setTextureVersion((version) => version + 1)
          return
        }

        const current = state.current

        if (current.selected?.kind !== 'source' || current.selected.name !== change.name || change.removed) {
          return
        }

        if (current.source === current.saved) {
          await openSource(change.name)
        } else {
          setDiskChanged(true)
        }
      } catch {
        // the next change will try again
      }
    })

    return () => {
      clearTimeout(archiveTimer)
      events.close()
    }
  }, [preview, refreshCatalog, openSource])


  // --- saving, making and packing -------------------------------------

  const save = useCallback(async () => {
    if (!selected || selected.kind !== 'source' || !catalog?.canWrite) {
      return
    }

    setBusy('Saving…')

    try {
      const result = await fetch(`/api/models/source?name=${encodeURIComponent(selected.name)}`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ source, expected: diskChanged ? null : modified }),
      }).then((r) => readJson<{ modified: number }>(r))

      setSaved(source)
      setModified(result.modified)
      setDiskChanged(false)
      setMessage({
        kind: 'good',
        text: `Saved ${selected.name}.js. Pack to put it in the game's archives.`,
      })
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error)

      if (/changed on disk/.test(text)) {
        setDiskChanged(true)
      }

      setMessage({ kind: 'bad', text })
    } finally {
      setBusy(null)
    }
  }, [selected, catalog, source, modified, diskChanged])

  const create = useCallback(
    async (name: string, text: string) => {
      setBusy('Creating…')

      try {
        await fetch(`/api/models/source?name=${encodeURIComponent(name)}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ source: text }),
        }).then((r) => readJson<{ modified: number }>(r))

        await refreshCatalog()
        setSelected({ kind: 'source', name })
        setNewName(null)
        setMessage({ kind: 'good', text: `Made rsc-client-dev/assets/models/${name}.js.` })
      } catch (error) {
        setMessage({ kind: 'bad', text: error instanceof Error ? error.message : String(error) })
      } finally {
        setBusy(null)
      }
    },
    [refreshCatalog],
  )

  // packs every model; with `place`, first makes the selected source an
  // object as the form describes it
  const packAll = useCallback(
    async (place?: Placing) => {
      if (dirty && !window.confirm('This model has unsaved changes, and packing uses what is saved. Pack anyway?')) {
        return
      }

      const body =
        place && selected
          ? {
              model: selected.name,
              details: {
                name: place.name.trim() || undefined,
                description: place.description.trim() || undefined,
                width: footprint.width,
                height: footprint.height,
                type: place.solid ? 'blocked' : 'unblocked',
              },
            }
          : {}

      setBusy('Packing — this takes a few seconds…')
      setPackOutput(null)

      try {
        const response = await fetch('/api/models/pack', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        })
        const result: PackResult = await response.json().catch(() => ({ ok: false, output: 'no answer' }))
        const registered = result.registered ?? []
        const mine = registered.find((object) => object.model === selected?.name)

        setPackOutput(
          `${result.ok ? 'Packed' : 'Packing failed'} in ${((result.milliseconds ?? 0) / 1000).toFixed(1)}s\n\n${result.output ?? result.error ?? ''}`,
        )

        if (mine) {
          setObjects([{ id: mine.id, name: mine.name, width: mine.width, height: mine.height }])
          setPlacing(null)
        }

        setMessage(
          !result.ok
            ? { kind: 'bad', text: 'Packing failed — see the output.' }
            : registered.length
              ? {
                  kind: 'good',
                  text:
                    `Packed, and made ${registered.map((object) => `${object.name} (${object.id})`).join(', ')} ` +
                    "placeable: find them in the World Editor's objects. The worlds need a restart before placed ones show in game.",
                }
              : { kind: 'good', text: 'Packed. Reload the game page to see it in game.' },
        )
      } finally {
        setBusy(null)
      }
    },
    [dirty, selected, footprint],
  )

  const choose = (next: Selection) => {
    if (dirty && !window.confirm(`${selected?.name}.js has unsaved changes. Leave them?`)) {
      return
    }

    setPlacing(null)
    setSelected(next)
  }

  // --- the page -------------------------------------------------------

  const sourceNames = useMemo(() => new Set(catalog?.sources.map((s) => s.name)), [catalog])
  const needle = filter.trim().toLowerCase()

  const sources = (catalog?.sources ?? []).filter((s) => s.name.includes(needle))
  const games = gameNames.filter((name) => name.includes(needle))

  const describeFill = (fill: number) => preview?.describeFill(fill) ?? String(fill)
  const errorLine = evaluation?.error ? evaluation.line ?? null : null

  if (failure) {
    return (
      <div className="rounded-lg border border-red-900/60 bg-red-950/30 p-6 text-sm text-red-200">
        {failure}
      </div>
    )
  }

  const item = (active: boolean) =>
    cn(
      'flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left text-[13px]',
      active ? 'bg-gold-500/15 text-gold-300' : 'text-text-secondary hover:bg-stone-800 hover:text-gold-400',
    )

  return (
    <div className="grid gap-4 xl:grid-cols-[15rem_minmax(0,1.15fr)_minmax(0,1fr)]">
      {/* the catalogue */}
      <aside className="flex max-h-[80vh] flex-col rounded-lg border border-stone-700 bg-stone-900/60">
        <div className="border-b border-stone-800 p-2">
          <input
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            placeholder="Find a model…"
            className="w-full rounded border border-stone-700 bg-stone-950 px-2 py-1 text-sm text-stone-200 outline-none focus:border-gold-500/60"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          <div className="mb-1 flex items-center justify-between">
            <h3 className="text-[11px] uppercase tracking-wide text-gold-500">Sources</h3>
            {catalog?.canWrite && (
              <button
                type="button"
                className="text-[11px] uppercase tracking-wide text-text-secondary hover:text-gold-400"
                onClick={() => setNewName('')}
              >
                + New
              </button>
            )}
          </div>

          {newName !== null && (
            <form
              className="mb-2 flex gap-1"
              onSubmit={(event) => {
                event.preventDefault()
                const name = newName.trim().toLowerCase()
                if (name) {
                  create(name, template(name))
                }
              }}
            >
              <input
                autoFocus
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="name"
                className="min-w-0 flex-1 rounded border border-stone-700 bg-stone-950 px-2 py-0.5 text-sm text-stone-200 outline-none"
              />
              <button type="submit" className="rounded bg-gold-500/20 px-2 text-xs text-gold-300">
                Make
              </button>
            </form>
          )}

          {sources.map((s) => (
            <button
              key={s.name}
              type="button"
              className={item(selected?.kind === 'source' && selected.name === s.name)}
              onClick={() => choose({ kind: 'source', name: s.name })}
            >
              <span className="truncate">{s.name}</span>
            </button>
          ))}

          <h3 className="mb-1 mt-4 text-[11px] uppercase tracking-wide text-gold-500">
            The game&apos;s models ({games.length})
          </h3>

          {games.map((name) => (
            <button
              key={name}
              type="button"
              className={item(selected?.kind === 'game' && selected.name === name)}
              onClick={() => choose({ kind: 'game', name })}
            >
              <span className="truncate">{name}</span>
              {sourceNames.has(name) && <span className="shrink-0 text-[10px] uppercase text-text-muted">source</span>}
            </button>
          ))}
        </div>
      </aside>

      {/* the view and its checks */}
      <section className="flex min-w-0 flex-col gap-3">
        {view && Preview ? (
          <ModelViewport
            preview={preview}
            canvas={canvas}
            view={view}
            onView={updateView}
            hit={hit}
            describeFill={describeFill}
            onPickFace={setPickedFace}
            width={Preview.WIDTH}
            height={Preview.HEIGHT}
          />
        ) : (
          <div className="flex aspect-[512/334] items-center justify-center rounded-lg border border-stone-700 bg-stone-950 text-sm text-text-secondary">
            Loading the game&apos;s renderer and archives…
          </div>
        )}

        <div className="rounded-lg border border-stone-700 bg-stone-900/60 p-3 text-[13px]">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-text-secondary">
            <span className="font-adventure text-base uppercase tracking-wide text-gold-400">
              {selected ? selected.name : 'No model'}
            </span>
            {report && (
              <>
                <span>{report.stats.vertices} vertices</span>
                <span>{report.stats.faces} faces</span>
                <span>{(report.stats.bytes / 1024).toFixed(1)} KB</span>
                <span>
                  x {report.stats.bounds.x.join('…')} · y {report.stats.bounds.y.join('…')} · z{' '}
                  {report.stats.bounds.z.join('…')}
                </span>
              </>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-[12px] text-text-secondary">
            <span>Footprint</span>
            <select
              value={`${footprint.width}x${footprint.height}`}
              onChange={(event) => {
                const [width, height] = event.target.value.split('x').map(Number)
                setFootprint({ width, height })
              }}
              className="rounded border border-stone-700 bg-stone-950 px-1 py-0.5 text-stone-200"
            >
              {['1x1', '2x1', '1x2', '2x2', '3x3'].map((size) => (
                <option key={size}>{size}</option>
              ))}
            </select>
            <span className="text-text-muted">
              {objects.length
                ? `used by ${objects.slice(0, 4).map((o) => `${o.name} (${o.id})`).join(', ')}${objects.length > 4 ? ` and ${objects.length - 4} more` : ''}`
                : selected?.kind === 'source'
                  ? 'no object uses this model yet: packing makes it one'
                  : 'no object uses this model'}
            </span>
            {!objects.length && selected?.kind === 'source' && catalog?.canWrite && !placing && (
              <button
                type="button"
                className="text-gold-400 hover:underline"
                onClick={() => setPlacing({ name: titleOf(selected.name), description: '', solid: true })}
              >
                name the object…
              </button>
            )}
            {pickedFace !== null && (
              <button type="button" className="text-gold-400 hover:underline" onClick={() => setPickedFace(null)}>
                face {pickedFace} picked · clear
              </button>
            )}
          </div>

          {placing && (
            <form
              className="mt-2 flex flex-wrap items-center gap-2 rounded border border-stone-800 bg-stone-950/60 p-2 text-[12px] text-text-secondary"
              onSubmit={(event) => {
                event.preventDefault()
                packAll(placing)
              }}
            >
              <label className="flex items-center gap-1">
                Name
                <input
                  value={placing.name}
                  maxLength={40}
                  onChange={(event) => setPlacing({ ...placing, name: event.target.value })}
                  className="w-36 rounded border border-stone-700 bg-stone-950 px-1 py-0.5 text-stone-200"
                />
              </label>
              <label className="flex items-center gap-1">
                Examine
                <input
                  value={placing.description}
                  maxLength={80}
                  placeholder={`A ${placing.name.trim().toLowerCase() || 'thing'}`}
                  onChange={(event) => setPlacing({ ...placing, description: event.target.value })}
                  className="w-56 rounded border border-stone-700 bg-stone-950 px-1 py-0.5 text-stone-200"
                />
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={placing.solid}
                  onChange={(event) => setPlacing({ ...placing, solid: event.target.checked })}
                />
                solid
              </label>
              <span className="text-text-muted">
                {footprint.width}x{footprint.height} tiles, as the footprint above
              </span>
              <button
                type="submit"
                disabled={!!busy}
                className="rounded border border-stone-700 px-2 py-0.5 uppercase tracking-wide hover:text-gold-400 disabled:opacity-40"
              >
                Add and pack
              </button>
              <button type="button" className="text-text-muted hover:underline" onClick={() => setPlacing(null)}>
                cancel
              </button>
            </form>
          )}

          {evaluation?.error && (
            <p className="mt-2 rounded bg-red-950/50 px-2 py-1 font-mono text-[12px] text-red-200">
              {evaluation.line ? `line ${evaluation.line}: ` : ''}
              {evaluation.error}
              {' '}— the view shows the last version that ran
            </p>
          )}

          {report && report.issues.length > 0 && (
            <ul className="mt-2 max-h-40 space-y-0.5 overflow-y-auto text-[12px]">
              {report.issues.map((issue, i) => (
                <li key={i}>
                  <button
                    type="button"
                    disabled={issue.face === undefined}
                    onClick={() => issue.face !== undefined && setPickedFace(issue.face)}
                    className={cn(
                      'text-left',
                      issue.level === 'error' && 'text-red-300',
                      issue.level === 'warning' && 'text-amber-300',
                      issue.level === 'note' && 'text-text-muted',
                      issue.face !== undefined && 'hover:underline',
                    )}
                  >
                    {issue.level === 'error' ? '✖' : issue.level === 'warning' ? '⚠' : '·'} {issue.message}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {report && report.issues.length === 0 && (
            <p className="mt-2 text-[12px] text-emerald-300">✔ No problems found.</p>
          )}
        </div>
      </section>

      {/* the source */}
      <section className="flex min-h-[32rem] min-w-0 flex-col gap-2 xl:max-h-[80vh]">
        <div className="flex flex-wrap items-center gap-2">
          {selected?.kind === 'source' && catalog?.canWrite && (
            <button
              type="button"
              disabled={!dirty || !!busy}
              onClick={save}
              className="rounded border border-gold-500/50 bg-gold-500/15 px-3 py-1 text-xs uppercase tracking-wide text-gold-300 disabled:opacity-40"
            >
              {dirty ? 'Save (Ctrl+S)' : 'Saved'}
            </button>
          )}

          {selected?.kind === 'source' && dirty && (
            <button
              type="button"
              onClick={() => setSource(saved)}
              className="rounded border border-stone-700 px-3 py-1 text-xs uppercase tracking-wide text-text-secondary hover:text-gold-400"
            >
              Undo changes
            </button>
          )}

          {selected?.kind === 'game' && catalog?.canWrite && evaluation?.model && (
            <button
              type="button"
              disabled={!!busy}
              onClick={() => {
                const name = window.prompt(
                  `Name the new source. Keep "${selected.name}" to replace the game's model when packed.`,
                  sourceNames.has(selected.name) ? `${selected.name}2` : selected.name,
                )
                if (name && Preview) {
                  create(name.trim().toLowerCase(), Preview.Source.toSource(evaluation.model!, selected.name))
                }
              }}
              className="rounded border border-gold-500/50 bg-gold-500/15 px-3 py-1 text-xs uppercase tracking-wide text-gold-300"
            >
              Edit as a new source
            </button>
          )}

          {catalog?.canWrite && (
            <button
              type="button"
              disabled={!!busy}
              onClick={() => packAll()}
              title="Runs pack-cache: every model, texture and object into the game's archives. A model no object uses gets one of its own, so the World Editor can place it"
              className="rounded border border-stone-700 px-3 py-1 text-xs uppercase tracking-wide text-text-secondary hover:text-gold-400 disabled:opacity-40"
            >
              Pack for the game
            </button>
          )}

          <button
            type="button"
            disabled={!preview}
            onClick={() => {
              const link = document.createElement('a')
              link.href = preview!.snapshot()
              link.download = `${selected?.name ?? 'model'}.png`
              link.click()
            }}
            className="rounded border border-stone-700 px-3 py-1 text-xs uppercase tracking-wide text-text-secondary hover:text-gold-400"
          >
            Picture
          </button>

          {busy && <span className="text-xs text-text-secondary">{busy}</span>}
        </div>

        {diskChanged && (
          <div className="flex flex-wrap items-center gap-2 rounded border border-amber-700/60 bg-amber-950/40 px-3 py-2 text-[12px] text-amber-200">
            {selected?.name}.js changed on disk while you were editing it.
            <button type="button" className="underline" onClick={() => selected && openSource(selected.name)}>
              Load that version
            </button>
            <span>or save to overwrite it with yours.</span>
          </div>
        )}

        {message && (
          <p
            className={cn(
              'rounded px-3 py-1.5 text-[12px]',
              message.kind === 'good' ? 'bg-emerald-950/40 text-emerald-200' : 'bg-red-950/40 text-red-200',
            )}
          >
            {message.text}
          </p>
        )}

        {selected?.kind === 'source' ? (
          <SourceEditor
            value={source}
            onChange={setSource}
            onSave={save}
            errorLine={errorLine}
            readOnly={!catalog?.canWrite}
            className="min-h-[28rem] flex-1"
          />
        ) : (
          <div className="flex min-h-[12rem] flex-1 items-center justify-center rounded-lg border border-stone-700 bg-stone-950 p-6 text-center text-sm text-text-secondary">
            {selected
              ? `${selected.name} is one of the game's own models, read from models36.jag. Edit it as a new source to change it.`
              : 'Pick a model.'}
          </div>
        )}

        {packOutput && (
          <pre className="max-h-48 overflow-auto rounded-lg border border-stone-700 bg-stone-950 p-3 text-[11px] text-stone-300">
            {packOutput}
          </pre>
        )}
      </section>
    </div>
  )
}
