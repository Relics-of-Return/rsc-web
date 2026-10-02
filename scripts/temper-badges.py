"""Make the tempered Ironman helms from the iron one.

The iron helm (public/gamemodes/Ironman_badge.webp) is grey. Each metal keeps
its shading: every pixel's brightness, from the helm's darkest to its
lightest, is mapped onto a ramp between a dark and a light shade of the
metal. The metals are the ones the game's armour comes in. See
docs/IRONMAN_AND_DIARIES.md.

    python scripts/temper-badges.py
"""

from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent.parent / 'public' / 'gamemodes'
SOURCE = HERE / 'Ironman_badge.webp'

# (dark, light) for each metal
METALS = {
    'steel': ((78, 82, 90), (176, 180, 188)),
    'mithril': ((38, 40, 96), (120, 124, 196)),
    'adamant': ((28, 72, 34), (104, 158, 98)),
    'rune': ((16, 86, 104), (86, 186, 206)),
}


def luminance(pixel):
    r, g, b = pixel[:3]
    return 0.299 * r + 0.587 * g + 0.114 * b


def main():
    iron = Image.open(SOURCE).convert('RGBA')
    width, height = iron.size
    source = iron.load()
    every = [source[x, y] for y in range(height) for x in range(width)]
    opaque = [p for p in every if p[3] >= 128]
    low = min(luminance(p) for p in opaque)
    high = max(luminance(p) for p in opaque)

    for name, (dark, light) in METALS.items():
        helm = Image.new('RGBA', iron.size)

        pixels = []

        for pixel in every:
            if pixel[3] < 128:
                pixels.append((0, 0, 0, 0))
                continue

            t = (luminance(pixel) - low) / (high - low or 1)

            pixels.append(
                tuple(round(d + (l - d) * t) for d, l in zip(dark, light))
                + (255,)
            )

        helm.putdata(pixels)
        helm.save(HERE / f'Ironman_{name}.png')
        print('made', HERE / f'Ironman_{name}.png')


if __name__ == '__main__':
    main()
