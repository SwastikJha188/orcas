"""Parse OSW-PE-FLT-PYR-01 Rev.01 (pdftotext -layout, form feeds stripped) into JSON.

usage: python3 -I parse.py <flt2.txt> <out.json>
"""
import json
import re
import sys

src, out = sys.argv[1], sys.argv[2]
lines = open(src, encoding="utf-8").read().split("\n")

ID_RE = r"(?:FP-\d+|UL-[A-Z]+-\d{3}|DQ-\d{3}|CX-EXH-\d{3})"
HEAD = re.compile(rf"^({ID_RE}) \| (.+)$")
FIELD = re.compile(r"^ (0[1-9]|1[01]) (\S.*?)\s{2,}(\S.*)$")
FOOTER = re.compile(r"^Confidential \| OSWARteck")
GROUP_TITLE = re.compile(r"^\d+ fault reference sheets")

FIELD_KEYS = {
    "01": "identity", "02": "inputs", "03": "baseline", "04": "detection", "05": "evidence",
    "06": "diagnosis", "07": "severity", "08": "prognosis", "09": "analysis", "10": "action", "11": "source",
}


def join(parts):
    s = ""
    for p in parts:
        p = p.strip()
        if not p:
            continue
        if not s:
            s = p
        elif s.endswith("-") and not s.endswith(" -") and p[:1].islower():
            s += p
        else:
            s += " " + p
    return re.sub(r"\s+", " ", s).strip()


# --- sheets -------------------------------------------------------------------------------------------------------
sheets = []
i = 0
n = len(lines)
while i < n:
    m = HEAD.match(lines[i])
    if not m or i + 1 >= n or "REV.01:" not in lines[i + 1]:
        i += 1
        continue
    fid, title = m.group(1), m.group(2).strip()
    meta = lines[i + 1].strip()
    i += 2
    fields = {}
    cur = None
    col = 26
    while i < n:
        ln = lines[i]
        if HEAD.match(ln) and i + 1 < n and "REV.01:" in lines[i + 1]:
            break
        if ln.startswith("7 SENSOR-TO-FAULT"):
            break
        if FOOTER.match(ln) or GROUP_TITLE.match(ln):
            i += 1
            continue
        fm = FIELD.match(ln)
        if fm and fm.group(1) in FIELD_KEYS and (cur is None or int(fm.group(1)) == int(cur) + 1):
            cur = fm.group(1)
            col = fm.start(3)
            fields[cur] = [fm.group(3)]
        elif cur is not None and ln.strip():
            head, tail = ln[:col], ln[col:]
            # a page-level group heading ("FSL-01 · Raw-meal feed silo") sits at column 0 with no label column
            if not ln.startswith(" ") and "·" in ln and cur == "11":
                i += 1
                continue
            if head.strip() and not tail.strip():
                pass  # label-only continuation ("action")
            else:
                fields[cur].append(tail if head.strip() == "" or re.fullmatch(r"\s*[a-z /]+\s*", head) else ln)
        i += 1
    rec = {"id": fid, "title": title, "meta": meta}
    for k, v in fields.items():
        rec[FIELD_KEYS[k]] = join(v)
    sheets.append(rec)

# --- catalogue (section 5) gives the component and Rev.01 status per id -------------------------------------------
cat = {}
start = next(k for k, l in enumerate(lines) if l.startswith("5 FAULT CATALOGUE"))
end = next(k for k, l in enumerate(lines) if l.startswith("6 INDIVIDUAL ENGINEERING"))
CAT_ROW = re.compile(rf"^ ({ID_RE})\s{{2,}}(.+?)\s{{2,}}(.+?)\s{{2,}}(Unchanged|Inputs updated|Re-scoped|Converted|New|Conditional)\s*$")
section = None
for l in lines[start:end]:
    sm = re.match(r"^5\.(\d+) (.+?) \((\d+) entries\)", l)
    if sm:
        section = sm.group(2)
    cm = CAT_ROW.match(l)
    if cm:
        cat[cm.group(1)] = {"component": cm.group(2).strip(), "scenario": cm.group(3).strip(), "status": cm.group(4), "section": section}

# --- retired (8.1) ------------------------------------------------------------------------------------------------
retired = []
r0 = next(k for k, l in enumerate(lines) if l.startswith("8.1 Retired entries"))
for l in lines[r0:r0 + 40]:
    rm = re.match(r"^ (CX-EXH-\d{3})\s{2,}(.+?)\s{2,}(.+?)\s{2,}(No ESP installed \(MoM-02\))", l)
    if rm:
        retired.append({"id": rm.group(1), "component": rm.group(2).strip(), "title": rm.group(3).strip(), "reason": rm.group(4)})

json.dump({"sheets": sheets, "catalogue": cat, "retired": retired}, open(out, "w"), indent=1, ensure_ascii=False)
print("sheets", len(sheets), "catalogue", len(cat), "retired", len(retired))
missing = [s["id"] for s in sheets if len([k for k in FIELD_KEYS.values() if k in s]) != 11]
print("incomplete", missing[:20], len(missing))
print("not in catalogue", [s["id"] for s in sheets if s["id"] not in cat][:20])
print("catalogue not sheet", [c for c in cat if c not in {s["id"] for s in sheets}][:20])
