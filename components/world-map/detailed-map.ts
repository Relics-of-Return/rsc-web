import type * as Leaflet from 'leaflet'

import { crownPath, staffRankName } from '@/data/ranks'
import type { PlayerPosition } from '@/lib/types'
import { formatUsername } from '@/lib/utils'
import { PLANE_ELEVATION, planeLabel } from '@/lib/world-map'

const BASE = '/world-map'
const CLASSIC_TILE = 3
const CLASSIC_PLANE_HEIGHT = 2736
const BACKGROUND = ['#24407f', '#000', '#000', '#000']
const BLANK_TILE = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

interface Meta {
  width: number
  height: number
  tileSize: number
  maxZoom: number
  westX: number
  tilePixels: number
  planes: Record<string, string[]>
}

interface Label {
  text: string
  x: number
  y: number
  size: number
  align?: 'center' | 'left'
  bold?: boolean
  colour?: string
}

interface Point {
  type: string
  x: number
  y: number
}

interface Options {
  onSelect?: (username: string) => void
}

async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/${path}`)

  if (!res.ok) {
    throw new Error(`${BASE}/${path}: ${res.status}`)
  }

  return res.json() as Promise<T>
}

export class DetailedMapView {
  private readonly markers = new Map<string, Leaflet.Marker>()
  private players: PlayerPosition[] = []
  private selected: string | null = null
  private showNames = true
  private readonly overlays: Leaflet.LayerGroup[]
  private readonly planeText: HTMLSpanElement

  private constructor(
    private readonly L: typeof Leaflet,
    private readonly map: Leaflet.Map,
    private readonly tiles: Leaflet.TileLayer,
    private readonly meta: Meta,
    private readonly state: { plane: number },
    private readonly container: HTMLElement,
    labels: Label[],
    points: Point[],
    private readonly onSelect?: (username: string) => void,
  ) {
    this.overlays = [0, 1, 2, 3].map(() => L.layerGroup())

    for (const label of labels) {
      this.addLabel(label)
    }

    for (const point of points) {
      this.addPoint(point)
    }

    this.planeText = this.addPlaneControl()
    this.map.on('zoomend', () => this.applyZoom())
    this.showPlane(0)
  }

  static async create(container: HTMLElement, { onSelect }: Options = {}) {
    const [L, meta, labels, points] = await Promise.all([
      import('leaflet').then((module) => module.default),
      getJSON<Meta>('detailed/meta.json'),
      getJSON<Label[]>('labels.json'),
      getJSON<Point[]>('points.json'),
    ])

    const map = L.map(container, {
      crs: L.CRS.Simple,
      minZoom: 0,
      // two zooms past the painted picture, drawn pixelated
      maxZoom: meta.maxZoom + 2,
      zoomSnap: 1,
      attributionControl: false,
    })

    const corner = (x: number, y: number) => map.unproject([x, y], meta.maxZoom)
    const bounds = L.latLngBounds(corner(0, meta.height), corner(meta.width, 0))

    map.setMaxBounds(bounds.pad(0.05))

    const state = { plane: 0 }
    const present = Object.values(meta.planes).map((keys) => new Set(keys))

    const tiles = L.tileLayer('', {
      tileSize: meta.tileSize,
      minNativeZoom: 0,
      maxNativeZoom: meta.maxZoom,
      noWrap: true,
      bounds,
    })

    // painted tiles only: the sea and the dark are the container's background
    tiles.getTileUrl = (coords) => {
      const key = `${coords.z}/${coords.x}/${coords.y}`

      return present[state.plane].has(key) ? `${BASE}/detailed/${state.plane}/${key}.png` : BLANK_TILE
    }

    tiles.addTo(map)

    const view = new DetailedMapView(L, map, tiles, meta, state, container, labels, points, onSelect)

    // Lumbridge, where the classic map opens too
    map.setView(view.toLatLng(view.tileToPixel(122, 655)), meta.maxZoom - 1)

    return view
  }

  private toLatLng([x, y]: [number, number]) {
    return this.map.unproject([x, y], this.meta.maxZoom)
  }

  private tileToPixel(x: number, localY: number): [number, number] {
    const { westX, tilePixels } = this.meta

    return [(westX - x) * tilePixels + tilePixels / 2, localY * tilePixels + tilePixels / 2]
  }

  private classicToPixel(x: number, y: number): [number, number] {
    const scale = this.meta.tilePixels / CLASSIC_TILE

    return [x * scale, (y % CLASSIC_PLANE_HEIGHT) * scale]
  }

  private addLabel({ text, x, y, size, align, bold, colour }: Label) {
    const span = document.createElement('span')

    span.className = 'rsc-dmap-label'
    span.textContent = text
    span.style.fontSize = `${size}px`
    span.style.fontWeight = bold ? '700' : '400'
    span.style.color = colour ?? '#fff'
    span.style.textAlign = align ?? 'left'

    if (align === 'center') {
      span.style.transform = 'translateX(-50%)'
    }

    const marker = this.L.marker(this.toLatLng(this.classicToPixel(x, y)), {
      icon: this.L.divIcon({ html: span, className: 'rsc-dmap-anchor', iconSize: [0, 0] }),
      interactive: false,
      keyboard: false,
    })

    this.overlays[Math.floor(y / CLASSIC_PLANE_HEIGHT)]?.addLayer(marker)
  }

  private addPoint({ type, x, y }: Point) {
    const image = document.createElement('img')
    const name = type.slice(type.lastIndexOf('/') + 1).replace(/-/g, ' ')

    image.src = `${BASE}/key/${type}.png`
    image.alt = ''
    image.title = name.charAt(0).toUpperCase() + name.slice(1)
    image.className = 'rsc-dmap-point'

    const marker = this.L.marker(this.toLatLng(this.classicToPixel(x + 7.5, y + 7.5)), {
      icon: this.L.divIcon({ html: image, className: 'rsc-dmap-anchor', iconSize: [0, 0] }),
      keyboard: false,
    })

    this.overlays[Math.floor(y / CLASSIC_PLANE_HEIGHT)]?.addLayer(marker)
  }

  private addPlaneControl() {
    const L = this.L
    const control = new L.Control({ position: 'topright' })
    const text = document.createElement('span')

    control.onAdd = () => {
      const box = L.DomUtil.create('div', 'leaflet-bar rsc-dmap-planes')
      const button = (label: string, title: string, change: number) => {
        const element = L.DomUtil.create('a', '', box)

        element.href = '#'
        element.role = 'button'
        element.title = title
        element.textContent = label
        L.DomEvent.on(element, 'click', (event) => {
          L.DomEvent.preventDefault(event)
          this.showPlane(this.state.plane + change)
        })
      }

      button('▲', 'Up a floor', 1)
      box.appendChild(text)
      button('▼', 'Down a floor', -1)
      L.DomEvent.disableClickPropagation(box)

      return box
    }

    control.addTo(this.map)

    return text
  }

  /** 0 surface, 1-2 upstairs, 3 underground; Up from 3 wraps to the surface. */
  private showPlane(next: number) {
    const plane = ((next % 4) + 4) % 4

    this.overlays[this.state.plane]?.remove()
    this.state.plane = plane
    this.overlays[plane]?.addTo(this.map)
    this.container.style.backgroundColor = BACKGROUND[plane]
    this.planeText.textContent = planeLabel(plane)
    this.tiles.redraw()
    this.render()
    this.applyZoom()
  }

  /** Labels and icons only once the picture is big enough to read them. */
  private applyZoom() {
    const zoom = this.map.getZoom()

    this.container.classList.toggle('rsc-dmap--far', zoom < 1)
    this.container.classList.toggle('rsc-dmap--compact', zoom < this.meta.maxZoom - 1)
  }

  setPlayers(players: PlayerPosition[]) {
    this.players = players
    this.render()
  }

  setSelected(username: string | null) {
    this.selected = username

    for (const [name, marker] of this.markers) {
      marker.getElement()?.classList.toggle('rsc-map-marker--selected', name === username)
    }
  }

  setShowNames(showNames: boolean) {
    this.showNames = showNames

    for (const marker of this.markers.values()) {
      marker.getElement()?.classList.toggle('rsc-map-marker--anonymous', !showNames)
    }
  }

  focus(username: string) {
    const player = this.players.find((entry) => entry.username === username)

    if (!player) {
      return false
    }

    const plane = Math.floor(player.y / PLANE_ELEVATION)

    if (plane !== this.state.plane) {
      this.showPlane(plane)
    }

    this.map.setView(
      this.toLatLng(this.tileToPixel(player.x, player.y - plane * PLANE_ELEVATION)),
      Math.max(this.map.getZoom(), this.meta.maxZoom),
    )

    return true
  }

  destroy() {
    this.map.remove()
    this.markers.clear()
  }

  private render() {
    const visible = new Set<string>()

    for (const player of this.players) {
      const plane = Math.floor(player.y / PLANE_ELEVATION)

      if (plane !== this.state.plane) {
        continue
      }

      visible.add(player.username)

      const at = this.toLatLng(this.tileToPixel(player.x, player.y - plane * PLANE_ELEVATION))
      let marker = this.markers.get(player.username)

      if (!marker) {
        marker = this.createMarker(player.username).addTo(this.map)
        this.markers.set(player.username, marker)
      }

      marker.setLatLng(at)

      const element = marker.getElement()

      if (element) {
        element.title =
          `${formatUsername(player.username)} — world ${player.world}, ` +
          `${planeLabel(plane).toLowerCase()} (${player.x}, ${player.y})`
        setCrown(element, player.rank)
      }
    }

    for (const [username, marker] of this.markers) {
      if (!visible.has(username)) {
        marker.remove()
        this.markers.delete(username)
      }
    }
  }

  private createMarker(username: string) {
    const L = this.L
    const element = document.createElement('div')
    const pin = document.createElement('div')
    const name = document.createElement('div')

    pin.className = 'rsc-map-marker__pin'
    name.className = 'rsc-map-marker__name'
    name.textContent = formatUsername(username)
    element.append(pin, name)

    const classes = ['rsc-map-marker']

    if (username === this.selected) classes.push('rsc-map-marker--selected')
    if (!this.showNames) classes.push('rsc-map-marker--anonymous')

    const marker = L.marker([0, 0], {
      icon: L.divIcon({ html: element, className: classes.join(' '), iconSize: [15, 15] }),
      keyboard: false,
    })

    marker.on('click', () => this.onSelect?.(username))

    return marker
  }
}

function setCrown(marker: HTMLElement, rank: number | undefined) {
  const name = marker.querySelector('.rsc-map-marker__name')
  const src = crownPath(rank)
  const existing = name?.querySelector('img')

  if (!name || (existing?.getAttribute('src') ?? null) === src) {
    return
  }

  existing?.remove()

  if (src) {
    const crown = document.createElement('img')

    crown.className = 'rsc-map-marker__crown'
    crown.src = src
    crown.alt = `${staffRankName(rank)} crown`
    name.prepend(crown)
  }
}
