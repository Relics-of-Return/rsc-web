/** Development status of a roadmap item. */
export type RoadmapStatus = 'Not Started' | 'In Progress' | 'Testing' | 'Complete'

/**
 * A single tracked feature on the development roadmap. All fields except
 * name/progress/status are optional detail lists shown when the card is
 * expanded.
 */
export interface RoadmapItem {
  name: string
  /** 0-100. Keep consistent with `status`. */
  progress: number
  status: RoadmapStatus
  description: string
  completedFeatures?: string[]
  plannedFeatures?: string[]
  knownIssues?: string[]
  notes?: string[]
}

/** A top-level roadmap category rendered as a collapsible section. */
export interface RoadmapCategory {
  id: string
  title: string
  description: string
  items: RoadmapItem[]
}
