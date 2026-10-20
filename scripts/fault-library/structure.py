"""Split the raw sheet fields into structured parts.

usage: python3 -I structure.py <raw.json> <measurements.json> <out.json>
"""
import json
import re
import sys

raw = json.load(open(sys.argv[1], encoding="utf-8"))
meas = json.load(open(sys.argv[2], encoding="utf-8"))
rows = meas["rows"] if isinstance(meas, dict) else meas

# measurement id -> (machine, tag) for the pyro line
tag_to_meas = {}
for r in rows:
    mid = r[0] if isinstance(r, list) else r["id"]
    if not mid.startswith("PYR-"):
        continue
    machine = mid[:10]
    tag = mid[11:]
    tag_to_meas[tag] = {"machine": machine, "measurement": mid}

GROUP_MACHINE = {
    "FSL-01": "PYR-FED-01", "KFS-01": "PYR-FED-01",
    "PHC-01": "PYR-PHC-01", "BGH-01": "PYR-PHC-01",
    "KLN-01": "PYR-KLN-01", "BRN-01": "PYR-BRN-01", "CLR-01": "PYR-CLR-01",
    "HMR-01": "PYR-CCT-01", "CSL-01": "PYR-CCT-01",
}
SECTION_GROUP = {
    "Shared cross-machine patterns": "SHARED",
    "ULTRON data quality and analytics": "DQ",
    "Conditional entries": "CONDITIONAL",
}

TAG = re.compile(r"\b([A-Z]{3}-[A-Z]{3}-\d{2})(?:…(\d{2}))?")


def expand(text):
    out = []
    for m in TAG.finditer(text):
        base, last = m.group(1), m.group(2)
        out.append(base)
        if last:
            pre, a = base[:-2], int(base[-2:])
            for k in range(a + 1, int(last) + 1):
                out.append(f"{pre}{k:02d}")
    seen = []
    for t in out:
        if t not in seen:
            seen.append(t)
    return seen


def split_labels(text, labels):
    """Split 'A: x B: y' by known labels, in order."""
    pos = []
    for lab in labels:
        k = text.find(lab + ":")
        pos.append(k)
    res = {}
    found = [(p, lab) for p, lab in zip(pos, labels) if p >= 0]
    found.sort()
    for idx, (p, lab) in enumerate(found):
        e = found[idx + 1][0] if idx + 1 < len(found) else len(text)
        res[lab] = text[p + len(lab) + 1:e].strip().rstrip()
    return res, (text[: found[0][0]].strip() if found else text)


faults = []
unknown_tags = {}
for order, s in enumerate(raw["sheets"]):
    cat = raw["catalogue"][s["id"]]
    meta = s["meta"]
    # "FSL-01 / Silo cone and extraction · D5 candidate · REV.01: INPUTS UPDATED"
    head, origin, _rev = [p.strip() for p in meta.rsplit(" · ", 2)]
    grp_label = head.split(" / ", 1)[0]
    group = grp_label if grp_label in GROUP_MACHINE else SECTION_GROUP.get(grp_label, grp_label)

    inp, _ = split_labels(s["inputs"], ["PRIMARY", "SUPPORT"])
    primary_text, support_text = inp.get("PRIMARY", ""), inp.get("SUPPORT", "")
    primary, support = expand(primary_text), expand(support_text)

    dx, _ = split_labels(s["diagnosis"], ["WHAT", "WHERE", "WHY/ALTERNATIVES", "IMPACT"])
    sev, _ = split_labels(s["severity"], ["DEVELOPING", "ALERT", "DANGER"])
    danger = sev.get("DANGER", "")
    conf = ""
    k = danger.find("Confidence depends")
    if k >= 0:
        danger, conf = danger[:k].strip(), danger[k:].strip()
    alert = sev.get("ALERT", "").rstrip(";").strip()
    developing = sev.get("DEVELOPING", "").rstrip(";").strip()

    base = s["baseline"]
    setpoints = ""
    k = base.find("Proposed operating values")
    if k >= 0:
        setpoints = base[k:].split(":", 1)[1].strip()
        base = base[:k].strip()

    act = s["action"]
    if act.startswith("CHECK:"):
        act = act[6:].strip()
    check = re.split(r" For unsafe ?/ ?severe events", act)[0].strip()

    analysis = s["analysis"]
    discriminate = analysis.split("Discriminate:", 1)[1].strip() if "Discriminate:" in analysis else ""

    # Shared, data-quality and conditional entries belong to the line, not to one machine.
    machine = GROUP_MACHINE.get(group)

    for t in primary + support:
        if t not in tag_to_meas:
            unknown_tags.setdefault(t, []).append(s["id"])

    faults.append({
        "id": s["id"],
        "machine": machine,
        "group": group,
        # the sheet header keeps the component on one line (catalogue rows can wrap)
        "component": head.split(" / ", 1)[1].strip(),
        "title": s["title"],
        "origin": origin,
        "status": cat["status"],
        "active": True,
        "conditional": cat["status"] == "Conditional",
        "applicability": s["identity"].split("Applicability:", 1)[1].strip() if "Applicability:" in s["identity"] else s["identity"],
        "primaryText": primary_text,
        "supportText": support_text,
        "primary": primary,
        "support": support,
        "baseline": base,
        "setpoints": setpoints,
        "detection": s["detection"],
        "evidence": s["evidence"],
        "what": dx.get("WHAT", ""),
        "where": dx.get("WHERE", ""),
        "why": dx.get("WHY/ALTERNATIVES", ""),
        "impact": dx.get("IMPACT", ""),
        "developing": developing,
        "alert": alert,
        "danger": danger,
        "confidence": conf,
        "prognosis": s["prognosis"],
        "analysis": analysis,
        "discriminate": discriminate,
        "action": s["action"][6:].strip() if s["action"].startswith("CHECK:") else s["action"],
        "check": check,
        "source": s["source"],
        "order": order + 1,
    })

for r in raw["retired"]:
    faults.append({
        "id": r["id"], "machine": None, "group": "RETIRED", "component": r["component"], "title": r["title"],
        "origin": "Retired", "status": "Retired", "active": False, "conditional": False, "retiredReason": r["reason"],
        "primary": [], "support": [], "order": len(faults) + 1,
    })

json.dump({"faults": faults}, open(sys.argv[3], "w"), indent=1, ensure_ascii=False)
print("faults", len(faults), "active", sum(f["active"] for f in faults))
print("line-wide", len([f for f in faults if f["machine"] is None]))
print("unknown tags", {k: v[:3] for k, v in unknown_tags.items()})
empty = [f["id"] for f in faults if f["active"] and not (f["what"] and f["why"] and f["impact"] and f["alert"] and f["check"])]
print("missing parts", empty)
covered = {t for f in faults for t in f["primary"] + f["support"]}
print("register tags not linked", sorted(set(tag_to_meas) - covered))
