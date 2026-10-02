'use client'

/**
 * The model editor's link to the game's renderer: rsc-client's
 * src/editor/model-preview.js, which comes in the same bundle as the world
 * editor's 3D view (npm run build-preview in rsc-client), plus the model
 * source runner and checks beside it (src/editor/model-source.js).
 */

/** A model as ModelBuilder.build() returns it, and ob3.decode reads one. */
export interface PlainModel {
  x: number[]
  y: number[]
  z: number[]
  faces: number[][]
  front: number[]
  back: number[]
  flat: number[]
}

export interface Footprint {
  width: number
  height: number
}

export interface ModelView {
  /** 0-1023 a full turn. */
  yaw: number
  /** 912 is the game's. */
  pitch: number
  distance: number
  /** How far above the ground the camera looks, in units. */
  height: number
  /** The way a placed object faces, 0-7. */
  direction: number
  ground: boolean
  animate: boolean
  background: number
}

export interface FaceHit {
  face: number
  front: number
  back: number
  corners: number
}

export interface CheckIssue {
  level: 'error' | 'warning' | 'note'
  face?: number
  message: string
}

export interface CheckReport {
  stats: {
    vertices: number
    faces: number
    bytes: number
    bounds: { x: [number, number]; y: [number, number]; z: [number, number] }
  }
  issues: CheckIssue[]
}

export type Evaluation =
  | { model: PlainModel; error?: undefined }
  | { model?: undefined; error: string; line?: number; column?: number }

export interface ModelPreviewInstance {
  load(
    fetchArchive: (name: string) => Promise<ArrayBuffer>,
    customTextures: { name: string; image: ImageData }[],
  ): Promise<void>
  loadGameModels(fetchArchive: (name: string) => Promise<ArrayBuffer>): Promise<void>
  /** Reads the object table again, after a pack. */
  reloadObjects(fetchArchive: (name: string) => Promise<ArrayBuffer>): Promise<void>
  setCustomTextures(list: { name: string; image: ImageData }[]): void
  textureNames(): string[]
  setModel(model: PlainModel | null, footprint?: Footprint): void
  setView(patch: Partial<ModelView>): void
  view: ModelView
  modelNames(): string[]
  gameModel(name: string): PlainModel | null
  objectsUsing(modelName: string): { id: number; name: string; width: number; height: number }[]
  describeFill(fill: number): string
  setPointer(x: number | null, y?: number): void
  start(): void
  stop(): void
  destroy(): void
  snapshot(): string
  onFrame: ((hit: FaceHit | null) => void) | null
}

export interface ModelPreviewConstructor {
  new (canvas: HTMLCanvasElement): ModelPreviewInstance
  WIDTH: number
  HEIGHT: number
  DEFAULT_VIEW: ModelView
  Source: {
    evaluate(source: string, options: { textureNames: string[] }): Evaluation
    check(model: PlainModel, options: { footprint: Footprint | null }): CheckReport
    toSource(model: PlainModel, name: string): string
  }
}

declare global {
  interface Window {
    RSCModelPreview?: ModelPreviewConstructor
  }
}

let bundle: Promise<ModelPreviewConstructor> | null = null

/** The renderer's script, loaded once however often the editor mounts. */
export function loadModelPreview(): Promise<ModelPreviewConstructor> {
  if (window.RSCModelPreview) {
    return Promise.resolve(window.RSCModelPreview)
  }

  bundle ??= new Promise((resolve, reject) => {
    const done = () =>
      window.RSCModelPreview
        ? resolve(window.RSCModelPreview)
        : reject(
            new Error(
              'The model view is not in the 3D bundle — run npm run build-preview in rsc-client.',
            ),
          )

    // the world editor's bundle: loading either editor puts both views on
    // the page, so whichever comes second finds its constructor waiting
    const script = document.createElement('script')

    script.src = '/api/landscape/preview'
    script.onload = done
    script.onerror = () => {
      bundle = null
      reject(new Error('Could not load the 3D renderer.'))
    }

    document.head.appendChild(script)
  })

  return bundle
}

export async function fetchArchive(name: string): Promise<ArrayBuffer> {
  const response = await fetch(`/api/landscape/archive?name=${encodeURIComponent(name)}`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`could not load ${name} (${response.status})`)
  }

  return response.arrayBuffer()
}

/** One of this project's textures, from its PNG, as pixels. */
export async function fetchTexture(name: string): Promise<{ name: string; image: ImageData }> {
  const response = await fetch(`/api/models/texture?name=${encodeURIComponent(name)}`, {
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error(`could not load the texture ${name} (${response.status})`)
  }

  const bitmap = await createImageBitmap(await response.blob())
  const canvas = document.createElement('canvas')

  canvas.width = bitmap.width
  canvas.height = bitmap.height

  const ctx = canvas.getContext('2d')!

  ctx.drawImage(bitmap, 0, 0)

  return { name, image: ctx.getImageData(0, 0, bitmap.width, bitmap.height) }
}
