'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { CheckPanel } from '@/components/world-map/CheckPanel'
import { ObjectList } from '@/components/world-map/ObjectList'
import { ItemList, NpcList } from '@/components/world-map/SpawnList'
import { TileInspector } from '@/components/world-map/TileInspector'
import { ToolPanel } from '@/components/world-map/ToolPanel'
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
  ZOOMS,
  footprint,
  type MapLayers,
  type MapView,
  type PointerTile,
  type SectorLayer,
  type TileArea,
} from '@/components/world-map/WorldCanvas'
import {
  WorldPreview3D,
  type PreviewCamera,
  type PreviewHit,
} from '@/components/world-map/WorldPreview3D'
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
import { planeLabel } from '@/lib/world-map'

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

const EMPTY = new Set<number>()

type Tab = 'tile' | 'scenery' | 'doors' | 'npcs' | 'items'

/** The middle of a sector, in game coordinates. */
function middleOf(ref: { plane: number; x: number; y: number }) {
  return {
    x: (ref.x - MIN_REGION_X) * SECTOR_SIZE + SECTOR_SIZE / 2,
    y: (ref.y - MIN_REGION_Y) * SECTOR_SIZE + SECTOR_SIZE / 2 + ref.plane * PLANE_HEIGHT,
  }
}

