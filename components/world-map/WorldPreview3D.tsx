'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { CircularMinimap } from '@/components/world-map/CircularMinimap'
import type { LightingArea } from '@/lib/landscape/lighting'
import type { PlacedObject, SectorTiles } from '@/lib/landscape/types'
import { cn } from '@/lib/utils'

/**
 * The live 3D view: the game client's own world (rsc-client's
 * src/editor/world-preview.js), fed the editor's working copy. What it draws
 * is what a player standing there would see — the same meshes, textures,
 * models and lighting — so an edit can be judged before anything is saved.
 * The GPU draws it, at the screen's own resolution and as far out as the
 * draw distance reaches: the world around is built block by block in the
 * background, nearest first, and fades into the sky where it runs out.
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
  /** A tile's HD ground material (rsc-client/assets/hd/ground.json), or 'natural'. */
  ground?: string | null
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

/** How the view is drawn — kept per browser, not per map. */
export interface RenderSettings {
  /** Tiles from the camera's focus the world is drawn to. */
  drawDistance: number
  /** Whether the far edge fades into the sky or stops. */
  fog: boolean
  sky: 'day' | 'dusk' | 'night' | 'classic'
  brightness: number
  /** Old school's ground textures on grass and dirt, and moving water. */
  ground: boolean
  /** HD graphics' Enhanced lighting: the sky setting's sun, lighting the world again. */
  lighting: boolean
  /** The sun's shadows with Enhanced lighting: 0 off, 1 low to 3 high. */
  shadows: number
  /**
   * With Enhanced lighting, the light of the lighting area looked at (the
   * Wilderness's haze, the desert's glare), as the game has it there.
   */
  place: boolean
  /** The world mirrored in the water, with Enhanced lighting. */
  reflections: boolean
  /** The ground's colours blended across tiles, as old school's are. */
  groundBlend: boolean
  /** 0 none, 1 winter, 2 autumn. */
  season: number
  /** 0 off, 1 soft, 2 ACES. */
  toneMapping: number
  /** Bloom's strength, 0 off. */
  bloom: number
  /** The drawing buffer against the screen's pixels: below 1 is faster. */
  resolution: number
}

export const DEFAULT_RENDER_SETTINGS: RenderSettings = {
  drawDistance: 128,
  fog: true,
  sky: 'day',
  brightness: 1,
  ground: true,
  lighting: false,
  shadows: 2,
  place: true,
  reflections: true,
  groundBlend: false,
  season: 0,
  toneMapping: 0,
  bloom: 0,
  resolution: 1,
}

export const DRAW_DISTANCE_MIN = 24
export const DRAW_DISTANCE_MAX = 256

const RENDER_STORAGE_KEY = 'world-editor:render'

/** The view's render settings, remembered in this browser. */
export function useRenderSettings(): [RenderSettings, (patch: Partial<RenderSettings>) => void] {
  // the editor only renders once the login is known, so never on the server
  const [settings, setSettings] = useState<RenderSettings>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(RENDER_STORAGE_KEY) ?? 'null')

      if (saved && typeof saved === 'object') {
        return { ...DEFAULT_RENDER_SETTINGS, ...saved }
      }
    } catch {
      // nothing saved, or storage is off - the defaults do
    }

    return DEFAULT_RENDER_SETTINGS
  })

  const update = useCallback((patch: Partial<RenderSettings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch }

      try {
        localStorage.setItem(RENDER_STORAGE_KEY, JSON.stringify(next))
      } catch {
        // not remembered, but still applied
      }

      return next
    })
  }, [])

  return [settings, update]
}

/** How far along the world around the focus is. */
export interface PreviewProgress {
  built: number
  total: number
  building: number
}

export interface WorldPreviewController {
  yaw: number
  pitch: number
  distance: number
  roofs: boolean
  setYaw: (yaw: number) => void
  setPitch: (pitch: number) => void
  setDistance: (distance: number) => void
  setRoofs: (roofs: boolean) => void
  resetNorth: () => void
  resetView: () => void
  lookAt: (x: number, y: number) => void
}

interface PreviewInstance {
  load(fetchArchive: (name: string) => Promise<ArrayBuffer>): Promise<void>
  destroy(): void
  setSettings(settings: Partial<RenderSettings>): RenderSettings
  resize(width: number, height: number, pixelRatio: number): void
  progress(): PreviewProgress
  onUpdate: ((progress: PreviewProgress) => void) | null
  reloadMaps(fetchArchive: (name: string) => Promise<ArrayBuffer>): Promise<void>
  reloadArt(fetchArchive: (name: string) => Promise<ArrayBuffer>): Promise<void>
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
  /** Lighting areas to light the view by in place of the client's own; null for its own. */
  setEnvironments?(patch: { areas: LightingArea[] } | null): void
  yaw: number
  pitch: number
  distance: number
}

