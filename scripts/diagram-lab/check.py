#!/usr/bin/env python3
"""
Diagram lab — check images for a diagram spec (run by draw.mjs).

    python3 scripts/diagram-lab/check.py overlay <spec.json> <image> <out.png>
    python3 scripts/diagram-lab/check.py compare <image> <render.png> <out.png>

overlay: the source image with the grid, every item's box and id, and every
         sensor position and tag from the spec drawn over it — to see at a
         glance whether each box wraps its machine.
compare: the source image above the rendered drawing, same width.
"""
import json
import os
import re
import sys

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from prep import font, outlined, with_grid  # noqa: E402

COLOURS = [(0, 255, 255), (255, 90, 255), (140, 255, 80), (255, 170, 40), (120, 160, 255), (255, 255, 255)]


def load_spec(p):
    txt = open(p, encoding="utf-8").read()
    txt = re.sub(r"^\s*```(?:json)?|```\s*$", "", txt.strip())
    txt = re.sub(r",\s*([}\]])", r"\1", txt)
    return json.loads(txt)


def box_of(raw):
    if isinstance(raw, list) and len(raw) >= 4:
        l, t, r, b = raw[:4]
        if r <= l or b <= t:
            r, b = l + r, t + b
        return l, t, r, b
    if isinstance(raw, dict):
        g = lambda *k: next((raw[n] for n in k if isinstance(raw.get(n), (int, float))), None)
        l, t, r, b = g("left", "x0"), g("top", "y0"), g("right", "x2"), g("bottom", "y2")
        if None not in (l, t, r, b):
            return l, t, r, b
        x, y, w, h = g("x"), g("y"), g("w", "width"), g("h", "height")
        if None not in (x, y, w, h):
            return x, y, x + w, y + h
    return None


def overlay(spec_path, image_path, out):
    spec = load_spec(spec_path)
    img = Image.open(image_path).convert("RGB")
    s = 1500 / max(img.size)
    if s < 1:
        img = img.resize((round(img.size[0] * s), round(img.size[1] * s)), Image.LANCZOS)
    # Dim the photo so the boxes stand out.
    img = Image.blend(img, Image.new("RGB", img.size, (0, 0, 0)), 0.35)
    pad = 44
    canvas = with_grid(img, pad)
    d = ImageDraw.Draw(canvas)
    w, h = img.size
    f = font(18)
    fs = font(14)
    X = lambda v: pad + v / 100 * w
    Y = lambda v: pad + v / 100 * h
    for i, it in enumerate(spec.get("items", [])):
        b = box_of(it.get("box"))
        if not b:
            continue
        c = COLOURS[i % len(COLOURS)]
        d.rectangle([X(b[0]), Y(b[1]), X(b[2]), Y(b[3])], outline=c, width=3)
        outlined(d, (X(b[0]) + 4, Y(b[1]) + 4), str(it.get("id", "?")), f, fill=c, anchor="lt")
    for p in spec.get("points", []) or []:
        pos = p.get("pos")
        if not (isinstance(pos, list) and len(pos) >= 2):
            continue
        x, y = X(pos[0]), Y(pos[1])
        d.ellipse([x - 7, y - 7, x + 7, y + 7], outline=(255, 60, 60), width=3)
        outlined(d, (x + 10, y - 10), str(p.get("tag", "?")), fs, fill=(255, 120, 120), anchor="lt")
    canvas.save(out)


def compare(image_path, render_path, out):
    a = Image.open(image_path).convert("RGB")
    b = Image.open(render_path).convert("RGB")
    W = 1500
    a = a.resize((W, round(a.size[1] * W / a.size[0])), Image.LANCZOS)
    b = b.resize((W, round(b.size[1] * W / b.size[0])), Image.LANCZOS)
    gap = 36
    c = Image.new("RGB", (W, a.size[1] + b.size[1] + gap * 2), (20, 20, 24))
    d = ImageDraw.Draw(c)
    f = font(20)
    outlined(d, (12, gap / 2), "SOURCE IMAGE", f, anchor="lm")
    c.paste(a, (0, gap))
    outlined(d, (12, gap + a.size[1] + gap / 2), "YOUR DRAWING", f, anchor="lm")
    c.paste(b, (0, a.size[1] + gap * 2))
    c.save(out)


if __name__ == "__main__":
    if len(sys.argv) < 5 or sys.argv[1] not in ("overlay", "compare"):
        print(__doc__)
        sys.exit(2)
    (overlay if sys.argv[1] == "overlay" else compare)(*sys.argv[2:5])
