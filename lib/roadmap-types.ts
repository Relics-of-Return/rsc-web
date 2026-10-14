/**
 * Where a feature is in the dev → beta → live release pipeline
 * (documentation/RELEASE_CHANNELS.md), or `planned` when it has not
 * been started.
 */
export type RoadmapStage = 'live' | 'beta' | 'dev' | 'planned'

/** What part of the project a feature belongs to. */
export type RoadmapArea = 'gameplay' | 'client' | 'world' | 'economy' | 'community' | 'tools'

/** A single tracked feature on the roadmap. */
export interface RoadmapItem {
  id: string
  title: string
  stage: RoadmapStage
  area: RoadmapArea
  /** One or two sentences, shown on the card. */
  summary: string
  /** A picture shown at the top of the expanded card. */
  image?: { src: string; alt: string; width: number; height: number }
  /** What is in it (stage `live`/`beta`/`dev`). */
  highlights?: string[]
  /** What is not done yet, or any caveat players should know. */
  remaining?: string[]
}
