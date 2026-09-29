/**
 * Who may edit the world.
 *
 * Administrators only, rather than every staff rank the rest of the admin
 * section admits: a save rewrites the files both game servers run on, which
 * is a different order of power from reviewing an abuse report. Lowering
 * this to 1 opens it to player moderators.
 *
 * Shared by the page (which only decides what to draw) and every
 * /api/landscape route (which is what actually enforces it).
 */
export const WORLD_EDITOR_RANK = 3

export function canEditWorld(rank: number | null | undefined): boolean {
  return Number(rank ?? 0) >= WORLD_EDITOR_RANK
}
