#!/usr/bin/env python3
"""
Probe a PDF for extraction: per-page text, every table as rows (with its caption
and section heading), images of pages that carry drawings or little text, and
an overview the model reads first.

    python3 probe.py <file.pdf> [--out <dir>] [--dpi 110]

Writes into <dir> (default: extract/<pdf-stem>/ under the current directory):
    overview.md      read this first: document info, then per page its first lines,
                     tables (id, header, rows, caption, section) and figures
    probe.json       the same as data (build.py reads the tables from here)
    pages/p001.txt   text of each page, layout kept
    tables/t001.csv  each table as CSV (header row first)
    images/p001.png  pages to look at (drawings, photos, scanned pages)
"""
import argparse
import csv
import json
import os
import re
import subprocess
import sys

try:
    import pdfplumber
except ImportError:  # pragma: no cover
    sys.exit("pdfplumber is missing: run  pip3 install pdfplumber")

WORDS = set()
for path in ("/usr/share/dict/words", "/usr/dict/words"):
    if os.path.exists(path):
        with open(path, encoding="utf-8", errors="ignore") as fh:
            WORDS = {w.strip().lower() for w in fh if w.strip()}
        break


def join_lines(cell):
    """Cell text on one line. A word wrapped mid-way ('pressu' + 're') is re-joined."""
    if cell is None:
        return ""
    parts = [p.strip() for p in str(cell).split("\n") if p.strip()]
    out = ""
    for p in parts:
        if not out:
            out = p
            continue
        a = re.search(r"([A-Za-z]+)$", out)
        b = re.match(r"([a-z]+)", p)
        if a and b and WORDS:
            left, right = a.group(1).lower(), b.group(1).lower()
            if (left + right) in WORDS and left not in WORDS:
                out += p
                continue
        if out.endswith("-") and b:
            out += p  # hyphenated wrap: keep the hyphen ("dust-" + "collector")
            continue
        out += " " + p
    return re.sub(r"\s+", " ", out).strip()


CODE = re.compile(r"\b([A-Z]{2,6}-(?:\d{1,4}[A-Z]?|[A-Z]{2,3}\d{0,2}))\b")
HEADING = re.compile(r"^(\d{1,2}(\.\d{1,2})*)\.?\s+[A-Z]")


def note_heading(heads, ln):
    """Track the numbered heading chain: a level-n heading replaces level n and drops deeper ones."""
    m = HEADING.match(ln)
    if not m or ln.lower().startswith("table"):
        return
    level = m.group(1).count(".") + 1
    for k in [k for k in heads if k >= level]:
        del heads[k]
    heads[level] = ln


def page_lines(page):
    text = page.extract_text() or ""
    return [ln.strip() for ln in text.split("\n") if ln.strip()]


