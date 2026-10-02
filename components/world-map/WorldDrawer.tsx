'use client'

import { useState } from 'react'
import {
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  GripVertical,
  Layers,
  MapPin,
  Navigation,
  Pin,
  PinOff,
  Sliders,
  Wrench,
  X,
} from 'lucide-react'

import { CheckPanel } from '@/components/world-map/CheckPanel'
import { ObjectList } from '@/components/world-map/ObjectList'
import { ItemList, NpcList } from '@/components/world-map/SpawnList'
import { TileInspector } from '@/components/world-map/TileInspector'
import { ToolPanel } from '@/components/world-map/ToolPanel'
import type { Tool, ToolSettings } from '@/components/world-map/tools'
import type { MapLayers } from '@/components/world-map/WorldCanvas'
import {
  DISTANCE_MAX,
  DRAW_DISTANCE_MAX,
  DRAW_DISTANCE_MIN,
  type PreviewCamera,
  type RenderSettings,
  type WorldPreviewController,
} from '@/components/world-map/WorldPreview3D'
import {
  PLANE_HEIGHT,
  SECTOR_SIZE,
  MIN_REGION_X,
  MIN_REGION_Y,
  type ItemSpawn,
  type LandscapePalette,
  type NpcSpawn,
  type PlacedObject,
  type SectorRef,
  type TileEdit,
} from '@/lib/landscape/types'
import { cn } from '@/lib/utils'
import { planeLabel } from '@/lib/world-map'

export const LANDMARK_PRESETS = [
  { name: 'Lumbridge Castle', x: 120, y: 648, plane: 0 },
  { name: 'Varrock Square', x: 136, y: 508, plane: 0 },
  { name: 'Falador Center', x: 312, y: 540, plane: 0 },
  { name: 'Draynor Village', x: 214, y: 630, plane: 0 },
  { name: 'Edgeville', x: 220, y: 445, plane: 0 },
  { name: 'Al Kharid', x: 85, y: 690, plane: 0 },
  { name: 'Barbarian Village', x: 230, y: 505, plane: 0 },
  { name: 'Seers’ Village', x: 500, y: 455, plane: 0 },
  { name: 'Ardougne Market', x: 560, y: 590, plane: 0 },
  { name: 'Catherby Shore', x: 435, y: 490, plane: 0 },
  { name: 'Karamja Docks', x: 370, y: 715, plane: 0 },
  { name: 'Wilderness Ruins', x: 220, y: 300, plane: 0 },
]

interface WorldDrawerProps {
  isOpen: boolean
  onToggleOpen: () => void
  isPinned: boolean
  onTogglePinned: () => void

  // Camera & 3D controller
  camera?: PreviewCamera
  previewController?: React.MutableRefObject<WorldPreviewController | null>
  roofs: boolean
  onRoofsChange: (roofs: boolean) => void
  renderSettings: RenderSettings
  onRenderSettingsChange: (patch: Partial<RenderSettings>) => void

  // Navigation
  plane: number
  onPlaneChange: (plane: number) => void
  planeSectors: SectorRef[]
  centreRef: { plane: number; x: number; y: number }
  centreExists: boolean
  centreMembers?: boolean
  onGoTo: (at: { x: number; y: number }) => void
  neighbours: { label: string; title: string; dx: number; dy: number }[]

  // Tool & Palette
  tool: Tool
  settings: ToolSettings
  onUpdateSettings: (patch: Partial<ToolSettings>) => void
  palette: LandscapePalette
  thumbnail: ((kind: 'object' | 'door', id: number) => string | null) | null
  area: { width: number; height: number } | null
  clip: { width: number; height: number } | null
  pasting: boolean
  onCopyArea: () => void
  onPasteArea: () => void
  onTurnArea: (how: 'rotate' | 'mirror' | 'flip') => void
  onClearArea: () => void
  /** The lighting tool's panel. */
  lightingPanel?: React.ReactNode

