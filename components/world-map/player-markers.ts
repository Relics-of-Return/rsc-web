import type WorldMap from '@2003scape/rsc-world-map'

import { crownPath, staffRankName } from '@/data/ranks'
import type { PlayerPosition } from '@/lib/types'
import { gameToMap, isOnMap, planeLabel } from '@/lib/world-map'

/**
 * Draws live players on top of `@2003scape/rsc-world-map`.
 *
 * Markers are appended straight into the library's `planeWrap` as 15x15 `div`
 * elements carrying `data-x`/`data-y`, which is exactly the shape its zoom
 * handler expects — so panning and the four zoom levels reposition players for
 * free. The library wipes and rebuilds those children whenever the plane
 * changes, so `setPlaneLevel` and `zoom` are wrapped to keep markers in sync.
 */

/** Matches the size of the library's point-of-interest icons. */
const MARKER_SIZE = 15
const MARKER_CENTRE = MARKER_SIZE / 2

/** Background the library gives the ocean, restored when leaving a plane. */
const SURFACE_BACKGROUND = '#24407f'

/** Margins the library applies to `div` children at zoom levels 1 and 2. */
const ZOOM_MARGINS: Record<number, string> = {
  1: '7.5px 0 0 7.5px',
  2: '22.5px 0 0 22.5px',
}

const FOCUS_TRANSITION_MS = 500

interface PlayerMarkersOptions {
  /** Fired when a marker is clicked (a click, not the end of a map drag). */
  onSelect?: (username: string) => void
}

export class PlayerMarkers {
  private readonly worldMap: WorldMap
  private readonly onSelect?: (username: string) => void
  private readonly markers = new Map<string, HTMLDivElement>()

  private players: PlayerPosition[] = []
  private selected: string | null = null
  private showNames = true
  private destroyed = false

  private originalSetPlaneLevel?: WorldMap['setPlaneLevel']
  private originalZoom?: WorldMap['zoomElements']['zoom']
  private focusTimeout?: ReturnType<typeof setTimeout>

  constructor(worldMap: WorldMap, { onSelect }: PlayerMarkersOptions = {}) {
    this.worldMap = worldMap
    this.onSelect = onSelect
  }

  /** Wraps the library methods that would otherwise drop or misplace markers. */
  attach(): void {
    const { worldMap } = this

    this.originalSetPlaneLevel = worldMap.setPlaneLevel.bind(worldMap)

    worldMap.setPlaneLevel = (level: number) => {
      this.originalSetPlaneLevel?.(level)

      // the library only ever switches the backdrop to black, never back
      worldMap.container.style.backgroundColor =
        level === 0 ? SURFACE_BACKGROUND : '#000'

      this.render()
    }

    const { zoomElements } = worldMap

    this.originalZoom = zoomElements.zoom.bind(zoomElements)

    zoomElements.zoom = (level: number, offsetX?: number, offsetY?: number) => {
      this.originalZoom?.(level, offsetX, offsetY)
      this.applyZoomLevel()
    }
  }

  /** Replaces the tracked players and redraws the markers. */
  setPlayers(players: PlayerPosition[]): void {
    this.players = players
    this.render()
  }

  /** Highlights a single player, or clears the highlight with `null`. */
  setSelected(username: string | null): void {
    this.selected = username

    for (const [name, marker] of this.markers) {
      marker.classList.toggle('rsc-map-marker--selected', name === username)
    }
  }

  setShowNames(showNames: boolean): void {
    this.showNames = showNames

    for (const marker of this.markers.values()) {
      marker.classList.toggle('rsc-map-marker--anonymous', !showNames)
    }
  }

  /**
   * Centres the map on a player, switching plane first when they are upstairs
   * or underground. Returns false when they are not on the map at all.
   */
  focus(username: string): boolean {
    const player = this.players.find((entry) => entry.username === username)

    if (!player) {
      return false
    }

    const point = gameToMap(player.x, player.y, player.plane)

    if (!isOnMap(point)) {
      return false
    }

    if (point.plane !== this.worldMap.currentPlane) {
      this.worldMap.setPlaneLevel(point.plane)
    }

    const marker = this.markers.get(username)

    if (!marker) {
      return false
    }

    const { container, draggable, planeWrap, zoomElements } = this.worldMap
    const marginLeft = Number.parseFloat(marker.style.marginLeft) || 0
    const marginTop = Number.parseFloat(marker.style.marginTop) || 0

    if (this.worldMap.transitions) {
      planeWrap.style.transition = `transform ${FOCUS_TRANSITION_MS / 1000}s ease-in`

      clearTimeout(this.focusTimeout)

      this.focusTimeout = setTimeout(() => {
        planeWrap.style.transition = ''
      }, FOCUS_TRANSITION_MS)
    }

    draggable.mapRelativeX =
      zoomElements.scale * -Number(marker.dataset.x) +
      container.clientWidth / 2 -
      MARKER_CENTRE -
      marginLeft

    draggable.mapRelativeY =
      zoomElements.scale * -Number(marker.dataset.y) +
      container.clientHeight / 2 -
      MARKER_CENTRE -
      marginTop

    this.worldMap.scrollMap()
    this.worldMap.overviewElements.refreshSelection()

    return true
  }

