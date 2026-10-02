'use client'

import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'

import type { LightingAreas } from '@/components/world-map/useLightingAreas'
import { planesOf, rectOf, type LightingArea, type Rgb } from '@/lib/landscape/lighting'
import { cn } from '@/lib/utils'

/**
 * The lighting tool's panel: HD graphics' lighting areas (the Wilderness's
 * red haze, the desert's glare, the dark underground), in the order the
 * game tries them, and the selected one's light. Dragging on the map draws
 * the selected area's rectangle.
 */

const LABEL = 'text-[11px] uppercase tracking-wide text-text-secondary'
const NOTE = 'text-[11px] leading-relaxed text-text-secondary/80'
const INPUT =
  'w-full min-w-0 rounded border border-stone-700 bg-stone-900 px-1.5 py-0.5 text-xs text-text-primary'
const BUTTON =
  'rounded border border-stone-700 px-2 py-0.5 text-xs text-text-secondary hover:text-text-primary disabled:opacity-40'

const PLANES: { id: string; label: string; plane: number | number[] | undefined }[] = [
  { id: 'any', label: 'Any plane', plane: undefined },
  { id: '0', label: 'Surface (0)', plane: 0 },
  { id: '1', label: 'Upstairs (1)', plane: 1 },
  { id: '2', label: 'Upstairs (2)', plane: 2 },
  { id: '1,2', label: 'Upstairs (1 and 2)', plane: [1, 2] },
  { id: '3', label: 'Underground (3)', plane: 3 },
]

function planeId(area: LightingArea) {
  const planes = planesOf(area)

  return planes ? planes.join(',') : 'any'
}

/** Where an area is, in a few words. */
function whereOf(area: LightingArea) {
  const rect = rectOf(area)
  const planes = planesOf(area)
  const on = planes ? `plane ${planes.join(', ')}` : 'any plane'

  if (area.closedIn) {
    return 'the Black Hole'
  }

  return rect ? `${rect.width}×${rect.height} tiles at ${rect.x}, ${rect.y}` : `all of ${on}`
}

/** A number the file may leave out: empty is "not set". */
function Optional({
  label,
  value,
  step,
  hint,
  onChange,
}: {
  label: string
  value: number | undefined
  step: number
  hint: string
  onChange: (value: number | undefined) => void
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-text-secondary" title={hint}>
      <span className="w-20 shrink-0">{label}</span>
      <input
        type="number"
        step={step}
        value={value ?? ''}
        placeholder="—"
        aria-label={label}
        onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        className={INPUT}
      />
    </label>
  )
}

/** A colour multiplier, red green blue, each 1 for no change; or not set. */
function Multiplier({
  label,
  value,
  hint,
  onChange,
}: {
  label: string
  value: Rgb | undefined
  hint: string
  onChange: (value: Rgb | undefined) => void
}) {
  const shown = value ?? [1, 1, 1]
  const swatch = shown.map((part) => Math.round(Math.max(0, Math.min(1, part * 0.5)) * 255))

  return (
    <div className="flex items-center gap-2 text-xs text-text-secondary" title={hint}>
      <label className="flex w-20 shrink-0 items-center gap-1.5">
        <input
          type="checkbox"
          className="accent-gold-500"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked ? [1, 1, 1] : undefined)}
        />
        {label}
      </label>
      {(['R', 'G', 'B'] as const).map((channel, i) => (
        <input
          key={channel}
          type="number"
          step={0.02}
          min={0}
          max={3}
          disabled={!value}
          value={shown[i]}
          aria-label={`${label} ${channel}`}
          onChange={(e) => {
            const next = [...shown] as Rgb

            next[i] = Number(e.target.value)
            onChange(next)
          }}
          className={cn(INPUT, 'disabled:opacity-40')}
        />
      ))}
      <span
        aria-hidden
        className="h-4 w-4 shrink-0 rounded border border-stone-600"
        style={{ background: `rgb(${swatch.join(',')})` }}
      />
    </div>
  )
}

