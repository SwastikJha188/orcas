#!/usr/bin/env python3
"""
Check an extract.json (build.py runs this for you).

    python3 validate.py <dir>        prints errors, warnings and counts; exit 1 on errors
"""
import json
import os
import re
import sys

TAGLIKE = re.compile(r"^[A-Z]{1,6}[-_ ]?[A-Z0-9]{0,6}[-_]?\d{1,4}[A-Z]?$")
KINDS = {"sensor-list", "technical-spec", "datasheet", "manual", "maintenance-checklist", "drawing", "plant-overview",
         "org-chart", "report", "contract", "policy", "other"}


def validate(x, probe=None, used=None):
    errors, warnings = [], []
    if x.get("schema") != "ultron.extract/1":
        errors.append("schema must be 'ultron.extract/1'")
    if x.get("kind") not in KINDS:
        errors.append(f"kind '{x.get('kind')}' is not one of {sorted(KINDS)}")
    doc = x.get("document") or {}
    if not doc.get("title"):
        warnings.append("document.title is empty (read it from page 1)")
    if not x.get("summary"):
        warnings.append("summary is empty: one or two sentences on what the document is")

    machines = x.get("machines") or []
    codes = {str(m.get("code") or "").upper() for m in machines if m.get("code")}
    names = {str(m.get("name") or "").lower() for m in machines if m.get("name")}
    for i, m in enumerate(machines):
        if not m.get("name") and not m.get("code"):
            errors.append(f"machines[{i}] has neither code nor name")
        if not (m.get("source") or {}).get("page"):
            warnings.append(f"machine {m.get('code') or m.get('name')}: no source page")

    seen = {}
    for i, p in enumerate(x.get("points") or []):
        tag = p.get("tag")
        where = f"point {tag or i}"
        if not tag:
            errors.append(f"points[{i}] has no tag")
            continue
        if tag in seen:
            errors.append(f"{where}: duplicate tag (also points[{seen[tag]}])")
        seen[tag] = i
        if not p.get("name"):
            warnings.append(f"{where}: no name")
        if p.get("value_kind") not in ("analog", "state"):
            errors.append(f"{where}: value_kind must be analog or state")
        if p.get("value_kind") == "analog" and not p.get("unit"):
            warnings.append(f"{where}: analog point without unit")
        for key in ("range", "nominal"):
            r = p.get(key)
            if r and r.get("lo") is not None and r.get("hi") is not None and r["lo"] > r["hi"]:
                errors.append(f"{where}: {key} lo {r['lo']} > hi {r['hi']}")
        lim = p.get("limits") or {}
        seq = [(k, lim.get(k)) for k in ("ll", "l", "h", "hh") if lim.get(k) is not None]
        for (ka, a), (kb, b) in zip(seq, seq[1:]):
            if a > b:
                errors.append(f"{where}: limits out of order {ka.upper()} {a} > {kb.upper()} {b}")
        rng = p.get("range") or {}
        if rng.get("lo") is not None and rng.get("hi") is not None:
            for k, v in seq:
                if v < rng["lo"] - 1e-9 or v > rng["hi"] + 1e-9:
                    warnings.append(f"{where}: {k.upper()} {v} outside the range {rng['lo']}…{rng['hi']}")
        m = p.get("machine")
        if m and machines and m.upper() not in codes and m.lower() not in names:
            warnings.append(f"{where}: machine '{m}' is not in machines[]")
        if not (p.get("source") or {}).get("page"):
            warnings.append(f"{where}: no source page")

    ids = [t.get("task_id") for t in (x.get("maintenance") or []) if t.get("task_id")]
    dup = sorted({i for i in ids if ids.count(i) > 1}) if len(ids) < 5000 else []
    if dup:
        warnings.append(f"maintenance task_id repeated: {', '.join(dup[:10])}")
    for i, pp in enumerate(x.get("people") or []):
        if not pp.get("name"):
            warnings.append(f"people[{i}] has no name (role '{pp.get('role')}'): a role without a person is not a person — drop it or add it to gaps")
    for pt in x.get("points") or []:
        u = str(pt.get("unit") or "")
        if len(u.split()) > 3 or re.search(r"\b(if|transmitter|sensor|optional|added|motor|of)\b", u, re.I):
            warnings.append(f"point {pt.get('tag')}: unit '{u}' looks like text, not a unit — set it in facts.json point_fixes")
    unknown_m = {}
    for i, t in enumerate(x.get("maintenance") or []):
        if not t.get("task"):
            errors.append(f"maintenance[{i}] has no task")
        m = t.get("machine")
        if m and machines and m.upper() not in codes and m.lower() not in names:
            unknown_m[m] = unknown_m.get(m, 0) + 1
    for m, n in unknown_m.items():
        warnings.append(f"{n} maintenance task(s) name machine '{m}', which is not in machines[]")
    if x.get("plant") and not (x["plant"] or {}).get("name"):
        warnings.append("plant is set but has no name: use null for the whole plant when the document does not name one")

    # Tables that look like sensor lists but were not mapped: probably missed points.
    if probe is not None and used is not None:
        for t in probe.get("tables", []):
            if t["id"] in used:
                continue
            col0 = [r[0] for r in t["data"][1:] if r and r[0]]
            tagged = sum(1 for c in col0 if TAGLIKE.match(c.replace(" ", "")))
            if col0 and tagged >= max(2, len(col0) // 2):
                warnings.append(f"table {t['id']} (page {t['page']}, {t['rows']} rows, header {t['header'][:4]}…) looks like a list of tags but is not in mapping.json")
    if not (x.get("points") or machines or x.get("facts")):
        errors.append("nothing extracted: no points, machines or facts")
    return {"errors": errors, "warnings": warnings}


def report(x, res, path):
    pts = x.get("points") or []
    lines = [
        f"extract: {path}",
        f"kind: {x.get('kind')} · machines {len(x.get('machines') or [])} · components {len(x.get('components') or [])} · "
        f"points {len(pts)} (analog {sum(1 for p in pts if p.get('value_kind') == 'analog')}, state {sum(1 for p in pts if p.get('value_kind') == 'state')}) · "
        f"with range {sum(1 for p in pts if (p.get('range') or {}).get('hi') is not None)} · with numeric limits {sum(1 for p in pts if any((p.get('limits') or {}).get(k) is not None for k in ('ll', 'l', 'h', 'hh')))} (limit text {sum(1 for p in pts if (p.get('limits') or {}).get('text'))}) · "
        f"people {len(x.get('people') or [])} · maintenance {len(x.get('maintenance') or [])} · drawings {len(x.get('drawings') or [])} · facts {len(x.get('facts') or [])} · gaps {len(x.get('gaps') or [])}",
    ]
    lines.append(f"ERRORS ({len(res['errors'])}):" if res["errors"] else "ERRORS: none")
    lines += [f"  - {e}" for e in res["errors"][:60]]
    lines.append(f"WARNINGS ({len(res['warnings'])}):" if res["warnings"] else "WARNINGS: none")
    lines += [f"  - {w}" for w in res["warnings"][:60]]
    if len(res["warnings"]) > 60:
        lines.append(f"  … {len(res['warnings']) - 60} more")
    return "\n".join(lines)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    d = os.path.abspath(sys.argv[1])
    x = json.load(open(os.path.join(d, "extract.json"), encoding="utf-8"))
    probe = json.load(open(os.path.join(d, "probe.json"), encoding="utf-8")) if os.path.exists(os.path.join(d, "probe.json")) else None
    res = validate(x, probe, None)
    print(report(x, res, os.path.join(d, "extract.json")))
    sys.exit(1 if res["errors"] else 0)
