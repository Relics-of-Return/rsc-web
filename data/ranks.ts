/**
 * Staff ranks, mirroring rsc-server's `src/ranks.js` and rsc-client's
 * `src/ranks.js`. The `rank` column of the data server's players table indexes
 * this list, and every rank above 0 wears a crown in front of its username —
 * in game and here on the website.
 */
export interface StaffRank {
  id: number
  name: string
  /** Public path of the crown image, `null` for regular players. */
  crown: string | null
}

export const STAFF_RANKS: StaffRank[] = [
  { id: 0, name: 'Player', crown: null },
  { id: 1, name: 'Player moderator', crown: '/crowns/Player_moderator.webp' },
  { id: 2, name: 'Forum moderator', crown: '/crowns/Forum_moderator.png' },
  { id: 3, name: 'Administrator', crown: '/crowns/Administrator.png' },
]

/** Unknown ranks fall back to a regular player. */
export function staffRank(rank: number | null | undefined): StaffRank {
  const id = Number(rank ?? 0)
  return STAFF_RANKS[Number.isInteger(id) && id > 0 && id < STAFF_RANKS.length ? id : 0]
}

export function staffRankName(rank: number | null | undefined): string {
  return staffRank(rank).name
}

/** Crown image path for a rank, or `null` when it doesn't wear one. */
export function crownPath(rank: number | null | undefined): string | null {
  return staffRank(rank).crown
}

export function isStaff(rank: number | null | undefined): boolean {
  return staffRank(rank).id > 0
}

/**
 * Administrators change the site's settings. rsc-www's `ADMIN_RANK` is what
 * enforces it; the admin section only uses this to decide what to draw.
 */
export function isAdministrator(rank: number | null | undefined): boolean {
  return staffRank(rank).id >= 3
}
