import 'server-only'

import items from '@2003scape/rsc-data/config/items.json'

// the item definitions the tradepost pages name and describe items with.
// server-only: the whole table is ~300KB, and pages pass on just the fields
// they draw

const COINS_ID = 10

export interface ItemInfo {
  id: number
  name: string
  description: string
  members: boolean
  /** The shop value the game gives the item. */
  basePrice: number
  stackable: boolean
}

interface ItemDefinition {
  name: string
  description: string
  price: number
  stackable: boolean
  members: boolean
  untradeable: boolean
}

const definitions = items as ItemDefinition[]

/** What the tradepost can list: anything tradeable except coins. */
export function isTradeable(id: number): boolean {
  const definition = definitions[id]
  return !!definition && !definition.untradeable && id !== COINS_ID
}

function toInfo(id: number): ItemInfo {
  const { name, description, members, price, stackable } = definitions[id]
  return { id, name, description, members, basePrice: price, stackable }
}

/** A tradeable item's details, or null for anything the tradepost can't list. */
export function getItem(id: number): ItemInfo | null {
  return Number.isInteger(id) && isTradeable(id) ? toInfo(id) : null
}

/** Every item a world's tradepost can list, by name. */
export function getTradeableItems({ members }: { members: boolean }): ItemInfo[] {
  const list: ItemInfo[] = []

  definitions.forEach((definition, id) => {
    if (isTradeable(id) && (members || !definition.members)) {
      list.push(toInfo(id))
    }
  })

  return list.sort((a, b) => a.name.localeCompare(b.name))
}

/** Where an item's picture is served from (see public/items). */
export function itemIconPath(id: number): string {
  return `/items/${id}.png`
}