  // Inspector & Selection
  selected: { x: number; y: number } | null
  selectedSectorExists: boolean
  tileEditData: TileEdit | null
  onTileChange: (tile: TileEdit, field: string) => void
  sceneryHere: PlacedObject[]
  doorsHere: PlacedObject[]
  npcsHere: NpcSpawn[]
  itemsHere: ItemSpawn[]
  tileFacing?: number
  onSetOnTile: (
    kind: 'objects' | 'wallObjects' | 'npcs' | 'items',
    entries: PlacedObject[] | NpcSpawn[] | ItemSpawn[],
  ) => void
  inspectorTab?: InspectorTab
  onInspectorTabChange?: (tab: InspectorTab) => void

  // Layers
  showLayers: MapLayers
  onUpdateLayers: (updater: (prev: MapLayers) => MapLayers) => void
  layerLabels: [keyof MapLayers, string][]

  // Checker & Actions
  onFixFacing: (at: { x: number; y: number }[]) => Promise<void>
  dirty: boolean
  onSave: () => void
}

type AccordionSection =
  | 'camera'
  | 'navigation'
  | 'tool'
  | 'inspector'
  | 'layers'
  | 'integrity'

export type InspectorTab = 'tile' | 'scenery' | 'doors' | 'npcs' | 'items'

