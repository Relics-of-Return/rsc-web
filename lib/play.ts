import type { WorldEntry } from './types'

/**
 * Where a world is played: the game page of its own the site sends players
 * to (rsc-www's `playURL`, e.g. https://play.relicsofreturn.com/?world=1),
 * or the client URL a local stack serves it on. The game runs as its own
 * page rather than in a frame on this site, so nothing the site does — a
 * deploy, a reload, a dev recompile, a navigation — can end a game.
 */
export function gameURL(world: WorldEntry): string | null {
  return world.playURL || world.clientURL || null
}
