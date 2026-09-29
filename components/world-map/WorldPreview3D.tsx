'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type { PlacedObject, SectorTiles } from '@/lib/landscape/types'

/**
 * The live 3D view: the game client's own renderer (rsc-client's
 * src/editor/world-preview.js), fed the editor's working copy. What it draws
 * is what a player standing there would see — the same meshes, textures,
 * models and quirks — so an edit can be judged before anything is saved.
 *
 * Drag to orbit, right-drag or shift-drag to pan, scroll to zoom; with the
 * view focused, the arrow keys pan, Q/E turn and +/- zoom. Click to select
 * what is under the pointer.
 */

/** What the pointer is over, in game coordinates. */
export interface PreviewHit {
  kind: 'tile' | 'object' | 'door'
  x: number
  y: number
  id?: number
  direction?: number
  /** The footprint, in tiles — more than one for large scenery. */
  width: number
  height: number
}

/** Where the camera looks: x.5 is the middle of a tile. */
export interface PreviewCamera {
  x: number
  y: number
  plane: number
  yaw: number
  pitch: number
  distance: number
}

interface PreviewInstance {
  load(fetchArchive: (name: string) => Promise<ArrayBuffer>): Promise<void>
  reloadMaps(fetchArchive: (name: string) => Promise<ArrayBuffer>): Promise<void>
  setSector(ref: { plane: number; x: number; y: number }, tiles: SectorTiles): void
  clearSectors(): void
  setObjects(objects: PlacedObject[]): void
  setWallObjects(objects: PlacedObject[]): void
  setRoofs(roofs: boolean): void
  setSelected(tile: { x: number; y: number; width: number; height: number } | null): void
  lookAt(x: number, y: number): boolean
  pan(right: number, forward: number): boolean
  refresh(): void
  render(): void
  present(): void
  pointAt(x: number | null, y?: number): PreviewHit | null
  minimap(): { width: number; height: number; data: Uint8ClampedArray } | null
  camera(): PreviewCamera
  bounds(): { plane: number; minX: number; minY: number; maxX: number; maxY: number }
  thumbnail(kind: 'object' | 'door', id: number): string | null
  yaw: number
  pitch: number
  distance: number
}

type PreviewConstructor = new (
  canvas: HTMLCanvasElement,
  options?: { members?: boolean },
) => PreviewInstance

declare global {
  interface Window {
    RSCWorldPreview?: PreviewConstructor
  }
}

// the renderer is a script of its own, loaded once however often this mounts
let bundle: Promise<PreviewConstructor> | null = null

function loadBundle(): Promise<PreviewConstructor> {
  if (window.RSCWorldPreview) {
    return Promise.resolve(window.RSCWorldPreview)
  }

  bundle ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')

    script.src = '/api/landscape/preview'
    script.onload = () =>
      window.RSCWorldPreview
        ? resolve(window.RSCWorldPreview)
        : reject(
            new Error(
              'The 3D view is not built — run npm run build-preview in rsc-client.',
            ),
          )
    script.onerror = () => {
      bundle = null
      reject(new Error('Could not load the 3D view.'))
    }

    document.head.appendChild(script)
  })

  return bundle
}

async function fetchArchive(name: string): Promise<ArrayBuffer> {
  const response = await fetch(`/api/landscape/archive?name=${encodeURIComponent(name)}`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`could not load ${name} (${response.status})`)
  }

  return response.arrayBuffer()
}

// internal resolution: the renderer is software, so its cost is per pixel.
// CSS scales it to the column
const WIDTH = 640
const HEIGHT = 420

// mudclient looks down at 912; the editor lets you tip from nearly
// top-down to nearly level
const PITCH_MIN = 780
const PITCH_MAX = 1010
const DISTANCE_MIN = 400
const DISTANCE_MAX = 6000

const DEFAULT_VIEW = { yaw: 0, pitch: 912, distance: 1500 }

// how long an edit has to settle before the region is rebuilt - a rebuild
// is a full reload of 2x2 sectors, about 80ms
const REBUILD_DELAY = 150