function nameOf(ref: { plane: number; x: number; y: number }) {
  return `m${ref.plane}${String(ref.x).padStart(2, '0')}${String(ref.y).padStart(2, '0')}`
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

  const [tab, setTab] = useState<Tab>('tile')
  const [tool, setTool] = useState<Tool>('objects')
  const [settings, setSettings] = useState<ToolSettings>(DEFAULT_SETTINGS)
  const [show, setShow] = useState<MapLayers>(DEFAULT_LAYERS)

  const [area, setArea] = useState<TileArea | null>(null)
  const [clip, setClip] = useState<Clip | null>(null)
  const [pasting, setPasting] = useState(false)
  const [turn, setTurn] = useState<Turn>(NO_TURN)

  const [goto, setGoto] = useState({ x: '', y: '' })
  const [thumbnail, setThumbnail] = useState<
    ((kind: 'object' | 'door', id: number) => string | null) | null
  >(null)

  const update = useCallback((patch: Partial<ToolSettings>) => {
    setSettings((current) => ({ ...current, ...patch }))
  }, [])

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
    : tool === 'area'
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

      const toolIndex = /^F?([1-9])$/.exec(key)

      if (toolIndex && !event.altKey) {
        event.preventDefault()
        chooseTool(TOOLS[Number(toolIndex[1]) - 1].id)
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
      return `Ground · ${where}`
    }

    const overlay = sector.working.tiles.overlay[index]
    const surface = overlay
      ? (palette.overlays[String(overlay)]?.name ?? `overlay ${overlay}`)
      : 'Ground'

    return `${surface} · height ${sector.working.tiles.elevation[index]} · ${where}`
  }

  const zoomIndex = ZOOMS.indexOf(view.zoom as (typeof ZOOMS)[number])

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
  ]

  return (
    <div className="space-y-4">
      {/* navigation */}
      <div className="flex flex-wrap items-end gap-3 rounded border border-stone-700 bg-stone-900/60 p-3">
        <label className="text-xs uppercase tracking-wide text-text-secondary">
          Plane
          <select
            className="mt-1 block rounded border border-stone-700 bg-stone-900 px-2 py-1 text-sm text-text-primary"
            value={view.plane}
            onChange={(e) => {
              const plane = Number(e.target.value)
              const at = {
                x: Math.floor(view.x),
                y: Math.floor(view.y) + (plane - view.plane) * PLANE_HEIGHT,
              }

              goTo(at)
            }}
          >
            {[0, 1, 2, 3].map((plane) => (
              <option key={plane} value={plane}>
                {planeLabel(plane)}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs uppercase tracking-wide text-text-secondary">
          Sector
          <select
            className="mt-1 block rounded border border-stone-700 bg-stone-900 px-2 py-1 text-sm text-text-primary"
            value={centreExists ? `${centreRef.x},${centreRef.y}` : ''}
            onChange={(e) => {
              const [x, y] = e.target.value.split(',').map(Number)
              const middle = middleOf({ plane: view.plane, x, y })

              goTo({ x: middle.x, y: middle.y })
            }}
          >
            {!centreExists && <option value="">— nothing built here —</option>}
            {planeSectors.map((s) => {
              const minX = (s.x - MIN_REGION_X) * SECTOR_SIZE
              const minY = (s.y - MIN_REGION_Y) * SECTOR_SIZE + s.plane * PLANE_HEIGHT

              return (
                <option key={s.name} value={`${s.x},${s.y}`}>
                  {s.x},{s.y} — game {minX}–{minX + 47}, {minY}–{minY + 47}
                  {s.members ? ' (members)' : ''}
                </option>
              )
            })}
          </select>
        </label>

        <div className="flex gap-1">
          {neighbours.map((n) => (
            <button
              key={n.label}
              type="button"
              title={`A sector ${n.title}`}
              onClick={() =>
                goTo({
                  x: Math.floor(view.x) + n.dx * SECTOR_SIZE,
                  y: Math.floor(view.y) + n.dy * SECTOR_SIZE,
                })
              }
              className="h-8 w-8 rounded border border-stone-700 bg-stone-800 text-sm text-text-primary hover:border-gold-500"
            >
              {n.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Zoom out (-)"
            disabled={zoomIndex <= 0}
            onClick={() => setView({ ...view, zoom: ZOOMS[zoomIndex - 1] })}
            className="h-8 w-8 rounded border border-stone-700 bg-stone-800 text-sm text-text-primary hover:border-gold-500 disabled:opacity-30"
          >
            −
          </button>
          <span className="w-12 text-center text-xs text-text-secondary">{view.zoom} px</span>
          <button
            type="button"
            title="Zoom in (+)"
            disabled={zoomIndex >= ZOOMS.length - 1}
            onClick={() => setView({ ...view, zoom: ZOOMS[zoomIndex + 1] })}
            className="h-8 w-8 rounded border border-stone-700 bg-stone-800 text-sm text-text-primary hover:border-gold-500 disabled:opacity-30"
          >
            +
          </button>
        </div>

        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()

            const x = Number.parseInt(goto.x, 10)
            const y = Number.parseInt(goto.y, 10)

            if (!Number.isFinite(x) || !Number.isFinite(y)) {
              return
            }

            if (!existing.has(keyOf(sectorOfGame(x, y)))) {
              setNotice({ kind: 'error', text: `Nothing is built at ${x}, ${y}.` })
              return
            }

            setSelected({ x, y })
            goTo({ x, y })
          }}
        >
          <label className="text-xs uppercase tracking-wide text-text-secondary">
            Go to game x, y
            <span className="mt-1 flex gap-1">
              <input
                className="w-20 rounded border border-stone-700 bg-stone-900 px-2 py-1 text-sm text-text-primary"
                inputMode="numeric"
                placeholder="x"
                value={goto.x}
                onChange={(e) => setGoto((g) => ({ ...g, x: e.target.value }))}
              />
              <input
                className="w-20 rounded border border-stone-700 bg-stone-900 px-2 py-1 text-sm text-text-primary"
                inputMode="numeric"
                placeholder="y"
                value={goto.y}
                onChange={(e) => setGoto((g) => ({ ...g, y: e.target.value }))}
              />
            </span>
          </label>
          <Button type="submit" size="sm" variant="outline">
            Go
          </Button>
        </form>
      </div>

      {notice && (
        <div
          className={cn(
            'rounded border p-3 text-sm',
            notice.kind === 'ok' && 'border-emerald-700 bg-emerald-950/40 text-emerald-200',
            notice.kind === 'error' && 'border-red-800 bg-red-950/40 text-red-300',
            notice.kind === 'conflict' && 'border-amber-700 bg-amber-950/40 text-amber-200',
          )}
        >
          {notice.text}
          {notice.kind === 'conflict' && notice.sectors?.length ? (
            <button
              type="button"
              className="ml-2 underline"
              onClick={() => {
                const names = new Set(notice.sectors)
                const keys = [...open.values()]
                  .filter((s) => names.has(s.loaded.name))
                  .map((s) => keyOf(s.loaded))

                if (
                  window.confirm(
                    `Reloading ${notice.sectors!.join(', ')} throws away your unsaved changes there. Continue?`,
                  )
                ) {
                  edits
                    .reload(keys)
                    .then(() => setNotice(null))
                    .catch((error) =>
                      setNotice({
                        kind: 'error',
                        text: error instanceof Error ? error.message : 'could not reload',
                      }),
                    )
                }
              }}
            >
              Reload {notice.sectors.length === 1 ? 'it' : 'them'}
            </button>
          ) : null}
        </div>
      )}

      {/* the tools */}
      <div className="flex flex-wrap items-center gap-2 rounded border border-stone-700 bg-stone-900/60 p-2">
        <div className="flex flex-wrap gap-1" role="toolbar" aria-label="Tools">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              title={`${t.hint} (${t.key} or F${t.key})`}
              aria-pressed={tool === t.id}
              onClick={() => chooseTool(t.id)}
              className={cn(
                'rounded border px-2 py-1 text-xs uppercase tracking-wide',
                tool === t.id
                  ? 'border-gold-500 bg-gold-500 text-stone-950'
                  : 'border-stone-700 bg-stone-800 text-text-secondary hover:text-text-primary',
              )}
            >
              <span className="mr-1 opacity-60">{t.key}</span>
              {t.label}
            </button>
          ))}
        </div>

        <details className="relative">
          <summary className="cursor-pointer select-none rounded border border-stone-700 bg-stone-800 px-2 py-1 text-xs uppercase tracking-wide text-text-secondary hover:text-text-primary">
            Layers
          </summary>
          <div className="absolute z-20 mt-1 grid w-48 grid-cols-2 gap-1 rounded border border-stone-700 bg-stone-900 p-2 text-xs text-text-secondary shadow-lg">
            {layerLabels.map(([layer, label]) => (
              <label key={layer} className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  className="accent-gold-500"
                  checked={show[layer]}
                  onChange={(e) => setShow((s) => ({ ...s, [layer]: e.target.checked }))}
                />
                {label}
              </label>
            ))}
          </div>
        </details>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" disabled={!edits.canUndo} onClick={undo}>
            Undo{edits.canUndo ? ` (${edits.canUndo})` : ''}
          </Button>
          <Button size="sm" variant="outline" disabled={!edits.canRedo} onClick={redo}>
            Redo{edits.canRedo ? ` (${edits.canRedo})` : ''}
          </Button>
          <Button size="sm" variant="outline" disabled={!dirty || busy !== null} onClick={edits.discard}>
            Discard
          </Button>
          <Button size="sm" disabled={!dirty || busy !== null} onClick={save}>
            {busy === 'saving' ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>

      {/*
        the map, the game's view and the inspector: three columns on a wide
        screen; on a narrower one the view goes under the map
      */}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_20rem]">
        {/* the map */}
        <div className="min-w-0 space-y-2 lg:col-start-1 lg:row-start-1">
          <p role="status" className="text-xs text-text-secondary">
            {centreExists ? nameOf(centreRef) : 'open sea'}
            {centreMembers ? ' · members' : ''}
            {dirty
              ? ` · ${summary.tiles} tile${summary.tiles === 1 ? '' : 's'}` +
                summary.spawns.map((s) => ` + ${s}`).join('') +
                ' unsaved' +
                (summary.sectors > 1 ? ` in ${summary.sectors} sectors` : '')
              : ''}
          </p>

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
            brush={brushed && !pasting ? { size: settings.size, round: settings.round } : undefined}
            repeat={
              tool === 'height' && ['raise', 'lower', 'smooth'].includes(settings.heightAction)
                ? 120
                : undefined
            }
            area={tool === 'area' ? area : null}
            stamp={stampArea}
            boxes={npcsHere}
            onVisible={onVisible}
            onPress={pressAt}
            onDrag={dragAt}
            onArea={setArea}
            onHover={setHover}
          />

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-text-secondary">
            <span>
              {hover ? `${hover.x}, ${hover.y}` : 'hover a tile'}
              {hoverHeight !== null ? ` · height ${hoverHeight}` : ''}
              {hoverNames.length ? ` · ${hoverNames.join(', ')}` : ''}
            </span>
            <span><span className="text-[#e8d9a0]">━</span> wall</span>
            <span><span className="text-[#c9a227]">╱</span> diagonal</span>
            <span><span className="text-[#7ad1ff]">●</span> scenery</span>
            <span><span className="text-[#ff9d3c]">━</span> door</span>
            <span><span className="text-[#ff5cf0]">◆</span> NPC</span>
            <span><span className="text-[#ffe14d]">■</span> item</span>
            <span><span className="text-[#ff5c5c]">□</span> unsaved</span>
            <span><span className="text-white">◆</span> 3D camera</span>
          </div>
          <p className="text-[11px] text-text-secondary/80">
            1–9 or F1–F9 pick a tool. Right-drag scrolls (so does dragging when
            selecting), the wheel zooms, PageUp/PageDown change floor. Alt+click
            takes what is under the pointer. [ ] size the brush, {'{ }'} its
            strength. Ctrl+Z undoes, Ctrl+Y redoes.
          </p>
        </div>

        {/* what the game draws */}
        <div className="min-w-0 lg:col-start-1 lg:row-start-2 2xl:col-start-2 2xl:row-start-1">
          <WorldPreview3D
            sectors={preview.sectors}
            objects={preview.objects}
            wallObjects={preview.wallObjects}
            focus={focus}
            selected={selected}
            mapsVersion={mapsVersion}
            describe={describeInView}
            onPick={pickInView}
            onCamera={setCamera}
            onThumbnails={(draw) => setThumbnail(() => draw)}
          />
        </div>

        {/* the tool, the selected tile, and the checker */}
        <aside className="w-full space-y-3 lg:col-start-2 lg:row-span-2 lg:row-start-1 2xl:col-start-3 2xl:row-span-1">
          <section className="space-y-2 rounded border border-stone-700 bg-stone-900/60 p-3" aria-label="Tool">
            <h3 className="text-xs uppercase tracking-wide text-gold-400">
              {TOOLS.find((t) => t.id === tool)?.label}
              <span className="ml-2 normal-case tracking-normal text-text-secondary">
                {TOOLS.find((t) => t.id === tool)?.hint}
              </span>
            </h3>
            <ToolPanel
              tool={tool}
              settings={settings}
              update={update}
              palette={palette}
              thumbnail={thumbnail}
              area={area}
              clip={clip}
              pasting={pasting}
              onCopy={copy}
              onPaste={startPaste}
              onTurn={doTurn}
              onClearArea={() => area && clearArea(area)}
            />
          </section>

          <section className="space-y-3 rounded border border-stone-700 bg-stone-900/60 p-3" aria-label="Selected tile">
            {!selection ? (
              <p className="text-sm text-text-secondary">
                Click a tile with the Objects tool (1) to inspect it.
              </p>
            ) : !selectedSector ? (
              <p className="text-sm text-text-secondary">
                {existing.has(selection.key)
                  ? 'Loading this tile…'
                  : `Nothing is built at ${selected!.x}, ${selected!.y}.`}
              </p>
            ) : (
              <>
                <div className="flex flex-wrap gap-1">
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
                      onClick={() => setTab(value)}
                      className={cn(
                        'flex-1 rounded px-1.5 py-1 text-[11px] uppercase tracking-wide',
                        tab === value
                          ? 'bg-stone-700 text-gold-400'
                          : 'text-text-secondary hover:text-text-primary',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {tab === 'tile' && (
                  <TileInspector
                    tile={tileEdit(selectedSector.working.tiles, selection.index)}
                    palette={palette}
                    sector={selection.ref}
                    onChange={setTile}
                  />
                )}

                {tab === 'scenery' && selected && (
                  <ObjectList
                    kind="scenery"
                    names={palette.objects}
                    entries={sceneryHere}
                    at={selected}
                    tileFacing={selectedSector.working.tiles.direction[selection.index]}
                    onChange={(next) => setOnTile('objects', next)}
                  />
                )}

                {tab === 'doors' && selected && (
                  <ObjectList
                    kind="doors"
                    names={palette.wallObjects}
                    entries={doorsHere}
                    at={selected}
                    onChange={(next) => setOnTile('wallObjects', next)}
                  />
                )}

                {tab === 'npcs' && (
                  <NpcList
                    names={palette.npcs}
                    entries={npcsHere}
                    onChange={(next) => setOnTile('npcs', next)}
                  />
                )}

                {tab === 'items' && (
                  <ItemList
                    names={palette.items}
                    entries={itemsHere}
                    onChange={(next) => setOnTile('items', next)}
                  />
                )}
              </>
            )}
          </section>

          <details className="rounded border border-stone-700 bg-stone-900/60 p-3">
            <summary className="cursor-pointer text-xs uppercase tracking-wide text-gold-400">
              Check the world
            </summary>
            <div className="mt-2">
              <CheckPanel
                onGo={(at) => {
                  setSelected({ x: at.x, y: at.y })
                  goTo(at)
                }}
                onFixFacing={fixFacing}
              />
            </div>
          </details>
        </aside>
      </div>
    </div>
  )
}

function onSelectedAt<T extends { x: number; y: number }>(list: T[], at: { x: number; y: number }) {
  return list.filter((entry) => entry.x === at.x && entry.y === at.y)
}
