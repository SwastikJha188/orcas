#!/usr/bin/env python3
"""
Diagram lab — trace the silhouette of machines that have no catalog part.

    python3 scripts/diagram-lab/trace.py <image> <spec.json> <out.json>

For every item of type "machine" (or with "options": {"trace": true}) it crops
the item's box from the image, separates the machine from its background,
and writes its outline and main inner edges as polylines in box-relative
units (0–1). draw.mjs passes them to the layout, and the sheet draws them as
a graphite body with fine detail lines, so an unusual machine keeps its own
shape. Items whose trace is unreliable (no clear figure) are left out and
fall back to the generic machine body.
"""
import json
import re
import sys

import numpy as np
from PIL import Image

try:
    import cv2
except Exception:  # no OpenCV → no traces, the generic body is used
    cv2 = None


def load_spec(p):
    txt = open(p, encoding="utf-8").read().strip()
    txt = re.sub(r"^```(?:json)?|```$", "", txt).strip()
    txt = re.sub(r",\s*([}\]])", r"\1", txt)
    return json.loads(txt)


def box_of(raw):
    if isinstance(raw, list) and len(raw) >= 4 and all(isinstance(v, (int, float)) for v in raw[:4]):
        l, t, r, b = raw[:4]
        if r <= l or b <= t:
            r, b = l + r, t + b
        return l, t, r, b
    return None


def square(pts, closed=True, deg=12):
    """Snap edges within `deg` of horizontal / vertical to exactly square, drop collinear points (CAD look)."""
    import math
    p = [list(q) for q in pts]
    n = len(p)
    for _ in range(2):
        for i in range(n if closed else n - 1):
            a, b = p[i], p[(i + 1) % n]
            dx, dy = b[0] - a[0], b[1] - a[1]
            if abs(dx) < 1e-6 and abs(dy) < 1e-6:
                continue
            ang = abs(math.degrees(math.atan2(dy, dx))) % 180
            if ang < deg or ang > 180 - deg:
                m = (a[1] + b[1]) / 2
                a[1] = b[1] = m
            elif abs(ang - 90) < deg:
                m = (a[0] + b[0]) / 2
                a[0] = b[0] = m
    out = []
    for q in p:
        if out and abs(out[-1][0] - q[0]) < 1e-4 and abs(out[-1][1] - q[1]) < 1e-4:
            continue
        out.append(q)
    i = 1
    while i < len(out) - (0 if closed else 1) and len(out) > 3:
        a, b, c = out[i - 1], out[i], out[(i + 1) % len(out)]
        if (abs(a[0] - b[0]) < 1e-4 and abs(b[0] - c[0]) < 1e-4) or (abs(a[1] - b[1]) < 1e-4 and abs(b[1] - c[1]) < 1e-4):
            out.pop(i)
        else:
            i += 1
    return [[round(x, 4), round(y, 4)] for x, y in out]


