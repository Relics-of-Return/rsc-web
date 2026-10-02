/**
 * Account types and the Ironman helm, mirroring rsc-server's `src/ironman.js`
 * and rsc-client's `src/ranks.js`. An Ironman's helm is tempered by the
 * achievement diaries: each tier finished in every area moves it on a metal.
 * See docs/IRONMAN_AND_DIARIES.md.
 */

export const ACCOUNT_MODES = {
  standard: 0,
  ironman: 1,
} as const

export interface Helm {
  /** The metal, iron to rune. */
  metal: string
  /** Public path of the helm image. */
  image: string
  /** What earns it. */
  earnedBy: string
}

export const HELMS: Helm[] = [
  { metal: 'iron', image: '/gamemodes/Ironman_badge.webp', earnedBy: 'Choosing Ironman' },
  { metal: 'steel', image: '/gamemodes/Ironman_steel.png', earnedBy: 'Every Easy diary' },
  { metal: 'mithril', image: '/gamemodes/Ironman_mithril.png', earnedBy: 'Every Medium diary' },
  { metal: 'adamant', image: '/gamemodes/Ironman_adamant.png', earnedBy: 'Every Hard diary' },
  { metal: 'rune', image: '/gamemodes/Ironman_rune.png', earnedBy: 'Every Elite diary' },
]

export function isIronman(accountMode: number | null | undefined): boolean {
  return Number(accountMode) === ACCOUNT_MODES.ironman
}

/** The helm an account wears, or `null` for a standard one. */
export function helmFor(
  accountMode: number | null | undefined,
  temper: number | null | undefined,
): Helm | null {
  if (!isIronman(accountMode)) return null

  const index = Math.max(0, Math.min(HELMS.length - 1, Number(temper) || 0))
  return HELMS[index]
}

/** The four diaries, in the order the game keeps them. */
export const DIARY_AREAS = [
  { id: 'lumbridge', name: 'Lumbridge & Draynor', taskmaster: 'Hatius Cosaintus' },
  { id: 'varrock', name: 'Varrock', taskmaster: 'Toby' },
  { id: 'falador', name: 'Falador', taskmaster: 'Sir Rebral' },
  { id: 'karamja', name: 'Karamja', taskmaster: 'Pirate Jackie the Fruit' },
] as const

export const DIARY_TIERS = ['Easy', 'Medium', 'Hard', 'Elite'] as const