type PreviewConstructor = new (
  canvas: HTMLCanvasElement,
  options?: { members?: boolean; overlay?: HTMLCanvasElement | null },
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

// mudclient looks down at 912; the editor lets you tip from nearly
// top-down to nearly level
const PITCH_MIN = 780
const PITCH_MAX = 1010
const DISTANCE_MIN = 400
export const DISTANCE_MAX = 12000

const DEFAULT_VIEW = { yaw: 0, pitch: 912, distance: 1500 }

// how long an edit has to settle before the blocks it touches are rebuilt -
// each is a load of 2x2 sectors, about 50ms on a worker
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
  /**
   * Bumped when the game's art is packed again (object table, models,
   * textures), so new and changed scenery shows without a page reload.
   */
  artVersion?: number
  /** Words for what the pointer is over. */
  describe: (hit: PreviewHit) => string
  onPick: (hit: PreviewHit) => void
  onCamera?: (camera: PreviewCamera) => void
  /** Once the renderer is up: a way to draw any scenery or door model small. */
  onThumbnails?: (thumbnail: (kind: 'object' | 'door', id: number) => string | null) => void
  /** External controller / callbacks */
  controllerRef?: React.MutableRefObject<WorldPreviewController | null>
  onFpsChange?: (fps: number) => void
  onOpenNav?: () => void
  className?: string
  showMinimap?: boolean
  showControlsBar?: boolean
  roofs?: boolean
  onRoofsChange?: (roofs: boolean) => void
  /** Draw distance, sky and the like; the defaults if not given. */
  render?: RenderSettings
  /** The lighting areas being edited, to light the view by; null for the client's own. */
  lightingAreas?: LightingArea[] | null
}

