'use client'

import { useMemo } from 'react'

import { Catalog } from '@/components/world-map/Catalog'
import type { HeightAction, Tool, ToolSettings } from '@/components/world-map/tools'
import type { LandscapePalette } from '@/lib/landscape/types'
import { cn } from '@/lib/utils'

/**
 * The settings of the tool in hand: brush size and strength, the colour,
 * overlay, wall or roof it lays down, and the catalogs to pick scenery,
 * doors, NPCs and items from.
 */

const LABEL = 'text-[11px] uppercase tracking-wide text-text-secondary'
const NOTE = 'text-[11px] leading-relaxed text-text-secondary/80'

const HEIGHT_ACTIONS: { id: HeightAction; label: string }[] = [
  { id: 'raise', label: 'Raise' },
  { id: 'lower', label: 'Lower' },
  { id: 'set', label: 'Set' },
  { id: 'smooth', label: 'Smooth' },
  { id: 'flatten', label: 'Flatten' },
]

const FACINGS = ['0 · east side', '1', '2 · south side', '3', '4 · west side', '5', '6 · north side', '7']

interface ToolPanelProps {
  tool: Tool
  settings: ToolSettings
  update: (patch: Partial<ToolSettings>) => void
  palette: LandscapePalette
  thumbnail: ((kind: 'object' | 'door', id: number) => string | null) | null
  /** Area tool: what is selected and on the clipboard. */
  area: { width: number; height: number } | null
  clip: { width: number; height: number } | null
  pasting: boolean
  onCopy: () => void
  onPaste: () => void
  onTurn: (how: 'rotate' | 'mirror' | 'flip') => void
  onClearArea: () => void
  /** The lighting tool's panel (LightingPanel), made by the editor. */
  lighting?: React.ReactNode
}

