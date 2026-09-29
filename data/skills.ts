export const DEFAULT_SKILLS = [
  'attack',
  'defense',
  'strength',
  'hits',
  'ranged',
  'prayer',
  'magic',
  'cooking',
  'woodcutting',
  'fletching',
  'fishing',
  'firemaking',
  'crafting',
  'smithing',
  'mining',
  'herblaw',
  'agility',
  'thieving',
]

/**
 * Canonical display order for hiscores: the overall total comes first,
 * followed by the individual skills.
 */
export const HISCORE_SKILLS = ['overall', ...DEFAULT_SKILLS]

const SKILL_LABEL_OVERRIDES: Record<string, string> = {
  overall: 'Overall',
  hits: 'Hitpoints',
  herblaw: 'Herblaw',
}

/** Pretty label for a skill identifier (e.g. `hits` -> `Hitpoints`). */
export function skillLabel(skill: string): string {
  const override = SKILL_LABEL_OVERRIDES[skill]
  if (override) return override
  return skill.charAt(0).toUpperCase() + skill.slice(1)
}

/** Sort index for a skill in hiscores display order (unknown skills last). */
export function hiscoreSkillOrder(skill: string): number {
  const index = HISCORE_SKILLS.indexOf(skill)
  return index === -1 ? HISCORE_SKILLS.length : index
}

const SKILL_ICON_PATHS: Record<string, string> = {
  attack: '/skills/melee.webp',
  strength: '/skills/melee.webp',
  defense: '/skills/melee.webp',
  ranged: '/skills/ranged.webp',
  prayer: '/skills/prayer.png',
  magic: '/skills/magic.webp',
  cooking: '/skills/cooking.png',
  woodcutting: '/skills/woodcutting.webp',
  fletching: '/skills/fletching.webp',
  fishing: '/skills/fishing.webp',
  firemaking: '/skills/firemaking.webp',
  crafting: '/skills/crafting.webp',
  smithing: '/skills/smithing.webp',
  mining: '/skills/mining.webp',
  herblaw: '/skills/herblaw.webp',
  agility: '/skills/agility.webp',
  thieving: '/skills/thieving.webp',
  hits: '/skills/hitpoints.png',
  overall: '/skills/overall.webp',
}

/** Public icon path for a skill, or `undefined` when no icon exists. */
export function skillIconPath(skill: string): string | undefined {
  return SKILL_ICON_PATHS[skill]
}