export function LightingPanel({
  lighting,
  plane,
  focusArea,
  previewOn,
  onPreview,
  onGoTo,
}: {
  lighting: LightingAreas
  /** The plane the map shows, for a new area. */
  plane: number
  /** The area the 3D view's light comes from, or null. */
  focusArea: string | null
  /** Whether the 3D view is lit by the place it looks at. */
  previewOn: boolean
  onPreview: () => void
  onGoTo: (at: { x: number; y: number }) => void
}) {
  const { areas, selected, select, change } = lighting
  const area = areas && selected !== null ? areas[selected] : null
  const rect = area ? rectOf(area) : null

  if (!areas) {
    return lighting.message ? (
      <div className="space-y-1">
        <p className="text-xs text-red-300">{lighting.message.text}</p>
        <button type="button" onClick={() => void lighting.revert()} className={BUTTON}>
          Try again
        </button>
      </div>
    ) : (
      <p className={NOTE}>Loading the lighting areas…</p>
    )
  }

  return (
    <div className="space-y-2">
      <p className={NOTE}>
        The places that change HD graphics&apos; Enhanced lighting. The game uses the first one
        that matches where the player stands, so the order matters. Pick an area, then drag
        across the map to draw where it is.
      </p>

      {!previewOn ? (
        <button type="button" onClick={onPreview} className={BUTTON}>
          Light the 3D view by these areas
        </button>
      ) : (
        <p className="text-xs text-text-secondary">
          3D view&apos;s light: <span className="text-gold-400">{focusArea ?? 'no area'}</span>
        </p>
      )}

      <ol className="space-y-0.5">
        {areas.map((entry, index) => (
          <li key={index} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => select(index === selected ? null : index)}
              aria-pressed={index === selected}
              className={cn(
                'min-w-0 flex-1 rounded border px-2 py-1 text-left text-xs',
                index === selected
                  ? 'border-gold-500 bg-gold-500/15 text-text-primary'
                  : 'border-stone-700 text-text-secondary hover:text-text-primary',
              )}
            >
              <span className="block truncate">
                {index + 1}. {entry.name}
              </span>
              <span className="block truncate text-[10px] opacity-70">{whereOf(entry)}</span>
            </button>
            <button
              type="button"
              title="Tried earlier"
              disabled={index === 0}
              onClick={() => lighting.move(index, -1)}
              className="rounded p-0.5 text-stone-400 hover:text-white disabled:opacity-30"
            >
              <ArrowUp className="h-3 w-3" />
            </button>
            <button
              type="button"
              title="Tried later"
              disabled={index === areas.length - 1}
              onClick={() => lighting.move(index, 1)}
              className="rounded p-0.5 text-stone-400 hover:text-white disabled:opacity-30"
            >
              <ArrowDown className="h-3 w-3" />
            </button>
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={() => lighting.add(plane, null)}
        className={cn(BUTTON, 'flex items-center gap-1')}
      >
        <Plus className="h-3 w-3" /> New area on plane {plane}
      </button>

      {area && selected !== null && (
        <div className="space-y-1.5 rounded border border-stone-700 p-2">
          <label className="flex items-center gap-2 text-xs text-text-secondary">
            <span className="w-20 shrink-0">Name</span>
            <input
              value={area.name}
              maxLength={60}
              onChange={(e) => change(selected, { name: e.target.value })}
              className={INPUT}
            />
          </label>

          <label className="flex items-center gap-2 text-xs text-text-secondary">
            <span className="w-20 shrink-0">Plane</span>
            <select
              value={planeId(area)}
              onChange={(e) =>
                change(selected, { plane: PLANES.find((p) => p.id === e.target.value)?.plane })
              }
              className={INPUT}
            >
              {PLANES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-1 text-xs text-text-secondary">
            <span className={LABEL}>Where</span>
            {rect ? (
              <div className="grid grid-cols-[auto_1fr_1fr] items-center gap-1">
                {(['x', 'y'] as const).map((axis) => (
                  <div key={axis} className="contents">
                    <span className="w-6">{axis}</span>
                    {[0, 1].map((end) => (
                      <input
                        key={end}
                        type="number"
                        value={area[axis]![end]}
                        aria-label={`${axis} ${end ? 'to' : 'from'}`}
                        onChange={(e) => {
                          const next = [...area[axis]!] as [number, number]

                          next[end] = Math.round(Number(e.target.value))
                          change(selected, { [axis]: next })
                        }}
                        className={INPUT}
                      />
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <p className={NOTE}>
                {area.closedIn
                  ? 'The Black Hole, wherever it is.'
                  : 'The whole plane. Drag across the map to give it a rectangle.'}
              </p>
            )}
            <div className="flex flex-wrap gap-1">
              {rect && (
                <>
                  <button
                    type="button"
                    className={BUTTON}
                    onClick={() =>
                      onGoTo({
                        x: Math.floor(rect.x + rect.width / 2),
                        y: Math.floor(rect.y + rect.height / 2),
                      })
                    }
                  >
                    Go there
                  </button>
                  <button
                    type="button"
                    className={BUTTON}
                    onClick={() => change(selected, { x: undefined, y: undefined })}
                  >
                    Whole plane
                  </button>
                </>
              )}
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-text-secondary">
            <span className="w-20 shrink-0">Black Hole</span>
            <select
              value={area.closedIn === undefined ? 'any' : area.closedIn ? 'in' : 'out'}
              onChange={(e) =>
                change(selected, {
                  closedIn: e.target.value === 'any' ? undefined : e.target.value === 'in',
                })
              }
              className={INPUT}
            >
              <option value="any">Either way</option>
              <option value="in">Only in its closed-in view</option>
              <option value="out">Only outside it</option>
            </select>
          </label>

          <label className="flex items-center gap-2 text-xs text-text-secondary">
            <input
              type="checkbox"
              className="accent-gold-500"
              checked={area.sky === 'none'}
              onChange={(e) => change(selected, { sky: e.target.checked ? 'none' : undefined })}
            />
            No sky (the dark around the region, as indoors)
          </label>

          <span className={LABEL}>Light</span>
          <Multiplier
            label="Tint"
            value={area.tint}
            hint="Multiplies every colour: 1 leaves it, above 1 warms or brightens that channel"
            onChange={(tint) => change(selected, { tint })}
          />
          <Multiplier
            label="Haze"
            value={area.haze}
            hint="Multiplies the sky's and the fog's colour"
            onChange={(haze) => change(selected, { haze })}
          />
          <Optional
            label="Sun"
            value={area.sun}
            step={0.05}
            hint="Multiplies how strong the sun is: 0 none, 1 as the time of day has it"
            onChange={(sun) => change(selected, { sun })}
          />
          <Optional
            label="Bias"
            value={area.bias}
            step={0.01}
            hint="Light every point gets, added to the time of day's: negative darkens"
            onChange={(bias) => change(selected, { bias })}
          />
          <Optional
            label="Light gain"
            value={area.lightGain}
            step={0.05}
            hint="How bright torches and fires are here, in place of the time of day's (0.25 by day, 1 at night)"
            onChange={(lightGain) => change(selected, { lightGain })}
          />

          <button
            type="button"
            onClick={() => lighting.remove(selected)}
            className={cn(BUTTON, 'flex items-center gap-1 hover:text-red-300')}
          >
            <Trash2 className="h-3 w-3" /> Remove this area
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          disabled={!lighting.dirty || lighting.busy}
          onClick={() => void lighting.save()}
          className="rounded border border-gold-500 bg-gold-500 px-2 py-0.5 text-xs text-stone-950 disabled:opacity-40"
        >
          {lighting.busy ? 'Saving…' : 'Save lighting'}
        </button>
        <button
          type="button"
          disabled={!lighting.dirty || lighting.busy}
          onClick={() => void lighting.revert()}
          className={BUTTON}
        >
          Undo changes
        </button>
      </div>

      {lighting.message && (
        <p
          className={cn(
            'text-xs',
            lighting.message.kind === 'error' ? 'text-red-300' : 'text-emerald-300',
          )}
        >
          {lighting.message.text}
        </p>
      )}
      <p className={NOTE}>
        Saved apart from the map&apos;s own Save, into rsc-client&apos;s environments.json. The 3D
        view shows changes at once; the game after its next client build.
      </p>
    </div>
  )
}