  /** Restores the wrapped library methods and removes every marker. */
  destroy(): void {
    this.destroyed = true
    clearTimeout(this.focusTimeout)

    if (this.originalSetPlaneLevel) {
      this.worldMap.setPlaneLevel = this.originalSetPlaneLevel
    }

    if (this.originalZoom) {
      this.worldMap.zoomElements.zoom = this.originalZoom
    }

    for (const marker of this.markers.values()) {
      marker.remove()
    }

    this.markers.clear()
  }

  /** Adds, moves and removes markers so the DOM matches `this.players`. */
  private render(): void {
    if (this.destroyed) {
      return
    }

    const plane = this.worldMap.currentPlane
    const visible = new Set<string>()

    for (const player of this.players) {
      const point = gameToMap(player.x, player.y, player.plane)

      if (point.plane !== plane || !isOnMap(point)) {
        continue
      }

      visible.add(player.username)

      let marker = this.markers.get(player.username)

      if (!marker) {
        marker = this.createMarker(player.username)
        this.markers.set(player.username, marker)
      }

      this.setCrown(marker, player.rank)

      marker.title =
        `${player.username} — world ${player.world}, ` +
        `${planeLabel(point.plane).toLowerCase()} (${player.x}, ${player.y})`

      marker.dataset.x = String(point.x - MARKER_CENTRE)
      marker.dataset.y = String(point.y - MARKER_CENTRE)

      this.position(marker)

      if (!marker.isConnected) {
        this.worldMap.planeWrap.appendChild(marker)
      }
    }

    for (const [username, marker] of this.markers) {
      if (!visible.has(username)) {
        marker.remove()
        this.markers.delete(username)
      }
    }
  }

  private createMarker(username: string): HTMLDivElement {
    const marker = document.createElement('div')

    marker.className = 'rsc-map-marker'
    marker.classList.toggle('rsc-map-marker--selected', username === this.selected)
    marker.classList.toggle('rsc-map-marker--anonymous', !this.showNames)
    marker.classList.toggle(
      'rsc-map-marker--compact',
      this.worldMap.zoomElements.level === -1,
    )

    const pin = document.createElement('div')
    pin.className = 'rsc-map-marker__pin'
    marker.appendChild(pin)

    const name = document.createElement('div')
    name.className = 'rsc-map-marker__name'
    name.textContent = username
    marker.appendChild(name)

    // tell a click on the marker apart from the end of a map drag
    let downX = 0
    let downY = 0

    marker.addEventListener(
      'mousedown',
      (event) => {
        downX = event.clientX
        downY = event.clientY
      },
      false,
    )

    marker.addEventListener(
      'click',
      (event) => {
        if (Math.hypot(event.clientX - downX, event.clientY - downY) > 4) {
          return
        }

        event.stopPropagation()
        this.onSelect?.(username)
      },
      false,
    )

    return marker
  }

  /** Puts the player's staff crown in front of the name on their marker. */
  private setCrown(marker: HTMLDivElement, rank: number | undefined): void {
    const name = marker.querySelector('.rsc-map-marker__name')

    if (!name) {
      return
    }

    const existing = name.querySelector('img')
    const src = crownPath(rank)

    if (!src) {
      existing?.remove()
      return
    }

    if (existing?.getAttribute('src') === src) {
      return
    }

    const crown = existing ?? document.createElement('img')

    crown.className = 'rsc-map-marker__crown'
    crown.src = src
    crown.alt = `${staffRankName(rank)} crown`

    if (!existing) {
      name.prepend(crown)
    }
  }

  /** Positions a marker the way the library positions its own `div` children. */
  private position(marker: HTMLDivElement): void {
    const { level, scale } = this.worldMap.zoomElements

    marker.style.left = `${Number(marker.dataset.x) * scale}px`
    marker.style.top = `${Number(marker.dataset.y) * scale}px`
    marker.style.margin = ZOOM_MARGINS[level] ?? ''
    marker.style.transform = level === -1 ? 'scale(0.5)' : ''
  }

  /** Names are unreadable once the map is scaled down to half size. */
  private applyZoomLevel(): void {
    const compact = this.worldMap.zoomElements.level === -1

    for (const marker of this.markers.values()) {
      marker.classList.toggle('rsc-map-marker--compact', compact)
    }
  }
}
