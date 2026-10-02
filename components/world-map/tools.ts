import type { MapLayers } from '@/components/world-map/WorldCanvas'

/**
 * The editor's tools, after the in-house one's modes: each is on a number
 * key and an F key, and changes what a click on the map does.
 */

export type Tool =
  | 'objects'
  | 'height'
  | 'underlay'
  | 'overlay'
  | 'walls'
  | 'roofs'
  | 'npcs'
  | 'items'
  | 'area'
  | 'lighting'

export const TOOLS: { id: Tool; key: string; label: string; hint: string }[] = [
  { id: 'objects', key: '1', label: 'Objects', hint: 'Select tiles; put down scenery and doors' },
  { id: 'height', key: '2', label: 'Height', hint: 'Raise, lower, set, smooth and flatten the ground' },
  { id: 'underlay', key: '3', label: 'Underlay', hint: 'Paint the ground colour' },
  { id: 'overlay', key: '4', label: 'Overlay', hint: 'Paint roads, water, floors' },
  { id: 'walls', key: '5', label: 'Walls', hint: 'Draw walls on tile edges' },
  { id: 'roofs', key: '6', label: 'Roofs', hint: 'Paint roofs over tiles' },
  { id: 'npcs', key: '7', label: 'NPCs', hint: 'Put down NPC spawns' },
  { id: 'items', key: '8', label: 'Items', hint: 'Put down items on the ground' },
  { id: 'area', key: '9', label: 'Area', hint: 'Select a rectangle to copy, paste, turn and clear' },
  { id: 'lighting', key: '0', label: 'Lighting', hint: "Draw the places that change HD graphics' light" },
]

export type HeightAction = 'raise' | 'lower' | 'set' | 'smooth' | 'flatten'

export interface ToolSettings {
  /** Brush width in tiles, 1-10. */
  size: number
  round: boolean
  /** How hard the height brush works, 1-10. */
  strength: number
  heightAction: HeightAction
  /** The height the set brush lays down, 0-254. */
  height: number
  /** Ground colour index, even. */
  colour: number
  /** Overlay id, 0 for none. */
  overlay: number
  /** Wall-object id the wall tool draws. */
  wall: number
  /** Walls and roofs: take away instead of put down. */
  erase: boolean
  /** Roof definition, 1-6. */
  roof: number
  /** What the objects tool puts down, if anything. */
  placeKind: 'object' | 'door'
  objectId: number | null
  doorId: number | null
  /** Scenery facing, 0-7: each step is 45 degrees clockwise. */
  facing: number
  npcId: number | null
  /** How far a new NPC wanders from its spawn. */
  wander: number
  itemId: number | null
  amount: number
  /** Seconds before a picked-up item comes back. */
  respawn: number
  /** What a paste writes. */
  paste: { heights: boolean; ground: boolean; walls: boolean; spawns: boolean }
}

export const DEFAULT_SETTINGS: ToolSettings = {
  size: 1,
  round: false,
  strength: 2,
  heightAction: 'raise',
  height: 64,
  colour: 70,
  overlay: 1,
  wall: 0,
  erase: false,
  roof: 1,
  placeKind: 'object',
  objectId: null,
  doorId: null,
  facing: 0,
  npcId: null,
  wander: 5,
  itemId: null,
  amount: 1,
  respawn: 60,
  paste: { heights: true, ground: true, walls: true, spawns: true },
}

/** The map layers a tool is easiest to use with, switched on when it is picked. */
export const LAYERS_FOR: Partial<Record<Tool, Partial<MapLayers>>> = {
  height: { heights: true },
  underlay: { overlays: false, heights: false },
  roofs: { roofs: true, heights: false, overlays: true },
  lighting: { lighting: true },
}

/** Every layer a tool turns on or off, put back when another is picked. */
export const TOOL_LAYERS = ['heights', 'overlays', 'roofs', 'lighting'] as const
