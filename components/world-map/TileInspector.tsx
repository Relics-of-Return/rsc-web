'use client'

import {
  readDiagonal,
  tileToGame,
  writeDiagonal,
  type LandscapePalette,
  type TileEdit,
} from '@/lib/landscape/types'

/**
 * The landscape half of one tile: ground, height, overlay and walls.
 *
 * A few quirks of the archive format show through rather than being hidden,
 * because hiding them would only make the editor lie:
 *
 * - elevation is stored as 7 bits doubled, so only even values exist; the
 *   slider steps in twos.
 * - the tile's diagonal field can also hold `.loc` scenery baked into the
 *   map file. Only Lumbridge's two map squares have any, the server never
 *   spawns it and the client never draws it, so it is shown, preserved and
 *   clearable, but not offered. Real scenery lives in objects.json and is
 *   edited in the scenery panel.
 * - the tile's direction is not edited here: it is the facing the client
 *   draws the tile's scenery at, so the scenery panel owns it and keeps it
 *   in step with the server's copy.
 */

const FIELD =
  'w-full rounded border border-stone-700 bg-stone-900 px-2 py-1 text-sm text-text-primary focus:border-gold-500 focus:outline-none'

const LABEL = 'text-xs uppercase tracking-wide text-text-secondary'

const NOTE = 'text-[11px] text-text-secondary/70'

interface TileInspectorProps {
  tile: TileEdit
  palette: LandscapePalette
  sector: { plane: number; x: number; y: number }
  onChange: (tile: TileEdit, field: string) => void
}

