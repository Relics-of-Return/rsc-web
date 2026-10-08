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
  'construction',
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
  construction: '/skills/construction.png',
}

/** Public icon path for a skill, or `undefined` when no icon exists. */
export function skillIconPath(skill: string): string | undefined {
  return SKILL_ICON_PATHS[skill]
}


/** A character's combat level from its skill levels, by the game's own formula (rsc-server's getCombatLevel). */
export function combatLevel(levels: Partial<Record<string, number>>): number {
  const level = (skill: string, base = 1) => levels[skill] ?? base
  const offence = (level('attack') + level('strength')) * 0.25
  const defence = (level('defense') + level('hits', 10)) * 0.25
  const magic = (level('prayer') + level('magic')) * 0.125
  const ranged = level('ranged') * 0.375

  return Math.floor(defence + magic + Math.max(offence, ranged))
}

export const MAX_LEVEL = 99

/** The experience a level starts at, on RuneScape's curve (1 = 0, 2 = 83, 99 = 13,034,431). */
export function experienceForLevel(level: number): number {
  let points = 0

  for (let lvl = 1; lvl < level; lvl += 1) {
    points += Math.floor(lvl + 300 * 2 ** (lvl / 7))
  }

  return Math.floor(points / 4)
}
