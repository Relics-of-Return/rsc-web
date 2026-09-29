/**
 * Ambient types for `@2003scape/rsc-world-map`, which ships a browserify UMD
 * bundle with no declarations. Only the members the site actually touches are
 * described here; see `node_modules/@2003scape/rsc-world-map/src` for the rest.
 */
declare module '@2003scape/rsc-world-map' {
  interface WorldMapLabel {
    text: string
    x: number
    y: number
    size: number
    align?: 'center' | 'left'
    bold?: boolean
    colour?: string
  }

  interface WorldMapPoint {
    type: string
    x: number
    y: number
  }

  interface WorldMapObject {
    id: number
    x: number
    y: number
  }

  interface WorldMapOptions {
    container: HTMLElement
    labels?: WorldMapLabel[]
    points?: WorldMapPoint[]
    objects?: WorldMapObject[]
  }

  /** Pans the map by writing to `mapRelativeX`/`Y` then calling `scrollMap()`. */
  interface Draggable {
    mapRelativeX: number
    mapRelativeY: number
    lock: boolean
  }

  /** `level` is -1..2; `scale` is the matching 0.5/1/2/4 multiplier. */
  interface ZoomElements {
    level: number
    scale: number
    zoom(level: number, offsetX?: number, offsetY?: number): void
  }

  interface OverviewElements {
    refreshSelection(): void
  }

  interface SearchElements {
    search(terms: string): void
  }

  class WorldMap {
    constructor(options: WorldMapOptions)

    container: HTMLElement
    planeWrap: HTMLElement
    /** Currently displayed plane: 0 surface, 1-2 upstairs, 3 underground. */
    currentPlane: number
    transitions: boolean
    draggable: Draggable
    zoomElements: ZoomElements
    overviewElements: OverviewElements
    searchElements: SearchElements

    init(): Promise<void>
    setPlaneLevel(level: number): void
    scrollMap(): void
  }

  export = WorldMap
}
