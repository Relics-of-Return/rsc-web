'use client'

import { useEffect, useRef, useState } from 'react'

import type { FaceHit, ModelPreviewInstance, ModelView } from '@/components/model-editor/preview'
import { cn } from '@/lib/utils'

/**
 * The live view: the game's own renderer drawing the model at 512x334, the
 * game's view size, scaled up pixel for pixel. Drag to turn, shift-drag (or
 * right-drag) to raise and lower the camera's aim, scroll to zoom. The
 * toolbar has the game's camera, the eight directions a placed object can
 * face (lighting is fixed, so each shows a different side lit), the ground
 * and the texture animations.
 */

const PITCH_MIN = 700
const PITCH_MAX = 1020
const DISTANCE_MIN = 300
const DISTANCE_MAX = 6000

const GAME_CAMERA = { pitch: 912, distance: 1100, height: 0 }

interface ModelViewportProps {
  preview: ModelPreviewInstance | null
  /** The renderer's own canvas, which the view is put into. */
  canvas: HTMLCanvasElement | null
  view: ModelView
  onView: (patch: Partial<ModelView>) => void
  hit: FaceHit | null
  describeFill: (fill: number) => string
  onPickFace: (face: number | null) => void
  width: number
  height: number
  className?: string
}

export function ModelViewport({
  preview,
  canvas,
  view,
  onView,
  hit,
  describeFill,
  onPickFace,
  width,
  height,
  className,
}: ModelViewportProps) {
  const holder = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; moved: boolean; raise: boolean } | null>(null)
  const [fullscreen, setFullscreen] = useState(false)

  // the renderer's canvas is its own; it's put in the holder here
  useEffect(() => {
    const host = holder.current

    if (!canvas || !host) {
      return
    }

    host.appendChild(canvas)

    return () => {
      if (canvas.parentNode === host) {
        host.removeChild(canvas)
      }
    }
  }, [canvas])

  const toCanvas = (event: { clientX: number; clientY: number }) => {
    if (!canvas) {
      return null
    }

    const box = canvas.getBoundingClientRect()

    return {
      x: ((event.clientX - box.left) / box.width) * width,
      y: ((event.clientY - box.top) / box.height) * height,
    }
  }

  const onPointerDown = (event: React.PointerEvent) => {
    ;(event.target as Element).setPointerCapture?.(event.pointerId)
    drag.current = {
      x: event.clientX,
      y: event.clientY,
      moved: false,
      raise: event.shiftKey || event.button === 2,
    }
  }

  const onPointerMove = (event: React.PointerEvent) => {
    const at = toCanvas(event)

    if (at) {
      preview?.setPointer(at.x, at.y)
    }

    const current = drag.current

    if (!current) {
      return
    }

    const dx = event.clientX - current.x
    const dy = event.clientY - current.y

    if (Math.abs(dx) + Math.abs(dy) > 3) {
      current.moved = true
    }

    current.x = event.clientX
    current.y = event.clientY

    if (current.raise) {
      onView({ height: Math.max(-200, Math.min(800, view.height - dy * 2)) })
    } else {
      onView({
        yaw: (view.yaw - dx * 2 + 1024) & 1023,
        pitch: Math.max(PITCH_MIN, Math.min(PITCH_MAX, view.pitch - dy)),
      })
    }
  }

  const onPointerUp = () => {
    if (drag.current && !drag.current.moved) {
      onPickFace(hit ? hit.face : null)
    }

    drag.current = null
  }

  const onWheel = (event: React.WheelEvent) => {
    const factor = event.deltaY > 0 ? 1.1 : 1 / 1.1

    onView({
      distance: Math.round(Math.max(DISTANCE_MIN, Math.min(DISTANCE_MAX, view.distance * factor))),
    })
  }

  // the page doesn't scroll while zooming the view
  useEffect(() => {
    const element = holder.current

    if (!element) {
      return
    }

    const stop = (event: WheelEvent) => event.preventDefault()

    element.addEventListener('wheel', stop, { passive: false })

    return () => element.removeEventListener('wheel', stop)
  }, [])

  const button = (active: boolean) =>
    cn(
      'rounded border px-2 py-1 text-[11px] uppercase tracking-wide transition-colors',
      active
        ? 'border-gold-500/70 bg-gold-500/15 text-gold-300'
        : 'border-stone-700 bg-stone-900/70 text-text-secondary hover:border-gold-500/40 hover:text-gold-400',
    )

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden rounded-lg border border-stone-700 bg-stone-950',
        fullscreen && 'fixed inset-4 z-50',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5 border-b border-stone-800 bg-stone-900/80 px-2 py-1.5">
        <button type="button" className={button(false)} onClick={() => onView(GAME_CAMERA)}>
          Game camera
        </button>
        <button
          type="button"
          className={button(false)}
          onClick={() => onView({ pitch: 1010, distance: view.distance, height: 120 })}
        >
          Side on
        </button>
        <button type="button" className={button(false)} onClick={() => onView({ pitch: 760 })}>
          From above
        </button>

        <span className="mx-1 h-4 w-px bg-stone-700" />

        <span className="text-[11px] uppercase tracking-wide text-text-muted">Facing</span>
        {Array.from({ length: 8 }, (_, direction) => (
          <button
            key={direction}
            type="button"
            className={button(view.direction === direction)}
            title={`Placed facing direction ${direction}, as the World Editor's R turns it`}
            onClick={() => onView({ direction })}
          >
            {direction}
          </button>
        ))}

        <span className="mx-1 h-4 w-px bg-stone-700" />

        <button type="button" className={button(view.ground)} onClick={() => onView({ ground: !view.ground })}>
          Ground
        </button>
        <button type="button" className={button(view.animate)} onClick={() => onView({ animate: !view.animate })}>
          Animate
        </button>
        <button type="button" className={button(fullscreen)} onClick={() => setFullscreen((on) => !on)}>
          {fullscreen ? 'Exit full' : 'Full'}
        </button>
      </div>

      <div
        ref={holder}
        className="relative min-h-0 flex-1 touch-none select-none"
        style={fullscreen ? undefined : { aspectRatio: `${width} / ${height}` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={() => preview?.setPointer(null)}
        onWheel={onWheel}
        onContextMenu={(event) => event.preventDefault()}
      >
        {!preview && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-text-secondary">
            Loading the game&apos;s renderer…
          </p>
        )}

        {hit && (
          <div className="pointer-events-none absolute left-2 top-2 rounded bg-stone-950/80 px-2 py-1 font-mono text-[11px] leading-relaxed text-stone-200">
            <div>
              face <span className="text-gold-300">{hit.face}</span> · {hit.corners} corners
            </div>
            <div>front {describeFill(hit.front)}</div>
            <div>back {describeFill(hit.back)}</div>
          </div>
        )}

        <div className="pointer-events-none absolute bottom-2 right-2 rounded bg-stone-950/70 px-2 py-0.5 font-mono text-[10px] text-text-muted">
          yaw {view.yaw} · pitch {view.pitch} · {view.distance}
        </div>
      </div>
    </div>
  )
}
