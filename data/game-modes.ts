/**
 * Game modes (tiers and paths), mirroring the data server's game-modes.json.
 * Tier 0 is Normal, path 0 is no path; their icons are blank.
 */

import type { GameMode } from '@/lib/types'

export interface GameTier {
  name: string
  /** The multiplier shown on the icon, e.g. "10x". */
  tag: string | null
  icon: string | null
}

export interface GamePath {
  name: string
  icon: string | null
}

export const TIERS: GameTier[] = [
  { name: 'Normal', tag: null, icon: null },
  { name: 'Hard', tag: '10x', icon: '/gamemodes/tier-hard.png' },
  { name: 'Extreme', tag: '5x', icon: '/gamemodes/tier-extreme.png' },
  { name: 'Realism', tag: '1x', icon: '/gamemodes/tier-realism.png' },
]

export const PATHS: GamePath[] = [
  { name: 'No path', icon: null },
  { name: 'Gatherer', icon: '/gamemodes/path-gatherer.png' },
  { name: 'Artisan', icon: '/gamemodes/path-artisan.png' },
  { name: 'Skiller', icon: '/gamemodes/path-skiller.png' },
  { name: 'Noble', icon: '/gamemodes/path-noble.png' },
]

/** The hiscores `mode` values; anything else is `normal`. */
export const HISCORE_MODE_IDS = [
  'ironman',
  'normal',
  'hard',
  'extreme',
  'realism',
] as const

export type HiscoreModeId = (typeof HISCORE_MODE_IDS)[number]

export function hiscoreModeOf(raw: string | null | undefined): HiscoreModeId {
  return HISCORE_MODE_IDS.find((id) => id === raw) ?? 'normal'
}

export function tierTitle(tier: GameTier): string {
  return tier.tag ? `${tier.name} (${tier.tag})` : tier.name
}

/** Words for a mode, e.g. "Hard (10x) · Gatherer". */
export function gameModeText(gameMode: GameMode): string {
  const tier = TIERS[gameMode.tier]
  const path = PATHS[gameMode.path]

  return `${tier ? tierTitle(tier) : 'Unknown'} · ${path ? path.name : 'Unknown path'}`
}

/** A character's mode in words, e.g. "Ironman · Hard (10x) · Gatherer". */
export function characterModeText(accountMode: number | null | undefined, gameMode: GameMode | null | undefined): string {
  const words = [Number(accountMode) === 1 ? 'Ironman' : null, gameMode ? gameModeText(gameMode) : gameMode === null ? 'Mode not chosen yet' : null]
  return words.filter(Boolean).join(' · ') || 'Normal'
}