// a press that moves less than this is a click, not a drag
const CLICK_SLOP = 4

// the minimap World paints is 3 pixels a tile, 285 square
const MINIMAP_SIZE = 285
const MINIMAP_SCALE = 3

interface WorldPreview3DProps {
  /** Every sector the editor has open; their working copies win over the archives. */
  sectors: { ref: { plane: number; x: number; y: number }; tiles: SectorTiles }[]
  /** Every scenery object and door to show, working copies included. */
  objects: PlacedObject[]
  wallObjects: PlacedObject[]
  /** A request to look at a tile; a new `n` asks again. */
  focus: { x: number; y: number; n: number }
  /** The selected tile, outlined. */
  selected: { x: number; y: number } | null
  /** Bumped after a save, so the surrounding sectors are re-read. */
  mapsVersion: number
  /** Words for what the pointer is over. */
  describe: (hit: PreviewHit) => string
  onPick: (hit: PreviewHit) => void
  onCamera?: (camera: PreviewCamera) => void
  /** Once the renderer is up: a way to draw any scenery or door model small. */
  onThumbnails?: (thumbnail: (kind: 'object' | 'door', id: number) => string | null) => void
}

export function WorldPreview3D({
  sectors,
  objects,
  wallObjects,
  focus,
  selected,
  mapsVersion,
  describe,
  onPick,
  onCamera,
  onThumbnails,
}: WorldPreview3DProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const minimapRef = useRef<HTMLCanvasElement | null>(null)
  const previewRef = useRef<PreviewInstance | null>(null)

  const [status, setStatus] = useState<string>('loading')
  const [roofs, setRoofs] = useState(true)
  const [hit, setHit] = useState<PreviewHit | null>(null)

  // the props as of the last render, for effects that fire on something else
  const latest = useRef({ sectors, objects, wallObjects, onCamera, onThumbnails })
  // what the renderer was last handed
  const applied = useRef<typeof latest.current | null>(null)

  useEffect(() => {
    latest.current = { sectors, objects, wallObjects, onCamera, onThumbnails }
  })

  // ## drawing

  const frame = useRef(0)
  // where the pointer rests on the canvas, in canvas pixels, while hovering
  const pointer = useRef<{ x: number; y: number } | null>(null)
  const minimapImage = useRef<ImageData | null>(null)
  const regionChanged = useRef(true)
  const cameraReport = useRef({ at: 0, timer: 0 as ReturnType<typeof setTimeout> | 0 })

  const drawMinimap = useCallback(() => {
    const preview = previewRef.current
    const canvas = minimapRef.current
    const context = canvas?.getContext('2d')

    if (!preview || !context) {
      return
    }

    if (regionChanged.current || !minimapImage.current) {
      const image = preview.minimap()

      if (!image) {
        return
      }

      minimapImage.current = new ImageData(
        new Uint8ClampedArray(image.data),
        image.width,
        image.height,
      )
      regionChanged.current = false
    }

    context.putImageData(minimapImage.current, 0, 0)

    const region = preview.bounds()
    const camera = preview.camera()

    // local x grows westward, which the minimap draws right to left
    const toX = (gameX: number) => MINIMAP_SIZE - (gameX - region.minX) * MINIMAP_SCALE
    const toY = (gameY: number) => (gameY - region.minY) * MINIMAP_SCALE

    // the sector boundaries
    context.strokeStyle = 'rgba(232, 191, 74, 0.6)'
    context.lineWidth = 1

    for (let x = region.minX; x <= region.maxX + 1; x += 48) {
      context.beginPath()
      context.moveTo(Math.round(toX(x)) + 0.5, 0)
      context.lineTo(Math.round(toX(x)) + 0.5, MINIMAP_SIZE)
      context.stroke()
    }

    for (let y = region.minY; y <= region.maxY + 1; y += 48) {
      context.beginPath()
      context.moveTo(0, Math.round(toY(y)) + 0.5)
      context.lineTo(MINIMAP_SIZE, Math.round(toY(y)) + 0.5)
      context.stroke()
    }

    // the camera: where it looks, and which way
    const angle = (camera.yaw / 1024) * Math.PI * 2
    const x = toX(camera.x)
    const y = toY(camera.y)

    context.strokeStyle = '#ffffff'
    context.fillStyle = '#ffffff'
    context.lineWidth = 2
    context.beginPath()
    context.moveTo(x, y)
    context.lineTo(x - Math.sin(angle) * 14, y + Math.cos(angle) * 14)
    context.stroke()
    context.beginPath()
    context.arc(x, y, 3, 0, Math.PI * 2)
    context.fill()
  }, [])

  const reportCamera = useCallback(() => {
    const preview = previewRef.current
    const report = cameraReport.current

    if (!preview || !latest.current.onCamera) {
      return
    }

    // a dozen times a second is plenty for a marker on the map
    const send = () => {
      report.at = performance.now()
      report.timer = 0
      latest.current.onCamera?.(preview.camera())
    }

    if (report.timer) {
      return
    }

    const wait = 80 - (performance.now() - report.at)

    if (wait <= 0) {
      send()
    } else {
      report.timer = setTimeout(send, wait)
    }
  }, [])

  // one frame per animation frame at most, however many things changed
  const schedule = useCallback(() => {
    if (frame.current) {
      return
    }

    frame.current = requestAnimationFrame(() => {
      frame.current = 0

      const preview = previewRef.current

      if (!preview) {
        return
      }

      if (pointer.current) {
        const next = preview.pointAt(pointer.current.x, pointer.current.y)

        setHit((last) =>
          last &&
          next &&
          last.kind === next.kind &&
          last.x === next.x &&
          last.y === next.y &&
          last.id === next.id
            ? last
            : next,
        )
      } else {
        preview.render()
      }

      drawMinimap()
      reportCamera()
    })
  }, [drawMinimap, reportCamera])

  /** Hands the renderer the working copy, if it changed. */
  const push = useCallback((preview: PreviewInstance) => {
    const next = latest.current
    const last = applied.current

    if (
      last &&
      last.sectors === next.sectors &&
      last.objects === next.objects &&
      last.wallObjects === next.wallObjects
    ) {
      return false
    }

    preview.clearSectors()

    for (const { ref, tiles } of next.sectors) {
      preview.setSector(ref, tiles)
    }

    preview.setObjects(next.objects)
    preview.setWallObjects(next.wallObjects)
    applied.current = next

    return true
  }, [])

  // ## lifecycle

  // boot: the bundle, then the archives, then the first look
  useEffect(() => {
    let cancelled = false
    const report = cameraReport.current

    loadBundle()
      .then(async (Preview) => {
        if (cancelled || !canvasRef.current) {
          return
        }

        const preview = new Preview(canvasRef.current)

        await preview.load(fetchArchive)

        if (!cancelled) {
          previewRef.current = preview
          setStatus('ready')
          latest.current.onThumbnails?.((kind, id) => preview.thumbnail(kind, id))
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setStatus(error instanceof Error ? error.message : 'The 3D view failed to start.')
        }
      })

    return () => {
      cancelled = true
      cancelAnimationFrame(frame.current)
      frame.current = 0
      clearTimeout(report.timer || undefined)
      report.timer = 0
      previewRef.current = null
      applied.current = null
    }
  }, [])

  // look where asked - the sector just opened, or a tile clicked on the map
  useEffect(() => {
    const preview = previewRef.current

    if (status !== 'ready' || !preview) {
      return
    }

    const pushed = push(preview)
    const moved = preview.lookAt(focus.x, focus.y)

    if (pushed && !moved) {
      preview.refresh()
    }

    regionChanged.current = true
    schedule()
  }, [status, focus.x, focus.y, focus.n, push, schedule])

  // the working copy, rebuilt once an edit settles
  useEffect(() => {
    const preview = previewRef.current

    if (status !== 'ready' || !preview) {
      return
    }

    const timer = setTimeout(() => {
      if (push(preview)) {
        preview.refresh()
        regionChanged.current = true
        schedule()
      }
    }, REBUILD_DELAY)

    return () => clearTimeout(timer)
  }, [status, sectors, objects, wallObjects, push, schedule])

  // after a save the surrounding sectors come from the archives again
  useEffect(() => {
    const preview = previewRef.current

    if (status !== 'ready' || !preview || mapsVersion === 0) {
      return
    }

    preview
      .reloadMaps(fetchArchive)
      .then(() => {
        regionChanged.current = true
        schedule()
      })
      .catch(() => {
        // the view keeps the maps it had; the next save tries again
      })
  }, [status, mapsVersion, schedule])

  // by value: the editor hands over a new object on every render
  const selectedX = selected?.x ?? null
  const selectedY = selected?.y ?? null

  useEffect(() => {
    const preview = previewRef.current

    if (status !== 'ready' || !preview) {
      return
    }

    preview.setSelected(
      selectedX !== null && selectedY !== null
        ? { x: selectedX, y: selectedY, width: 1, height: 1 }
        : null,
    )
    schedule()
  }, [status, selectedX, selectedY, schedule])

  useEffect(() => {
    const preview = previewRef.current

    if (status !== 'ready' || !preview) {
      return
    }

    preview.setRoofs(roofs)
    schedule()
  }, [status, roofs, schedule])

  // the wheel zooms the view, not the page - which takes a listener React
  // cannot give, since its own wheel listeners are passive
  useEffect(() => {
    const canvas = canvasRef.current

    if (status !== 'ready' || !canvas) {
      return
    }

    const onWheel = (event: WheelEvent) => {
      const preview = previewRef.current

      if (!preview) {
        return
      }

      event.preventDefault()

      preview.distance = Math.max(
        DISTANCE_MIN,
        Math.min(DISTANCE_MAX, preview.distance * (event.deltaY > 0 ? 1.12 : 1 / 1.12)),
      )

      schedule()
    }

    canvas.addEventListener('wheel', onWheel, { passive: false })

    return () => canvas.removeEventListener('wheel', onWheel)
  }, [status, schedule])

  // ## controls

  const drag = useRef<{
    startX: number
    startY: number
    x: number
    y: number
    pan: boolean
    moved: boolean
  } | null>(null)

  /** Client coordinates to the canvas's own pixels, which CSS scales. */
  const canvasPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()

    return {
      x: ((event.clientX - rect.left) * WIDTH) / rect.width,
      y: ((event.clientY - rect.top) * HEIGHT) / rect.height,
    }
  }

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    event.currentTarget.focus()

    pointer.current = null
    drag.current = {
      startX: event.clientX,
      startY: event.clientY,
      x: event.clientX,
      y: event.clientY,
      pan: event.button === 2 || event.shiftKey,
      moved: false,
    }
  }

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const preview = previewRef.current
    const from = drag.current

    if (!preview) {
      return
    }

    if (!from) {
      pointer.current = canvasPoint(event)
      schedule()
      return
    }

    if (
      !from.moved &&
      Math.hypot(event.clientX - from.startX, event.clientY - from.startY) < CLICK_SLOP
    ) {
      return
    }

    from.moved = true

    const dx = event.clientX - from.x
    const dy = event.clientY - from.y

    from.x = event.clientX
    from.y = event.clientY

    if (from.pan) {
      // grab the ground: it follows the pointer, further when zoomed out
      const scale = preview.distance / 1500 / 12

      if (preview.pan(-dx * scale, dy * scale)) {
        regionChanged.current = true
      }
    } else {
      preview.yaw = (preview.yaw - dx * 2 + 4096) & 0x3ff
      preview.pitch = Math.max(PITCH_MIN, Math.min(PITCH_MAX, preview.pitch + dy))
    }

    schedule()
  }

  const onPointerUp = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const preview = previewRef.current
    const from = drag.current

    drag.current = null

    if (!preview || !from || from.moved || event.button !== 0 || from.pan) {
      return
    }

    const { x, y } = canvasPoint(event)
    const picked = preview.pointAt(x, y)

    pointer.current = { x, y }
    setHit(picked)
    drawMinimap()

    if (picked) {
      onPick(picked)
    }
  }

  const onPointerLeave = () => {
    pointer.current = null
    previewRef.current?.pointAt(null)
    setHit(null)
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLCanvasElement>) => {
    const preview = previewRef.current

    if (!preview) {
      return
    }

    const step = 2
    let handled = true
    let moved = false

    switch (event.key) {
      case 'ArrowLeft':
        moved = preview.pan(-step, 0)
        break
      case 'ArrowRight':
        moved = preview.pan(step, 0)
        break
      case 'ArrowUp':
        moved = preview.pan(0, step)
        break
      case 'ArrowDown':
        moved = preview.pan(0, -step)
        break
      case 'q':
      case 'Q':
        preview.yaw = (preview.yaw + 32) & 0x3ff
        break
      case 'e':
      case 'E':
        preview.yaw = (preview.yaw - 32 + 1024) & 0x3ff
        break
      case '+':
      case '=':
        preview.distance = Math.max(DISTANCE_MIN, preview.distance / 1.15)
        break
      case '-':
        preview.distance = Math.min(DISTANCE_MAX, preview.distance * 1.15)
        break
      default:
        handled = false
    }

    if (handled) {
      event.preventDefault()
      event.stopPropagation()

      if (moved) {
        regionChanged.current = true
      }

      schedule()
    }
  }

  const resetView = () => {
    const preview = previewRef.current

    if (!preview) {
      return
    }

    preview.yaw = DEFAULT_VIEW.yaw
    preview.pitch = DEFAULT_VIEW.pitch
    preview.distance = DEFAULT_VIEW.distance

    if (preview.lookAt(focus.x, focus.y)) {
      regionChanged.current = true
    }

    schedule()
  }

  return (
    <div className="space-y-2" data-testid="world-preview">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-secondary">
        <span className="uppercase tracking-wide text-text-primary">Game view</span>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            className="accent-gold-500"
            checked={roofs}
            onChange={(e) => setRoofs(e.target.checked)}
          />
          Roofs &amp; upper floors
        </label>
        <button
          type="button"
          onClick={resetView}
          className="underline decoration-dotted underline-offset-2 hover:text-text-primary"
        >
          Reset view
        </button>
      </div>

      <div className="relative overflow-hidden rounded border border-stone-700 bg-black">
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          tabIndex={0}
          aria-label="3D view of the world, as the game draws it"
          className="block h-auto w-full cursor-crosshair touch-none outline-none focus-visible:ring-2 focus-visible:ring-gold-500/60"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            drag.current = null
          }}
          onPointerLeave={onPointerLeave}
          onKeyDown={onKeyDown}
          onContextMenu={(e) => e.preventDefault()}
        />

        {status !== 'ready' && (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-text-secondary">
            {status === 'loading' ? 'Loading the game renderer…' : status}
          </div>
        )}
      </div>

      <p className="min-h-[1rem] text-[11px] text-text-secondary">
        {hit ? describe(hit) : 'Drag to orbit · right-drag to pan · scroll to zoom · click to select'}
      </p>

      <div className="flex gap-3">
        <canvas
          ref={minimapRef}
          width={MINIMAP_SIZE}
          height={MINIMAP_SIZE}
          aria-label="The game's minimap of the loaded area"
          className="h-auto w-36 shrink-0 rounded border border-stone-700 bg-black"
        />
        <p className="text-[11px] leading-relaxed text-text-secondary">
          The game&apos;s own renderer, showing your unsaved changes. The
          minimap is the one the game draws for the 2×2 sectors loaded around
          the camera, with the sector boundaries in gold and the white mark
          where the camera looks. With the view focused, the arrow keys pan,
          Q and E turn, and + and − zoom.
        </p>
      </div>
    </div>
  )
}