export function TileInspector({
  tile,
  palette,
  sector,
  onChange,
}: TileInspectorProps) {
  const set = (patch: Partial<TileEdit>) =>
    onChange({ ...tile, ...patch }, Object.keys(patch).join(','))

  const diagonal = readDiagonal(tile.diagonal)
  const game = tileToGame(sector, tile.index)
  const wallOptions = Object.entries(palette.wallObjects)

  return (
    <div className="space-y-4">
      <div className="text-xs text-text-secondary">
        game <span className="text-text-primary">{game.x}, {game.y}</span>
        {sector.plane > 0 ? ` · plane ${sector.plane}` : ''}
      </div>

      <div className="space-y-1">
        <label className={LABEL} htmlFor="tile-colour">
          Ground colour
        </label>
        <div className="flex items-center gap-2">
          <span
            className="h-6 w-6 shrink-0 rounded border border-stone-600"
            style={{ background: palette.terrain[tile.colour] }}
          />
          <input
            id="tile-colour"
            type="range"
            min={0}
            max={254}
            step={2}
            value={tile.colour & 0xfe}
            onChange={(e) => set({ colour: Number(e.target.value) & 0xfe })}
            className="w-full accent-gold-500"
          />
          <span className="w-9 text-right text-xs text-text-secondary">
            {tile.colour & 0xfe}
          </span>
        </div>
        <p className={NOTE}>
          Like elevation, stored as 7 bits doubled — only even values exist.
          {sector.plane === 1 || sector.plane === 2
            ? ' Upper floors draw every ground colour as black.'
            : ''}
        </p>
      </div>

      <div className="space-y-1">
        <label className={LABEL} htmlFor="tile-elevation">
          Elevation
        </label>
        <div className="flex items-center gap-2">
          <input
            id="tile-elevation"
            type="range"
            min={0}
            max={254}
            step={2}
            value={tile.elevation & 0xfe}
            onChange={(e) => set({ elevation: Number(e.target.value) & 0xfe })}
            className="w-full accent-gold-500"
          />
          <span className="w-9 text-right text-xs text-text-secondary">
            {tile.elevation & 0xfe}
          </span>
        </div>
        <p className={NOTE}>Stored as 7 bits doubled — only even values exist.</p>
      </div>

      <div className="space-y-1">
        <label className={LABEL} htmlFor="tile-overlay">
          Overlay
        </label>
        <select
          id="tile-overlay"
          className={FIELD}
          value={tile.overlay}
          onChange={(e) => set({ overlay: Number(e.target.value) })}
        >
          <option value={0}>none — plain ground</option>
          {Object.entries(palette.overlays).map(([id, def]) => (
            <option key={id} value={id}>
              {def.name.replace(/_/g, ' ')}
              {def.blocked ? ' (blocked)' : ''}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="space-y-2 rounded border border-stone-700 p-3">
        <legend className={`${LABEL} px-1`}>Walls</legend>

        {(
          [
            ['wallHorizontal', 'North edge'],
            ['wallVertical', 'East edge'],
            ['wallRoof', 'Roof'],
          ] as const
        ).map(([field, label]) => (
          <div key={field} className="space-y-1">
            <label className={LABEL} htmlFor={`tile-${field}`}>
              {label}
            </label>
            <select
              id={`tile-${field}`}
              className={FIELD}
              value={tile[field]}
              onChange={(e) => set({ [field]: Number(e.target.value) })}
            >
              <option value={0}>none</option>
              {field === 'wallRoof'
                ? palette.roofs.map((roof) => (
                    <option key={roof.id} value={roof.id}>
                      {roof.name}
                    </option>
                  ))
                : // the archive stores a wall as its wall-object id + 1, so 0
                  // can mean "no wall" — see mudclient's `k3 - 1`
                  wallOptions.map(([id, name]) => (
                    <option key={id} value={Number(id) + 1}>
                      {name}
                    </option>
                  ))}
            </select>
          </div>
        ))}

        <div className="space-y-1">
          <label className={LABEL} htmlFor="tile-diagonal">
            Diagonal
          </label>

          {diagonal.kind === 'object' ? (
            <div className="space-y-2 rounded border border-amber-700/60 bg-amber-950/30 p-2">
              <p className={NOTE}>
                Old <code>.loc</code> scenery baked into the map file: #
                {diagonal.objectId}{' '}
                {palette.objects[String(diagonal.objectId)] ?? ''}. Only
                Lumbridge&apos;s two map squares have any. The server never
                spawns it and the client loads it but never draws it
                (mudclient never calls World#addModels), so it has no effect
                in-game. Clearing it frees the field for a diagonal wall.
              </p>

              <button
                type="button"
                className="text-xs text-amber-300 underline"
                onClick={() => set({ diagonal: 0 })}
              >
                Clear it
              </button>
            </div>
          ) : (
            <>
              <select
                id="tile-diagonal"
                className={FIELD}
                value={diagonal.kind === 'diagonal' ? diagonal.direction! : 'none'}
                onChange={(e) => {
                  const value = e.target.value

                  set({
                    diagonal:
                      value === 'none'
                        ? 0
                        : writeDiagonal(
                            'diagonal',
                            value as '/' | '\\',
                            diagonal.overlay || 1,
                            0,
                          ),
                  })
                }}
              >
                <option value="none">none</option>
                <option value="/">/ south-west to north-east</option>
                {/* a JSX attribute string does not process escapes, so the
                    single backslash has to go in as an expression */}
                <option value={'\\'}>\ north-west to south-east</option>
              </select>

              {diagonal.kind === 'diagonal' && (
                <select
                  aria-label="Diagonal wall type"
                  className={FIELD}
                  value={diagonal.overlay}
                  onChange={(e) =>
                    set({
                      diagonal: writeDiagonal(
                        'diagonal',
                        diagonal.direction ?? '/',
                        Number(e.target.value),
                        0,
                      ),
                    })
                  }
                >
                  {wallOptions.map(([id, name]) => (
                    <option key={id} value={Number(id) + 1}>
                      {name}
                    </option>
                  ))}
                </select>
              )}
            </>
          )}
        </div>
      </fieldset>
    </div>
  )
}
