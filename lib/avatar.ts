// draws RuneScape Classic player avatars in the browser by stacking the
// client's entity sprites, the same way the game does. this is a port of
// 2003scape/rsc-sprite-generator that uses the DOM canvas instead of
// node-canvas, so the website needs no native dependency and no build step.
//
// the sprites and definitions under /res/avatar come from that project and
// are AGPL-3.0+ (see /res/avatar/LICENSE)

const RES_PATH = '/res/avatar'

const AVATAR_WIDTH = 86
const AVATAR_HEIGHT = 115

// the sprite values the game stores are 1-based, with 0 meaning "nothing
// in this slot"
const DEFAULTS = {
  angle: 1,
  headSprite: 1,
  bodySprite: 2,
  hairColour: 2,
  topColour: 8,
  trouserColour: 14,
  skinColour: 0,
  wielding: [] as number[],
  scale: 1,
}

// the legs every character is drawn with, under whatever they wear
const LEGS_ANIMATION = 3

// character colours the client defines as 32-bit rgb integers
const SKIN_COLOURS = [0xecded0, 0xccb366, 0xb38c40, 0x997326, 0x906020]

const HAIR_COLOURS = [
  0xffc030, 0xffa040, 0x805030, 0x604020, 0x303030, 0xff6020, 0xff4000,
  0xffffff, 0x00ff00, 0x00ffff,
]

const TOP_COLOURS = [
  0xff0000, 0xff8000, 0xffe000, 0xa0e000, 0x00e000, 0x008000, 0x00a080,
  0x00b0ff, 0x0080ff, 0x0030f0, 0xe000e0, 0x303030, 0x604000, 0x805000,
  0xffffff,
]

// which part of the character each wieldable `position` draws. gloves
// (position 10) are left out because the game never draws them on the
// character
const SLOT_NAMES: Record<number, string> = {
  0: 'head',
  1: 'body',
  2: 'legs',
  3: 'left',
  4: 'right',
  5: 'med',
  6: 'chain',
  7: 'skirt',
  8: 'neck',
  9: 'boots',
  11: 'cape',
}

// the order the parts stack in, which depends on which way the character
// is facing
const SPRITE_ORDER = {
  FRONT: [
    'cape', 'legs', 'skirt', 'body', 'neck', 'head', 'med', 'chain',
    'left', 'right', 'boots',
  ],
  BACK: [
    'left', 'right', 'legs', 'skirt', 'body', 'neck', 'head', 'med',
    'chain', 'cape', 'boots',
  ],
  COMBAT: [
    'cape', 'legs', 'skirt', 'body', 'neck', 'head', 'med', 'chain',
    'boots', 'left', 'right',
  ],
}

// overlay values at or below this are the markers the client uses for the
// parts it recolours itself (hair, top, legs), not real colours
const MAX_OVERLAY_MARKER = 5

// the female platebody sprite, which needs the skin showing through
const FEMALE_PLATEBODY_SPRITE = 486

// angles 0-7 face the camera, 8-14 face away, and 15+ are the combat
// stances, which stack the weapon differently
const BACK_ANGLE = 8
const COMBAT_ANGLE = 15

interface Animation {
  sprite: number
  overlay: number
  // set on equipment that shows skin, as the Ironman platebody's bare arms
  // do (rsc-client/scripts/export-avatar-sprites.js)
  skin?: boolean
}

interface Shift {
  x: number
  y: number
}

interface Wieldable {
  animation: number
  position: number
}

interface Definitions {
  animations: Animation[]
  shifts: Record<string, Shift>
  wieldable: Record<string, Wieldable>
}

interface Slot {
  animation: number
  colour?: number
}

interface DrawnPart {
  image: CanvasImageSource
  shift: Shift
}

interface RGB {
  r: number
  g: number
  b: number
}

/** the appearance fields the data server stores for a player. */
export interface PlayerAppearance {
  headSprite: number
  bodySprite: number
  hairColour: number
  topColour: number
  trouserColour: number
  skinColour: number
  wielding: number[]
}

interface PlayerOptions extends Partial<PlayerAppearance> {
  /** 0-7 facing the camera, 8-14 facing away, 15-16 combat stances. */
  angle?: number
  /** whole-number multiplier the finished avatar is drawn at. */
  scale?: number
}

