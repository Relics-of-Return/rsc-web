'use client'

import { useCallback, useRef, useState } from 'react'
import { Compass, Globe, Minus, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CircularMinimapProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  cameraYaw: number
  cameraX: number
  cameraY: number
  plane: number
  fps?: number
  onResetNorth: () => void
  onLookAt?: (x: number, y: number) => void
  onOpenNav?: () => void
  className?: string
}

const MINIMAP_SIZE = 285
const MINIMAP_SCALE = 3

/**
 * Authentic RuneScape circular minimap orb with rotating compass needle,
 * interactive click-to-pan, live FPS counter, and coordinates chip.
 */
export function CircularMinimap({
  canvasRef,
  cameraYaw,
  cameraX,
  cameraY,
  plane,
  fps = 60,
  onResetNorth,
  onLookAt,
  onOpenNav,
  className,
}: CircularMinimapProps) {
  const [collapsed, setCollapsed] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  // Camera yaw: 0-1024. In the engine, yaw 0 is looking south, 512 is looking north.
  // The compass rose needle points North relative to the camera's orientation.
  const compassAngle = (cameraYaw / 1024) * 360

  const handleMinimapClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!onLookAt || !canvasRef.current) return

      const rect = e.currentTarget.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const clickY = e.clientY - rect.top

      // Minimap is 285x285, rendered inside the circle.
      // Scaling factor from displayed size (e.g. 156px) to original canvas size (285px):
      const displaySize = rect.width
      const canvasX = (clickX / displaySize) * MINIMAP_SIZE
      const canvasY = (clickY / displaySize) * MINIMAP_SIZE

      // The 2x2 sector bounds are centered around camera:
      // toX = MINIMAP_SIZE - (gameX - region.minX) * MINIMAP_SCALE
      // toY = (gameY - region.minY) * MINIMAP_SCALE
      // Thus delta from camera:
      const centerCanvas = MINIMAP_SIZE / 2
      const deltaCanvasX = canvasX - centerCanvas
      const deltaCanvasY = canvasY - centerCanvas

      // In game coords: local x grows westward (so right-to-left on canvas)
      const deltaGameX = -deltaCanvasX / MINIMAP_SCALE
      const deltaGameY = deltaCanvasY / MINIMAP_SCALE

      const targetX = Math.round(cameraX + deltaGameX)
      const targetY = Math.round(cameraY + deltaGameY)

      onLookAt(targetX, targetY)
    },
    [onLookAt, canvasRef, cameraX, cameraY],
  )

  const planeLabel =
    plane === 0
      ? 'Surface'
      : plane === 1
        ? '1st Floor'
        : plane === 2
          ? '2nd Floor'
          : 'Dungeon'

  return (
    <div
      ref={containerRef}
      className={cn(
        'pointer-events-auto flex flex-col items-start select-none transition-all duration-200',
        className,
      )}
    >
      {/* Outer container */}
      <div className="relative group">
        {/* The Circular Minimap Frame */}
        <div
          className={cn(
            'relative flex items-center justify-center transition-all duration-300 ease-out',
            collapsed
              ? 'h-10 w-10 rounded-full bg-stone-900/90 border border-stone-700 shadow-lg'
              : 'h-40 w-40 sm:h-44 sm:w-44 rounded-full p-2 bg-gradient-to-br from-[#3b3227] via-[#221c16] to-[#120f0d] border-2 border-[#544634] shadow-[0_10px_25px_rgba(0,0,0,0.8),inset_0_1px_2px_rgba(255,255,255,0.15)] ring-1 ring-black/80',
          )}
        >
          {/* Inner metallic rim */}
          {!collapsed && (
            <div className="absolute inset-1 rounded-full border border-[#7a684b]/40 pointer-events-none z-10" />
          )}

          {/* Minimap Canvas inside circle mask */}
          {!collapsed && (
            <div
              onClick={handleMinimapClick}
              title="Click minimap to walk/pan camera here"
              className="relative h-full w-full cursor-crosshair overflow-hidden rounded-full border-2 border-[#1a1714] bg-black shadow-[inset_0_4px_12px_rgba(0,0,0,0.9)]"
            >
              <canvas
                ref={canvasRef}
                width={MINIMAP_SIZE}
                height={MINIMAP_SIZE}
                className="h-full w-full object-cover"
              />

              {/* Center crosshair dot */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_4px_#ff0000]" />
              </div>
            </div>
          )}

          {/* Compass Rose (Top Left at 10 o'clock position) */}
          <button
            type="button"
            onClick={onResetNorth}
            title="Snap camera North (click or press N)"
            className={cn(
              'absolute z-20 flex items-center justify-center rounded-full transition-transform active:scale-95',
              collapsed
                ? 'inset-0 h-full w-full text-gold-400 hover:text-gold-300'
                : '-top-1.5 -left-1.5 h-10 w-10 bg-gradient-to-br from-[#453a2d] to-[#1c1712] border-2 border-[#69573f] shadow-lg ring-1 ring-black/90 hover:border-gold-400 group/compass',
            )}
          >
            {/* Rotating needle */}
            <div
              className="relative flex items-center justify-center transition-transform duration-100 ease-out"
              style={{ transform: `rotate(${compassAngle}deg)` }}
            >
              <Compass className="h-6 w-6 text-[#d6c4a5] group-hover/compass:text-gold-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]" />
              {/* Red 'N' tip indicator */}
              <span className="absolute -top-1 font-bold text-[9px] tracking-tight text-red-500 drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
                N
              </span>
            </div>
          </button>

          {/* World Globe Button (Bottom Right at 5 o'clock position) */}
          {!collapsed && (
            <button
              type="button"
              onClick={onOpenNav}
              title="Open Navigation & Teleport panel"
              className="absolute -bottom-1 -right-1 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#3b3227] to-[#17130f] border-2 border-[#5c4c37] shadow-lg ring-1 ring-black/90 text-gold-400 hover:text-gold-300 hover:border-gold-400 transition-all active:scale-95"
            >
              <Globe className="h-4 w-4 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]" />
            </button>
          )}

          {/* Minimap toggle collapse button */}
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand minimap' : 'Minimize minimap'}
            className={cn(
              'absolute z-20 flex items-center justify-center rounded-full bg-stone-900/90 text-stone-300 hover:text-white border border-stone-700/80 shadow-md transition-all',
              collapsed
                ? '-bottom-1 -right-1 h-5 w-5'
                : 'top-0 right-1 h-5 w-5 hover:bg-stone-800',
            )}
          >
            {collapsed ? <Plus className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
          </button>
        </div>

        {/* Live HUD info below minimap (Matching osrs.world image 1 & 2) */}
        {!collapsed && (
          <div className="mt-2 space-y-1 pl-1">
            {/* FPS Counter */}
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs font-bold tracking-tight text-white/90 drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
                {Math.round(fps)}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-text-secondary/70">
                fps
              </span>
            </div>

            {/* Coordinates Badge */}
            <button
              type="button"
              onClick={onOpenNav}
              title="Click to jump or view coordinates"
              className="group/coord flex items-center gap-1.5 rounded bg-black/60 px-2 py-0.5 text-[11px] font-mono text-stone-300 backdrop-blur-md border border-white/10 hover:border-gold-500/50 hover:text-gold-300 transition-all shadow-sm"
            >
              <span className="text-gold-400/90 group-hover/coord:text-gold-300">
                {Math.round(cameraX)}, {Math.round(cameraY)}
              </span>
              <span className="text-stone-500">·</span>
              <span className="text-stone-400 text-[10px]">{planeLabel}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
