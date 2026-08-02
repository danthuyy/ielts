#!/usr/bin/env python3
"""Cuts the sticker set out of its background and writes the web-sized copies.

    python scripts/build-stickers.py

Reads the 512px originals in output/stickers-zalo-be/ and writes 192px PNGs
with a real alpha channel into public/stickers/. Needs Pillow:

    pip install pillow

The originals were sliced out of a contact sheet, so every one of them carries
the sheet's flat cream backdrop and no transparency at all. On a dark theme
that reads as a pale rectangle stuck to the page.

Why a flood fill instead of keying out the colour everywhere: the characters
are drawn with a thick white outline, and white sits close enough to the cream
that a global colour key eats into it. Filling inwards from the border only
touches background that is actually connected to the edge, so the whites inside
the drawing survive.
"""

from __future__ import annotations

import sys
from collections import deque
from pathlib import Path

try:
    from PIL import Image
except ImportError:  # pragma: no cover - operational script
    sys.exit("Cần Pillow: pip install pillow")

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "output" / "stickers-zalo-be"
TARGET = ROOT / "public" / "stickers"

SIZE = 192
PALETTE = 128
# Padding kept around the drawing after cropping, as a share of the crop. The
# characters gesture outwards; a tight crop clips fingers.
PADDING = 0.03

# Everything within this distance of the backdrop colour is background. Kept
# well below the ~23 that separates the cream from the white outline, or the
# fill escapes through the outline and eats the character.
SOLID = 12.0
# Between SOLID and FRINGE a pixel is part of the anti-aliased edge and gets a
# partial alpha, which is what keeps the cut-out from looking like scissors.
FRINGE = 22.0

# Which sticker plays which role. The filenames are the artist's, the keys are
# what src/lib/stickers.ts asks for.
ROLES = {
    "correct": "07-duyet",
    "wrong": "12-ua",
    "perfect": "16-ngau-chua-ne",
    "sorry": "14-xin-loi-nhoa",
    "cry": "05-huhu-tr",
    "wow": "06-wow",
    "love": "15-iu-qua",
    "remind": "03-toi-nhac-em",
    "morning": "01-chao-buoi-sang",
    "night": "13-gut-nai",
}


def distance(a: tuple[int, int, int], b: tuple[int, int, int]) -> float:
    return ((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2) ** 0.5


def cut_out(image: Image.Image) -> Image.Image:
    """Replaces the connected border colour with transparency."""
    rgb = image.convert("RGB")
    width, height = rgb.size
    pixels = rgb.load()
    backdrop = pixels[0, 0]

    alpha = [255] * (width * height)
    seen = bytearray(width * height)
    queue: deque[tuple[int, int]] = deque()

    for x in range(width):
        for y in (0, height - 1):
            queue.append((x, y))
    for y in range(height):
        for x in (0, width - 1):
            queue.append((x, y))

    while queue:
        x, y = queue.popleft()
        index = y * width + x
        if seen[index]:
            continue
        seen[index] = 1

        gap = distance(pixels[x, y], backdrop)
        if gap >= FRINGE:
            continue

        if gap <= SOLID:
            alpha[index] = 0
        else:
            # Linear across the anti-aliased band. The edge pixel is a blend of
            # backdrop and drawing, so how far it has travelled from the
            # backdrop is a fair estimate of how much drawing is in it.
            alpha[index] = round(255 * (gap - SOLID) / (FRINGE - SOLID))
            # A half-transparent pixel still carries the backdrop's colour, and
            # left alone it shows up as a cream halo on a dark page. Stopping
            # the fill here would leave that halo one pixel thick; letting it
            # spread further would nibble the outline. One pixel is the
            # compromise, so do not enqueue the neighbours.
            continue

        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < width and 0 <= ny < height and not seen[ny * width + nx]:
                queue.append((nx, ny))

    out = rgb.convert("RGBA")
    out.putalpha(Image.frombytes("L", (width, height), bytes(alpha)))
    return out


def trim(image: Image.Image) -> Image.Image:
    """Crops to what is actually drawn, then pads back out to a square."""
    box = image.getchannel("A").getbbox()
    if box is None:
        return image
    cropped = image.crop(box)

    side = max(cropped.size)
    side += round(side * PADDING) * 2
    square = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    square.paste(
        cropped,
        ((side - cropped.width) // 2, (side - cropped.height) // 2),
    )
    return square


def main() -> int:
    if not SOURCE.is_dir():
        sys.exit(f"Không thấy thư mục ảnh gốc: {SOURCE}")
    TARGET.mkdir(parents=True, exist_ok=True)

    for role, stem in ROLES.items():
        path = SOURCE / f"{stem}.png"
        if not path.is_file():
            sys.exit(f"Thiếu ảnh gốc cho '{role}': {path}")

        image = trim(cut_out(Image.open(path)))
        image = image.resize((SIZE, SIZE), Image.LANCZOS)
        out = TARGET / f"{role}.png"
        # A palette costs about a fifth of what truecolour does here and the
        # difference is invisible at 192px — these are flat-shaded drawings
        # around a small photo, not a photograph.
        image.quantize(colors=PALETTE, method=Image.FASTOCTREE).save(out, optimize=True)

        opaque = sum(1 for value in image.getchannel("A").getdata() if value > 250)
        share = round(100 * opaque / (SIZE * SIZE))
        print(f"{role:9} <- {stem:20} {out.stat().st_size // 1024:4} kB  đặc {share}%")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
