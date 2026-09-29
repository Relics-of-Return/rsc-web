/**
 * The 12 rules of the in-game report form, in the order the game client lists
 * them (see rsc-client/src/ui/report-dialog.js and rsc-data-server's
 * `src/offences.js`). A report's `offence` is a 1-based index into this list.
 */
export const OFFENCES = [
  'Offensive language',
  'Item scamming',
  'Password scamming',
  'Bug abuse',
  'Jagex Staff impersonation',
  'Account sharing/trading',
  'Macroing',
  'Mutiple logging in',
  'Encouraging others to break rules',
  'Misuse of customer support',
  'Advertising / website',
  'Real world item trading',
] as const

/** Rule name for an offence id, or a placeholder when it is out of range. */
export function offenceName(offence: number | null | undefined): string {
  const id = Number(offence ?? 0)
  return id >= 1 && id <= OFFENCES.length ? OFFENCES[id - 1] : 'Unknown offence'
}

/**
 * Offences worth pulling to the top of the queue: scamming and impersonation
 * cost players their accounts, and bug abuse costs the economy.
 */
const SEVERE = new Set([2, 3, 4, 5])

export function isSevere(offence: number | null | undefined): boolean {
  return SEVERE.has(Number(offence ?? 0))
}