def text_above(page, top, max_gap=60):
    """Lines of text just above a table (its caption), nearest last."""
    if top <= 2:
        return []
    band = page.crop((0, max(0, top - max_gap), page.width, top - 1))
    return page_lines(band)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf")
    ap.add_argument("--out")
    ap.add_argument("--dpi", type=int, default=110)
    a = ap.parse_args()
    pdf_path = os.path.abspath(a.pdf)
    stem = os.path.splitext(os.path.basename(pdf_path))[0]
    out = os.path.abspath(a.out or os.path.join("extract", re.sub(r"[^A-Za-z0-9._-]+", "_", stem)))
    for sub in ("pages", "tables", "images"):
        os.makedirs(os.path.join(out, sub), exist_ok=True)

    meta = {}
    try:
        info = subprocess.run(["pdfinfo", pdf_path], capture_output=True, text=True, timeout=60).stdout
        for ln in info.splitlines():
            if ":" in ln:
                k, v = ln.split(":", 1)
                meta[k.strip()] = v.strip()
    except Exception:
        pass

    pages, tables = [], []
    heads = {}  # heading level → heading text (1 → "2 FSL-01 · RAW-MEAL FEED SILO", 2 → "2.1 Silo bottom …")
    last_header = None
    with pdfplumber.open(pdf_path) as pdf:
        n = len(pdf.pages)
        for i, page in enumerate(pdf.pages, start=1):
            # Layout text via pdftotext keeps columns apart; pdfplumber is the fallback.
            txt = ""
            try:
                txt = subprocess.run(
                    ["pdftotext", "-layout", "-f", str(i), "-l", str(i), pdf_path, "-"],
                    capture_output=True, text=True, timeout=60,
                ).stdout
            except Exception:
                pass
            if not txt.strip():
                txt = page.extract_text() or ""
            with open(os.path.join(out, "pages", f"p{i:03d}.txt"), "w", encoding="utf-8") as fh:
                fh.write(txt)
            lines = page_lines(page)
            chars = len(page.chars)
            # Only pictures of real size count (logos and icons do not).
            area = float(page.width * page.height) or 1.0
            figures = sum(1 for im in page.images if (abs(im["x1"] - im["x0"]) * abs(im["bottom"] - im["top"])) / area > 0.04)
            vector = len(page.curves) + len(page.rects) + len(page.lines)

            found = page.find_tables()
            page_tables = []
            for tb in sorted(found, key=lambda t: t.bbox[1]):
                rows = [[join_lines(c) for c in r] for r in (tb.extract() or [])]
                rows = [r for r in rows if any(c for c in r)]
                if not rows:
                    continue
                above = text_above(page, tb.bbox[1])
                # Caption: a "Table …" / "Fig. …" line or a numbered heading just above; body sentences are not captions.
                caption = next((ln for ln in reversed(above) if re.match(r"^(table|tab\.|fig(ure)?\.?)\s", ln, re.I) or HEADING.match(ln)), "")
                # Headings above this table on the page update the heading chain.
                for ln in page_lines(page.crop((0, 0, page.width, max(1, tb.bbox[1])))):
                    note_heading(heads, ln)
                chain = [heads[k] for k in sorted(heads)]
                section = chain[-1] if chain else ""
                header = rows[0]
                # A table continuing on a new page repeats its header; mark it so it can be mapped once.
                if last_header and len(header) == len(last_header) and header == last_header:
                    cont = True
                else:
                    cont = False
                last_header = header
                tid = f"t{len(tables) + 1:03d}"
                with open(os.path.join(out, "tables", f"{tid}.csv"), "w", newline="", encoding="utf-8") as fh:
                    csv.writer(fh).writerows(rows)
                cap_title = re.sub(r"^(table|tab\.|fig(ure)?\.?)\s+[\w.\-]+\s*", "", caption, flags=re.I)
                cap_title = re.sub(r"^\d+(\.\d+)*\.?\s+", "", cap_title).split(" · ")[0].strip()
                if not cap_title and cont and tables and tables[-1]["section_path"] == " › ".join(chain):
                    cap_title = tables[-1]["caption_title"]  # the same table continued (same heading): keep its caption
                if not cap_title and chain:
                    cap_title = re.sub(r"^\d+(\.\d+)*\.?\s+", "", chain[-1]).split(" · ")[0].strip()
                sec_code = next((m.group(1) for h in reversed(chain) for m in [CODE.search(h)] if m), None)
                t = {
                    "id": tid,
                    "page": i,
                    "rows": len(rows) - 1,
                    "cols": len(header),
                    "header": header,
                    "header_sig": " | ".join(header),
                    "repeats_previous_header": cont,
                    "caption": caption,
                    "caption_title": cap_title,
                    "section": section,
                    "section_path": " › ".join(chain),
                    "section_title": re.sub(r"^\d+(\.\d+)*\.?\s+", "", chain[-1]).strip() if chain else "",
                    "section_code": sec_code or "",
                    "first_row": rows[1] if len(rows) > 1 else [],
                    "csv": f"tables/{tid}.csv",
                    "data": rows,
                }
                tables.append(t)
                page_tables.append(tid)
            for ln in lines:
                note_heading(heads, ln)

            # Pages to look at as images: drawings / photos / scans / little text.
            image = None
            look = figures > 0 or chars < 200 or (vector > 150 and not page_tables and chars < 1500)
            if look:
                base = os.path.join(out, "images", f"p{i:03d}")
                subprocess.run(["pdftoppm", "-png", "-r", str(a.dpi), "-f", str(i), "-l", str(i), "-singlefile", pdf_path, base],
                               capture_output=True, timeout=120)
                if os.path.exists(base + ".png"):
                    image = f"images/p{i:03d}.png"
            pages.append({
                "page": i,
                "chars": chars,
                "embedded_images": figures,
                "vector_shapes": vector,
                "tables": page_tables,
                "image": image,
                "scanned": chars < 30 and figures > 0,
                "first_lines": lines[:6],
            })

    codes = sorted({m for t in tables for row in t["data"] for c in row for m in CODE.findall(c)} |
                   {m for p in pages for ln in p["first_lines"] for m in CODE.findall(ln)})
    # codes_seen: code-like words anywhere (tags, machines, document numbers) — hints only.
    probe = {"file": pdf_path, "pages": n, "meta": meta, "codes_seen": codes[:400], "page_info": pages,
             "tables": [{k: v for k, v in t.items() if k != "data"} | {"data": t["data"]} for t in tables]}
    with open(os.path.join(out, "probe.json"), "w", encoding="utf-8") as fh:
        json.dump(probe, fh, ensure_ascii=False, indent=1)

    # Overview: what a model reads first.
    md = [f"# {os.path.basename(pdf_path)}", "",
          f"Pages: {n} · tables: {len(tables)} · page images: {sum(1 for p in pages if p['image'])}",
          f"Title (metadata): {meta.get('Title', '—')}", ""]
    sigs = {}
    for t in tables:
        sigs.setdefault(t["header_sig"], []).append(t["id"])
    shape_no = {}
    if sigs:
        md += ["## Table shapes (same header = same kind of table; map each shape once)", ""]
        for n, (sig, ids) in enumerate(sorted(sigs.items(), key=lambda kv: -len(kv[1])), start=1):
            shape_no[sig] = n
            md.append(f"- S{n}: {len(ids)}× [{sig}] → {', '.join(ids[:12])}{' …' if len(ids) > 12 else ''}")
        md.append("")
    md += ["## Pages", ""]
    for p in pages:
        flags = []
        if p["image"]:
            flags.append(f"image {p['image']}")
        if p["scanned"]:
            flags.append("SCANNED (read the image)")
        md.append(f"### Page {p['page']}" + (f"  ({'; '.join(flags)})" if flags else ""))
        for ln in p["first_lines"][:4]:
            md.append(f"    {ln[:140]}")
        for tid in p["tables"]:
            t = next(x for x in tables if x["id"] == tid)
            md.append(f"- table {tid}: {t['rows']} rows + header × {t['cols']} cols · caption_title: {t['caption_title'][:80] or '—'} · section: {t['section_path'][-110:] or '—'}{' · code ' + t['section_code'] if t['section_code'] else ''}")
            # A shape seen on many tables is described once at the top; here only its number.
            if len(sigs[t["header_sig"]]) > 1:
                md.append(f"  shape S{shape_no[t['header_sig']]}")
            else:
                md.append(f"  header: {t['header']}")
                if t["first_row"]:
                    md.append(f"  first row: {[c[:60] for c in t['first_row']]}")
        md.append("")
    with open(os.path.join(out, "overview.md"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(md))
    print(json.dumps({"out": out, "pages": n, "tables": len(tables), "images": [p["image"] for p in pages if p["image"]],
                      "table_shapes": len(sigs), "overview": os.path.join(out, "overview.md")}, indent=1))


if __name__ == "__main__":
    main()