type Character = typeof DEFAULTS

let definitions: Definitions | null = null
const spriteCache = new Map<number, Promise<HTMLImageElement | null>>()

function makeCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas')

  canvas.width = width
  canvas.height = height

  return canvas
}

async function loadDefinitions(): Promise<Definitions> {
  if (definitions) {
    return definitions
  }

  const [animations, shifts, wieldable] = await Promise.all(
    ['animations', 'shifts', 'wieldable'].map(async (name) => {
      const res = await fetch(`${RES_PATH}/${name}.json`)

      if (!res.ok) {
        throw new Error(`unable to load ${name} definitions`)
      }

      return res.json()
    }),
  )

  definitions = { animations, shifts, wieldable }

  return definitions
}

// resolves to null rather than throwing for the sprite ids that have no
// image: a missing part shouldn't cost us the whole avatar
function fetchSprite(id: number): Promise<HTMLImageElement | null> {
  const cached = spriteCache.get(id)

  if (cached) {
    return cached
  }

  const promise = new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image()

    image.onload = () => resolve(image)
    image.onerror = () => resolve(null)
    image.src = `${RES_PATH}/sprites/${id}.png`
  })

  spriteCache.set(id, promise)

  return promise
}

function splitColour(colour: number): RGB {
  return {
    r: (colour >> 16) & 0xff,
    g: (colour >> 8) & 0xff,
    b: colour & 0xff,
  }
}

// the client stores each recolourable part in greyscale, with the skin in
// pure red, and multiplies those pixels by the colour the player picked
function colourizeSprite(
  sprite: CanvasImageSource,
  width: number,
  height: number,
  overlay: number | null | undefined,
  skin: number | null | undefined,
): HTMLCanvasElement {
  const canvas = makeCanvas(width, height)
  const context = canvas.getContext('2d')!

  context.drawImage(sprite, 0, 0)

  const pixels = context.getImageData(0, 0, canvas.width, canvas.height)
  const data = pixels.data

  const overlayRGB = overlay ? splitColour(overlay) : null
  const skinRGB = skin ? splitColour(skin) : null

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]

    if (skinRGB && r === 255 && g === b) {
      data[i] = (r * skinRGB.r) >> 8
      data[i + 1] = (g * skinRGB.g) >> 8
      data[i + 2] = (b * skinRGB.b) >> 8
    }

    // a white pixel is both pure red and greyscale, so it matches both
    // passes and the overlay is the one that sticks -- which is what turns
    // the white in the head sprites into hair
    if (overlayRGB && r === g && g === b) {
      data[i] = (r * overlayRGB.r) >> 8
      data[i + 1] = (g * overlayRGB.g) >> 8
      data[i + 2] = (b * overlayRGB.b) >> 8
    }
  }

  context.putImageData(pixels, 0, 0)

  return canvas
}

// the animation slots to draw, keyed by part name, taken from the
// character's own sprites and everything they have equipped over them
function getSlots(
  player: Character,
  wieldable: Record<string, Wieldable>,
): Record<string, Slot> {
  const slots: Record<string, Slot> = {}

  for (const id of player.wielding) {
    const wield = wieldable[id]

    // an animation of 0 is an equipable item with nothing to draw
    if (!wield || !wield.animation) {
      continue
    }

    const name = SLOT_NAMES[wield.position]

    if (name) {
      slots[name] = { animation: wield.animation }
    }
  }

  // the character's own head, top and legs only show where there is no
  // equipment covering them
  if (!slots.head) {
    slots.head = {
      animation: player.headSprite,
      colour: HAIR_COLOURS[player.hairColour],
    }
  }

  if (!slots.body) {
    slots.body = {
      animation: player.bodySprite,
      colour: TOP_COLOURS[player.topColour],
    }
  }

  if (!slots.legs) {
    slots.legs = {
      animation: LEGS_ANIMATION,
      colour: TOP_COLOURS[player.trouserColour],
    }
  }

  return slots
}