def inner_structure(crop, mask, fx, fy, s, W, H):
    """The machine's own make-up inside its outline, as house-style shapes: regions of distinctly
    darker tone (openings, windows, recesses) and lighter tone (covers, plates, guards), and round
    features (wheels, pulleys, motor ends, gauges). Works on any machine; nothing is type-specific."""
    fig = mask > 0
    area = int(fig.sum())
    if area < 400:
        return [], []
    flat = cv2.pyrMeanShiftFiltering(crop, 8, 22)
    lab = cv2.cvtColor(flat, cv2.COLOR_RGB2LAB).reshape(-1, 3).astype(np.float32)
    pix = lab[fig.reshape(-1)]
    K = 5
    crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0)
    _, lbl, centers = cv2.kmeans(pix, K, None, crit, 2, cv2.KMEANS_PP_CENTERS)
    labels = np.full(W * H, -1, np.int32)
    labels[fig.reshape(-1)] = lbl.reshape(-1)
    labels = labels.reshape(H, W)
    Lmed = float(np.median(pix[:, 0]))
    regions = []
    for k in range(K):
        L = float(centers[k][0])
        tone = "recess" if L < Lmed - 22 else "raised" if L > Lmed + 22 else None
        if tone is None:
            continue
        m = np.where(labels == k, 255, 0).astype(np.uint8)
        m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
        m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
        cs, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for c in cs:
            a = cv2.contourArea(c)
            if a < 0.008 * area or a > 0.6 * area:
                continue
            rect_like = a / max(1.0, cv2.contourArea(cv2.convexHull(c)))
            if rect_like < 0.6:
                continue
            p = cv2.approxPolyDP(c, 0.02 * cv2.arcLength(c, True), True)[:, 0, :]
            if len(p) < 3 or len(p) > 12:
                continue
            regions.append({"tone": tone, "poly": square([[fx(px), fy(py)] for px, py in p]), "area": a})
    regions.sort(key=lambda r: -r["area"])
    regions = [{"tone": r["tone"], "poly": r["poly"]} for r in regions[:14]]
    # Round features.
    gray = cv2.cvtColor(flat, cv2.COLOR_RGB2GRAY)
    circles = []
    found = cv2.HoughCircles(cv2.medianBlur(gray, 5), cv2.HOUGH_GRADIENT, dp=1.3, minDist=max(W, H) * 0.12, param1=120, param2=38, minRadius=int(min(W, H) * 0.05), maxRadius=int(min(W, H) * 0.32))
    if found is not None:
        for cx_, cy_, r_ in found[0][:6]:
            if 0 <= int(cy_) < H and 0 <= int(cx_) < W and fig[int(cy_), int(cx_)]:
                circles.append([round(fx(cx_), 4), round(fy(cy_), 4), round((fx(cx_ + r_) - fx(cx_)), 4)])
    return regions, circles


