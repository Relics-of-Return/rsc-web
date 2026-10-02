'use client'

import {
  Box,
  Crop,
  Home,
  Layers,
  Maximize2,
  Minimize2,
  Minus,
  Mountain,
  Package,
  Paintbrush,
  Plus,
  Redo2,
  Save,
  Sparkles,
  SplitSquareVertical,
  Sun,
  Trash2,
  Undo2,
  Users,
  View,
} from 'lucide-react'

import { TOOLS, type Tool, type ToolSettings } from '@/components/world-map/tools'
import { cn } from '@/lib/utils'

export type ViewLayoutMode = '3d' | 'split' | '2d'

interface WorldToolbarProps {
  tool: Tool
  onSelectTool: (tool: Tool) => void
  settings: ToolSettings
  onUpdateSettings: (patch: Partial<ToolSettings>) => void
  viewMode: ViewLayoutMode
  onViewModeChange: (mode: ViewLayoutMode) => void
  isFullscreen: boolean
  onToggleFullscreen: () => void
  canUndo: number
  canRedo: number
  onUndo: () => void
  onRedo: () => void
  dirty: boolean
  unsavedCount: number
  busy: string | null
  onSave: () => void
  onDiscard: () => void
  className?: string
}

const TOOL_ICONS: Record<Tool, React.ComponentType<{ className?: string }>> = {
  objects: Box,
  height: Mountain,
  underlay: Paintbrush,
  overlay: Sparkles,
  walls: Layers,
  roofs: Home,
  npcs: Users,
  items: Package,
  area: Crop,
  lighting: Sun,
}