export function WorldDrawer({
  isOpen,
  onToggleOpen,
  isPinned,
  onTogglePinned,
  camera,
  previewController,
  roofs,
  onRoofsChange,
  renderSettings,
  onRenderSettingsChange,
  plane,
  onPlaneChange,
  planeSectors,
  centreRef,
  centreExists,
  centreMembers,
  onGoTo,
  neighbours,
  tool,
  settings,
  onUpdateSettings,
  palette,
  thumbnail,
  area,
  clip,
  pasting,
  onCopyArea,
  onPasteArea,
  onTurnArea,
  onClearArea,
  lightingPanel,
  selected,
  selectedSectorExists,
  tileEditData,
  onTileChange,
  sceneryHere,
  doorsHere,
  npcsHere,
  itemsHere,
  tileFacing,
  onSetOnTile,
  showLayers,
  onUpdateLayers,
  layerLabels,
  onFixFacing,
  inspectorTab: controlledTab,
  onInspectorTabChange,
  dirty,
  onSave,
}: WorldDrawerProps) {
  const [openSections, setOpenSections] = useState<Record<AccordionSection, boolean>>({
    camera: true,
    navigation: false,
    tool: true,
    inspector: true,
    layers: false,
    integrity: false,
  })

  const [internalTab, setInternalTab] = useState<InspectorTab>('tile')
  const inspectorTab = controlledTab ?? internalTab
  const setInspectorTab = onInspectorTabChange ?? setInternalTab
  const [gotoInput, setGotoInput] = useState({ x: '', y: '' })

  const toggleSection = (section: AccordionSection) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  // Camera values
  const currentPitch = camera?.pitch ?? 912
  const currentYaw = camera?.yaw ?? 0
  const currentDistance = camera?.distance ?? 1500
  const yawDegrees = Math.round((currentYaw / 1024) * 360)

  return (
    <>
      {/* Top-Right Floating Pill Button (Exact OSRS.world style) */}
      <button
        type="button"
        onClick={onToggleOpen}
        title={isOpen ? 'Close Settings Panel' : 'Open Settings & Inspector'}
        className={cn(
          'pointer-events-auto absolute top-3 right-3 z-30 flex items-center gap-1.5 rounded-xl px-3 py-1.5 font-medium text-xs backdrop-blur-xl transition-all duration-200 active:scale-95 shadow-xl',
          isOpen
            ? 'bg-stone-900/90 text-stone-200 border border-white/20 hover:bg-stone-800'
            : 'bg-stone-950/80 text-stone-300 border border-white/10 hover:border-gold-500/60 hover:text-white',
        )}
      >
        <ChevronRight
          className={cn(
            'h-4 w-4 transition-transform duration-200',
            isOpen ? 'rotate-180 text-gold-400' : 'text-stone-400',
          )}
        />
        <GripVertical className="h-3.5 w-3.5 text-stone-500" />
        <span className="hidden sm:inline font-mono tracking-tight">Inspector</span>
        {dirty && (
          <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" title="Unsaved changes" />
        )}
      </button>

      {/* The Slide-Out Drawer Panel */}
      <aside
        className={cn(
          'fixed sm:absolute top-0 right-0 h-full w-[380px] max-w-[92vw] z-40 flex flex-col bg-[#0c0d12]/95 backdrop-blur-2xl border-l border-white/10 shadow-[-12px_0_40px_rgba(0,0,0,0.85)] transition-transform duration-300 ease-out select-none',
          isOpen ? 'translate-x-0' : 'translate-x-full pointer-events-none',
        )}
      >
        {/* Drawer Header */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/10 px-4 bg-white/2">
          <div className="flex items-center gap-2">
            <Sliders className="h-4 w-4 text-gold-400" />
            <span className="font-adventure text-xs uppercase tracking-wider text-stone-200">
              World Inspector
            </span>
            <span className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-stone-400">
              m{centreRef.plane}
              {String(centreRef.x).padStart(2, '0')}
              {String(centreRef.y).padStart(2, '0')}
              {centreMembers ? ' · members' : ''}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onTogglePinned}
              title={isPinned ? 'Unpin drawer (floating)' : 'Pin drawer to sidebar'}
              className={cn(
                'rounded-lg p-1.5 text-stone-400 hover:bg-white/5 hover:text-stone-200 transition-colors',
                isPinned && 'text-gold-400 bg-white/5',
              )}
            >
              {isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={onToggleOpen}
              title="Close panel"
              className="rounded-lg p-1.5 text-stone-400 hover:bg-white/5 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Accordions */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-2.5 custom-scrollbar text-xs">
          {/* 1. Camera & View Settings (Exact osrs.world controls) */}
          <div className="rounded-xl border border-white/10 bg-white/3 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('camera')}
              className="flex w-full items-center justify-between px-3 py-2 text-left font-medium text-stone-200 hover:bg-white/5 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Camera className="h-3.5 w-3.5 text-gold-400" />
                <span>Camera &amp; Render</span>
              </span>
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 text-stone-400 transition-transform duration-200',
                  openSections.camera && 'rotate-180',
                )}
              />
            </button>

            {openSections.camera && (
              <div className="p-3 pt-1 space-y-3 border-t border-white/5">
                {/* Distance / Zoom Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-stone-400 font-mono">
                    <span>Distance (Zoom)</span>
                    <span className="text-gold-400">{Math.round(currentDistance)}</span>
                  </div>
                  <input
                    type="range"
                    min={400}
                    max={DISTANCE_MAX}
                    step={50}
                    value={currentDistance}
                    onChange={(e) => previewController?.current?.setDistance(Number(e.target.value))}
                    className="w-full accent-gold-500 cursor-pointer"
                  />
                </div>

                {/* Pitch Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-stone-400 font-mono">
                    <span>Pitch</span>
                    <span className="text-gold-400">{Math.round(currentPitch)}</span>
                  </div>
                  <input
                    type="range"
                    min={780}
                    max={1010}
                    step={5}
                    value={currentPitch}
                    onChange={(e) => previewController?.current?.setPitch(Number(e.target.value))}
                    className="w-full accent-gold-500 cursor-pointer"
                  />
                </div>

                {/* Yaw / Orientation Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-stone-400 font-mono">
                    <span>Yaw</span>
                    <span className="text-gold-400">{yawDegrees}°</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1023}
                    step={16}
                    value={currentYaw}
                    onChange={(e) => previewController?.current?.setYaw(Number(e.target.value))}
                    className="w-full accent-gold-500 cursor-pointer"
                  />
                </div>

                {/* Roofs Toggle Switch */}
                <label className="flex items-center justify-between py-1 text-stone-300 cursor-pointer">
                  <span>Roofs &amp; Upper Floors</span>
                  <input
                    type="checkbox"
                    checked={roofs}
                    onChange={(e) => onRoofsChange(e.target.checked)}
                    className="accent-gold-500 h-4 w-4 rounded cursor-pointer"
                  />
                </label>

                {/* Draw Distance Slider */}
                <div className="space-y-1 border-t border-white/5 pt-3">
                  <div className="flex justify-between text-[11px] text-stone-400 font-mono">
                    <span>Draw distance</span>
                    <span className="text-gold-400">{renderSettings.drawDistance} tiles</span>
                  </div>
                  <input
                    type="range"
                    min={DRAW_DISTANCE_MIN}
                    max={DRAW_DISTANCE_MAX}
                    step={8}
                    value={renderSettings.drawDistance}
                    onChange={(e) => onRenderSettingsChange({ drawDistance: Number(e.target.value) })}
                    className="w-full accent-gold-500 cursor-pointer"
                  />
                </div>

                {/* Brightness Slider */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-stone-400 font-mono">
                    <span>Brightness</span>
                    <span className="text-gold-400">{Math.round(renderSettings.brightness * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0.6}
                    max={1.8}
                    step={0.05}
                    value={renderSettings.brightness}
                    onChange={(e) => onRenderSettingsChange({ brightness: Number(e.target.value) })}
                    className="w-full accent-gold-500 cursor-pointer"
                  />
                </div>

                {/* Sky & Resolution */}
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1">
                    <span className="block text-[11px] text-stone-400 font-mono">Sky</span>
                    <select
                      value={renderSettings.sky}
                      onChange={(e) =>
                        onRenderSettingsChange({ sky: e.target.value as RenderSettings['sky'] })
                      }
                      className="w-full rounded-md border border-white/10 bg-black/40 px-2 py-1 text-xs text-stone-200 focus:border-gold-500/60 focus:outline-none"
                    >
                      <option value="day">Day</option>
                      <option value="dusk">Dusk</option>
                      <option value="night">Night</option>
                      <option value="classic">Classic (black)</option>
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="block text-[11px] text-stone-400 font-mono">Resolution</span>
                    <select
                      value={renderSettings.resolution}
                      onChange={(e) => onRenderSettingsChange({ resolution: Number(e.target.value) })}
                      className="w-full rounded-md border border-white/10 bg-black/40 px-2 py-1 text-xs text-stone-200 focus:border-gold-500/60 focus:outline-none"
                    >
                      <option value={0.5}>50% (fast)</option>
                      <option value={0.75}>75%</option>
                      <option value={1}>Full</option>
                      <option value={1.5}>150% (sharp)</option>
                    </select>
                  </label>
                </div>

                {/* Fog Toggle */}
                <label className="flex items-center justify-between py-1 text-stone-300 cursor-pointer">
                  <span>Distance fog</span>
                  <input
                    type="checkbox"
                    checked={renderSettings.fog}
                    onChange={(e) => onRenderSettingsChange({ fog: e.target.checked })}
                    className="accent-gold-500 h-4 w-4 rounded cursor-pointer"
                  />
                </label>

                {/* HD ground and water */}
                <label className="flex items-center justify-between py-1 text-stone-300 cursor-pointer">
                  <span>Detailed ground and water</span>
                  <input
                    type="checkbox"
                    checked={renderSettings.ground}
                    onChange={(e) => onRenderSettingsChange({ ground: e.target.checked })}
                    className="accent-gold-500 h-4 w-4 rounded cursor-pointer"
                  />
                </label>

                {/* HD lighting: the sky setting's sun and its shadows */}
                <label className="flex items-center justify-between py-1 text-stone-300 cursor-pointer">
                  <span>Enhanced lighting</span>
                  <input
                    type="checkbox"
                    checked={renderSettings.lighting}
                    onChange={(e) => onRenderSettingsChange({ lighting: e.target.checked })}
                    className="accent-gold-500 h-4 w-4 rounded cursor-pointer"
                  />
                </label>
                {renderSettings.lighting && (
                  <label className="flex items-center justify-between gap-2 py-1 text-stone-300">
                    <span>Shadows</span>
                    <select
                      value={renderSettings.shadows}
                      onChange={(e) => onRenderSettingsChange({ shadows: Number(e.target.value) })}
                      className="rounded-md border border-white/10 bg-black/40 px-2 py-1 text-xs text-stone-200 focus:border-gold-500/60 focus:outline-none"
                    >
                      <option value={0}>Off</option>
                      <option value={1}>Low</option>
                      <option value={2}>Medium</option>
                      <option value={3}>High</option>
                    </select>
                  </label>
                )}
                {renderSettings.lighting && (
                  <label
                    className="flex items-center justify-between py-1 text-stone-300 cursor-pointer"
                    title="The light of the lighting area looked at, as the game has it there"
                  >
                    <span>Light from the place</span>
                    <input
                      type="checkbox"
                      checked={renderSettings.place}
                      onChange={(e) => onRenderSettingsChange({ place: e.target.checked })}
                      className="accent-gold-500 h-4 w-4 rounded cursor-pointer"
                    />
                  </label>
                )}
                {renderSettings.lighting && (
                  <label className="flex items-center justify-between py-1 text-stone-300 cursor-pointer">
                    <span>Water reflections</span>
                    <input
                      type="checkbox"
                      checked={renderSettings.reflections}
                      onChange={(e) => onRenderSettingsChange({ reflections: e.target.checked })}
                      className="accent-gold-500 h-4 w-4 rounded cursor-pointer"
                    />
                  </label>
                )}

                {/* the ground's colours blended across tiles, the season, the picture */}
                <label className="flex items-center justify-between py-1 text-stone-300 cursor-pointer">
                  <span>Blend ground colours</span>
                  <input
                    type="checkbox"
                    checked={renderSettings.groundBlend}
                    onChange={(e) => onRenderSettingsChange({ groundBlend: e.target.checked })}
                    className="accent-gold-500 h-4 w-4 rounded cursor-pointer"
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="space-y-1">
                    <span className="block text-[11px] text-stone-400 font-mono">Season</span>
                    <select
                      value={renderSettings.season}
                      onChange={(e) => onRenderSettingsChange({ season: Number(e.target.value) })}
                      className="w-full rounded-md border border-white/10 bg-black/40 px-2 py-1 text-xs text-stone-200 focus:border-gold-500/60 focus:outline-none"
                    >
                      <option value={0}>None</option>
                      <option value={1}>Winter</option>
                      <option value={2}>Autumn</option>
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="block text-[11px] text-stone-400 font-mono">Tone mapping</span>
                    <select
                      value={renderSettings.toneMapping}
                      onChange={(e) => onRenderSettingsChange({ toneMapping: Number(e.target.value) })}
                      className="w-full rounded-md border border-white/10 bg-black/40 px-2 py-1 text-xs text-stone-200 focus:border-gold-500/60 focus:outline-none"
                    >
                      <option value={0}>Off</option>
                      <option value={1}>Soft</option>
                      <option value={2}>ACES</option>
                    </select>
                  </label>
                </div>
                <label className="flex items-center justify-between py-1 text-stone-300 cursor-pointer">
                  <span>Bloom</span>
                  <input
                    type="checkbox"
                    checked={renderSettings.bloom > 0}
                    onChange={(e) => onRenderSettingsChange({ bloom: e.target.checked ? 0.6 : 0 })}
                    className="accent-gold-500 h-4 w-4 rounded cursor-pointer"
                  />
                </label>

                {/* Quick Camera Buttons */}
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => previewController?.current?.resetNorth()}
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 py-1.5 text-center font-medium text-stone-300 hover:border-gold-500/60 hover:text-white transition-all text-xs"
                  >
                    Snap North
                  </button>
                  <button
                    type="button"
                    onClick={() => previewController?.current?.resetView()}
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 py-1.5 text-center font-medium text-stone-300 hover:border-gold-500/60 hover:text-white transition-all text-xs"
                  >
                    Reset View
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 2. Navigation & Teleport */}
          <div className="rounded-xl border border-white/10 bg-white/3 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('navigation')}
              className="flex w-full items-center justify-between px-3 py-2 text-left font-medium text-stone-200 hover:bg-white/5 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Navigation className="h-3.5 w-3.5 text-gold-400" />
                <span>Navigation &amp; Teleport</span>
              </span>
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 text-stone-400 transition-transform duration-200',
                  openSections.navigation && 'rotate-180',
                )}
              />
            </button>

            {openSections.navigation && (
              <div className="p-3 pt-1 space-y-3 border-t border-white/5">
                {/* Plane Level Switcher */}
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-stone-400">
                    Plane / Height
                  </span>
                  <div className="grid grid-cols-4 gap-1">
                    {[0, 1, 2, 3].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => onPlaneChange(p)}
                        className={cn(
                          'rounded-lg py-1 text-center font-mono text-xs transition-all',
                          plane === p
                            ? 'bg-gold-500 text-stone-950 font-bold shadow-sm'
                            : 'bg-white/5 text-stone-400 hover:bg-white/10 hover:text-stone-200',
                        )}
                      >
                        {planeLabel(p)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sector Jump Dropdown */}
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-stone-400">
                    Jump to Sector
                  </span>
                  <select
                    className="w-full rounded-lg border border-white/10 bg-stone-900 px-2 py-1.5 text-xs text-stone-200 focus:border-gold-500 focus:outline-none"
                    value={centreExists ? `${centreRef.x},${centreRef.y}` : ''}
                    onChange={(e) => {
                      const [x, y] = e.target.value.split(',').map(Number)
                      const targetX = (x - MIN_REGION_X) * SECTOR_SIZE + SECTOR_SIZE / 2
                      const targetY =
                        (y - MIN_REGION_Y) * SECTOR_SIZE + SECTOR_SIZE / 2 + plane * PLANE_HEIGHT
                      onGoTo({ x: targetX, y: targetY })
                    }}
                  >
                    {!centreExists && <option value="">— open sea —</option>}
                    {planeSectors.map((s) => {
                      const minX = (s.x - MIN_REGION_X) * SECTOR_SIZE
                      const minY = (s.y - MIN_REGION_Y) * SECTOR_SIZE + s.plane * PLANE_HEIGHT
                      return (
                        <option key={s.name} value={`${s.x},${s.y}`}>
                          {s.x},{s.y} · game {minX}–{minX + 47}, {minY}–{minY + 47}
                          {s.members ? ' (members)' : ''}
                        </option>
                      )
                    })}
                  </select>
                </div>

                {/* Cardinal Nudge Buttons */}
                <div className="flex items-center justify-between gap-1 pt-1">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-stone-400">
                    Nudge
                  </span>
                  <div className="flex gap-1">
                    {neighbours.map((n) => (
                      <button
                        key={n.label}
                        type="button"
                        title={`Move ${n.title}`}
                        onClick={() =>
                          onGoTo({
                            x: (centreRef.x - MIN_REGION_X + n.dx) * SECTOR_SIZE + 24,
                            y:
                              (centreRef.y - MIN_REGION_Y + n.dy) * SECTOR_SIZE +
                              24 +
                              plane * PLANE_HEIGHT,
                          })
                        }
                        className="h-7 w-7 rounded-lg border border-white/10 bg-white/5 font-mono text-xs text-stone-300 hover:border-gold-500 hover:text-white transition-all active:scale-95"
                      >
                        {n.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Coordinate Form */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault()
                    const x = Number.parseInt(gotoInput.x, 10)
                    const y = Number.parseInt(gotoInput.y, 10)
                    if (Number.isFinite(x) && Number.isFinite(y)) {
                      onGoTo({ x, y })
                    }
                  }}
                  className="space-y-1 pt-1"
                >
                  <span className="text-[10px] uppercase font-mono tracking-wider text-stone-400">
                    Exact Coordinates
                  </span>
                  <div className="flex gap-1.5">
                    <input
                      type="number"
                      placeholder="X"
                      value={gotoInput.x}
                      onChange={(e) => setGotoInput((g) => ({ ...g, x: e.target.value }))}
                      className="w-1/2 rounded-lg border border-white/10 bg-stone-900 px-2 py-1 text-xs text-stone-200 font-mono focus:border-gold-500 focus:outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Y"
                      value={gotoInput.y}
                      onChange={(e) => setGotoInput((g) => ({ ...g, y: e.target.value }))}
                      className="w-1/2 rounded-lg border border-white/10 bg-stone-900 px-2 py-1 text-xs text-stone-200 font-mono focus:border-gold-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="rounded-lg bg-gold-500 px-3 py-1 font-semibold text-stone-950 hover:bg-gold-400 transition-colors"
                    >
                      Go
                    </button>
                  </div>
                </form>

                {/* Landmark Presets */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] uppercase font-mono tracking-wider text-stone-400">
                    Iconic Landmarks
                  </span>
                  <div className="grid grid-cols-2 gap-1 max-h-36 overflow-y-auto pr-1">
                    {LANDMARK_PRESETS.map((landmark) => (
                      <button
                        key={landmark.name}
                        type="button"
                        onClick={() => {
                          if (landmark.plane !== plane) {
                            onPlaneChange(landmark.plane)
                          }
                          onGoTo({ x: landmark.x, y: landmark.y })
                        }}
                        className="rounded border border-white/5 bg-white/3 px-2 py-1 text-left text-[11px] text-stone-300 hover:border-gold-500/50 hover:text-white transition-all truncate"
                      >
                        {landmark.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. Active Tool Settings */}
          <div className="rounded-xl border border-white/10 bg-white/3 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('tool')}
              className="flex w-full items-center justify-between px-3 py-2 text-left font-medium text-stone-200 hover:bg-white/5 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Wrench className="h-3.5 w-3.5 text-gold-400" />
                <span className="capitalize">Tool: {tool}</span>
              </span>
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 text-stone-400 transition-transform duration-200',
                  openSections.tool && 'rotate-180',
                )}
              />
            </button>

            {openSections.tool && (
              <div className="p-3 pt-1 border-t border-white/5">
                <ToolPanel
                  tool={tool}
                  settings={settings}
                  update={onUpdateSettings}
                  palette={palette}
                  thumbnail={thumbnail}
                  area={area}
                  clip={clip}
                  pasting={pasting}
                  onCopy={onCopyArea}
                  onPaste={onPasteArea}
                  onTurn={onTurnArea}
                  onClearArea={onClearArea}
                  lighting={lightingPanel}
                />
              </div>
            )}
          </div>

          {/* 4. Selected Tile Inspector */}
          <div className="rounded-xl border border-white/10 bg-white/3 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('inspector')}
              className="flex w-full items-center justify-between px-3 py-2 text-left font-medium text-stone-200 hover:bg-white/5 transition-colors"
            >
              <span className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-gold-400" />
                <span>
                  Tile Inspector{' '}
                  {selected && (
                    <span className="text-gold-400 font-mono">
                      ({selected.x}, {selected.y})
                    </span>
                  )}
                </span>
              </span>
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 text-stone-400 transition-transform duration-200',
                  openSections.inspector && 'rotate-180',
                )}
              />
            </button>

            {openSections.inspector && (
              <div className="p-3 pt-1 border-t border-white/5 space-y-3">
                {!selected ? (
                  <p className="text-xs text-stone-400 py-3 text-center">
                    Click any tile or scenery on the 3D scene or 2D grid to inspect its properties.
                  </p>
                ) : !selectedSectorExists ? (
                  <p className="text-xs text-stone-400 py-3 text-center">
                    Nothing is built at {selected.x}, {selected.y}.
                  </p>
                ) : (
                  <>
                    {/* Tab Bar */}
                    <div className="flex border-b border-white/10 text-xs">
                      {(
                        [
                          ['tile', 'Tile'],
                          ['scenery', `Scenery (${sceneryHere.length})`],
                          ['doors', `Doors (${doorsHere.length})`],
                          ['npcs', `NPCs (${npcsHere.length})`],
                          ['items', `Items (${itemsHere.length})`],
                        ] as const
                      ).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setInspectorTab(value)}
                          className={cn(
                            'flex-1 pb-1.5 text-center font-medium border-b-2 transition-colors text-[11px]',
                            inspectorTab === value
                              ? 'border-gold-500 text-gold-400'
                              : 'border-transparent text-stone-400 hover:text-stone-200',
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {/* Active Inspector Tab Content */}
                    <div className="pt-1">
                      {inspectorTab === 'tile' && tileEditData && (
                        <TileInspector
                          tile={tileEditData}
                          palette={palette}
                          sector={centreRef}
                          onChange={onTileChange}
                        />
                      )}

                      {inspectorTab === 'scenery' && (
                        <ObjectList
                          kind="scenery"
                          names={palette.objects}
                          entries={sceneryHere}
                          at={selected}
                          tileFacing={tileFacing}
                          onChange={(next) => onSetOnTile('objects', next)}
                        />
                      )}

                      {inspectorTab === 'doors' && (
                        <ObjectList
                          kind="doors"
                          names={palette.wallObjects}
                          entries={doorsHere}
                          at={selected}
                          onChange={(next) => onSetOnTile('wallObjects', next)}
                        />
                      )}

                      {inspectorTab === 'npcs' && (
                        <NpcList
                          names={palette.npcs}
                          entries={npcsHere}
                          onChange={(next) => onSetOnTile('npcs', next)}
                        />
                      )}

                      {inspectorTab === 'items' && (
                        <ItemList
                          names={palette.items}
                          entries={itemsHere}
                          onChange={(next) => onSetOnTile('items', next)}
                        />
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>

          {/* 5. Layers & Visibility */}
          <div className="rounded-xl border border-white/10 bg-white/3 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('layers')}
              className="flex w-full items-center justify-between px-3 py-2 text-left font-medium text-stone-200 hover:bg-white/5 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Layers className="h-3.5 w-3.5 text-gold-400" />
                <span>Layers &amp; Overlays</span>
              </span>
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 text-stone-400 transition-transform duration-200',
                  openSections.layers && 'rotate-180',
                )}
              />
            </button>

            {openSections.layers && (
              <div className="p-3 pt-1 border-t border-white/5 grid grid-cols-2 gap-2">
                {layerLabels.map(([layer, label]) => (
                  <label
                    key={layer}
                    className="flex items-center gap-2 text-stone-300 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={showLayers[layer]}
                      onChange={(e) =>
                        onUpdateLayers((prev) => ({ ...prev, [layer]: e.target.checked }))
                      }
                      className="accent-gold-500 rounded h-3.5 w-3.5 cursor-pointer"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* 6. Map Rules Checker */}
          <div className="rounded-xl border border-white/10 bg-white/3 overflow-hidden">
            <button
              type="button"
              onClick={() => toggleSection('integrity')}
              className="flex w-full items-center justify-between px-3 py-2 text-left font-medium text-stone-200 hover:bg-white/5 transition-colors"
            >
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-gold-400" />
                <span>Map Rules Checker</span>
              </span>
              <ChevronDown
                className={cn(
                  'h-3.5 w-3.5 text-stone-400 transition-transform duration-200',
                  openSections.integrity && 'rotate-180',
                )}
              />
            </button>

            {openSections.integrity && (
              <div className="p-3 pt-1 border-t border-white/5">
                <CheckPanel onGo={onGoTo} onFixFacing={onFixFacing} />
              </div>
            )}
          </div>
        </div>

        {/* Drawer Footer with Quick Save */}
        <div className="shrink-0 border-t border-white/10 p-3 bg-white/2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-stone-400">
            {dirty ? (
              <span className="text-amber-400 flex items-center gap-1 font-mono">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                Unsaved changes
              </span>
            ) : (
              <span className="text-stone-500 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                All changes saved
              </span>
            )}
          </div>

          <button
            type="button"
            disabled={!dirty}
            onClick={onSave}
            className={cn(
              'rounded-lg px-4 py-1.5 font-semibold text-xs transition-all active:scale-95',
              dirty
                ? 'bg-gradient-to-r from-gold-500 to-amber-500 text-stone-950 shadow-md hover:brightness-110'
                : 'bg-white/5 text-stone-500 opacity-50 cursor-not-allowed',
            )}
          >
            Save All
          </button>
        </div>
      </aside>
    </>
  )
}