export function WorldPreview3D({
  sectors,
  objects,
  wallObjects,
  focus,
  selected,
  mapsVersion,
  artVersion = 0,
  describe,
  onPick,
  onCamera,
  onThumbnails,
  controllerRef,
  onFpsChange,
  onOpenNav,
  className,
  showMinimap = true,
  roofs: externalRoofs,
  onRoofsChange,
  render = DEFAULT_RENDER_SETTINGS,
  lightingAreas = null,
}: WorldPreview3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const overlayRef = useRef<HTMLCanvasElement | null>(null)
  const minimapRef = useRef<HTMLCanvasElement | null>(null)
  const previewRef = useRef<PreviewInstance | null>(null)

  const [status, setStatus] = useState<string>('loading')
  const [internalRoofs, setInternalRoofs] = useState(true)
  const roofs = externalRoofs !== undefined ? externalRoofs : internalRoofs

  const [hit, setHit] = useState<PreviewHit | null>(null)
  const [cameraState, setCameraState] = useState<PreviewCamera>({
    x: focus.x,
    y: focus.y,
    plane: 0,
    yaw: DEFAULT_VIEW.yaw,
    pitch: DEFAULT_VIEW.pitch,
    distance: DEFAULT_VIEW.distance,
  })
  const [fps, setFps] = useState(60)
  const [progress, setProgress] = useState<PreviewProgress | null>(null)
  const frameTimes = useRef<number[]>([])

  // the props as of the last render, for effects that fire on something else
  const latest = useRef({
    sectors,
    objects,
    wallObjects,
    onCamera,
    onThumbnails,
    onFpsChange,
    render,
  })
  // what the renderer was last handed
  const applied = useRef<typeof latest.current | null>(null)

  useEffect(() => {
    latest.current = { sectors, objects, wallObjects, onCamera, onThumbnails, onFpsChange, render }
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

    if (!preview) {
      return
    }

    const cam = preview.camera()
    setCameraState(cam)

    if (!latest.current.onCamera) {
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

      // Track FPS
      const now = performance.now()
      frameTimes.current.push(now)
      while (frameTimes.current.length > 0 && frameTimes.current[0] < now - 1000) {
        frameTimes.current.shift()
      }
      const measuredFps = Math.max(1, frameTimes.current.length)
      setFps(measuredFps)
      latest.current.onFpsChange?.(measuredFps)

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

      // how much of the world around is built, for the loading chip
      const next = preview.progress()

      setProgress((last) =>
        last && last.built === next.built && last.total === next.total ? last : next,
      )
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

  /** Sizes the drawing buffer to the view's box. */
  const fitCanvas = useCallback((preview: PreviewInstance) => {
    const container = containerRef.current

    if (!container) {
      return
    }

    preview.resize(
      container.clientWidth || 1,
      container.clientHeight || 1,
      window.devicePixelRatio || 1,
    )
  }, [])

  // Camera Controller actions
  const resetNorth = useCallback(() => {
    const preview = previewRef.current
    if (!preview) return
    preview.yaw = 0
    schedule()
  }, [schedule])

  const resetView = useCallback(() => {
    const preview = previewRef.current
    if (!preview) return
    preview.yaw = DEFAULT_VIEW.yaw
    preview.pitch = DEFAULT_VIEW.pitch
    preview.distance = DEFAULT_VIEW.distance
    if (preview.lookAt(focus.x, focus.y)) {
      regionChanged.current = true
    }
    schedule()
  }, [focus.x, focus.y, schedule])

  const setYaw = useCallback(
    (yaw: number) => {
      const preview = previewRef.current
      if (!preview) return
      preview.yaw = ((yaw % 1024) + 1024) % 1024
      schedule()
    },
    [schedule],
  )

  const setPitch = useCallback(
    (pitch: number) => {
      const preview = previewRef.current
      if (!preview) return
      preview.pitch = Math.max(PITCH_MIN, Math.min(PITCH_MAX, pitch))
      schedule()
    },
    [schedule],
  )

  const setDistance = useCallback(
    (distance: number) => {
      const preview = previewRef.current
      if (!preview) return
      preview.distance = Math.max(DISTANCE_MIN, Math.min(DISTANCE_MAX, distance))
      schedule()
    },
    [schedule],
  )

  const handleSetRoofs = useCallback(
    (nextRoofs: boolean) => {
      setInternalRoofs(nextRoofs)
      onRoofsChange?.(nextRoofs)
      const preview = previewRef.current
      if (preview) {
        preview.setRoofs(nextRoofs)
        schedule()
      }
    },
    [onRoofsChange, schedule],
  )

  const lookAt = useCallback(
    (x: number, y: number) => {
      const preview = previewRef.current
      if (!preview) return
      if (preview.lookAt(x, y)) {
        regionChanged.current = true
      }
      schedule()
    },
    [schedule],
  )

  // Expose controller to ref
  useEffect(() => {
    if (!controllerRef) return
    controllerRef.current = {
      yaw: cameraState.yaw,
      pitch: cameraState.pitch,
      distance: cameraState.distance,
      roofs,
      setYaw,
      setPitch,
      setDistance,
      setRoofs: handleSetRoofs,
      resetNorth,
      resetView,
      lookAt,
    }
  }, [
    controllerRef,
    cameraState.yaw,
    cameraState.pitch,
    cameraState.distance,
    roofs,
    setYaw,
    setPitch,
    setDistance,
    handleSetRoofs,
    resetNorth,
    resetView,
    lookAt,
  ])

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

        const preview = new Preview(canvasRef.current, { overlay: overlayRef.current })

        await preview.load(fetchArchive)

        if (cancelled) {
          preview.destroy()
          return
        }

        preview.setSettings(latest.current.render)
        fitCanvas(preview)

        // a block of the world arrived: draw it, and the minimap it is in
        preview.onUpdate = (next) => {
          regionChanged.current = true
          setProgress(next)
          schedule()
        }

        previewRef.current = preview
        setStatus('ready')
        latest.current.onThumbnails?.((kind, id) => preview.thumbnail(kind, id))
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
      previewRef.current?.destroy()
      previewRef.current = null
      applied.current = null
    }
    // the view is started once; schedule and fitCanvas never change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // the drawing buffer follows the box it is shown in, at the screen's own
  // density
  useEffect(() => {
    const container = containerRef.current

    if (status !== 'ready' || !container) {
      return
    }

    const observer = new ResizeObserver(() => {
      const preview = previewRef.current

      if (preview) {
        fitCanvas(preview)
        schedule()
      }
    })

    observer.observe(container)

    return () => observer.disconnect()
  }, [status, fitCanvas, schedule])

  // draw distance, sky and the rest
  const {
    drawDistance,
    fog,
    sky,
    brightness,
    ground,
    lighting,
    shadows,
    place,
    reflections,
    groundBlend,
    season,
    toneMapping,
    bloom,
    resolution,
  } = render

  useEffect(() => {
    const preview = previewRef.current

    if (status !== 'ready' || !preview) {
      return
    }

    preview.setSettings({
      drawDistance,
      fog,
      sky,
      brightness,
      ground,
      lighting,
      shadows,
      place,
      reflections,
      groundBlend,
      season,
      toneMapping,
      bloom,
      resolution,
    })
    fitCanvas(preview)
    setProgress(preview.progress())
    schedule()
  }, [
    status,
    drawDistance,
    fog,
    sky,
    brightness,
    ground,
    lighting,
    shadows,
    place,
    reflections,
    groundBlend,
    season,
    toneMapping,
    bloom,
    resolution,
    fitCanvas,
    schedule,
  ])

  // the lighting areas being drawn, lighting the view as they change
  useEffect(() => {
    const preview = previewRef.current

    if (status !== 'ready' || !preview?.setEnvironments) {
      return
    }

    preview.setEnvironments(lightingAreas ? { areas: lightingAreas } : null)
    schedule()
  }, [status, lightingAreas, schedule])

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
      .catch((error) => {
        console.error('could not reload surrounding sectors', error)
      })
  }, [status, mapsVersion, schedule])

  // after a pack the object table, models and textures are read again, and
  // the catalog is handed a new thumbnail function so it draws them afresh
  useEffect(() => {
    const preview = previewRef.current

    if (status !== 'ready' || !preview || artVersion === 0) {
      return
    }

    preview
      .reloadArt(fetchArchive)
      .then(() => {
        latest.current.onThumbnails?.((kind, id) => preview.thumbnail(kind, id))
        regionChanged.current = true
        schedule()
      })
      .catch((error) => {
        console.error('could not reload the game art', error)
      })
  }, [status, artVersion, schedule])

  // selected tile outline
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

  // the wheel zooms the view, not the page
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

  /** Client coordinates to the canvas's own pixels */
  const canvasPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()

    return {
      x: ((event.clientX - rect.left) * event.currentTarget.width) / rect.width,
      y: ((event.clientY - rect.top) * event.currentTarget.height) / rect.height,
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
      case 'a':
      case 'A':
        moved = preview.pan(-step, 0)
        break
      case 'ArrowRight':
      case 'd':
      case 'D':
        moved = preview.pan(step, 0)
        break
      case 'ArrowUp':
      case 'w':
      case 'W':
        moved = preview.pan(0, step)
        break
      case 'ArrowDown':
      case 's':
      case 'S':
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
      case 'n':
      case 'N':
        preview.yaw = 0
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

  return (
    <div
      ref={containerRef}
      className={cn('relative h-full w-full overflow-hidden bg-black select-none', className)}
      data-testid="world-preview"
      data-progress={progress ? `${progress.built}/${progress.total}` : undefined}
    >
      {/* The 3D Canvas */}
      <canvas
        ref={canvasRef}
        tabIndex={0}
        aria-label="3D view of the world, as the game draws it"
        className="block h-full w-full cursor-crosshair touch-none outline-none focus-visible:ring-1 focus-visible:ring-gold-500/60"
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

      {/* The outlines of what is hovered and selected, over the scene */}
      <canvas
        ref={overlayRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full"
      />

      {/* The world around still being built */}
      {status === 'ready' && progress && progress.built < progress.total && (
        <div className="pointer-events-none absolute top-3 left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/10 bg-black/70 px-3 py-1 font-mono text-[11px] text-stone-300 shadow-lg backdrop-blur-md">
          Loading world · {progress.built}/{progress.total}
        </div>
      )}

      {/* Loading / Status message overlay */}
      {status !== 'ready' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-sm text-text-secondary bg-black/90 backdrop-blur-sm z-30">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gold-500 border-t-transparent mb-3" />
          <p>{status === 'loading' ? 'Loading RuneScape Classic 3D engine…' : status}</p>
        </div>
      )}

      {/* Circular Minimap Overlay at Top Left (Exact OSRS.world style) */}
      {showMinimap && (
        <div className="absolute top-3 left-3 z-20 pointer-events-none">
          <CircularMinimap
            canvasRef={minimapRef}
            cameraYaw={cameraState.yaw}
            cameraX={cameraState.x}
            cameraY={cameraState.y}
            plane={cameraState.plane}
            fps={fps}
            onResetNorth={resetNorth}
            onLookAt={lookAt}
            onOpenNav={onOpenNav}
          />
        </div>
      )}

      {/* Bottom Hit & Control Info Bar */}
      <div className="absolute bottom-3 inset-x-3 pointer-events-none z-10 flex items-center justify-between gap-2">
        <div className="pointer-events-auto max-w-lg truncate rounded-full bg-black/75 px-3 py-1 font-mono text-[11px] text-stone-300 backdrop-blur-md border border-white/10 shadow-lg">
          {hit ? (
            <span className="text-gold-400 font-medium">{describe(hit)}</span>
          ) : (
            <span className="text-stone-400">
              Drag orbit · Right-drag pan · Scroll zoom · WASD fly · Click inspect
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={resetView}
          className="pointer-events-auto rounded-full bg-black/75 px-3 py-1 text-[11px] text-stone-300 backdrop-blur-md border border-white/10 hover:border-gold-500/60 hover:text-white transition-all shadow-lg active:scale-95"
        >
          Reset View
        </button>
      </div>
    </div>
  )
}