export function WorldToolbar({
  tool,
  onSelectTool,
  settings,
  onUpdateSettings,
  viewMode,
  onViewModeChange,
  isFullscreen,
  onToggleFullscreen,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  dirty,
  unsavedCount,
  busy,
  onSave,
  onDiscard,
  className,
}: WorldToolbarProps) {
  const showBrushControls = ['height', 'underlay', 'overlay'].includes(tool)

  return (
    <div
      className={cn(
        'pointer-events-auto flex flex-wrap items-center gap-1.5 rounded-2xl bg-stone-950/90 p-1.5 backdrop-blur-xl border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.8)]',
        className,
      )}
    >
      {/* 1-9 and 0 Tool Selector Buttons */}
      <div className="flex items-center gap-1" role="toolbar" aria-label="Editor Tools">
        {TOOLS.map((t) => {
          const Icon = TOOL_ICONS[t.id] ?? Box
          const isActive = tool === t.id

          return (
            <button
              key={t.id}
              type="button"
              title={`${t.label} (Press ${t.key} or F${t.key === '0' ? '10' : t.key}) — ${t.hint}`}
              onClick={() => onSelectTool(t.id)}
              className={cn(
                'group relative flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-medium transition-all duration-150 active:scale-95',
                isActive
                  ? 'bg-gradient-to-r from-gold-500 to-amber-500 text-stone-950 shadow-[0_0_12px_rgba(232,191,74,0.4)]'
                  : 'text-stone-400 hover:bg-white/5 hover:text-stone-100',
              )}
            >
              <Icon
                className={cn(
                  'h-3.5 w-3.5',
                  isActive ? 'text-stone-950' : 'text-stone-400 group-hover:text-gold-400',
                )}
              />
              <span className="hidden md:inline">{t.label}</span>
              <span
                className={cn(
                  'rounded px-1 text-[10px] font-mono leading-none',
                  isActive ? 'bg-stone-950/20 text-stone-950' : 'bg-white/5 text-stone-500',
                )}
              >
                {t.key}
              </span>
            </button>
          )
        })}
      </div>

      {/* Quick Brush Size Controls (when applicable) */}
      {showBrushControls && (
        <>
          <div className="h-5 w-px bg-white/10 mx-0.5" />
          <div className="flex items-center gap-1 bg-white/5 rounded-xl px-2 py-0.5">
            <span className="text-[10px] uppercase font-mono tracking-wider text-stone-400 mr-1">
              Brush
            </span>
            <button
              type="button"
              title="Decrease brush size ([)"
              disabled={settings.size <= 1}
              onClick={() => onUpdateSettings({ size: Math.max(1, settings.size - 1) })}
              className="flex h-5 w-5 items-center justify-center rounded text-stone-300 hover:bg-white/10 disabled:opacity-30"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="min-w-6 text-center font-mono text-xs text-gold-300">
              {settings.size}
            </span>
            <button
              type="button"
              title="Increase brush size (])"
              disabled={settings.size >= 10}
              onClick={() => onUpdateSettings({ size: Math.min(10, settings.size + 1) })}
              className="flex h-5 w-5 items-center justify-center rounded text-stone-300 hover:bg-white/10 disabled:opacity-30"
            >
              <Plus className="h-3 w-3" />
            </button>
            <button
              type="button"
              title={settings.round ? 'Round brush (click for square)' : 'Square brush (click for round)'}
              onClick={() => onUpdateSettings({ round: !settings.round })}
              className={cn(
                'ml-1 h-4 w-4 border border-stone-600 hover:border-gold-400 transition-colors',
                settings.round ? 'rounded-full' : 'rounded-none',
              )}
            />
          </div>
        </>
      )}

      <div className="h-5 w-px bg-white/10 mx-0.5" />

      {/* History (Undo / Redo) */}
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          disabled={!canUndo}
          onClick={onUndo}
          title={`Undo (Ctrl+Z)${canUndo ? ` · ${canUndo} left` : ''}`}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 hover:bg-white/10 hover:text-stone-200 disabled:opacity-30 transition-all active:scale-95"
        >
          <Undo2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          disabled={!canRedo}
          onClick={onRedo}
          title={`Redo (Ctrl+Y)${canRedo ? ` · ${canRedo} left` : ''}`}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 hover:bg-white/10 hover:text-stone-200 disabled:opacity-30 transition-all active:scale-95"
        >
          <Redo2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="h-5 w-px bg-white/10 mx-0.5" />

      {/* Discard & Save Actions */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={!dirty || busy !== null}
          onClick={onDiscard}
          title="Discard all unsaved changes in this session"
          className="flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs text-stone-400 hover:bg-red-950/40 hover:text-red-300 disabled:opacity-30 transition-all"
        >
          <Trash2 className="h-3 w-3" />
          <span className="hidden sm:inline">Discard</span>
        </button>

        <button
          type="button"
          disabled={!dirty || busy !== null}
          onClick={onSave}
          title="Save all sector modifications"
          className={cn(
            'relative flex items-center gap-1.5 rounded-xl px-3 py-1 text-xs font-semibold transition-all active:scale-95',
            dirty
              ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-stone-950 shadow-[0_0_12px_rgba(16,185,129,0.4)] hover:brightness-110'
              : 'bg-white/5 text-stone-500 disabled:opacity-40',
          )}
        >
          <Save className="h-3.5 w-3.5" />
          <span>{busy === 'saving' ? 'Saving…' : 'Save'}</span>
          {dirty && unsavedCount > 0 && (
            <span className="rounded-full bg-stone-950/30 px-1.5 py-0.2 text-[10px] font-mono">
              {unsavedCount}
            </span>
          )}
        </button>
      </div>

      <div className="h-5 w-px bg-white/10 mx-0.5" />

      {/* View Mode Switcher (3D / Split / 2D) */}
      <div className="flex items-center rounded-xl bg-white/5 p-0.5">
        <button
          type="button"
          onClick={() => onViewModeChange('3d')}
          title="3D View (Hero 3D view like osrs.world)"
          className={cn(
            'flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-all',
            viewMode === '3d'
              ? 'bg-gold-500 text-stone-950 font-medium shadow-sm'
              : 'text-stone-400 hover:text-white',
          )}
        >
          <View className="h-3.5 w-3.5" />
          <span className="hidden lg:inline">3D</span>
        </button>

        <button
          type="button"
          onClick={() => onViewModeChange('split')}
          title="Split View (Side-by-side 3D and 2D canvas)"
          className={cn(
            'flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-all',
            viewMode === 'split'
              ? 'bg-gold-500 text-stone-950 font-medium shadow-sm'
              : 'text-stone-400 hover:text-white',
          )}
        >
          <SplitSquareVertical className="h-3.5 w-3.5" />
          <span className="hidden lg:inline">Split</span>
        </button>

        <button
          type="button"
          onClick={() => onViewModeChange('2d')}
          title="2D Map Grid (Maximized tile canvas)"
          className={cn(
            'flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition-all',
            viewMode === '2d'
              ? 'bg-gold-500 text-stone-950 font-medium shadow-sm'
              : 'text-stone-400 hover:text-white',
          )}
        >
          <Layers className="h-3.5 w-3.5" />
          <span className="hidden lg:inline">2D</span>
        </button>
      </div>

      {/* Fullscreen / Studio Mode Toggle */}
      <button
        type="button"
        onClick={onToggleFullscreen}
        title={isFullscreen ? 'Exit Fullscreen (Esc)' : 'Enter Fullscreen Studio (F11)'}
        className="flex h-7 w-7 items-center justify-center rounded-xl text-stone-400 hover:bg-white/10 hover:text-gold-300 transition-all active:scale-95"
      >
        {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
      </button>
    </div>
  )
}
