'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'


import {
  DEFAULT_SETTINGS,
  LAYERS_FOR,
  TOOLS,
  TOOL_LAYERS,
  type Tool,
  type ToolSettings,
} from '@/components/world-map/tools'
import {
  DEFAULT_LAYERS,
  WorldCanvas,
  footprint,
  type MapLayers,
  type MapView,
  type PointerTile,
  type SectorLayer,
  type TileArea,
} from '@/components/world-map/WorldCanvas'
import {
  useRenderSettings,
  WorldPreview3D,
  type PreviewCamera,
  type PreviewHit,
  type WorldPreviewController,
} from '@/components/world-map/WorldPreview3D'
import { WorldToolbar, type ViewLayoutMode } from '@/components/world-map/WorldToolbar'
import { WorldDrawer, type InspectorTab } from '@/components/world-map/WorldDrawer'
import { LightingPanel } from '@/components/world-map/LightingPanel'
import { useLightingAreas } from '@/components/world-map/useLightingAreas'
import { areaAt, rectOf } from '@/lib/landscape/lighting'
import { SplitSquareVertical, X } from 'lucide-react'
import {
  fetchJson,
  keyOf,
  tileEdit,
  useWorldEdits,
  withTile,
  type OpenSector,
  type SectorKey,
  type SpawnField,
  type Working,
} from '@/components/world-map/useWorldEdits'
import {
  NO_TURN,
  doorPlacement,
  doorSegment,
  edgeOwner,
  segmentOf,
  stampOf,
  wallValue,
  type Clip,
  type Turn,
} from '@/lib/landscape/geometry'
import {
  MIN_REGION_X,
  MIN_REGION_Y,
  PLANE_HEIGHT,
  SECTOR_SIZE,
  gameToTile,
  readDiagonal,
  sectorOfGame,
  type ItemSpawn,
  type LandscapePalette,
  type NpcSpawn,
  type PlacedObject,
  type SectorRef,
  type TileEdit,
} from '@/lib/landscape/types'
import { cn } from '@/lib/utils'

/**
 * The world editor: scroll the map, shape the ground, paint it, build walls
 * and roofs, put down scenery, doors, NPCs and items, copy and turn whole
 * pieces of it, and write it all back to the files the game runs on.
 *
 * Everything edits a working copy of the sectors in view. Nothing reaches
 * the server until Save, which writes every changed sector at once or none
 * of them, and is refused for any sector that changed since it was loaded —
 * so two tabs, or two staff members, cannot silently overwrite each other.
 *
 * Beside the map, the game's own renderer draws the working copy in 3D, so an
 * edit is seen the way players will see it before it is saved.
 */

/** Lumbridge, where a new character starts. */
const DEFAULT_GAME = { x: 120, y: 648 }

const DEFAULT_ZOOM = 14

// how long after the last packed archive changes the art is read again:
// pack-cache writes three of them in a row
const ART_SETTLE = 600

const EMPTY = new Set<number>()

/** The middle of a sector, in game coordinates. */
function middleOf(ref: { plane: number; x: number; y: number }) {
  return {
    x: (ref.x - MIN_REGION_X) * SECTOR_SIZE + SECTOR_SIZE / 2,
    y: (ref.y - MIN_REGION_Y) * SECTOR_SIZE + SECTOR_SIZE / 2 + ref.plane * PLANE_HEIGHT,
  }
}

/** A tile's sector, and where in it the tile is. */
function locate(tile: { x: number; y: number }) {
  const ref = sectorOfGame(tile.x, tile.y)

  return { ref, key: keyOf(ref), index: gameToTile(ref, tile.x, tile.y)! }
}

function inArea(area: TileArea, at: { x: number; y: number }) {
  return (
    at.x >= area.x && at.x < area.x + area.width && at.y >= area.y && at.y < area.y + area.height
  )
}

/** The sectors a rectangle of tiles touches. */
function sectorsOfArea(area: TileArea): SectorKey[] {
  const keys = new Set<SectorKey>()

  for (let x = area.x; x < area.x + area.width; x += 1) {
    for (let y = area.y; y < area.y + area.height; y += 1) {
      keys.add(locate({ x, y }).key)
    }
  }

  return [...keys]
}

/** Heights are 7 bits doubled: only even values 0-254 exist. */
function heightOf(value: number) {
  return Math.max(0, Math.min(254, Math.round(value / 2) * 2))
}

/**
 * A place to gather the new working copies of the sectors an edit touches,
 * each built on the one before it within the same edit.
 */
function changes(current: Map<SectorKey, OpenSector>) {
  const out = new Map<SectorKey, Working>()
  const get = (key: SectorKey) => out.get(key) ?? current.get(key)?.working

  return {
    out,
    get,
    /** Changes one tile's landscape, if its sector is open. */
    tile(at: { x: number; y: number }, change: (edit: TileEdit) => void) {
      const { key, index } = locate(at)
      const working = get(key)

      if (!working) {
        return
      }

      const edit = tileEdit(working.tiles, index)

      change(edit)

      const tiles = withTile(working.tiles, edit)

      if (tiles !== working.tiles) {
        out.set(key, { ...working, tiles })
      }
    },
    /** Replaces one spawn list of a sector. */
    spawns<F extends SpawnField>(key: SectorKey, field: F, change: (list: Working[F]) => Working[F]) {
      const working = get(key)

      if (working) {
        out.set(key, { ...working, [field]: change(working[field]) })
      }
    },
  }
}

