import 'server-only'

import { SECTOR_SIZE, SECTOR_TILES } from '@/lib/landscape/types'

/**
 * A correct encoder for the `.hei` terrain buffers.
 *
 * rsc-landscape's own `toHei()` cannot be used once a tile has been edited.
 * Its `encodeBuffer` carries its running total as `lastVal += enc`, while
 * `parseHei` reads it back as `lastVal = raw + (lastVal & 0x7f)` — the mask
 * is applied on the way in but not on the way out, so the two walks diverge
 * the moment a delta changes. It also divides by two without flooring, so an
 * odd height lands somewhere else entirely. Editing one tile's elevation and
 * re-encoding with it shifts about 1300 other tiles in the same sector.
 *
 * The format itself:
 *
 *   stored[i]  a 7-bit delta, run-length compressed
 *   L[i]       the running total: raw + the previous total, masked to 7 bits
 *   value[i]   (L[i] * 2) & 0xff
 *
 * for both height and ground colour, so both are 7 bits doubled — only even
 * values 0..254 exist, and none of the 785,664 tiles in the world holds an
 * odd one. The walk is column-major (`x * 48 + y`), and the chain starts at
 * 64 for height and 35 for colour.
 */

const HEIGHT_SEED = 64
const COLOUR_SEED = 35

/** Deltas for one buffer, in the order parseHei walks it. */
function encodeDeltas(values: Uint8Array, seed: number): Uint8Array {
  const deltas = new Uint8Array(SECTOR_TILES)

  let last = seed

  for (let tileY = 0; tileY < SECTOR_SIZE; tileY++) {
    for (let tileX = 0; tileX < SECTOR_SIZE; tileX++) {
      const index = tileX * SECTOR_SIZE + tileY

      // the decoder can only ever produce even values, so this is what the
      // stored 7-bit total has to be
      const target = (values[index] & 0xff) >> 1

      deltas[index] = (target - (last & 0x7f)) & 0x7f

      // the decoder's next step masks this, and target is already 7 bit
      last = target
    }
  }

  return deltas
}

/**
 * Run-length compression: a byte under 128 is a literal, and a byte of
 * `128 + n` repeats the previous literal n times. Mirrors the reader in
 * parseHei.
 */
function compress(buffer: Uint8Array): number[] {
  const out: number[] = []

  let index = 0

  while (index < SECTOR_TILES) {
    const value = buffer[index]

    let run = 1

    while (
      index + run < SECTOR_TILES &&
      buffer[index + run] === value &&
      // 128 + run has to stay a byte, and the reader treats 128 as a zero
      // length run, so the longest useful run is 127
      run < 127
    ) {
      run++
    }

    out.push(value)

    if (run > 1) {
      out.push(128 + (run - 1))
    }

    index += run
  }

  return out
}

/** The `.hei` entry for a sector, encoded from its terrain buffers. */
export function encodeHei(
  terrainHeight: Int8Array | Uint8Array,
  terrainColour: Int8Array | Uint8Array,
): Buffer {
  const height = Uint8Array.from(terrainHeight, (v) => v & 0xff)
  const colour = Uint8Array.from(terrainColour, (v) => v & 0xff)

  const body = [
    ...compress(encodeDeltas(height, HEIGHT_SEED)),
    ...compress(encodeDeltas(colour, COLOUR_SEED)),
  ]

  return Buffer.from(body)
}