def trace(img, box):
    h0, w0 = img.shape[:2]
    l, t, r, b = box
    x0, y0, x1, y1 = [int(round(v)) for v in (l / 100 * w0, t / 100 * h0, r / 100 * w0, b / 100 * h0)]
    pad = max(2, int(0.04 * max(x1 - x0, y1 - y0)))
    X0, Y0, X1, Y1 = max(0, x0 - pad), max(0, y0 - pad), min(w0, x1 + pad), min(h0, y1 + pad)
    crop = img[Y0:Y1, X0:X1]
    if crop.size == 0 or min(crop.shape[:2]) < 24:
        return None
    s = 360 / max(crop.shape[:2])
    crop = cv2.resize(crop, (max(8, int(crop.shape[1] * s)), max(8, int(crop.shape[0] * s))), interpolation=cv2.INTER_AREA)
    H, W = crop.shape[:2]
    lab = cv2.cvtColor(crop, cv2.COLOR_RGB2LAB).astype(np.int16)
    border = np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]])
    bg = np.median(border, axis=0)
    diff = np.abs(lab - bg).sum(axis=2)
    gray = cv2.cvtColor(crop, cv2.COLOR_RGB2GRAY)
    edges = cv2.Canny(cv2.GaussianBlur(gray, (3, 3), 0), 50, 140)
    mask = ((diff > 28) | (edges > 0)).astype(np.uint8) * 255
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    # Fill the figure, then cut away thin things touching it (leader lines, arrows, text, pipes).
    cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    filled = np.zeros_like(mask)
    cv2.drawContours(filled, cnts, -1, 255, thickness=cv2.FILLED)
    k = max(5, int(0.05 * min(W, H)))
    filled = cv2.morphologyEx(filled, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)))
    n, lab_, stats, _ = cv2.connectedComponentsWithStats(filled, 8)
    if n < 2:
        return None
    big = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    mask = np.where(lab_ == big, 255, 0).astype(np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)))
    # Large background pockets inside the figure (the throat of a C-frame, the arm of a press) stay open.
    bgpix = ((diff <= 22) & (edges == 0)).astype(np.uint8) * 255
    pockets = cv2.morphologyEx(cv2.bitwise_and(bgpix, mask), cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k * 2 + 1, k * 2 + 1)))
    holes = []
    # Only a filled figure (render, photo, coloured drawing) shows pockets reliably; in line art the body is paper-coloured too.
    filled_figure = np.median(diff[mask > 0]) > 40
    pn, plab, pstats, _ = cv2.connectedComponentsWithStats(pockets if filled_figure else np.zeros_like(pockets), 8)
    for i in range(1, pn):
        if pstats[i, cv2.CC_STAT_AREA] > 0.03 * W * H:
            hc, _ = cv2.findContours(np.where(plab == i, 255, 0).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
            if hc:
                holes.append(max(hc, key=cv2.contourArea))
    cnts, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    if not cnts:
        return None
    c = max(cnts, key=cv2.contourArea)
    area = cv2.contourArea(c) / (W * H)
    # A figure must fill a fair part of its box but not be the whole crop (that is background, not a machine).
    if area < 0.18 or area > 0.93:
        return None
    hull = cv2.convexHull(c)
    solidity = cv2.contourArea(c) / max(1.0, cv2.contourArea(hull))
    if solidity < 0.45:
        return None
    eps = 0.009 * cv2.arcLength(c, True)
    poly = cv2.approxPolyDP(c, eps, True)[:, 0, :]
    if len(poly) < 4 or len(poly) > 220:
        return None
    # Box-relative coordinates: the item's own box (not the padded crop) is 0..1.
    fx = lambda px: (px / s + X0 - x0) / max(1, x1 - x0)
    fy = lambda py: (py / s + Y0 - y0) / max(1, y1 - y0)
    outline = square([[fx(px), fy(py)] for px, py in poly])
    # Only a clean, simple silhouette is worth drawing; a ragged one (photo clutter, overlapping parts) falls back to the standard body.
    if len(outline) > 40 or solidity < 0.55:
        return None
    hole_polys = []
    for hc in holes:
        hp = cv2.approxPolyDP(hc, 0.006 * cv2.arcLength(hc, True), True)[:, 0, :]
        if len(hp) >= 4:
            hole_polys.append(square([[fx(px), fy(py)] for px, py in hp]))
    # Inner detail: long edges inside the figure, simplified to short polylines.
    inner = np.zeros_like(mask)
    cv2.drawContours(inner, [c], -1, 255, thickness=cv2.FILLED)
    inner = cv2.erode(inner, np.ones((7, 7), np.uint8))
    detail = cv2.bitwise_and(edges, inner)
    dcnts, _ = cv2.findContours(detail, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)
    lines = []
    for d in sorted(dcnts, key=lambda k: -cv2.arcLength(k, False)):
        L = cv2.arcLength(d, False)
        if L < 0.12 * max(W, H) or len(lines) >= 28:
            break
        p = cv2.approxPolyDP(d, 0.01 * L + 1.5, False)[:, 0, :]
        if len(p) < 2 or len(p) > 8:
            continue  # squiggles (text, hatching) are not machine edges
        lines.append(square([[fx(px), fy(py)] for px, py in p], closed=False))
    regions, circles = inner_structure(crop, mask, fx, fy, s, W, H)
    return {"outline": outline, "holes": hole_polys, "lines": lines, "regions": regions, "circles": circles}


def main():
    if len(sys.argv) < 4:
        print(__doc__)
        sys.exit(2)
    img_path, spec_path, out = sys.argv[1:4]
    res = {}
    if cv2 is not None:
        img = np.asarray(Image.open(img_path).convert("RGB"))
        spec = load_spec(spec_path)
        for it in spec.get("items", []) or []:
            if not isinstance(it, dict):
                continue
            want = str(it.get("type", "")).lower() in ("machine", "other", "unit", "equipment") or (it.get("options") or {}).get("trace") is True
            b = box_of(it.get("box"))
            if not want or not b or not it.get("id"):
                continue
            try:
                t = trace(img, b)
            except Exception:
                t = None
            if t:
                res[str(it["id"])] = t
    json.dump(res, open(out, "w"))
    print(json.dumps({"traced": sorted(res)}))


if __name__ == "__main__":
    main()