async function drawSlot(
  slot: Slot,
  player: Character,
  { animations, shifts }: Definitions,
): Promise<DrawnPart | null> {
  const animation = animations[slot.animation - 1]

  if (!animation) {
    return null
  }

  const spriteID = animation.sprite + player.angle
  const sprite = await fetchSprite(spriteID)

  if (!sprite) {
    return null
  }

  const skin = SKIN_COLOURS[player.skinColour]

  let image: CanvasImageSource = sprite

  if (slot.colour) {
    image = colourizeSprite(image, sprite.width, sprite.height, slot.colour, skin)
  } else if (animation.overlay > MAX_OVERLAY_MARKER) {
    image = colourizeSprite(image, sprite.width, sprite.height, animation.overlay, null)
  }

  if (animation.sprite === FEMALE_PLATEBODY_SPRITE || animation.skin) {
    image = colourizeSprite(image, sprite.width, sprite.height, null, skin)
  }

  return { image, shift: shifts[spriteID] || { x: 0, y: 0 } }
}

// the parts are drawn where the game puts them, in a frame that leaves room on
// one side for a weapon the player may not be holding, so the figure ends up
// off-centre in the canvas. the website only ever shows the figure on its own,
// so the finished canvas is trimmed to the pixels actually drawn and centred,
// which is what puts the character in the middle of its box
function centreContent(composite: HTMLCanvasElement): HTMLCanvasElement {
  const context = composite.getContext('2d')!

  const { data } = context.getImageData(0, 0, composite.width, composite.height)

  let minX = composite.width
  let minY = composite.height
  let maxX = -1
  let maxY = -1

  for (let y = 0; y < composite.height; y++) {
    for (let x = 0; x < composite.width; x++) {
      if (data[(y * composite.width + x) * 4 + 3] === 0) {
        continue
      }

      if (x < minX) minX = x
      if (y < minY) minY = y
      if (x > maxX) maxX = x
      if (y > maxY) maxY = y
    }
  }

  // nothing was drawn: an appearance whose sprites all failed to load, which
  // leaves the empty canvas for the component to show its message over
  if (maxX < 0) {
    return composite
  }

  const width = maxX - minX + 1
  const height = maxY - minY + 1

  const centred = makeCanvas(AVATAR_WIDTH, AVATAR_HEIGHT)
  const centredContext = centred.getContext('2d')!

  centredContext.drawImage(
    composite,
    minX,
    minY,
    width,
    height,
    Math.round((AVATAR_WIDTH - width) / 2),
    Math.round((AVATAR_HEIGHT - height) / 2),
    width,
    height,
  )

  return centred
}

// draws a player avatar and resolves to a canvas of it
async function player(options: PlayerOptions): Promise<HTMLCanvasElement> {
  const loaded = await loadDefinitions()

  const character: Character = { ...DEFAULTS, ...options }

  character.wielding = Array.isArray(character.wielding)
    ? character.wielding
    : []

  const slots = getSlots(character, loaded.wieldable)
  const drawn: Record<string, DrawnPart | null> = {}

  await Promise.all(
    Object.keys(slots).map(async (name) => {
      drawn[name] = await drawSlot(slots[name], character, loaded)
    }),
  )

  let order: string[]

  if (character.angle < COMBAT_ANGLE) {
    order =
      character.angle >= BACK_ANGLE
        ? SPRITE_ORDER.BACK
        : SPRITE_ORDER.FRONT
  } else {
    order = SPRITE_ORDER.COMBAT
  }

  const composite = makeCanvas(AVATAR_WIDTH, AVATAR_HEIGHT)
  const context = composite.getContext('2d')!

  for (const name of order) {
    const part = drawn[name]

    if (part) {
      context.drawImage(part.image, part.shift.x, part.shift.y)
    }
  }

  const centred = centreContent(composite)
  const scale = Math.max(1, Math.floor(character.scale) || 1)

  if (scale === 1) {
    return centred
  }

  // scale after compositing, with smoothing off, so the sprites stay
  // the hard-edged pixels they were drawn as
  const scaled = makeCanvas(AVATAR_WIDTH * scale, AVATAR_HEIGHT * scale)
  const scaledContext = scaled.getContext('2d')!

  scaledContext.imageSmoothingEnabled = false
  scaledContext.drawImage(centred, 0, 0, scaled.width, scaled.height)

  return scaled
}

export const RSCAvatar = { player, WIDTH: AVATAR_WIDTH, HEIGHT: AVATAR_HEIGHT }
