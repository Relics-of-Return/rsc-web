import type WorldMap from '@2003scape/rsc-world-map'

import { MAP_IMAGE_WIDTH, MAP_X_ORIGIN, TILE_SIZE } from '@/lib/world-map'

const BASE = '/world-map'

type Options = ConstructorParameters<typeof WorldMap>[0]
type Point = NonNullable<Options['points']>[number]

export interface BakedMap {
  labels: NonNullable<Options['labels']>
  objects: NonNullable<Options['objects']>
  points: Point[]
  extraPoints: Point[]
}

async function getJSON<T>(name: string): Promise<T> {
  const res = await fetch(`${BASE}/${name}`)

  if (!res.ok) {
    throw new Error(`${BASE}/${name}: ${res.status}`)
  }

  return res.json() as Promise<T>
}

export async function loadBakedMap(): Promise<BakedMap> {
  const [labels, points, objects] = await Promise.all([
    getJSON<BakedMap['labels']>('labels.json'),
    getJSON<Point[]>('points.json'),
    getJSON<BakedMap['objects']>('objects.json'),
  ])

  const east = (MAP_IMAGE_WIDTH - MAP_X_ORIGIN) / TILE_SIZE

  return {
    labels,
    objects: objects.map((object) => ({ ...object, x: object.x + east })),
    points: points.filter((point) => !point.type.includes('/')),
    extraPoints: points.filter((point) => point.type.includes('/')),
  }
}

export function swapInBakedPlanes(worldMap: WorldMap) {
  const bundled = worldMap.loadImages.bind(worldMap)

  worldMap.imageWidth = MAP_IMAGE_WIDTH
  worldMap.planeWrap.style.width = `${MAP_IMAGE_WIDTH}px`

  worldMap.loadImages = async () => {
    await bundled()
    await Promise.all(
      worldMap.planeImages.map(
        (image, plane) =>
          new Promise<void>((resolve, reject) => {
            image.onload = () => resolve()
            image.onerror = () => reject(new Error(`${BASE}/plane-${plane}.png failed to load`))
            image.src = `${BASE}/plane-${plane}.png`
          }),
      ),
    )
  }
}

export function addExtraPoints(worldMap: WorldMap, extraPoints: Point[]) {
  const { pointElements, keyElements } = worldMap
  const template = Object.values(pointElements.elements)[0]

  if (!template || extraPoints.length === 0) {
    return
  }

  for (const type of new Set(extraPoints.map((point) => point.type))) {
    const element = template.cloneNode(true) as HTMLElement
    const name = type.slice(type.lastIndexOf('/') + 1).replace(/-/g, ' ')

    element.title = name.charAt(0).toUpperCase() + name.slice(1)
    element.querySelector('img')?.setAttribute('src', `${BASE}/key/${type}.png`)

    pointElements.elements[type] = element
    keyElements.toggledPoints[type] = true
  }

  pointElements.points = [...pointElements.points, ...extraPoints]

  worldMap.setPlaneLevel(worldMap.currentPlane)
}
