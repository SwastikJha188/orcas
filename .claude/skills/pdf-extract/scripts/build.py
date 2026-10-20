#!/usr/bin/env python3
"""
Build extract.json from the probe's tables plus what the model wrote by hand.

    python3 build.py <dir>          (the folder probe.py wrote)

Reads   <dir>/probe.json    tables found by probe.py
        <dir>/mapping.json  which tables hold what, and which column is which field
        <dir>/facts.json    document, plant, areas, machines, people … written by the model
Writes  <dir>/extract.json  the result, then validates it (validate.py) and prints the report.

mapping.json:
{
  "tables": [
    { "kind": "points",                       // points | machines | components | people | maintenance | facts | rows | pairs
      "header_sig": "TAG | SENSOR NAME | …",  // every table with this header (from overview.md) …
      "ids": ["t006"],                        // … or these table ids (either or both)
      "columns": { "tag": "TAG", "name": "SENSOR NAME", "unit": "UNIT", "range": "DESIGN RANGE", … },
      "machine": "@section_code",             // per-table value: "@section_code" | "@section_title" | "@section" | "@caption_title" | "@caption" | "=FSL-01" | a column name
      "component": "@caption_title" }
  ]
}
A column value is the header text as printed (case and spacing ignored) or "#2" (0-based column number).
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from validate import validate, report  # noqa: E402

FIELDS = {
    "points": ["tag", "name", "machine", "component", "location", "signal_type", "unit", "range", "nominal",
               "ll", "l", "h", "hh", "warn", "alarm", "setpoint", "priority", "remarks", "value_kind", "origin"],
    "machines": ["code", "name", "type", "area", "manufacturer", "model", "power", "speed", "description"],
    "components": ["machine", "code", "name", "description"],
    "people": ["name", "role", "email", "phone"],
    "maintenance": ["machine", "component", "task_id", "task", "criteria", "frequency", "method", "who"],
    "facts": ["topic", "text"],
    "rows": ["topic"],
    "pairs": [],
}

STATE_WORDS = re.compile(r"\b(open|closed|running|stopped|on|off|ok|clear|ready|normal|present|absent|tripped|fault|healthy|alarm|status|yes|no|high|low)\b", re.I)
TAG_IN = re.compile(r"^([A-Z]{1,6}(?:[-_][A-Z0-9]{1,6})*[-_]?\d{1,4}[A-Z]?)\b")
CODE = re.compile(r"^\s*([A-Z]{2,6}-(?:\d{1,4}[A-Z]?|[A-Z]{2,3}\d{0,2}))\b\s*(?:[·:\-–—|]\s*)?(.*)$")
# Units recognised after a range ("0–5 bar abs"); anything else stays in the text.
UNIT_HEAD = re.compile(r"^(°C|°F|K|bar|mbar|barg|bar\(g\)|Pa|kPa|MPa|psi|mmWG|mmH2O|mWC|kW|W|MW|kVA|A|mA|V|kV|rpm|Hz|kHz|mm/s|in/s|g|mm|µm|um|m|%|ppm|vol%|t/h|kg/h|kg|t|m³/h|m3/h|Nm³/h|Nm3/h|L/min|l/min|L/h|s|ms|min|h|dB|dBA|mg/Nm³|mg/Nm3|°|N|kN|Nm|kNm|bara|mbara)$")
UNIT_TAIL = {"abs", "a", "g", "(g)", "gauge", "rms", "pk", "peak", "p-p", "dc", "ac", "fla"}
NUM = r"[+-]?\d+(?:\.\d+)?"
EMPTY = {"", "-", "–", "—", "n/a", "na", "none", "nil", "tbc", "tbd", "?"}


def norm(s):
    return re.sub(r"\s+", " ", str(s or "")).strip().lower()


def clean_text(v):
    v = re.sub(r"\s+", " ", str(v or "")).strip()
    return None if norm(v) in EMPTY else v


def numtext(v):
    """Unicode minus → '-', thousands commas removed."""
    v = str(v or "").replace("−", "-").replace(" ", " ")
    v = re.sub(r"(?<=\d),(?=\d{3}\b)", "", v)
    return re.sub(r"(?<=\d)[ \u00a0\u202f](?=\d{3}\b)", "", v)  # "10 000"


# A limit written relative to something else (a baseline, normal value, set-point, target) has no absolute number.
RELATIVE = re.compile(r"±|\bdev|deviation|set-?\s?point|\bsp\b|\bbaseline\b|\bnormal\b|\bestablished\b|\btarget\b|\breference\b|\bmatched\b|\brecorded\b|\brated\b|\bnominal\b|\bmean\b|"
                      r"\d\s*[x×]\b|[x×]\s*\d|\bfrom\b|\bthan\b|\babove the\b|\bbelow the\b|\brise\b|\bdrop\b", re.I)


def parse_number(v):
    """A single limit / set-point: '+20' → 20, '> 1050 °C' → 1050 (side hi), '< -0.7 bar' → -0.7 (side lo)."""
    t = clean_text(v)
    if t is None:
        return None, None
    s = numtext(t)
    side = "hi" if re.match(r"^\s*(>|≥|above|over|high)", s, re.I) else "lo" if re.match(r"^\s*(<|≤|below|under|low)", s, re.I) else None
    if RELATIVE.search(s):
        return None, side  # relative to a set-point / deviation band: keep the text only
    nums = re.findall(NUM, s)
    if side and nums:
        return float(nums[0]), side  # "> 26 °C for 30 s": the number after the comparator
    if len(nums) != 1:
        return None, side
    return float(nums[0]), side


def parse_range(v):
    """'0 – 300' / '−50 … +50' / '0 to 100 (sum)' → (lo, hi); otherwise (None, None)."""
    t = clean_text(v)
    if t is None:
        return None, None
    s = numtext(t)
    m = re.search(rf"({NUM})\s*(?:–|—|…|\.\.\.|\bto\b)\s*({NUM})", s)
    if not m:
        m = re.match(rf"^\s*({NUM})\s*-\s*({NUM})", s)
    if m:
        lo, hi = float(m.group(1)), float(m.group(2))
        return (lo, hi) if lo <= hi else (hi, lo)
    m = re.match(rf"^\s*±\s*({NUM})", s)
    if m:
        x = abs(float(m.group(1)))
        return -x, x
    m = re.match(rf"^\s*(<|≤|max\.?|below|up to)\s*({NUM})", s, re.I)
    if m:
        return None, float(m.group(2))  # "< 300": upper bound only
    m = re.match(rf"^\s*(>|≥|min\.?|above|at least)\s*({NUM})", s, re.I)
    if m:
        return float(m.group(2)), None
    return None, None


def unit_after_range(text):
    """'0 – 5 bar abs' → 'bar abs'; prose after the numbers ('mA if added') → None."""
    m = re.search(rf"{NUM}\s*(?:–|—|…|\.\.\.|\bto\b|-)\s*{NUM}\s*(.*)$", numtext(text))
    if not m:
        return None
    lo_hi = [float(x) for x in re.findall(NUM, numtext(text))[:2]]
    if re.match(r"^\s*(mA|V)\b", m.group(1)) and lo_hi in ([4.0, 20.0], [0.0, 20.0], [0.0, 10.0], [1.0, 5.0], [2.0, 10.0]):
        return None  # a transmitter signal range (4–20 mA), not the measured unit
    tail = re.sub(r"(?<=\S)\s*\((g|a|abs|gauge)\)", r"(\1)", m.group(1), flags=re.I)  # "bar (g)" → "bar(g)"
    tail = re.split(r"[;,]|\s[-–—]\s|\s\(", tail)[0].strip(" .,;")
    words = tail.split()
    if not words:
        return None
    head = re.sub(r"\((g|a|abs|gauge)\)$", "", words[0], flags=re.I)
    if not UNIT_HEAD.match(head):
        return None
    out = [words[0]]
    for w in words[1:]:  # the unit's own qualifiers ("abs", "RMS"); prose after it is dropped
        if w.lower() not in UNIT_TAIL:
            break
        out.append(w)
    return " ".join(out)


def col_index(header, ref):
    if ref is None:
        return None
    ref = str(ref)
    if ref.startswith("#") and ref[1:].isdigit():
        i = int(ref[1:])
        return i if i < len(header) else None
    want = norm(ref)
    for i, h in enumerate(header):
        if norm(h) == want:
            return i
    for i, h in enumerate(header):
        if want and (want in norm(h) or norm(h) in want) and norm(h):
            return i
    return None


def table_value(t, ref, row, header):
    """Per-table context value or a column of the row."""
    if ref is None:
        return None
    ref = str(ref)
    if ref.startswith("="):
        return ref[1:]
    if ref.startswith("@"):
        return clean_text(t.get(ref[1:], ""))
    i = col_index(header, ref)
    return clean_text(row[i]) if i is not None and i < len(row) else None


def tables_for(entry, tables):
    ids = set(entry.get("ids") or [])
    sig = norm(entry.get("header_sig"))
    return [t for t in tables if t["id"] in ids or (sig and norm(t["header_sig"]) == sig)]


def point_from(raw, src):
    p = {"tag": None, "name": None, "machine": None, "component": None, "location": None, "signal_type": None,
         "unit": None, "value_kind": None, "range": None, "nominal": None,
         "limits": {"ll": None, "l": None, "h": None, "hh": None, "text": None},
         "setpoint": None, "priority": None, "remarks": None, "source": src}
    for k in ("tag", "name", "machine", "component", "location", "signal_type", "unit", "priority", "remarks"):
        if raw.get(k) is not None:
            p[k] = clean_text(raw[k])
    if p["tag"]:
        # "P2 pump-down": the tag is the first token, the rest names it.
        m = TAG_IN.match(p["tag"])
        if " " in p["tag"] and m:
            rest = p["tag"][m.end():].strip(" ·:-–")
            p["tag"] = m.group(1)
            if rest and not p["name"]:
                p["name"] = rest
        else:
            p["tag"] = re.sub(r"\s+", "", p["tag"])
    for key in ("range", "nominal"):
        txt = clean_text(raw.get(key))
        if txt is not None:
            lo, hi = parse_range(txt)
            p[key] = {"lo": lo, "hi": hi, "text": txt}
    texts = []
    for k in ("ll", "l", "h", "hh"):
        txt = clean_text(raw.get(k))
        if txt is not None:
            texts.append(f"{k.upper()} {txt}")
            p["limits"][k], _ = parse_number(txt)
    # Warning / alarm columns without a side: the comparator decides (default: high side).
    # When one of the pair is relative ("deviation > 0.15 bar"), the other is read the same way: text only.
    rel_pair = any(clean_text(raw.get(k)) and RELATIVE.search(numtext(raw.get(k))) for k in ("warn", "alarm"))
    for k, (lo_k, hi_k) in (("warn", ("l", "h")), ("alarm", ("ll", "hh"))):
        if rel_pair:
            txt = clean_text(raw.get(k))
            if txt is not None:
                texts.append(f"{k} {txt}")
            continue
        txt = clean_text(raw.get(k))
        if txt is not None:
            texts.append(f"{k} {txt}")
            val, side = parse_number(txt)
            slot = lo_k if side == "lo" else hi_k
            if p["limits"][slot] is None:
                p["limits"][slot] = val
    # A percentage limit on a point whose unit is not a percentage is relative (of a baseline / rating): text only.
    if "%" not in str(p["unit"] or ""):
        for k, txt in (("ll", raw.get("ll")), ("l", raw.get("l")), ("h", raw.get("h")), ("hh", raw.get("hh")), ("warn", raw.get("warn")), ("alarm", raw.get("alarm"))):
            if txt and "%" in str(txt):
                for slot in ((k,) if k in ("ll", "l", "h", "hh") else (("l", "h") if k == "warn" else ("ll", "hh"))):
                    p["limits"][slot] = None
    p["limits"]["text"] = " · ".join(texts) or None
    sp = clean_text(raw.get("setpoint"))
    if sp is not None:
        val, _ = parse_number(sp)
        p["setpoint"] = {"value": val, "text": sp}
    # No unit column: a unit printed after the range numbers ("0-5 bar abs") is the unit.
    rng = p["range"]
    if not p["unit"] and rng and rng["hi"] is not None:
        p["unit"] = unit_after_range(rng["text"])
    vk = clean_text(raw.get("value_kind"))
    if vk in ("analog", "state"):
        p["value_kind"] = vk
    else:
        unit = norm(p["unit"])
        numeric = any(r and (r.get("lo") is not None or r.get("hi") is not None) for r in (p["range"], p["nominal"]))
        texts = " ".join(r["text"] for r in (p["range"], p["nominal"]) if r)
        kind_txt = norm(" ".join(str(x or "") for x in (p["signal_type"], texts)))
        # A numeric range means a value, even when the note mentions a digital link ("OEM digital/analogue").
        state = unit in ("digital", "binary", "on/off", "status", "bool", "boolean", "di", "do") or (not numeric and (
            bool(re.search(r"\bdigital\b|\b0\s*/\s*1\b|\bbinary\b|\blimit switch|\bon\s*/\s*off\b|\bopen\s*/\s*closed\b", kind_txt))
            or (not unit and bool(STATE_WORDS.search(texts)))))
        p["value_kind"] = "state" if state else "analog"
    org = norm(raw.get("origin"))
    blob = norm(" ".join(str(x or "") for x in (p["unit"], p["signal_type"], p["name"])))
    p["origin"] = org if org in ("online", "manual", "calculated") else (
        "manual" if re.search(r"\b(lab|laboratory|manual|handheld|sample|log ?sheet)\b", blob) else
        "calculated" if re.search(r"\b(calculated|derived|computed|formula)\b", blob) else "online")
    return p


TAG_TOKEN = re.compile(r"\b([A-Z]{1,6}(?:[-_][A-Z0-9]{1,6})*[-_]?\d{1,4}[A-Z]?)\b")


def split_tags(cell):
    """'S1 / S2 states' → ['S1', 'S2']; 'T3 minus T2' → 'formula'; otherwise [cell]."""
    t = clean_text(cell)
    if not t:
        return [t]
    toks = TAG_TOKEN.findall(t)
    if len(toks) > 1:
        if re.search(rf"^{re.escape(toks[0])}\s*(?:/|,|&|\band\b)\s*{re.escape(toks[1])}", t):
            return toks
        if re.search(r"\bminus\b|−|\bdiff|\bratio\b|\+|\bover\b|÷|\bvs\.?\b", t):
            return "formula"
    return [t]


def merge_point(a, b, conflicts):
    """Fill a's missing fields from b (same tag seen in another table); report values that disagree."""
    for k, v in b.items():
        if k in ("source", "value_kind", "origin"):
            continue
        if isinstance(v, dict) and isinstance(a.get(k), dict):
            for kk, vv in v.items():
                if a[k].get(kk) is None and vv is not None:
                    a[k][kk] = vv
                elif vv is not None and kk != "text" and a[k].get(kk) != vv:
                    conflicts.append(f"point {a['tag']}: {k}.{kk} is {a[k][kk]} on page {a['source']['page']} but {vv} on page {b['source']['page']} (kept the first)")
        elif a.get(k) is None and v is not None:
            a[k] = v
        elif k == "remarks" and v and norm(v) not in norm(a.get(k)):
            a[k] = f"{a[k]} · {v}"  # remarks from both tables are kept
        elif v is not None and k not in ("name", "remarks", "location", "signal_type", "component") and norm(a.get(k)) != norm(v):
            conflicts.append(f"point {a['tag']}: {k} is '{a[k]}' on page {a['source']['page']} but '{v}' on page {b['source']['page']} (kept the first)")
    a.setdefault("also_in", []).append(b["source"])
    return a


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    d = os.path.abspath(sys.argv[1])
    probe = json.load(open(os.path.join(d, "probe.json"), encoding="utf-8"))
    tables = probe["tables"]
    mapping = json.load(open(os.path.join(d, "mapping.json"), encoding="utf-8")) if os.path.exists(os.path.join(d, "mapping.json")) else {"tables": []}
    facts = json.load(open(os.path.join(d, "facts.json"), encoding="utf-8")) if os.path.exists(os.path.join(d, "facts.json")) else {}

    out = {
        "schema": "ultron.extract/1",
        "document": facts.get("document") or {"file": os.path.basename(probe["file"]), "pages": probe["pages"]},
        "kind": facts.get("kind") or "other",
        "summary": facts.get("summary"),
        "plant": facts.get("plant"),
        "areas": list(facts.get("areas") or []),
        "machines": list(facts.get("machines") or []),
        "components": list(facts.get("components") or []),
        "points": [],
        "people": list(facts.get("people") or []),
        "maintenance": list(facts.get("maintenance") or []),
        "drawings": list(facts.get("drawings") or []),
        "facts": list(facts.get("facts") or []),
        "gaps": list(facts.get("gaps") or []),
    }
    out["document"].setdefault("file", os.path.basename(probe["file"]))
    out["document"].setdefault("pages", probe["pages"])

    points_by_tag = {}
    used = {}
    problems = []
    conflicts = []
    for entry in mapping.get("tables", []):
        kind = entry.get("kind", "points")
        if kind not in FIELDS:
            problems.append(f"mapping: unknown kind '{kind}' (use one of {', '.join(FIELDS)})")
            continue
        cols = entry.get("columns") or {}
        bad = [k for k in cols if kind != "pairs" and k not in FIELDS[kind]]
        if bad:
            problems.append(f"mapping ({kind}): unknown field(s) {bad}; allowed: {FIELDS[kind]}")
        chosen = tables_for(entry, tables)
        if not chosen:
            problems.append(f"mapping ({kind}): no table matches header_sig/ids {entry.get('header_sig') or entry.get('ids')}")
        for t in chosen:
            header = t["header"]
            for f, ref in cols.items():
                if ref and not str(ref).startswith(("=", "@")) and col_index(header, ref) is None:
                    problems.append(f"{t['id']} (page {t['page']}): column '{ref}' for '{f}' not in header {header}")
            rows = t["data"] if entry.get("header_is_data") else t["data"][1:]
            used[t["id"]] = used.get(t["id"], 0) + len(rows)
            src = {"page": t["page"], "table": t["id"]}
            for row in rows:
                first = norm(next((c for c in row if c), ""))
                if kind in ("points", "machines", "components", "people") and re.match(r"^((sub|grand) ?)?(total|sum)s?:?$", first):
                    continue  # a summary row ("Total", "Sum") is not an item
                if kind == "rows":
                    # Every column kept: "Header: value · Header: value", topic from the mapped column or the first one.
                    ti = col_index(header, cols.get("topic")) if cols.get("topic") else 0
                    topic = clean_text(row[ti]) if ti is not None and ti < len(row) else None
                    parts = [f"{header[i]}: {clean_text(c)}" for i, c in enumerate(row) if i != ti and clean_text(c) and i < len(header)]
                    if topic or parts:
                        out["facts"].append({"topic": topic or t.get("caption_title") or "table row", "text": " · ".join(parts),
                                             "table": t.get("caption_title") or None, "source": src})
                    continue
                if kind == "pairs":
                    for i in range(0, len(row) - 1, 2):
                        k, v = clean_text(row[i]), clean_text(row[i + 1])
                        if k and v:
                            out["facts"].append({"topic": k, "text": v, "source": src})
                    continue
                raw = {f: table_value(t, ref, row, header) for f, ref in cols.items()}
                for f in ("machine", "component"):
                    if entry.get(f) is not None and raw.get(f) is None:
                        raw[f] = table_value(t, entry[f], row, header)
                if not any(v for v in raw.values()):
                    continue
                if kind == "points":
                    tags = split_tags(raw.get("tag"))
                    if tags == "formula":
                        # "T3 minus T2": a derived value, not one tag: keep the row as a fact.
                        txt = " · ".join(f"{header[i]}: {clean_text(c)}" for i, c in enumerate(row) if clean_text(c) and i < len(header))
                        out["facts"].append({"topic": clean_text(raw.get("tag")), "text": txt, "source": src})
                        continue
                    if len(tags) > 1:
                        for tg in tags:
                            q = point_from({**raw, "tag": tg}, src)
                            if q["tag"] in points_by_tag:
                                merge_point(points_by_tag[q["tag"]], q, conflicts)
                            else:
                                points_by_tag[q["tag"]] = q
                                out["points"].append(q)
                        continue
                    p = point_from(raw, src)
                    if not p["tag"]:
                        # A row without a tag is a sub-heading or a note row: keep its text as a fact.
                        txt = " · ".join(c for c in (clean_text(x) for x in row) if c)
                        if txt:
                            out["facts"].append({"topic": t.get("caption_title") or "table note", "text": txt, "source": src})
                        continue
                    if p["tag"] in points_by_tag:
                        merge_point(points_by_tag[p["tag"]], p, conflicts)
                    else:
                        points_by_tag[p["tag"]] = p
                        out["points"].append(p)
                elif kind == "machines":
                    m = {k: clean_text(v) for k, v in raw.items()}
                    if m.get("name") and not m.get("code"):
                        cm = CODE.match(m["name"])
                        if cm:
                            m["code"], m["name"] = cm.group(1), cm.group(2).strip() or m["name"]
                    m["source"] = src
                    out["machines"].append(m)
                else:
                    item = {k: clean_text(v) for k, v in raw.items()}
                    if kind == "components" and item.get("name") and not item.get("code"):
                        cm = CODE.match(item["name"])
                        if cm and cm.group(2):
                            item["code"], item["name"] = cm.group(1), cm.group(2).strip()
                    item["source"] = src
                    out[kind if kind != "facts" else "facts"].append(item)

    # One machine per code (hand-written entries win for fields they set).
    merged, seen = [], {}
    for m in out["machines"]:
        key = (m.get("code") or m.get("name") or "").upper()
        if key and key in seen:
            base = seen[key]
            for k, v in m.items():
                if base.get(k) in (None, "") and v not in (None, ""):
                    base[k] = v
            continue
        if key:
            seen[key] = m
        merged.append(m)
    out["machines"] = merged

    # Fixes the model read in the document (facts.json "point_fixes": [{tag, unit, value_kind, name, …}]).
    for fx in facts.get("point_fixes") or []:
        tag = (fx or {}).get("tag")
        p = points_by_tag.get(tag)
        if not p:
            problems.append(f"point_fixes: tag '{tag}' is not among the points")
            continue
        for k, v in fx.items():
            if k == "tag":
                continue
            if k in ("range", "nominal") and isinstance(v, str):
                lo, hi = parse_range(v)
                p[k] = {"lo": lo, "hi": hi, "text": v}
            elif k in ("ll", "l", "h", "hh"):
                p["limits"][k] = v if (v is None or isinstance(v, (int, float))) else parse_number(v)[0]  # null clears a misread limit
            elif k in p:
                p[k] = v
            else:
                problems.append(f"point_fixes {tag}: unknown field '{k}'")
        p["fixed"] = sorted(k for k in fx if k != "tag")

    # Components named by the points but not listed: add them (machine + name, code as printed only).
    have = {(norm(c.get("machine")), norm(c.get("name"))) for c in out["components"]}
    for p in out["points"]:
        key = (norm(p.get("machine")), norm(p.get("component")))
        if p.get("component") and key not in have:
            have.add(key)
            out["components"].append({"machine": p.get("machine"), "code": None, "name": p["component"], "description": None,
                                      "source": p["source"], "from_points": True})

    with open(os.path.join(d, "extract.json"), "w", encoding="utf-8") as fh:
        json.dump(out, fh, ensure_ascii=False, indent=1)
    res = validate(out, probe, used)
    res["errors"] = problems + res["errors"]
    res["warnings"] = conflicts + res["warnings"]
    print(report(out, res, os.path.join(d, "extract.json")))
    sys.exit(1 if res["errors"] else 0)


if __name__ == "__main__":
    main()
