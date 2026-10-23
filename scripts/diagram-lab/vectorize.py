#!/usr/bin/env python3
"""
Diagram lab — vectorize a machine from its picture into house-style shapes.

    python3 scripts/diagram-lab/vectorize.py <image> <jobs.json> <out.json> [--preview <dir>]

jobs.json: [{"key": "...", "src": [l, t, r, b], "parts": [{"box": [l,t,r,b], "tone": "body|raised|recess|material"}]}]
  src    the machine's area in the image, grid units (0-100)
  parts  the model's part boxes in that area (they mark where the machine is, and give tone hints)

For each job it writes {key: {"regions": [{"tone", "d"}], "ink": ["d", ...], "aspect": w/h}} where every
path is in job-relative units (0..1000 across the src box, y down). The engine draws regions with the
kit paints (body / raised / recess / material / shaft) and ink as the drawing's edge lines, so the machine
keeps its real outline from the picture whatever model wrote the spec.

Works on line drawings (dark strokes on a light page) and on filled pictures (renders, photos, flat
colour sketches): line art gives regions = areas enclosed by the strokes; filled pictures give regions =
areas of one colour inside the machine's silhouette.
"""
import json
import os
import sys

import cv2
import numpy as np
from PIL import Image

U = 1000.0  # path units across the job box


def poly_d(cnt, sx, sy, ox, oy, eps):
    p = cv2.approxPolyDP(cnt, eps, True)[:, 0, :]
    if len(p) < 3:
        return None
    pts = [f"{(x - ox) * sx:.1f} {(y - oy) * sy:.1f}" for x, y in p]
    return "M" + " L".join(pts) + " Z"