function Choice<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[]
  value: T
  onChange: (id: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((option) => (
        <button
          key={String(option.id)}
          type="button"
          aria-pressed={value === option.id}
          onClick={() => onChange(option.id)}
          className={cn(
            'rounded border px-2 py-0.5 text-xs',
            value === option.id
              ? 'border-gold-500 bg-gold-500 text-stone-950'
              : 'border-stone-700 text-text-secondary hover:text-text-primary',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  shown,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  shown?: string
  onChange: (value: number) => void
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-text-secondary">
      <span className="w-16 shrink-0">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="min-w-0 flex-1 accent-gold-500"
      />
      <span className="w-12 text-right text-text-primary">{shown ?? value}</span>
    </label>
  )
}

function Brush({ settings, update }: Pick<ToolPanelProps, 'settings' | 'update'>) {
  return (
    <div className="space-y-1.5">
      <Slider
        label="Size"
        value={settings.size}
        min={1}
        max={10}
        shown={`${settings.size}×${settings.size}`}
        onChange={(size) => update({ size })}
      />
      <label className="flex items-center gap-2 text-xs text-text-secondary">
        <input
          type="checkbox"
          className="accent-gold-500"
          checked={settings.round}
          onChange={(e) => update({ round: e.target.checked })}
        />
        Round brush
      </label>
    </div>
  )
}

export function ToolPanel(props: ToolPanelProps) {
  const { tool, settings, update, palette, thumbnail } = props

  // the ground colours come in pairs - only even ones can be stored
  const colours = useMemo(
    () => palette.terrain.map((css, id) => ({ id, css })).filter(({ id }) => id % 2 === 0),
    [palette],
  )

  const objectThumb = useMemo(
    () => (thumbnail ? (id: number) => thumbnail('object', id) : null),
    [thumbnail],
  )
  const doorThumb = useMemo(
    () => (thumbnail ? (id: number) => thumbnail('door', id) : null),
    [thumbnail],
  )

  switch (tool) {
    case 'objects':
      return (
        <div className="space-y-2">
          <Choice
            options={[
              { id: 'object', label: 'Scenery' },
              { id: 'door', label: 'Doors' },
            ]}
            value={settings.placeKind}
            onChange={(placeKind) => update({ placeKind })}
          />

          {settings.placeKind === 'object' ? (
            <>
              <Catalog
                label="scenery"
                names={palette.objects}
                selected={settings.objectId}
                onPick={(objectId) => update({ objectId })}
                thumbnail={objectThumb}
              />
              <label className="block space-y-1">
                <span className={LABEL}>Facing (R turns it)</span>
                <select
                  className="w-full rounded border border-stone-700 bg-stone-900 px-2 py-1 text-sm text-text-primary"
                  value={settings.facing}
                  onChange={(e) => update({ facing: Number(e.target.value) })}
                >
                  {FACINGS.map((label, facing) => (
                    <option key={facing} value={facing}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </>
          ) : (
            <Catalog
              label="doors"
              names={palette.wallObjects}
              selected={settings.doorId}
              onPick={(doorId) => update({ doorId })}
              thumbnail={doorThumb}
            />
          )}

          <p className={NOTE}>
            {(settings.placeKind === 'object' ? settings.objectId : settings.doorId) === null
              ? 'Click the map to select a tile. Pick something above to put it down instead.'
              : settings.placeKind === 'object'
                ? 'Click or drag across the map to put it down; it replaces the scenery on each tile. Esc goes back to selecting; Delete clears the selected tile.'
                : 'Click a tile edge to hang the door there; Shift for the diagonals. Esc goes back to selecting.'}
          </p>
        </div>
      )

    case 'height':
      return (
        <div className="space-y-2">
          <Choice
            options={HEIGHT_ACTIONS}
            value={settings.heightAction}
            onChange={(heightAction) => update({ heightAction })}
          />
          <Brush settings={settings} update={update} />
          {settings.heightAction === 'set' ? (
            <Slider
              label="Height"
              value={settings.height}
              min={0}
              max={254}
              step={2}
              onChange={(height) => update({ height })}
            />
          ) : (
            <Slider
              label="Strength"
              value={settings.strength}
              min={1}
              max={10}
              onChange={(strength) => update({ strength })}
            />
          )}
          <p className={NOTE}>
            Hold the button to keep raising or lowering. Flatten levels to the
            height where the stroke began. H or Alt+click takes the height
            under the pointer for the set brush. The map shades by height
            while this tool is in hand.
          </p>
        </div>
      )

    case 'underlay':
      return (
        <div className="space-y-2">
          <Brush settings={settings} update={update} />
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <span
              className="h-6 w-6 rounded border border-stone-600"
              style={{ background: palette.terrain[settings.colour] }}
            />
            Colour {settings.colour}
          </div>
          <div className="grid grid-cols-16 gap-px" role="listbox" aria-label="Ground colours">
            {colours.map(({ id, css }) => (
              <button
                key={id}
                type="button"
                role="option"
                aria-selected={settings.colour === id}
                title={`Colour ${id}`}
                onClick={() => update({ colour: id })}
                className={cn(
                  'aspect-square w-full',
                  settings.colour === id && 'ring-2 ring-white ring-offset-1 ring-offset-stone-900',
                )}
                style={{ background: css }}
              />
            ))}
          </div>
          <p className={NOTE}>
            The ground under any overlay; overlays are hidden while this tool
            is in hand. Alt+click takes the colour under the pointer.
          </p>
        </div>
      )

    case 'overlay':
      return (
        <div className="space-y-2">
          <Brush settings={settings} update={update} />
          <div className="grid grid-cols-2 gap-1" role="listbox" aria-label="Overlays">
            {[
              { id: 0, name: 'none — plain ground', colour: 'transparent', blocked: false },
              ...Object.entries(palette.overlays).map(([id, overlay]) => ({ id: Number(id), ...overlay })),
            ].map((overlay) => (
              <button
                key={overlay.id}
                type="button"
                role="option"
                aria-selected={settings.overlay === overlay.id}
                onClick={() => update({ overlay: overlay.id })}
                className={cn(
                  'flex items-center gap-1.5 rounded border px-1.5 py-1 text-left text-[11px]',
                  settings.overlay === overlay.id
                    ? 'border-gold-500 text-gold-400'
                    : 'border-stone-800 text-text-secondary hover:text-text-primary',
                )}
              >
                <span
                  className="h-3.5 w-3.5 shrink-0 rounded-sm border border-stone-600"
                  style={{ background: overlay.colour }}
                />
                <span className="truncate">
                  {overlay.name.replace(/_/g, ' ')}
                  {overlay.blocked ? ' ⛔' : ''}
                </span>
              </button>
            ))}
          </div>
          <p className={NOTE}>⛔ blocks movement. Alt+click takes the overlay under the pointer.</p>
        </div>
      )

    case 'walls':
      return (
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-xs text-text-secondary">
            <input
              type="checkbox"
              className="accent-gold-500"
              checked={settings.erase}
              onChange={(e) => update({ erase: e.target.checked })}
            />
            Erase walls
          </label>
          {!settings.erase && (
            <Catalog
              label="walls"
              names={palette.wallObjects}
              selected={settings.wall}
              onPick={(wall) => update({ wall: wall ?? 0 })}
              thumbnail={doorThumb}
            />
          )}
          <p className={NOTE}>
            Click near a tile edge to put a wall on it, or drag along a line.
            Hold Shift for the diagonals. Alt+click takes the wall under the
            pointer.
          </p>
        </div>
      )

    case 'roofs':
      return (
        <div className="space-y-2">
          <Brush settings={settings} update={update} />
          <label className="flex items-center gap-2 text-xs text-text-secondary">
            <input
              type="checkbox"
              className="accent-gold-500"
              checked={settings.erase}
              onChange={(e) => update({ erase: e.target.checked })}
            />
            Erase roofs
          </label>
          {!settings.erase && (
            <Choice
              options={palette.roofs.map((roof) => ({ id: roof.id, label: roof.name }))}
              value={settings.roof}
              onChange={(roof) => update({ roof })}
            />
          )}
          <p className={NOTE}>
            Paint the tiles a building covers; the game builds the roof over
            them, sloping from the edges. Roofed tiles are tinted purple.
          </p>
        </div>
      )

    case 'npcs':
      return (
        <div className="space-y-2">
          <Catalog
            label="NPCs"
            names={palette.npcs}
            selected={settings.npcId}
            onPick={(npcId) => update({ npcId })}
          />
          <Slider
            label="Wanders"
            value={settings.wander}
            min={0}
            max={20}
            shown={`±${settings.wander}`}
            onChange={(wander) => update({ wander })}
          />
          <p className={NOTE}>
            {settings.npcId === null
              ? 'Pick an NPC, then click the map to spawn it there. Click a tile to see the spawns on it.'
              : 'Click the map to spawn it, wandering a box this far each way.'}
          </p>
        </div>
      )

    case 'items':
      return (
        <div className="space-y-2">
          <Catalog
            label="items"
            names={palette.items}
            selected={settings.itemId}
            onPick={(itemId) => update({ itemId })}
          />
          <Slider
            label="Amount"
            value={settings.amount}
            min={1}
            max={100}
            onChange={(amount) => update({ amount })}
          />
          <Slider
            label="Respawn"
            value={settings.respawn}
            min={5}
            max={600}
            step={5}
            shown={`${settings.respawn}s`}
            onChange={(respawn) => update({ respawn })}
          />
          <p className={NOTE}>
            {settings.itemId === null
              ? 'Pick an item, then click the map to leave it there.'
              : 'Click the map to leave it there.'}
          </p>
        </div>
      )

    case 'area':
      return (
        <div className="space-y-2">
          <p className={NOTE}>
            Drag across the map to select. Ctrl+C copies, Ctrl+V picks the
            copy up to put down: R turns it, M mirrors it west to east, F flips
            it north to south, a click sets it down, Esc lets go.
          </p>
          <p className="text-xs text-text-secondary">
            {props.area ? `Selected ${props.area.width}×${props.area.height}` : 'Nothing selected'}
            {props.clip ? ` · copied ${props.clip.width}×${props.clip.height}` : ''}
          </p>
          <div className="flex flex-wrap gap-1">
            {(
              [
                ['Copy', props.onCopy, !props.area],
                ['Paste', props.onPaste, !props.clip],
                ['Turn', () => props.onTurn('rotate'), !props.pasting],
                ['Mirror', () => props.onTurn('mirror'), !props.pasting],
                ['Flip', () => props.onTurn('flip'), !props.pasting],
                ['Clear spawns', props.onClearArea, !props.area],
              ] as const
            ).map(([label, action, disabled]) => (
              <button
                key={label}
                type="button"
                disabled={disabled}
                onClick={action}
                className="rounded border border-stone-700 px-2 py-0.5 text-xs text-text-secondary hover:text-text-primary disabled:opacity-40"
              >
                {label}
              </button>
            ))}
          </div>
          <fieldset className="space-y-1 text-xs text-text-secondary">
            <legend className={LABEL}>A paste writes</legend>
            {(
              [
                ['heights', 'heights'],
                ['ground', 'ground colour and overlays'],
                ['walls', 'walls and roofs'],
                ['spawns', 'scenery, doors, NPCs and items'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="accent-gold-500"
                  checked={settings.paste[key]}
                  onChange={(e) => update({ paste: { ...settings.paste, [key]: e.target.checked } })}
                />
                {label}
              </label>
            ))}
          </fieldset>
        </div>
      )

    case 'lighting':
      return <>{props.lighting ?? null}</>
  }
}