export function WorldEditor() {
  const [palette, setPalette] = useState<LandscapePalette | null>(null)
  const [sectorList, setSectorList] = useState<SectorRef[] | null>(null)
  const [fatal, setFatal] = useState<string | null>(null)

  const edits = useWorldEdits()
  const { open, changes: changed, ensure, edit, undo, redo } = edits

  const [view, setView] = useState<MapView | null>(null)
  const [selected, setSelected] = useState<{ x: number; y: number } | null>(null)
  const [hover, setHover] = useState<PointerTile | null>(null)
  const [busy, setBusy] = useState<'saving' | null>(null)
  const [notice, setNotice] = useState<{
    kind: 'ok' | 'error' | 'conflict'
    text: string
    sectors?: string[]
  } | null>(null)

  const [tab, setTab] = useState<InspectorTab>('tile')
  const [tool, setTool] = useState<Tool>('objects')
  const [settings, setSettings] = useState<ToolSettings>(DEFAULT_SETTINGS)
  const [show, setShow] = useState<MapLayers>(DEFAULT_LAYERS)

  const [area, setArea] = useState<TileArea | null>(null)
  const [clip, setClip] = useState<Clip | null>(null)
  const [pasting, setPasting] = useState(false)
  const [turn, setTurn] = useState<Turn>(NO_TURN)

  // HD graphics' lighting areas (the lighting tool), and the rectangle being
  // dragged out for one
  const lighting = useLightingAreas(tool === 'lighting' || show.lighting)
  const [lightingDraft, setLightingDraft] = useState<TileArea | null>(null)

  const [thumbnail, setThumbnail] = useState<
    ((kind: 'object' | 'door', id: number) => string | null) | null
  >(null)

  const update = useCallback((patch: Partial<ToolSettings>) => {
    setSettings((current) => ({ ...current, ...patch }))
  }, [])

  // Studio UI states (osrs.world layout)
  const [viewMode, setViewMode] = useState<ViewLayoutMode>('3d')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isDrawerPinned, setIsDrawerPinned] = useState(false)
  const [roofs, setRoofs] = useState(true)
  const [renderSettings, setRenderSettings] = useRenderSettings()
  const [showPip, setShowPip] = useState(true)
  const previewControllerRef = useRef<WorldPreviewController | null>(null)

  // Fullscreen and drawer keyboard handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDrawerOpen) {
          setIsDrawerOpen(false)
        } else if (isFullscreen) {
          setIsFullscreen(false)
        }
      } else if (e.key === 'F11') {
        e.preventDefault()
        setIsFullscreen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isDrawerOpen, isFullscreen])

  // ## the 3D view

  // every spawn in the world, so the 3D view shows the sectors around the
  // open ones furnished; the editor works without it
  const [world, setWorld] = useState<{
    objects: PlacedObject[]
    wallObjects: PlacedObject[]
  } | null>(null)
  // a request for the 3D view to look somewhere; n makes a repeat a new one
  const [focus, setFocus] = useState<{ x: number; y: number; n: number } | null>(null)
  const [camera, setCamera] = useState<PreviewCamera | null>(null)
  // bumped after a save, so the 3D view re-reads the saved maps
  const [mapsVersion, setMapsVersion] = useState(0)
  // bumped when the game's art is packed again (the model editor's Pack, or
  // pack-cache anywhere), so new objects and models show without a reload
  const [artVersion, setArtVersion] = useState(0)

  const lookAt = useCallback((at: { x: number; y: number }) => {
    setFocus((last) => ({
      x: Math.floor(at.x),
      y: Math.floor(at.y),
      n: (last?.n ?? 0) + 1,
    }))
  }, [])

  const loadWorld = useCallback(() => {
    fetchJson<{ objects: PlacedObject[]; wallObjects: PlacedObject[] }>(
      '/api/landscape/locations',
    )
      .then(setWorld)
      .catch(() => setWorld(null))
  }, [])

  useEffect(() => {
    loadWorld()
  }, [loadWorld])

  // ## what exists, and what differs

  const existing = useMemo(
    () => new Set((sectorList ?? []).map((s) => keyOf(s))),
    [sectorList],
  )

  const exists = useCallback((key: SectorKey) => existing.has(key), [existing])

  const summary = useMemo(() => {
    let tiles = 0
    const spawns = new Set<string>()

    for (const change of changed.values()) {
      tiles += change.tiles.size

      if (change.objects) spawns.add('scenery')
      if (change.wallObjects) spawns.add('doors')
      if (change.npcs) spawns.add('NPCs')
      if (change.items) spawns.add('items')
    }

    return { sectors: changed.size, tiles, spawns: [...spawns] }
  }, [changed])

  const dirty = summary.sectors > 0

  const layers = useMemo(() => {
    const out = new Map<SectorKey, SectorLayer>()

    for (const [key, sector] of open) {
      out.set(key, {
        ref: sector.loaded,
        tiles: sector.working.tiles,
        objects: sector.working.objects,
        wallObjects: sector.working.wallObjects,
        npcs: sector.working.npcs,
        items: sector.working.items,
        changed: changed.get(key)?.tiles ?? EMPTY,
      })
    }

    return out
  }, [open, changed])

  // what the 3D view shows: the world's spawns, with every open sector's
  // replaced by its working copy
  const openKeys = useMemo(() => [...open.keys()].sort().join(','), [open])

  const outside = useMemo(() => {
    if (!world) {
      return null
    }

    const opened = new Set(openKeys.split(','))
    const elsewhere = (o: PlacedObject) => !opened.has(keyOf(sectorOfGame(o.x, o.y)))

    return {
      objects: world.objects.filter(elsewhere),
      wallObjects: world.wallObjects.filter(elsewhere),
    }
  }, [world, openKeys])

  const preview = useMemo(() => {
    const sectors: { ref: { plane: number; x: number; y: number }; tiles: Working['tiles'] }[] = []
    const objects: PlacedObject[] = [...(outside?.objects ?? [])]
    const wallObjects: PlacedObject[] = [...(outside?.wallObjects ?? [])]

    for (const sector of open.values()) {
      sectors.push({ ref: sector.loaded, tiles: sector.working.tiles })
      objects.push(...sector.working.objects)
      wallObjects.push(...sector.working.wallObjects)
    }

    return { sectors, objects, wallObjects }
  }, [open, outside])

  // ## loading

  // a pack rewrites the object table and the models: the catalog's names
  // and the 3D view's art are read again once pack-cache is done writing
  useEffect(() => {
    const events = new EventSource('/api/models/events')
    let timer: ReturnType<typeof setTimeout> | undefined

    events.addEventListener('change', (event) => {
      let change: { kind?: string }

      try {
        change = JSON.parse((event as MessageEvent).data)
      } catch {
        return
      }

      if (change.kind !== 'archive') {
        return
      }

      clearTimeout(timer)
      timer = setTimeout(() => {
        fetchJson<LandscapePalette>('/api/landscape/palette')
          .then((paletteData) => {
            setPalette(paletteData)
            setArtVersion((version) => version + 1)
          })
          .catch(() => {
            // the next pack will try again
          })
      }, ART_SETTLE)
    })

    return () => {
      clearTimeout(timer)
      events.close()
    }
  }, [])

  // the palette and the sector list once, then the view from the url
  useEffect(() => {
    let cancelled = false

    Promise.all([
      fetchJson<LandscapePalette>('/api/landscape/palette'),
      fetchJson<{ sectors: SectorRef[] }>('/api/landscape/sectors'),
    ])
      .then(([paletteData, sectorData]) => {
        if (cancelled) {
          return
        }

        setPalette(paletteData)
        setSectorList(sectorData.sectors)

        const params = new URLSearchParams(window.location.search)
        const [plane, x, y] = ['plane', 'x', 'y'].map((key) =>
          Number.parseInt(params.get(key) ?? '', 10),
        )

        const start =
          [plane, x, y].every(Number.isFinite) &&
          sectorData.sectors.some((s) => s.plane === plane && s.x === x && s.y === y)
            ? middleOf({ plane, x, y })
            : DEFAULT_GAME

        setView({
          plane: Math.floor(start.y / PLANE_HEIGHT),
          x: start.x,
          y: start.y,
          zoom: DEFAULT_ZOOM,
        })
        lookAt(start)
      })
      .catch((error) => {
        if (!cancelled) {
          setFatal(error instanceof Error ? error.message : 'could not open the editor')
        }
      })

    return () => {
      cancelled = true
    }
  }, [lookAt])

  const onVisible = useCallback(
    (keys: SectorKey[]) => {
      ensure(keys.filter((key) => existing.has(key))).catch((error) =>
        setNotice({
          kind: 'error',
          text: error instanceof Error ? error.message : 'could not load the map',
        }),
      )
    },
    [ensure, existing],
  )

  // the 3D view furnishes sectors that aren't open from the world's spawns,
  // but only an open sector can be edited, and the 2D map only opens the ones
  // it shows (a small corner in the 3D layout, none with it closed): so the
  // sectors around the 3D camera are opened as it moves
  const cameraKeys = useMemo(() => {
    if (!camera) {
      return ''
    }

    const keys = new Set<SectorKey>()

    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        keys.add(
          keyOf(sectorOfGame(camera.x + dx * SECTOR_SIZE, camera.y + dy * SECTOR_SIZE)),
        )
      }
    }

    return [...keys].join(',')
  }, [camera])

  useEffect(() => {
    if (cameraKeys) {
      onVisible(cameraKeys.split(','))
    }
  }, [cameraKeys, onVisible])

  // the url names the sector in the middle of the map, so a reload, or a
  // link, comes back to it
  const centreRef = view ? sectorOfGame(view.x, view.y) : null
  const centreKey = centreRef ? keyOf(centreRef) : null

  useEffect(() => {
    if (!centreKey) {
      return
    }

    const [plane, x, y] = centreKey.split('.')
    const url = new URL(window.location.href)

    url.searchParams.set('plane', plane)
    url.searchParams.set('x', x)
    url.searchParams.set('y', y)
    window.history.replaceState(null, '', url)
  }, [centreKey])

  // a tab close is the easiest way to lose an afternoon of painting
  useEffect(() => {
    if (!dirty) {
      return
    }

    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }

    window.addEventListener('beforeunload', warn)

    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  // ## the tools

  const chooseTool = useCallback((next: Tool) => {
    setTool(next)
    setPasting(false)
    // each tool's own layers, the rest as the user left them
    setShow((current) => {
      const base = { ...current }

      for (const layer of TOOL_LAYERS) {
        base[layer] = DEFAULT_LAYERS[layer]
      }

      return { ...base, ...LAYERS_FOR[next] }
    })
  }, [])

  /** What a click on the map puts down, if anything. */
  const placing =
    tool === 'objects'
      ? (settings.placeKind === 'object' ? settings.objectId : settings.doorId) !== null
      : tool === 'npcs'
        ? settings.npcId !== null
        : tool === 'items'
          ? settings.itemId !== null
          : true

  const canvasMode: 'select' | 'paint' | 'area' = pasting
    ? 'paint'
    : tool === 'area' || tool === 'lighting'
      ? 'area'
      : placing
        ? 'paint'
        : 'select'

  const pick: 'tile' | 'edge' =
    !pasting &&
    (tool === 'walls' || (tool === 'objects' && settings.placeKind === 'door' && settings.doorId !== null))
      ? 'edge'
      : 'tile'

  const brushed = tool === 'height' || tool === 'underlay' || tool === 'overlay' || tool === 'roofs'

  const stroke = useRef({ n: 0, flatten: 0 })

  const elevationAt = (current: Map<SectorKey, OpenSector>, at: { x: number; y: number }) => {
    const { key, index } = locate(at)
    const sector = current.get(key)

    return sector ? sector.working.tiles.elevation[index] : null
  }

  /** The brush of the tool in hand, at one spot. */
  const applyTool = (at: PointerTile, first: boolean) => {
    const key = `stroke:${stroke.current.n}`
    const tiles = footprint(at, settings.size, settings.round)

    switch (tool) {
      case 'height': {
        const { heightAction: action, strength } = settings
        const target = action === 'set' ? settings.height : stroke.current.flatten

        edit(key, (current) => {
          const out = changes(current)

          for (const tile of tiles) {
            const now = elevationAt(current, tile)

            if (now === null) {
              continue
            }

            let next = now

            if (action === 'raise') {
              next = now + strength * 2
            } else if (action === 'lower') {
              next = now - strength * 2
            } else if (action === 'smooth') {
              // toward the average of the tile and its eight neighbours
              const around: number[] = []

              for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                  const value = elevationAt(current, { x: tile.x + dx, y: tile.y + dy })

                  if (value !== null) {
                    around.push(value)
                  }
                }
              }

              const mean = around.reduce((sum, value) => sum + value, 0) / around.length

              next = now + (mean - now) * (strength / 10)
            } else {
              next = target
            }

            out.tile(tile, (edit) => {
              edit.elevation = heightOf(next)
            })
          }

          return out.out
        })
        return
      }

      case 'underlay':
      case 'overlay':
      case 'roofs': {
        const field = tool === 'underlay' ? 'colour' : tool === 'overlay' ? 'overlay' : 'wallRoof'
        const value =
          tool === 'underlay'
            ? settings.colour
            : tool === 'overlay'
              ? settings.overlay
              : settings.erase
                ? 0
                : settings.roof

        edit(key, (current) => {
          const out = changes(current)

          for (const tile of tiles) {
            out.tile(tile, (edit) => {
              edit[field] = value
            })
          }

          return out.out
        })
        return
      }

      case 'walls': {
        if (!at.edge) {
          return
        }

        const edge = at.edge
        const owner = edgeOwner(at, edge)
        const value = settings.erase ? 0 : wallValue(edge, settings.wall)

        edit(key, (current) => {
          const out = changes(current)

          out.tile(owner, (edit) => {
            // the old .loc scenery shares the diagonal field; leave it be
            if (owner.field === 'diagonal' && edit.diagonal >= 48000) {
              return
            }

            edit[owner.field] = value
          })

          return out.out
        })
        return
      }

      case 'objects': {
        if (settings.placeKind === 'object' && settings.objectId !== null) {
          const object = { id: settings.objectId, direction: settings.facing, x: at.x, y: at.y }
          const { key: sector } = locate(at)

          edit(key, (current) => {
            const out = changes(current)

            out.spawns(sector, 'objects', (list) => [
              ...list.filter((o) => o.x !== at.x || o.y !== at.y),
              object,
            ])
            // the client turns scenery by its tile's facing, the server by
            // the object's: both, always
            out.tile(at, (edit) => {
              edit.direction = object.direction
            })

            return out.out
          })
          setSelected({ x: at.x, y: at.y })
          setTab('scenery')
        } else if (settings.placeKind === 'door' && settings.doorId !== null && at.edge) {
          const door = { id: settings.doorId, ...doorPlacement(at, at.edge) }
          const { key: sector } = locate(door)

          edit(key, (current) => {
            const out = changes(current)

            out.spawns(sector, 'wallObjects', (list) => [
              ...list.filter((d) => d.x !== door.x || d.y !== door.y || d.direction !== door.direction),
              door,
            ])

            return out.out
          })
          setSelected({ x: door.x, y: door.y })
          setTab('doors')
        }
        return
      }

      case 'npcs': {
        if (!first || settings.npcId === null) {
          return
        }

        const reach = settings.wander
        const npc: NpcSpawn = {
          id: settings.npcId,
          x: at.x,
          y: at.y,
          minX: at.x - reach,
          maxX: at.x + reach,
          minY: at.y - reach,
          maxY: at.y + reach,
        }

        edit(`npc:${stroke.current.n}`, (current) => {
          const out = changes(current)

          out.spawns(locate(at).key, 'npcs', (list) => [...list, npc])

          return out.out
        })
        setSelected({ x: at.x, y: at.y })
        setTab('npcs')
        return
      }

      case 'items': {
        if (!first || settings.itemId === null) {
          return
        }

        const item: ItemSpawn = {
          id: settings.itemId,
          ...(settings.amount > 1 ? { amount: settings.amount } : {}),
          respawn: settings.respawn * 1000,
          x: at.x,
          y: at.y,
        }

        edit(`item:${stroke.current.n}`, (current) => {
          const out = changes(current)

          out.spawns(locate(at).key, 'items', (list) => [...list, item])

          return out.out
        })
        setSelected({ x: at.x, y: at.y })
        setTab('items')
        return
      }
    }
  }

  /** Alt+click: take what is under the pointer for the tool in hand. */
  const eyedrop = (at: PointerTile) => {
    const { key, index } = locate(at)
    const sector = open.get(key)

    if (!sector) {
      return
    }

    const tiles = sector.working.tiles

    switch (tool) {
      case 'height':
        update({ height: tiles.elevation[index], heightAction: 'set' })
        break
      case 'underlay':
        update({ colour: tiles.colour[index] & 0xfe })
        break
      case 'overlay':
        update({ overlay: tiles.overlay[index] })
        break
      case 'roofs':
        if (tiles.wallRoof[index]) {
          update({ roof: tiles.wallRoof[index], erase: false })
        }
        break
      case 'walls': {
        if (!at.edge) {
          break
        }

        const owner = edgeOwner(at, at.edge)
        const where = locate(owner)
        const value = open.get(where.key)?.working.tiles[owner.field][where.index] ?? 0
        const wall = owner.field === 'diagonal' ? readDiagonal(value).overlay : value

        if (wall > 0 && wall < 12000) {
          update({ wall: wall - 1, erase: false })
        }
        break
      }
      case 'objects': {
        const object = sector.working.objects.find((o) => o.x === at.x && o.y === at.y)

        if (object) {
          update({ placeKind: 'object', objectId: object.id, facing: object.direction })
        }
        break
      }
      case 'npcs': {
        const npc = sector.working.npcs.find((n) => n.x === at.x && n.y === at.y)

        if (npc) {
          update({ npcId: npc.id })
        }
        break
      }
      case 'items': {
        const item = sector.working.items.find((i) => i.x === at.x && i.y === at.y)

        if (item) {
          update({ itemId: item.id })
        }
        break
      }
    }
  }

  // ## copy and paste

  const copy = () => {
    if (!area) {
      return
    }

    const next: Clip = {
      width: area.width,
      height: area.height,
      tiles: [],
      walls: [],
      objects: [],
      wallObjects: [],
      npcs: [],
      items: [],
    }
    const tileAt = (x: number, y: number) => {
      const { key, index } = locate({ x: area.x + x, y: area.y + y })
      const sector = open.get(key)

      return sector ? { tiles: sector.working.tiles, index } : null
    }

    for (let x = 0; x < area.width; x++) {
      for (let y = 0; y < area.height; y++) {
        const found = tileAt(x, y)

        if (!found) {
          continue
        }

        const { tiles, index } = found

        next.tiles.push({
          x,
          y,
          colour: tiles.colour[index],
          elevation: tiles.elevation[index],
          overlay: tiles.overlay[index],
          direction: tiles.direction[index],
          wallRoof: tiles.wallRoof[index],
        })

        if (tiles.wallHorizontal[index]) {
          next.walls.push({ segment: segmentOf({ x, y }, 'north'), value: tiles.wallHorizontal[index] })
        }

        if (tiles.wallVertical[index]) {
          next.walls.push({ segment: segmentOf({ x, y }, 'east'), value: tiles.wallVertical[index] })
        }

        const diagonal = readDiagonal(tiles.diagonal[index])

        if (diagonal.kind === 'diagonal') {
          next.walls.push({
            segment: segmentOf({ x, y }, diagonal.direction === '/' ? 'slash' : 'backslash'),
            value: tiles.diagonal[index],
          })
        }
      }
    }

    // the south and west sides of the rectangle belong to the tiles beyond it
    for (let x = 0; x < area.width; x++) {
      const found = tileAt(x, area.height)

      if (found?.tiles.wallHorizontal[found.index]) {
        next.walls.push({
          segment: segmentOf({ x, y: area.height }, 'north'),
          value: found.tiles.wallHorizontal[found.index],
        })
      }
    }

    for (let y = 0; y < area.height; y++) {
      const found = tileAt(area.width, y)

      if (found?.tiles.wallVertical[found.index]) {
        next.walls.push({
          segment: segmentOf({ x: area.width, y }, 'east'),
          value: found.tiles.wallVertical[found.index],
        })
      }
    }

    const relative = <T extends { x: number; y: number }>(entry: T): T => ({
      ...entry,
      x: entry.x - area.x,
      y: entry.y - area.y,
    })

    for (const key of sectorsOfArea(area)) {
      const working = open.get(key)?.working

      if (!working) {
        continue
      }

      next.objects.push(...working.objects.filter((o) => inArea(area, o)).map(relative))
      next.wallObjects.push(
        ...working.wallObjects
          .filter((d) => inArea(area, d))
          .map((d) => ({ id: d.id, segment: doorSegment(relative(d)) })),
      )
      next.npcs.push(
        ...working.npcs.filter((n) => inArea(area, n)).map((n) => ({
          ...relative(n),
          minX: n.minX - area.x,
          maxX: n.maxX - area.x,
          minY: n.minY - area.y,
          maxY: n.maxY - area.y,
        })),
      )
      next.items.push(...working.items.filter((i) => inArea(area, i)).map(relative))
    }

    setClip(next)
    setNotice({
      kind: 'ok',
      text: `Copied ${area.width}×${area.height} tiles, ${next.objects.length} scenery, ${next.npcs.length} NPCs, ${next.items.length} items. Ctrl+V to put it down.`,
    })
  }

  const stampAt = (at: { x: number; y: number }) => {
    if (!clip || !palette) {
      return
    }

    const stamp = stampOf(clip, at, turn, palette)
    const options = settings.paste

    stroke.current.n += 1

    edit(`paste:${stroke.current.n}`, (current) => {
      const out = changes(current)

      for (const tile of stamp.tiles) {
        out.tile(tile, (edit) => {
          if (options.heights) {
            edit.elevation = tile.elevation
          }

          if (options.ground) {
            edit.colour = tile.colour
            edit.overlay = tile.overlay
          }

          if (options.walls) {
            edit.wallRoof = tile.wallRoof
            edit.wallHorizontal = 0
            edit.wallVertical = 0

            if (edit.diagonal < 48000) {
              edit.diagonal = 0
            }
          }

          if (options.spawns) {
            edit.direction = tile.direction
          }
        })
      }

      if (options.walls) {
        for (const wall of stamp.walls) {
          out.tile(wall, (edit) => {
            if (wall.field !== 'diagonal' || edit.diagonal < 48000) {
              edit[wall.field] = wall.value
            }
          })
        }
      }

      if (options.spawns) {
        const fields = [
          ['objects', stamp.objects],
          ['wallObjects', stamp.wallObjects],
          ['npcs', stamp.npcs],
          ['items', stamp.items],
        ] as const

        for (const key of sectorsOfArea(stamp.area)) {
          for (const [field, added] of fields) {
            out.spawns(key, field, (list) => [
              ...(list as { x: number; y: number }[]).filter((entry) => !inArea(stamp.area, entry)),
              ...(added as { x: number; y: number }[]).filter((entry) => locate(entry).key === key),
            ] as never)
          }
        }
      }

      return out.out
    })
  }

  /** Scenery, doors, NPCs and items: all of them out of a rectangle. */
  const clearArea = (target: TileArea) => {
    stroke.current.n += 1

    edit(`clear:${stroke.current.n}`, (current) => {
      const out = changes(current)

      for (const key of sectorsOfArea(target)) {
        for (const field of ['objects', 'wallObjects', 'npcs', 'items'] as const) {
          const list = out.get(key)?.[field] as { x: number; y: number }[] | undefined

          if (list?.some((entry) => inArea(target, entry))) {
            out.spawns(key, field, (entries) =>
              (entries as { x: number; y: number }[]).filter((entry) => !inArea(target, entry)) as never,
            )
          }
        }
      }

      return out.out
    })
  }

  const doTurn = (how: 'rotate' | 'mirror' | 'flip') => {
    setTurn((current) =>
      how === 'rotate'
        ? { ...current, quarters: (current.quarters + 1) % 4 }
        : how === 'mirror'
          ? { ...current, mirror: !current.mirror }
          : { ...current, flip: !current.flip },
    )
  }

  const startPaste = () => {
    if (clip) {
      setPasting(true)
      setTurn(NO_TURN)
    }
  }

  // ## pressing on the map, or in the 3D view

  const selectTile = (at: { x: number; y: number }) => {
    setSelected({ x: at.x, y: at.y })
    lookAt(at)
  }

  const pressAt = (at: PointerTile) => {
    if (pasting) {
      stampAt(at)
      return
    }

    if (at.alt) {
      eyedrop(at)
      return
    }

    if (canvasMode === 'select') {
      selectTile(at)
      return
    }

    stroke.current.n += 1
    stroke.current.flatten = elevationAt(open, at) ?? 0
    applyTool(at, true)
  }

  const dragAt = (at: PointerTile) => {
    if (!pasting && !at.alt && canvasMode === 'paint') {
      applyTool(at, false)
    }
  }

  // ## keys

  const selection = selected ? locate(selected) : null
  const selectedSector = selection ? open.get(selection.key) : undefined

  const removeFromSelected = (field: 'objects' | 'npcs' | 'items') => {
    if (!selected || !selection) {
      return
    }

    edit(`remove:${field}:${selection.key}:${selection.index}`, (current) => {
      const out = changes(current)

      out.spawns(selection.key, field, (list) =>
        (list as { x: number; y: number }[]).filter((e) => e.x !== selected.x || e.y !== selected.y) as never,
      )

      return out.out
    })
  }

  // the handler is rebuilt every render, so it always sees the current tool
  // and settings; the listener only forwards to it
  const onKey = useRef<(event: KeyboardEvent) => void>(() => {})

  useEffect(() => {
    onKey.current = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null

      if (target && /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) {
        return
      }

      const key = event.key
      const lower = key.toLowerCase()

      if (event.ctrlKey || event.metaKey) {
        if (lower === 'z' && !event.shiftKey) {
          event.preventDefault()
          undo()
        } else if (lower === 'y' || (lower === 'z' && event.shiftKey)) {
          event.preventDefault()
          redo()
        } else if (lower === 'c' && area) {
          event.preventDefault()
          copy()
        } else if (lower === 'v' && clip) {
          event.preventDefault()
          startPaste()
        }

        return
      }

      const toolIndex = /^(?:[0-9]|F[1-9]|F10)$/.test(key) ? Number(key.replace('F', '')) : null

      if (toolIndex !== null && !event.altKey) {
        event.preventDefault()
        // 0 and F10 are the tenth
        chooseTool(TOOLS[(toolIndex || 10) - 1].id)
        return
      }

      if (key === 'PageUp' || key === 'PageDown') {
        event.preventDefault()

        if (view) {
          const plane = Math.max(0, Math.min(3, view.plane + (key === 'PageUp' ? 1 : -1)))

          setView({ ...view, plane, y: view.y + (plane - view.plane) * PLANE_HEIGHT })
        }

        return
      }

      switch (key) {
        case '[':
        case ']':
          update({ size: Math.max(1, Math.min(10, settings.size + (key === ']' ? 1 : -1))) })
          break
        case '{':
        case '}':
          update({ strength: Math.max(1, Math.min(10, settings.strength + (key === '}' ? 1 : -1))) })
          break
        case 'r':
        case 'R':
          if (pasting) {
            doTurn('rotate')
          } else if (tool === 'objects') {
            update({ facing: (settings.facing + (event.shiftKey ? 1 : 2)) % 8 })
          }
          break
        case 'm':
        case 'M':
          if (pasting) doTurn('mirror')
          break
        case 'f':
        case 'F':
          if (pasting) doTurn('flip')
          break
        case 'h':
        case 'H':
          if (tool === 'height' && hover) {
            const value = elevationAt(open, hover)

            if (value !== null) {
              update({ height: value, heightAction: 'set' })
            }
          }
          break
        case 'Escape':
          if (pasting) {
            setPasting(false)
          } else if (tool === 'objects' && placing) {
            update(settings.placeKind === 'object' ? { objectId: null } : { doorId: null })
          } else if (tool === 'npcs' && placing) {
            update({ npcId: null })
          } else if (tool === 'items' && placing) {
            update({ itemId: null })
          } else if (tool === 'lighting') {
            lighting.select(null)
          } else {
            setArea(null)
          }
          break
        case 'Delete':
        case 'Backspace':
          if (tool === 'area' && area) {
            clearArea(area)
          } else if (tool === 'npcs') {
            removeFromSelected('npcs')
          } else if (tool === 'items') {
            removeFromSelected('items')
          } else if (tool === 'objects') {
            removeFromSelected('objects')
          } else {
            return
          }
          break
        default:
          return
      }

      event.preventDefault()
    }
  })

  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKey.current(event)

    window.addEventListener('keydown', listener)

    return () => window.removeEventListener('keydown', listener)
  }, [])

  // ## the inspector

  const setTile = (next: TileEdit, field: string) => {
    if (!selection) {
      return
    }

    const { key } = selection

    edit(`tile:${key}:${next.index}:${field}`, (current) => {
      const sector = current.get(key)

      return sector
        ? new Map([[key, { ...sector.working, tiles: withTile(sector.working.tiles, next) }]])
        : new Map()
    })
  }

  /** Replaces what one spawn list holds on the selected tile. */
  const setOnTile = <F extends SpawnField>(field: F, next: Working[F]) => {
    if (!selection || !selected) {
      return
    }

    const { key, index } = selection
    const at = selected

    edit(`${field}:${key}:${index}:${JSON.stringify(next)}`, (current) => {
      const out = changes(current)

      out.spawns(key, field, (list) =>
        [
          ...(list as { x: number; y: number }[]).filter((o) => o.x !== at.x || o.y !== at.y),
          ...(next as { x: number; y: number }[]),
        ] as never,
      )

      // a scenery object's facing lives in two places: the server takes it
      // from objects.json, but the client takes it from the tile it stands
      // on (packet-handlers/region-objects.js reads getTileDirection, then
      // rotates the model and sizes its collision by it). the shipped world
      // keeps the two equal for 99.5% of objects, so the editor always
      // writes both
      if (field === 'objects' && next.length) {
        const facing = (next as PlacedObject[])[0].direction

        out.tile(at, (edit) => {
          edit.direction = facing
        })
      }

      return out.out
    })
  }

  // ## saving

  const save = async () => {
    if (!dirty || busy) {
      return
    }

    setBusy('saving')
    setNotice(null)

    try {
      const result = await edits.save()

      if (!result) {
        return
      }

      const parts = [
        result.tiles ? `${result.tiles} tile${result.tiles === 1 ? '' : 's'}` : null,
        result.objects !== null ? 'scenery' : null,
        result.wallObjects !== null ? 'doors' : null,
        result.npcs !== null ? 'NPCs' : null,
        result.items !== null ? 'items' : null,
      ].filter(Boolean)

      setMapsVersion((v) => v + 1)
      loadWorld()

      setNotice({
        kind: 'ok',
        text:
          `Saved ${parts.join(', ')} in ${result.sectors.join(', ')} to ` +
          `${result.files.length} files. Restart the game servers for it to ` +
          'take effect in-game; the client picks up the new map on its next load.',
      })
    } catch (error) {
      const failure = error as { status?: number; sectors?: string[] }

      setNotice({
        kind: failure.status === 409 ? 'conflict' : 'error',
        text: error instanceof Error ? error.message : 'the save failed',
        sectors: failure.sectors,
      })
    } finally {
      setBusy(null)
    }
  }

  /** The checker's fix: each tile faces the way its scenery's server copy says. */
  const fixFacing = async (points: { x: number; y: number }[]) => {
    const keys = [...new Set(points.map((p) => locate(p).key))].filter((key) => existing.has(key))

    await ensure(keys)

    edit(`fix-facing:${Date.now()}`, (current) => {
      const out = changes(current)

      for (const point of points) {
        const object = out
          .get(locate(point).key)
          ?.objects.find((o) => o.x === point.x && o.y === point.y)

        if (object) {
          out.tile(point, (edit) => {
            edit.direction = object.direction
          })
        }
      }

      return out.out
    })
  }

  // ## rendering

  if (fatal) {
    return (
      <p className="rounded border border-red-800 bg-red-950/40 p-4 text-sm text-red-300">
        {fatal}
      </p>
    )
  }

  if (!palette || !sectorList || !view || !centreRef || !focus) {
    return <p className="text-sm text-text-secondary">Loading the world…</p>
  }

  const planeSectors = sectorList.filter((s) => s.plane === view.plane)
  const centreExists = existing.has(keyOf(centreRef))
  const centreMembers = sectorList.find((s) => keyOf(s) === keyOf(centreRef))?.members

  /** Centres the map, and the 3D view, on a point. */
  const goTo = (at: { x: number; y: number }, zoom = view.zoom) => {
    setView({ plane: Math.floor(at.y / PLANE_HEIGHT), x: at.x + 0.5, y: at.y + 0.5, zoom })
    lookAt(at)
  }

  // west is +x in game coordinates, north is -y
  const neighbours = [
    { label: 'N', title: 'north', dx: 0, dy: -1 },
    { label: 'W', title: 'west', dx: 1, dy: 0 },
    { label: 'E', title: 'east', dx: -1, dy: 0 },
    { label: 'S', title: 'south', dx: 0, dy: 1 },
  ]

  const onSelected = <T extends { x: number; y: number }>(list: T[]) =>
    selected ? list.filter((o) => o.x === selected.x && o.y === selected.y) : []

  const sceneryHere = selectedSector ? onSelected(selectedSector.working.objects) : []
  const doorsHere = selectedSector ? onSelected(selectedSector.working.wallObjects) : []
  const npcsHere = selectedSector ? onSelected(selectedSector.working.npcs) : []
  const itemsHere = selectedSector ? onSelected(selectedSector.working.items) : []

  const hoverSector = hover ? open.get(locate(hover).key) : undefined
  const hoverNames =
    hover && hoverSector
      ? [
          ...onSelectedAt(hoverSector.working.objects, hover).map(
            (o) => palette.objects[String(o.id)] ?? `#${o.id}`,
          ),
          ...onSelectedAt(hoverSector.working.npcs, hover).map(
            (n) => palette.npcs[String(n.id)] ?? `NPC #${n.id}`,
          ),
          ...onSelectedAt(hoverSector.working.items, hover).map(
            (i) => palette.items[String(i.id)] ?? `item #${i.id}`,
          ),
        ]
      : []
  const hoverHeight =
    hover && hoverSector ? hoverSector.working.tiles.elevation[locate(hover).index] : null

  const stampArea =
    pasting && clip && hover ? stampOf(clip, hover, turn, palette).area : null

  // a click in the 3D view selects what it hit, or with a brush in hand
  // uses it there
  const pickInView = (hit: PreviewHit) => {
    const at = { x: hit.x, y: hit.y, alt: false, shift: false }

    // what's drawn there may come from the world's spawns rather than an
    // open sector; this opens it so it can be edited
    onVisible([locate(hit).key])

    if (pasting || (canvasMode === 'paint' && pick === 'tile' && hit.kind === 'tile')) {
      pressAt(at)
      return
    }

    setTab(hit.kind === 'object' ? 'scenery' : hit.kind === 'door' ? 'doors' : 'tile')
    setSelected({ x: hit.x, y: hit.y })
  }

  const describeInView = (hit: PreviewHit) => {
    const where = `${hit.x}, ${hit.y}`

    if (hit.kind === 'object') {
      return `${palette.objects[String(hit.id)] ?? `Scenery #${hit.id}`} · ${where}`
    }

    if (hit.kind === 'door') {
      return `${palette.wallObjects[String(hit.id)] ?? `Door #${hit.id}`} · ${where}`
    }

    const { key, index } = locate(hit)
    const sector = open.get(key)

    if (!sector) {
      return `Ground${hit.ground ? ` · HD ${hit.ground}` : ''} · ${where}`
    }

    const overlay = sector.working.tiles.overlay[index]
    const surface = overlay
      ? (palette.overlays[String(overlay)]?.name ?? `overlay ${overlay}`)
      : 'Ground'

    const hd = hit.ground ? ` · HD ${hit.ground}` : ''

    return `${surface} · height ${sector.working.tiles.elevation[index]}${hd} · ${where}`
  }

  // the lighting tool: a drag draws the picked area's rectangle, or a new
  // area's if none is picked; a click picks the area there
  const onMapArea = (next: TileArea) => (tool === 'lighting' ? setLightingDraft(next) : setArea(next))

  const onMapRelease = () => {
    const draft = lightingDraft

    setLightingDraft(null)

    if (tool !== 'lighting' || !draft || !lighting.areas) {
      return
    }

    if (draft.width === 1 && draft.height === 1) {
      const index = areaAt(lighting.areas, draft)

      lighting.select(index === -1 ? null : index)
    } else if (lighting.selected !== null) {
      lighting.place(lighting.selected, draft, view.plane)
    } else {
      lighting.add(view.plane, draft)
    }
  }

  const lightingRegions =
    show.lighting && lighting.areas
      ? lighting.areas.flatMap((entry, index) => {
          const rect = rectOf(entry)

          return rect && Math.floor(rect.y / PLANE_HEIGHT) === view.plane && !entry.closedIn
            ? [{ area: rect, label: `${index + 1}. ${entry.name}`, selected: index === lighting.selected }]
            : []
        })
      : undefined

  const focusArea =
    camera && lighting.areas
      ? (lighting.areas[areaAt(lighting.areas, { x: Math.floor(camera.x), y: Math.floor(camera.y) })]
          ?.name ?? null)
      : null

  const lightingPanel = (
    <LightingPanel
      lighting={lighting}
      plane={view.plane}
      focusArea={focusArea}
      previewOn={renderSettings.lighting && renderSettings.place}
      onPreview={() => setRenderSettings({ lighting: true, place: true })}
      onGoTo={(at) => goTo(at)}
    />
  )

  const layerLabels: [keyof MapLayers, string][] = [
    ['heights', 'Heights'],
    ['overlays', 'Overlays'],
    ['walls', 'Walls'],
    ['roofs', 'Roofs'],
    ['scenery', 'Scenery'],
    ['doors', 'Doors'],
    ['npcs', 'NPCs'],
    ['items', 'Items'],
    ['blocked', 'Blocked'],
    ['grid', 'Grid'],
    ['lighting', 'Lighting areas'],
  ]

  return (
    <div
      className={cn(
        'relative w-full transition-all duration-300 select-none font-sans',
        isFullscreen
          ? 'fixed inset-0 z-50 h-screen w-screen bg-[#07080b] flex flex-col'
          : 'h-[calc(100vh-10rem)] min-h-[720px] rounded-2xl overflow-hidden border border-white/10 bg-[#07080b] shadow-[0_16px_50px_rgba(0,0,0,0.85)] flex flex-col',
      )}
    >
      {/* Floating Notice Toast */}
      {notice && (
        <div
          className={cn(
            'absolute top-4 inset-x-0 mx-auto w-fit max-w-xl z-50 flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium backdrop-blur-xl shadow-2xl transition-all animate-in fade-in slide-in-from-top-2',
            notice.kind === 'ok' && 'border border-emerald-500/40 bg-emerald-950/85 text-emerald-200',
            notice.kind === 'error' && 'border border-red-500/40 bg-red-950/85 text-red-200',
            notice.kind === 'conflict' && 'border border-amber-500/40 bg-amber-950/85 text-amber-200',
          )}
        >
          <span>{notice.text}</span>
          {notice.kind === 'conflict' && notice.sectors?.length ? (
            <button
              type="button"
              className="ml-2 font-bold underline hover:text-white"
              onClick={() => {
                const names = new Set(notice.sectors)
                const keys = [...open.values()]
                  .filter((s) => names.has(s.loaded.name))
                  .map((s) => keyOf(s.loaded))
                if (
                  window.confirm(
                    `Reloading ${notice.sectors!.join(', ')} throws away your unsaved changes. Continue?`,
                  )
                ) {
                  edits.reload(keys).then(() => setNotice(null))
                }
              }}
            >
              Reload
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="ml-2 rounded p-0.5 hover:bg-white/10 text-stone-400 hover:text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Main Workspace (Canvas Area) */}
      <div
        className={cn(
          'relative flex-1 w-full h-full overflow-hidden transition-all duration-300',
          isDrawerOpen && isDrawerPinned && 'pr-[380px]',
        )}
      >
        {/* VIEW MODE: 3D HERO VIEW (Directly inspired by osrs.world) */}
        {viewMode === '3d' && (
          <div className="relative h-full w-full">
            <WorldPreview3D
              sectors={preview.sectors}
              objects={preview.objects}
              wallObjects={preview.wallObjects}
              focus={focus}
              selected={selected}
              mapsVersion={mapsVersion}
              artVersion={artVersion}
              describe={describeInView}
              onPick={pickInView}
              onCamera={setCamera}
              onThumbnails={(draw) => setThumbnail(() => draw)}
              controllerRef={previewControllerRef}
              roofs={roofs}
              onRoofsChange={setRoofs}
              render={renderSettings}
              lightingAreas={lighting.areas}
              onOpenNav={() => setIsDrawerOpen(true)}
              className="h-full w-full"
            />

            {/* Floating 2D PiP mini-window in 3D Mode */}
            {showPip && (
              <div className="absolute bottom-18 right-4 z-20 flex flex-col rounded-xl overflow-hidden border border-white/15 bg-[#0e1017]/95 shadow-[0_12px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl transition-all">
                <div className="flex h-7 items-center justify-between px-2.5 bg-white/5 border-b border-white/10 text-[10px] text-stone-300">
                  <div className="flex items-center gap-1.5 truncate pr-2">
                    <span className="font-mono uppercase tracking-wider text-gold-400">
                      2D Grid
                    </span>
                    {hover && (
                      <span className="font-mono text-[9px] text-stone-400 truncate max-w-[130px]">
                        {hover.x},{hover.y}
                        {hoverHeight !== null ? ` · h${hoverHeight}` : ''}
                        {hoverNames.length ? ` · ${hoverNames[0]}` : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setViewMode('split')}
                      title="Expand to Split View"
                      className="hover:text-white p-0.5 text-stone-400"
                    >
                      <SplitSquareVertical className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPip(false)}
                      title="Close Mini-Grid"
                      className="hover:text-white p-0.5 text-stone-400"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <div className="h-44 w-60 sm:h-52 sm:w-72 overflow-hidden bg-[#090a0f]">
                  <WorldCanvas
                    view={view}
                    onView={setView}
                    layers={layers}
                    show={show}
                    loading={edits.pending}
                    exists={exists}
                    palette={palette}
                    selected={selected}
                    camera={camera}
                    mode={canvasMode}
                    pick={pick}
                    brush={
                      brushed && !pasting
                        ? { size: settings.size, round: settings.round }
                        : undefined
                    }
                    repeat={
                      tool === 'height' &&
                      ['raise', 'lower', 'smooth'].includes(settings.heightAction)
                        ? 120
                        : undefined
                    }
                    area={tool === 'area' ? area : tool === 'lighting' ? lightingDraft : null}
                    regions={lightingRegions}
                    stamp={stampArea}
                    boxes={npcsHere}
                    onVisible={onVisible}
                    onPress={pressAt}
                    onDrag={dragAt}
                    onArea={onMapArea}
                    onRelease={onMapRelease}
                    onHover={setHover}
                  />
                </div>
              </div>
            )}
            {!showPip && (
              <button
                type="button"
                onClick={() => setShowPip(true)}
                title="Show 2D Blueprint Grid"
                className="absolute bottom-18 right-4 z-20 rounded-xl border border-white/10 bg-stone-900/80 px-2.5 py-1 text-[11px] font-medium text-stone-300 backdrop-blur-md hover:border-gold-500/50 hover:text-white shadow-lg transition-all"
              >
                Show 2D Grid
              </button>
            )}
          </div>
        )}

        {/* VIEW MODE: SPLIT STUDIO (Side-by-side) */}
        {viewMode === 'split' && (
          <div className="grid grid-cols-1 md:grid-cols-2 h-full w-full divide-y md:divide-y-0 md:divide-x divide-white/10">
            {/* 2D Grid side */}
            <div className="relative h-full w-full overflow-hidden bg-[#090a0f]">
              <WorldCanvas
                view={view}
                onView={setView}
                layers={layers}
                show={show}
                loading={edits.pending}
                exists={exists}
                palette={palette}
                selected={selected}
                camera={camera}
                mode={canvasMode}
                pick={pick}
                brush={
                  brushed && !pasting ? { size: settings.size, round: settings.round } : undefined
                }
                repeat={
                  tool === 'height' && ['raise', 'lower', 'smooth'].includes(settings.heightAction)
                    ? 120
                    : undefined
                }
                area={tool === 'area' ? area : tool === 'lighting' ? lightingDraft : null}
                regions={lightingRegions}
                stamp={stampArea}
                boxes={npcsHere}
                onVisible={onVisible}
                onPress={pressAt}
                onDrag={dragAt}
                onArea={onMapArea}
                onRelease={onMapRelease}
                onHover={setHover}
              />
              <div className="absolute top-3 left-3 rounded-lg bg-black/70 px-2.5 py-1 text-[10px] font-mono text-stone-300 backdrop-blur-md border border-white/10 pointer-events-none">
                2D Grid{' '}
                {hover
                  ? `· ${hover.x}, ${hover.y}${hoverHeight !== null ? ` · elev ${hoverHeight}` : ''}${hoverNames.length ? ` · ${hoverNames[0]}` : ''}`
                  : ''}
              </div>
            </div>

            {/* 3D Preview side */}
            <div className="relative h-full w-full overflow-hidden bg-black">
              <WorldPreview3D
                sectors={preview.sectors}
                objects={preview.objects}
                wallObjects={preview.wallObjects}
                focus={focus}
                selected={selected}
                mapsVersion={mapsVersion}
                artVersion={artVersion}
                describe={describeInView}
                onPick={pickInView}
                onCamera={setCamera}
                onThumbnails={(draw) => setThumbnail(() => draw)}
                controllerRef={previewControllerRef}
                roofs={roofs}
                onRoofsChange={setRoofs}
                render={renderSettings}
                lightingAreas={lighting.areas}
                onOpenNav={() => setIsDrawerOpen(true)}
                className="h-full w-full"
              />
            </div>
          </div>
        )}

        {/* VIEW MODE: 2D BLUEPRINT */}
        {viewMode === '2d' && (
          <div className="relative h-full w-full overflow-hidden bg-[#090a0f]">
            <WorldCanvas
              view={view}
              onView={setView}
              layers={layers}
              show={show}
              loading={edits.pending}
              exists={exists}
              palette={palette}
              selected={selected}
              camera={camera}
              mode={canvasMode}
              pick={pick}
              brush={
                brushed && !pasting ? { size: settings.size, round: settings.round } : undefined
              }
              repeat={
                tool === 'height' && ['raise', 'lower', 'smooth'].includes(settings.heightAction)
                  ? 120
                  : undefined
              }
              area={tool === 'area' ? area : tool === 'lighting' ? lightingDraft : null}
              regions={lightingRegions}
              stamp={stampArea}
              boxes={npcsHere}
              onVisible={onVisible}
              onPress={pressAt}
              onDrag={dragAt}
              onArea={onMapArea}
              onRelease={onMapRelease}
              onHover={setHover}
            />

            {/* Floating 3D PiP in 2D mode */}
            {showPip && (
              <div className="absolute bottom-18 right-4 z-20 flex flex-col rounded-xl overflow-hidden border border-white/15 bg-black/95 shadow-[0_12px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl transition-all">
                <div className="flex h-7 items-center justify-between px-2.5 bg-white/5 border-b border-white/10 text-[10px] text-stone-300">
                  <span className="font-mono uppercase tracking-wider text-gold-400">
                    3D View Preview
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setViewMode('split')}
                      title="Expand to Split View"
                      className="hover:text-white p-0.5 text-stone-400"
                    >
                      <SplitSquareVertical className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowPip(false)}
                      title="Close 3D Preview"
                      className="hover:text-white p-0.5 text-stone-400"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
                <div className="h-44 w-60 sm:h-52 sm:w-72 overflow-hidden bg-black">
                  <WorldPreview3D
                    sectors={preview.sectors}
                    objects={preview.objects}
                    wallObjects={preview.wallObjects}
                    focus={focus}
                    selected={selected}
                    mapsVersion={mapsVersion}
                    artVersion={artVersion}
                    describe={describeInView}
                    onPick={pickInView}
                    onCamera={setCamera}
                    onThumbnails={(draw) => setThumbnail(() => draw)}
                    controllerRef={previewControllerRef}
                    roofs={roofs}
                    onRoofsChange={setRoofs}
                    render={renderSettings}
                    lightingAreas={lighting.areas}
                    showMinimap={false}
                    className="h-full w-full"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Floating Bottom HUD Action Bar */}
        <div className="absolute bottom-4 inset-x-0 mx-auto w-fit z-30 pointer-events-none">
          <WorldToolbar
            tool={tool}
            onSelectTool={chooseTool}
            settings={settings}
            onUpdateSettings={update}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
            canUndo={edits.canUndo}
            canRedo={edits.canRedo}
            onUndo={undo}
            onRedo={redo}
            dirty={dirty}
            unsavedCount={summary.tiles + summary.spawns.length}
            busy={busy}
            onSave={save}
            onDiscard={edits.discard}
          />
        </div>

        {/* Floating Slide-Out Drawer Panel (Exact osrs.world style) */}
        <WorldDrawer
          isOpen={isDrawerOpen}
          onToggleOpen={() => setIsDrawerOpen(!isDrawerOpen)}
          isPinned={isDrawerPinned}
          onTogglePinned={() => setIsDrawerPinned(!isDrawerPinned)}
          camera={camera ?? undefined}
          previewController={previewControllerRef}
          roofs={roofs}
          onRoofsChange={setRoofs}
          renderSettings={renderSettings}
          onRenderSettingsChange={setRenderSettings}
          plane={view.plane}
          onPlaneChange={(p) => {
            const at = {
              x: Math.floor(view.x),
              y: Math.floor(view.y) + (p - view.plane) * PLANE_HEIGHT,
            }
            goTo(at)
          }}
          planeSectors={planeSectors}
          centreRef={centreRef}
          centreExists={centreExists}
          centreMembers={centreMembers}
          onGoTo={goTo}
          neighbours={neighbours}
          tool={tool}
          settings={settings}
          onUpdateSettings={update}
          palette={palette}
          thumbnail={thumbnail}
          area={area}
          clip={clip}
          pasting={pasting}
          onCopyArea={copy}
          onPasteArea={startPaste}
          onTurnArea={doTurn}
          onClearArea={() => area && clearArea(area)}
          lightingPanel={lightingPanel}
          selected={selected}
          selectedSectorExists={!!selectedSector}
          tileEditData={
            selectedSector && selection
              ? tileEdit(selectedSector.working.tiles, selection.index)
              : null
          }
          onTileChange={setTile}
          sceneryHere={sceneryHere}
          doorsHere={doorsHere}
          npcsHere={npcsHere}
          itemsHere={itemsHere}
          tileFacing={
            selectedSector && selection
              ? selectedSector.working.tiles.direction[selection.index]
              : undefined
          }
          onSetOnTile={setOnTile}
          inspectorTab={tab}
          onInspectorTabChange={setTab}
          showLayers={show}
          onUpdateLayers={setShow}
          layerLabels={layerLabels}
          onFixFacing={fixFacing}
          dirty={dirty}
          onSave={save}
        />
      </div>
    </div>
  )
}

function onSelectedAt<T extends { x: number; y: number }>(list: T[], at: { x: number; y: number }) {
  return list.filter((entry) => entry.x === at.x && entry.y === at.y)
}
