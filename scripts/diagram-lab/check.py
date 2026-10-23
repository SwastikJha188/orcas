#!/usr/bin/env python3
"""
Diagram lab — check images for a diagram spec (run by draw.mjs).

    python3 scripts/diagram-lab/check.py overlay <spec.json> <image> <out.png>
    python3 scripts/diagram-lab/check.py compare <image> <render.png> <out.png>

overlay: the source image with the grid, every item's box and id, every
         link's path (yellow, numbered L1, L2 … in spec order) and every
         sensor position and tag from the spec drawn over it — to see at a
         glance whether each box wraps its machine and each path follows its line.
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
    # Each link's path (as given) in yellow, dashed for signal / power, with its number at the start.
    for i, ln in enumerate(spec.get("links", []) or []):
        path = [q for q in (ln.get("path") or []) if isinstance(q, list) and len(q) >= 2 and all(isinstance(v, (int, float)) for v in q[:2])]
        if len(path) < 2:
            continue
        pts = [(X(q[0]), Y(q[1])) for q in path]
        col = (255, 225, 60)
        if str(ln.get("medium", "")).lower() in ("signal", "power"):
            for (x0, y0), (x1, y1) in zip(pts, pts[1:]):
                L = max(1.0, ((x1 - x0) ** 2 + (y1 - y0) ** 2) ** 0.5)
                t = 0.0
                while t < L:
                    t2 = min(L, t + 8)
                    d.line([(x0 + (x1 - x0) * t / L, y0 + (y1 - y0) * t / L), (x0 + (x1 - x0) * t2 / L, y0 + (y1 - y0) * t2 / L)], fill=col, width=2)
                    t += 14
        else:
            d.line(pts, fill=col, width=3)
        for x, y in pts:
            d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=col)
        outlined(d, (pts[0][0] + 5, pts[0][1] + 3), f"L{i + 1}", fs, fill=col, anchor="lt")
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


def coverage(spec_path, image_path):
    """Share of the image's drawn content (machinery, pipes, symbols) that lies inside some item box, and the
    grid areas with content but no item. Text-heavy areas count too, so the threshold is lenient."""
    import numpy as np
    spec = load_spec(spec_path)
    img = Image.open(image_path).convert("L")
    s = 600 / max(img.size)
    img = img.resize((max(1, round(img.size[0] * s)), max(1, round(img.size[1] * s))))
    a = np.asarray(img).astype(np.int16)
    h, w = a.shape
    border = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]])
    bg = np.median(border)
    ink = np.abs(a - bg) > 40
    # Thin text and lines count less than solid bodies: keep pixels with ink around them.
    from PIL import ImageFilter
    dense = np.asarray(Image.fromarray((ink * 255).astype("uint8")).filter(ImageFilter.BoxBlur(4))) > 70
    covered = np.zeros_like(dense)
    for it in spec.get("items", []) or []:
        b = box_of(it.get("box")) if isinstance(it, dict) else None
        if not b:
            continue
        x0, y0, x1, y1 = [int(round(v / 100 * (w if i % 2 == 0 else h))) for i, v in enumerate(b)]
        m = int(0.02 * max(w, h))
        covered[max(0, y0 - m):min(h, y1 + m), max(0, x0 - m):min(w, x1 + m)] = True
    total = int(dense.sum())
    if total == 0:
        return {"coverage": 1.0, "missing": []}
    cov = float((dense & covered).sum()) / total
    missing = []
    for gy in range(5):
        for gx in range(5):
            cell = (slice(gy * h // 5, (gy + 1) * h // 5), slice(gx * w // 5, (gx + 1) * w // 5))
            d = dense[cell]
            n = int(d.sum())
            if n > 0.08 * d.size and float((d & ~covered[cell]).sum()) / max(1, n) > 0.7:
                missing.append([gx * 20, gy * 20, gx * 20 + 20, gy * 20 + 20])
    return {"coverage": round(cov, 3), "missing": missing}


if __name__ == "__main__":
    if len(sys.argv) >= 4 and sys.argv[1] == "coverage":
        print(json.dumps(coverage(sys.argv[2], sys.argv[3])))
        sys.exit(0)
    if len(sys.argv) < 5 or sys.argv[1] not in ("overlay", "compare"):
        print(__doc__)
        sys.exit(2)
    (overlay if sys.argv[1] == "overlay" else compare)(*sys.argv[2:5])