def paths(mask, sx, sy, ox, oy, eps, min_area):
    """Region mask -> SVG path data with holes (even-odd)."""
    cnts, hier = cv2.findContours(mask, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
    out = []
    if hier is None:
        return out
    hier = hier[0]
    for i, c in enumerate(cnts):
        if hier[i][3] != -1 or cv2.contourArea(c) < min_area:
            continue
        d = poly_d(c, sx, sy, ox, oy, eps)
        if not d:
            continue
        j = hier[i][2]
        while j != -1:
            if cv2.contourArea(cnts[j]) >= min_area * 0.5:
                h = poly_d(cnts[j], sx, sy, ox, oy, eps)
                if h:
                    d += " " + h
            j = hier[j][0]
        out.append((d, cv2.contourArea(c)))
    return out


def tone_of(region_mask, parts_px, figure_area, area, mean_l, l_rank):
    """House tone for a region: the model's tone hint where a part box covers it, else from size and lightness."""
    ys, xs = np.nonzero(region_mask)
    if len(xs):
        best = None
        for (x0, y0, x1, y1, t) in parts_px:
            if t not in ("recess", "material", "raised"):
                continue
            # The hint counts only for an area that lies (almost) wholly inside that part's box.
            inside = ((xs >= x0) & (xs <= x1) & (ys >= y0) & (ys <= y1)).mean()
            if inside >= 0.8:
                a = (x1 - x0) * (y1 - y0)
                if best is None or a < best[0]:
                    best = (a, t)
        if best:
            return best[1]
    if area < 0.004 * figure_area:
        return "raised"
    if l_rank is not None:
        # filled pictures: darkest colour reads as an opening, lightest as a raised cover
        if l_rank == "dark" and area < 0.25 * figure_area:
            return "recess"
        if l_rank == "light":
            return "raised"
    return "body" if area > 0.06 * figure_area else "raised"


def line_art(crop, inside, border):
    """Dark strokes on a light page: strokes = ink, enclosed areas = regions."""
    g = cv2.cvtColor(crop, cv2.COLOR_RGB2GRAY)
    h, w = g.shape
    # Strokes: dark pixels, plus faint pencil / pastel outlines that are only darker than their surroundings.
    thr = min(170, int(np.percentile(g, 30)) + 40)
    local = cv2.adaptiveThreshold(cv2.GaussianBlur(g, (3, 3), 0), 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV, 25, 12) > 0
    ink = (((g < thr) | local) & inside).astype(np.uint8) * 255
    # Letters, words and arrow heads: small separate blobs, or short wide blobs (a handwritten word).
    n, lab, st, _ = cv2.connectedComponentsWithStats(ink, 8)
    keep = np.zeros_like(ink)
    lim = 0.045 * max(w, h)
    for i in range(1, n):
        bw, bh = st[i][2], st[i][3]
        if max(bw, bh) < lim:
            continue
        if bh < 0.04 * h and bw < 0.25 * w and st[i][4] < 0.5 * bw * bh:
            continue  # a word: low, not too long, mostly empty
        keep[lab == i] = 255
    ink = keep
    raw = ink.copy()
    # Label leaders: straight strokes that run in from the edge of the machine area.
    segs = cv2.HoughLinesP(ink, 1, np.pi / 360, 25, minLineLength=int(0.05 * max(w, h)), maxLineGap=3)
    if segs is not None:
        for x1, y1, x2, y2 in segs[:, 0]:
            if border[y1, x1] or border[y2, x2]:
                cv2.line(ink, (int(x1), int(y1)), (int(x2), int(y2)), 0, 5)
        n, lab, st, _ = cv2.connectedComponentsWithStats(ink, 8)
        for i in range(1, n):
            if max(st[i][2], st[i][3]) < lim:
                ink[lab == i] = 0
    ink = cv2.morphologyEx(ink, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    # Regions: what the strokes enclose; anything that reaches the area's edge is page, not machine.
    # Small breaks in an outline would let a part leak into the page, so they are bridged for this step only.
    gap = max(3, int(0.012 * max(w, h)) | 1)
    walls = cv2.morphologyEx(ink, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (gap, gap)))
    # Label arrows run from a label on the page into the machine. Take them out whole (inside part and head
    # too) before finding the areas, or they split the machine's parts. A rough machine body = the drawing
    # filled in with its thin protrusions shaved off.
    cs, _ = cv2.findContours(walls, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    solid = np.zeros_like(walls)
    cv2.drawContours(solid, cs, -1, 255, thickness=cv2.FILLED)
    kk = max(5, int(0.035 * max(w, h)) | 1)
    body = cv2.morphologyEx(solid, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kk, kk))) > 0
    out_d = cv2.distanceTransform((~body).astype(np.uint8), cv2.DIST_L2, 3)
    margin = max(4.0, 0.012 * max(w, h))
    in_d = cv2.distanceTransform(body.astype(np.uint8), cv2.DIST_L2, 3)
    segs = cv2.HoughLinesP(raw, 1, np.pi / 360, 20, minLineLength=int(0.035 * max(w, h)), maxLineGap=4)
    if segs is not None:
        for x1, y1, x2, y2 in segs[:, 0]:
            ang = abs(np.degrees(np.arctan2(int(y2) - int(y1), int(x2) - int(x1)))) % 180
            if min(ang, abs(ang - 90), 180 - ang) < 5:
                continue  # machine edges are square; leaders are slanted
            a_in, b_in = body[y1, x1], body[y2, x2]
            if a_in == b_in:
                continue
            # A leader starts well out on the page and ends well inside the machine; the machine's own slanted
            # edges (a tapered frame) run along its boundary and are left alone.
            out_pt, in_pt = ((x2, y2), (x1, y1)) if a_in else ((x1, y1), (x2, y2))
            if out_d[out_pt[1], out_pt[0]] < 0.04 * max(w, h) or in_d[in_pt[1], in_pt[0]] < 0.02 * max(w, h):
                continue
            # Erase the shaft out on the page and deep inside the machine, but never near the machine's outline:
            # where the arrow meets or skims the outline, cutting would open the part it points at.
            lm = np.zeros_like(ink)
            cv2.line(lm, (int(out_pt[0]), int(out_pt[1])), (int(in_pt[0]), int(in_pt[1])), 255, 4)
            ink[(lm > 0) & ((out_d > 2) | (in_d > margin))] = 0
        # Where an arrow crossed a machine edge the cut is narrow: closing the strokes again heals it.
        walls = cv2.morphologyEx(ink, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (gap, gap)))
    # Regions: what the strokes enclose; an area that reaches the edge of the machine area is page.
    free = cv2.bitwise_not(cv2.dilate(walls, np.ones((3, 3), np.uint8)))
    free[~inside] = 0
    n, lab, st, _ = cv2.connectedComponentsWithStats(free, 4)
    page = set(np.unique(lab[border & (free > 0)]).tolist()) | {0}
    regions = []
    part = np.zeros_like(ink)
    for i in range(1, n):
        if i in page or st[i][4] < 25:
            continue
        m = (lab == i).astype(np.uint8) * 255
        regions.append((m, None))
        part |= m
    # A machine edge has a machine area on at least one side; a label arrow or stray word has only page around it.
    reach = max(3, int(0.008 * max(w, h)) + int(gap / 2))
    beside = cv2.dilate(part, np.ones((2 * reach + 1, 2 * reach + 1), np.uint8)) > 0
    # Arrows that reach in from a label: straight slanted strokes running out into the page.
    segs = cv2.HoughLinesP(raw, 1, np.pi / 360, 25, minLineLength=int(0.04 * max(w, h)), maxLineGap=2)
    if segs is not None:
        for x1, y1, x2, y2 in segs[:, 0]:
            ang = abs(np.degrees(np.arctan2(int(y2) - int(y1), int(x2) - int(x1)))) % 180
            if min(ang, abs(ang - 90), 180 - ang) < 6:
                continue
            if beside[y1, x1] != beside[y2, x2]:
                cv2.line(ink, (int(x1), int(y1)), (int(x2), int(y2)), 0, 4)
    ink[~beside] = 0
    n, lab, st, _ = cv2.connectedComponentsWithStats(ink, 8)
    for i in range(1, n):
        if max(st[i][2], st[i][3]) < 0.02 * max(w, h):
            ink[lab == i] = 0
    figure = cv2.morphologyEx(part | ink, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    return regions, ink, figure


def filled(crop, inside, border):
    """Renders, photos and colour sketches: the machine against its background, split into areas of one colour."""
    h, w = crop.shape[:2]
    lab_img = cv2.cvtColor(crop, cv2.COLOR_RGB2LAB).astype(np.int16)
    ring = lab_img[border]
    bg = np.median(ring, axis=0) if len(ring) else lab_img.reshape(-1, 3).mean(0)
    diff = np.abs(lab_img - bg).sum(axis=2)
    g = cv2.cvtColor(crop, cv2.COLOR_RGB2GRAY)
    edges = cv2.Canny(cv2.GaussianBlur(g, (3, 3), 0), 40, 120)
    fg = (((diff > 26) | (edges > 0)) & inside).astype(np.uint8) * 255
    k = max(3, int(0.012 * max(w, h)) | 1)
    fg = cv2.morphologyEx(fg, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)))
    cnts, _ = cv2.findContours(fg, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    figure = np.zeros_like(fg)
    keep = [c for c in cnts if cv2.contourArea(c) > 0.01 * w * h]
    cv2.drawContours(figure, keep, -1, 255, thickness=cv2.FILLED)
    figure = cv2.morphologyEx(figure, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)))
    if figure.sum() == 0:
        return [], np.zeros_like(fg), figure
    flat = cv2.pyrMeanShiftFiltering(crop, 10, 26)
    pix = cv2.cvtColor(flat, cv2.COLOR_RGB2LAB).reshape(-1, 3).astype(np.float32)
    sel = figure.reshape(-1) > 0
    K = 6
    _, lbl, centers = cv2.kmeans(pix[sel], K, None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1.0), 2, cv2.KMEANS_PP_CENTERS)
    labels = np.full(w * h, -1, np.int32)
    labels[sel] = lbl.reshape(-1)
    labels = labels.reshape(h, w)
    order = np.argsort(centers[:, 0])
    rank = {int(order[0]): "dark", int(order[-1]): "light"}
    regions = []
    for kk in range(K):
        m = np.where(labels == kk, 255, 0).astype(np.uint8)
        m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
        m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
        n, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)
        for i in range(1, n):
            if st[i][4] < 0.0015 * w * h:
                continue
            regions.append(((lab == i).astype(np.uint8) * 255, rank.get(kk, "mid")))
    # Ink: the region boundaries and the silhouette.
    ink = np.zeros_like(fg)
    for r, _ in regions:
        cs, _ = cv2.findContours(r, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)
        cv2.drawContours(ink, cs, -1, 255, 1)
    cs, _ = cv2.findContours(figure, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    cv2.drawContours(ink, cs, -1, 255, 2)
    return regions, ink, figure


def is_line_art(crop, inside):
    g = cv2.cvtColor(crop, cv2.COLOR_RGB2GRAY)[inside]
    hsv = cv2.cvtColor(crop, cv2.COLOR_RGB2HSV)[inside]
    if g.size == 0:
        return True
    light = (g > 200).mean()
    sat = (hsv[:, 1] > 60).mean()
    return light > 0.55 and sat < 0.25


def run_job(img, job):
    H0, W0 = img.shape[:2]
    l, t, r, b = job["src"]
    m = 0.04
    x0, y0 = int(max(0, (l / 100 - m * (r - l) / 100) * W0)), int(max(0, (t / 100 - m * (b - t) / 100) * H0))
    x1, y1 = int(min(W0, (r / 100 + m * (r - l) / 100) * W0)), int(min(H0, (b / 100 + m * (b - t) / 100) * H0))
    crop = img[y0:y1, x0:x1]
    if crop.size == 0 or min(crop.shape[:2]) < 16:
        return None
    s = 900 / max(crop.shape[:2])
    crop = cv2.resize(crop, (max(8, int(crop.shape[1] * s)), max(8, int(crop.shape[0] * s))), interpolation=cv2.INTER_AREA if s < 1 else cv2.INTER_CUBIC)
    h, w = crop.shape[:2]
    # Inside = the whole machine area (the crop); the model's part boxes are rough, so they only give tone hints.
    inside = np.full((h, w), 255, np.uint8)
    parts_px = []
    for p in job.get("parts", []):
        pl, pt, pr, pb = p["box"]
        px0, py0 = ((pl / 100) * W0 - x0) * s, ((pt / 100) * H0 - y0) * s
        px1, py1 = ((pr / 100) * W0 - x0) * s, ((pb / 100) * H0 - y0) * s
        parts_px.append((px0, py0, px1, py1, p.get("tone", "body")))
    line = is_line_art(crop, inside > 0)
    if not line and parts_px:
        # Photos and renders: the background is not plain, so the machine area is the model's part boxes (grown a little).
        inside = np.zeros((h, w), np.uint8)
        g = 0.02 * max(w, h)
        for (px0, py0, px1, py1, _) in parts_px:
            cv2.rectangle(inside, (int(px0 - g), int(py0 - g)), (int(px1 + g), int(py1 + g)), 255, -1)
    border = cv2.morphologyEx(inside, cv2.MORPH_GRADIENT, np.ones((7, 7), np.uint8)) > 0
    border |= np.pad(np.ones((h - 2, w - 2), bool), 1, constant_values=False) == False  # noqa: E712
    inside_b = inside > 0
    if not line:
        # A photo with a busy background (a machine on a show floor, a cluttered close-up) cannot be separated from
        # what is behind it: trace only when the background around the machine is plain (a render, a studio shot).
        # The picture's own background: its outer edge, where only page (or floor, or scene) is.
        full = cv2.cvtColor(img, cv2.COLOR_RGB2LAB).astype(np.float32)
        e = max(4, int(0.03 * min(H0, W0)))
        page = np.concatenate([full[:e].reshape(-1, 3), full[-e:].reshape(-1, 3), full[:, :e].reshape(-1, 3), full[:, -e:].reshape(-1, 3)])
        # Plain = most of the edge is one colour (a page with a few labels or a logo on it still counts).
        med = np.median(page, axis=0)
        plain = float((np.abs(page - med).sum(axis=1) < 24).mean())
        if plain < 0.75:
            return None
    regions, ink, figure = (line_art if line else filled)(crop, inside_b, border)
    fa = max(1.0, float((figure > 0).sum()))
    # job box (the src box, without margin) in crop pixels
    bx0, by0 = ((l / 100) * W0 - x0) * s, ((t / 100) * H0 - y0) * s
    bx1, by1 = ((r / 100) * W0 - x0) * s, ((b / 100) * H0 - y0) * s
    sx, sy = U / max(1e-6, bx1 - bx0), U / max(1e-6, by1 - by0)
    eps = 1.6
    out_regions = []
    for rm, rank in regions:
        area = float((rm > 0).sum())
        tone = tone_of(rm > 0, parts_px, fa, area, None, rank)
        for d, _ in paths(rm, sx, sy, bx0, by0, eps, 18):
            out_regions.append({"tone": tone, "d": d, "a": area})
    out_regions.sort(key=lambda r: -r["a"])
    for r_ in out_regions:
        del r_["a"]
    ink_d = []  # edges are drawn as the regions' rims (crisp vector lines), not as traced pixel strokes
    # Silhouette (3D extrusion, health outline).
    sil = [d for d, _ in paths((figure > 0).astype(np.uint8) * 255, sx, sy, bx0, by0, 1.2, 0.002 * w * h)]
    return {"regions": out_regions, "ink": ink_d, "silhouette": sil, "lineArt": bool(line), "aspect": round((bx1 - bx0) / max(1e-6, by1 - by0), 4)}


def preview(res, path, w=700):
    """Rasterise a result in house dark colours (for tuning only)."""
    asp = res["aspect"]
    W, H = w, int(w / asp)
    col = {"body": "#1d2127", "raised": "#2a2f37", "recess": "#090a0c", "material": "#a8894a", "shaft": "#6b7480"}
    svg = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W + 40}" height="{H + 40}" viewBox="-20 -20 {U + 40 * U / W} {U / asp + 40 * U / W}"><rect x="-50" y="-50" width="5000" height="5000" fill="#0c0d0e"/>']
    for r_ in res["regions"]:
        svg.append(f'<path d="{r_["d"]}" fill="{col[r_["tone"]]}" fill-rule="evenodd"/>')
    for d in res["ink"]:
        svg.append(f'<path d="{d}" fill="#586069" fill-rule="evenodd"/>')
    svg.append("</svg>")
    open(path, "w").write("".join(svg))


def main():
    args = sys.argv[1:]
    if len(args) < 3:
        print(__doc__)
        sys.exit(2)
    img = np.asarray(Image.open(args[0]).convert("RGB"))
    jobs = json.load(open(args[1]))
    pv = args[args.index("--preview") + 1] if "--preview" in args else None
    out = {}
    for job in jobs:
        try:
            r = run_job(img, job)
        except Exception as e:  # one bad job must not stop the rest
            r = None
            sys.stderr.write(f"{job.get('key')}: {e}\n")
        if r and r["regions"]:
            out[job["key"]] = r
            if pv:
                os.makedirs(pv, exist_ok=True)
                preview(r, os.path.join(pv, f"{job['key']}.svg"))
    json.dump(out, open(args[2], "w"))
    print(json.dumps({"vectorized": sorted(out), "sizes": {k: len(json.dumps(v)) for k, v in out.items()}}))


if __name__ == "__main__":
    main()
