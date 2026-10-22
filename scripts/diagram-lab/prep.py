#!/usr/bin/env python3
"""
Diagram lab — image prep for the machine-diagram skill.

    python3 scripts/diagram-lab/prep.py <image> --out <dir>

Writes into <dir>:
  grid.png     the image with a labelled 0–100 grid (every 5, numbered every 10)
               so positions can be read straight off it
  zoom-1..4.png the four quarters of grid.png, enlarged, same grid numbers
  image.json   the image's pixel size (draw.mjs reads it)

Prints a short JSON summary. Grid units: x 0 = left edge, 100 = right edge;
y 0 = top edge, 100 = bottom edge, whatever the image's shape.
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont


def font(size):
    for name in ("/System/Library/Fonts/Supplemental/Arial Bold.ttf", "/System/Library/Fonts/Helvetica.ttc", "/Library/Fonts/Arial.ttf", "DejaVuSans-Bold.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except Exception:
            continue
    return ImageFont.load_default()


def outlined(draw, xy, text, f, fill=(255, 230, 0), anchor="mm"):
    x, y = xy
    for dx in (-2, -1, 0, 1, 2):
        for dy in (-2, -1, 0, 1, 2):
            if dx or dy:
                draw.text((x + dx, y + dy), text, font=f, fill=(0, 0, 0), anchor=anchor)
    draw.text((x, y), text, font=f, fill=fill, anchor=anchor)


def with_grid(img, pad, x0=0.0, x1=100.0, y0=0.0, y1=100.0, step=5, label_every=10):
    """Image on a dark border with grid lines over it and grid numbers on all four sides."""
    w, h = img.size
    canvas = Image.new("RGB", (w + 2 * pad, h + 2 * pad), (20, 20, 24))
    canvas.paste(img, (pad, pad))
    over = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(over)
    f = font(max(14, pad // 2))
    gx = lambda v: pad + (v - x0) / (x1 - x0) * w
    gy = lambda v: pad + (v - y0) / (y1 - y0) * h
    v = int(np.ceil(x0 / step) * step)
    while v <= x1 + 1e-6:
        major = v % label_every == 0
        d.line([(gx(v), pad), (gx(v), pad + h)], fill=(255, 230, 0, 150 if major else 70), width=2 if major else 1)
        v += step
    v = int(np.ceil(y0 / step) * step)
    while v <= y1 + 1e-6:
        major = v % label_every == 0
        d.line([(pad, gy(v)), (pad + w, gy(v))], fill=(255, 230, 0, 150 if major else 70), width=2 if major else 1)
        v += step
    canvas = Image.alpha_composite(canvas.convert("RGBA"), over).convert("RGB")
    d = ImageDraw.Draw(canvas)
    v = int(np.ceil(x0 / step) * step)
    while v <= x1 + 1e-6:
        if v % label_every == 0 or (x1 - x0) <= 50:
            outlined(d, (gx(v), pad / 2), str(v), f)
            outlined(d, (gx(v), pad + h + pad / 2), str(v), f)
        v += step
    v = int(np.ceil(y0 / step) * step)
    while v <= y1 + 1e-6:
        if v % label_every == 0 or (y1 - y0) <= 50:
            outlined(d, (pad / 2, gy(v)), str(v), f)
            outlined(d, (pad + w + pad / 2, gy(v)), str(v), f)
        v += step
    return canvas


def main():
    args = sys.argv[1:]
    if not args or args[0].startswith("-"):
        print(__doc__)
        sys.exit(2)
    src = args[0]
    out = args[args.index("--out") + 1] if "--out" in args else os.path.join(os.path.dirname(src) or ".", "prep")
    os.makedirs(out, exist_ok=True)
    img = Image.open(src).convert("RGB")
    W0, H0 = img.size
    # Working copy: long side 1500 px.
    s = 1500 / max(W0, H0)
    work = img.resize((max(1, round(W0 * s)), max(1, round(H0 * s))), Image.LANCZOS) if s < 1 else img.copy()
    w, h = work.size
    pad = 44

    with_grid(work, pad).save(os.path.join(out, "grid.png"))

    # Quarters with 10 % overlap, enlarged to ~1400 px wide, grid numbers every 5.
    zooms = []
    for i, (ax, ay) in enumerate([(0, 0), (1, 0), (0, 1), (1, 1)], 1):
        gx0, gx1 = (0, 55) if ax == 0 else (45, 100)
        gy0, gy1 = (0, 55) if ay == 0 else (45, 100)
        crop = img.crop((round(gx0 / 100 * W0), round(gy0 / 100 * H0), round(gx1 / 100 * W0), round(gy1 / 100 * H0)))
        z = 1400 / crop.size[0]
        crop = crop.resize((round(crop.size[0] * z), round(crop.size[1] * z)), Image.LANCZOS)
        name = f"zoom-{i}.png"
        with_grid(crop, pad, gx0, gx1, gy0, gy1, step=5, label_every=5).save(os.path.join(out, name))
        zooms.append({"file": name, "x": [gx0, gx1], "y": [gy0, gy1]})

    with open(os.path.join(out, "image.json"), "w") as fh:
        json.dump({"file": os.path.abspath(src), "width": W0, "height": H0}, fh)

    print(json.dumps({
        "image": src,
        "size": [W0, H0],
        "grid": os.path.join(out, "grid.png"),
        "zooms": [os.path.join(out, z["file"]) for z in zooms],
        "zoomAreas": {z["file"]: {"x": z["x"], "y": z["y"]} for z in zooms},
    }, indent=1))


if __name__ == "__main__":
    main()
