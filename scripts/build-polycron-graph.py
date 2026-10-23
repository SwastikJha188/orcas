#!/usr/bin/env python3
"""Build the POLYCRON design-review graph from the locally supplied cement PDFs.

The checked-in JSON is a document index, not an as-built plant register. Rerun with
--d4/--d5/--maintenance/--sensors when source PDFs are replaced.
"""
from __future__ import annotations

import argparse
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOWNLOADS = Path.home() / "Downloads"
OUTPUT = ROOT / "src/components/polycron/cement-graph.json"


def pdf_pages(path: Path) -> list[str]:
    result = subprocess.run(["pdftotext", "-layout", str(path), "-"], check=True, capture_output=True, text=True)
    return result.stdout.split("\f")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--d4", type=Path, default=DOWNLOADS / "D4-OSW-PE-PYR_Technical_Specification_Full_Pyro_Line_Rev02.pdf")
    parser.add_argument("--d5", type=Path, default=DOWNLOADS / "D5-OSW-PE-PYR_Internal_System_Specification_Pyro_Line_Rev00.pdf")
    parser.add_argument("--maintenance", type=Path, default=DOWNLOADS / "OSW-PE-MNT-PYR-01_Machinewise_Equipment_Maintenance_Checklist_Rev05.pdf")
    parser.add_argument("--sensors", type=Path, default=DOWNLOADS / "OSW-PE-SNL-PYR-01_Pyro_Line_Sensor_List_with_Ranges_Rev02.pdf")
    parser.add_argument("--output", type=Path, default=OUTPUT)
    args = parser.parse_args()
    d4, d5, mnt, snl = (pdf_pages(path) for path in (args.d4, args.d5, args.maintenance, args.sensors))
    nodes: list[dict] = []
    links: list[dict] = []
    ids: set[str] = set()
    pairs: set[tuple[str, str, str]] = set()

    def node(id: str, title: str, detail: str, kind: str, evidence: str, description: str) -> None:
        if id in ids:
            return
        ids.add(id)
        nodes.append(dict(id=id, title=title, detail=detail, kind=kind, evidence=evidence, description=description))

    def link(source: str, target: str, type: str, evidence: str, note: str = "") -> None:
        key = (source, target, type)
        if key in pairs:
            return
        pairs.add(key)
        links.append(dict(from_=source, to=target, type=type, evidence=evidence, note=note))

    documents = [
        ("D4", "D4 · Rev. 02", "Technical specification", "D4-OSW-PE-PYR Rev. 02, pp. 1–2", "Pyro-line monitoring scope, process flow, diagrams and 161 online entries."),
        ("D5", "D5 · Rev. 00", "Internal system specification", "D5-OSW-PE-PYR Rev. 00, pp. 1–2", "Equipment, measurement and software specification for the pyro line."),
        ("MNT", "MNT · Rev. 05", "Equipment maintenance", "OSW-PE-MNT-PYR-01 Rev. 05, pp. 1–2", "Machine-wise design-review maintenance checklist with 539 task IDs."),
        ("SNL", "SNL · Rev. 02", "Sensor register", "OSW-PE-SNL-PYR-01 Rev. 02, pp. 1–2", "Machine-wise design-review sensor schedule with 294 expanded positions."),
    ]
    for id, title, detail, evidence, description in documents:
        node(id, title, detail, "document", evidence, description)

    machines = [
        ("FSL-01", "Feed silo", "Stores and extracts raw meal."),
        ("KFS-01", "Kiln feed and dosing", "Meters raw meal and lifts it toward the preheater."),
        ("PHC-01", "Six-stage preheater", "Heats meal in the cyclone train before the kiln inlet."),
        ("KLN-01", "Rotary kiln", "Turns hot meal into clinker."),
        ("BRN-01", "Main kiln burner", "Supplies heat at the kiln outlet."),
        ("CLR-01", "Clinker cooler", "Cools clinker and returns secondary air toward combustion."),
        ("HMR-01", "Hammer crusher", "Breaks large clinker lumps after the cooler."),
        ("CSL-01", "Clinker silo", "Receives clinker from the pan conveyor."),
        ("BGH-01", "Main baghouse / stack", "Sensor-register group for exhaust treatment; installation is subject to verification."),
        ("EXH-IF", "Exhaust treatment", "Maintenance group for ESP and bag-filter equipment, subject to P&ID verification."),
    ]
    d4_machines = {id for id, *_ in machines[:8]}
    for id, title, description in machines:
        evidence = ("OSW-PE-SNL-PYR-01 Rev. 02, p. 2" if id == "BGH-01" else "OSW-PE-MNT-PYR-01 Rev. 05, p. 2" if id == "EXH-IF" else "D4-OSW-PE-PYR Rev. 02, pp. 2, 6")
        node(id, id, title, "equipment", evidence, description)
        if id in d4_machines:
            link(id, "D5", "specified_in", "D5-OSW-PE-PYR Rev. 00, p. 2", "Included in the eight-machine pyro-line scope.")
            link(id, "MNT", "covered_by", "OSW-PE-MNT-PYR-01 Rev. 05, p. 2", "Machine-wise equipment maintenance coverage.")
        elif id == "BGH-01":
            link(id, "SNL", "listed_in", "OSW-PE-SNL-PYR-01 Rev. 02, p. 2")
        else:
            link(id, "MNT", "covered_by", "OSW-PE-MNT-PYR-01 Rev. 05, p. 2")
    link("D4", "D5", "expanded_by", "D5-OSW-PE-PYR Rev. 00, p. 2", "D5 turns D4 into a hardware and software specification.")

    flow = ["FSL-01", "KFS-01", "PHC-01", "KLN-01", "CLR-01", "HMR-01", "CSL-01"]
    for source, target in zip(flow, flow[1:]):
        link(source, target, "flows_to", "D4-OSW-PE-PYR Rev. 02, p. 6", "Material follows the documented pyro-line process flow.")
    link("BRN-01", "KLN-01", "heats", "D4-OSW-PE-PYR Rev. 02, p. 6")
    link("CLR-01", "BRN-01", "returns_secondary_air_to", "D4-OSW-PE-PYR Rev. 02, p. 6")
    for id, title, description, members in [
        ("MAT-RAW-MEAL", "Raw meal", "Feed material moving from the silo to the kiln.", ["FSL-01", "KFS-01", "PHC-01", "KLN-01"]),
        ("MAT-CLINKER", "Clinker", "Kiln product moving through cooling, crushing and storage.", ["KLN-01", "CLR-01", "HMR-01", "CSL-01"]),
        ("MAT-SECONDARY-AIR", "Secondary air", "Hot air returned from the cooler to the burner.", ["CLR-01", "BRN-01"]),
    ]:
        node(id, title, "Process stream", "D4-OSW-PE-PYR Rev. 02, p. 6", description)
        for machine in members:
            link(id, machine, "passes_through", "D4-OSW-PE-PYR Rev. 02, p. 6")

    # D4 appendix: each online entry is allocated to exactly one machine diagram.
    d4_index = re.compile(r"^\s*([A-Z]{3}-[A-Z]{3}-\d{2})\s+(\S+)\s+([A-Z]{3}-\d{2})\s+(D\d{2})\s+(.+?)\s+(Req|Opt)\s*$")
    d4_entries: list[tuple[int, str, str, str, str, str, str]] = []
    for page_number in range(53, 59):
        for line in d4[page_number - 1].splitlines():
            match = d4_index.match(line)
            if match:
                d4_entries.append((page_number, *match.groups()))
    assert len(d4_entries) == 160, f"D4 parsed {len(d4_entries)} appendix rows, expected 160 plus the paired status/calculation row"
    # The index prints STS-KLN-08 / CAL-KLN-03 as one required row.
    d4_entries.append((56, "STS-KLN-08 / CAL-KLN-03", "K-K33", "KLN-01", "D07", "Kiln shell, inlet and outlet (5.4.4)", "Req"))
    assert sum(row[-1] == "Req" for row in d4_entries) == 132
    assert sum(row[-1] == "Opt" for row in d4_entries) == 29
    diagrams: dict[str, tuple[str, str, int]] = {}
    for page, tag, point, machine, diagram, title, priority in d4_entries:
        diagrams.setdefault(diagram, (title, machine, page))
        evidence = f"D4-OSW-PE-PYR Rev. 02, p. {page}"
        id = f"D4:{tag}"
        node(id, tag, f"{machine} · {point} · {priority}", "monitoring entry", evidence,
             "Design-review monitoring entry allocated to this machine diagram; field installation is unverified.")
        link(id, diagram, "allocated_to", evidence, f"Point {point} on {diagram}.")
    assert len(diagrams) == 11
    for diagram, (title, machine, page) in sorted(diagrams.items()):
        evidence = f"D4-OSW-PE-PYR Rev. 02, pp. {page}, 2"
        node(diagram, diagram, title, "diagram", evidence, "Machine diagram in the D4 monitoring schedule.")
        link(diagram, machine, "depicts", evidence)
        link(diagram, "D4", "published_in", evidence)
    for tag, diagram, page in [("LAB-KLN-01", "D04", 58), ("MAN-KLN-01", "D07", 58)]:
        evidence = f"D4-OSW-PE-PYR Rev. 02, p. {page}"
        id = f"D4:{tag}"
        node(id, tag, "Manual record · KLN-01", "manual record", evidence,
             "Manual or laboratory record listed outside D4's online monitoring set.")
        link(id, diagram, "allocated_to", evidence)

    # Later sensor register: 294 positions, including 24 held cyclone placeholders
    # and two manual records. A row is a design position, not an installed sensor.
    snl_row = re.compile(r"^\s*([A-Z]{3}-[A-Z]{3}-[^\s]+(?:\s*·\s*[^\s]+)?(?:\s*\(M\))?)\s{2,}(.+?)\s{2,}")
    snl_entries: list[tuple[int, str, str]] = []
    for page_number, page in enumerate(snl, 1):
        if page_number < 3 or page_number > 32:
            continue
        for line in page.splitlines():
            match = snl_row.match(line)
            if match:
                snl_entries.append((page_number, match.group(1).strip(), match.group(2).strip()))
    assert len(snl_entries) == 294, f"SNL parsed {len(snl_entries)} positions, expected 294"
    snl_groups: set[str] = set()
    snl_tags: dict[str, str] = {}
    for page, tag, label in snl_entries:
        machine_code = tag.split("-")[1]
        machine = f"{machine_code}-01"
        group = f"SNL-P{page:02d}-{machine_code}"
        evidence = f"OSW-PE-SNL-PYR-01 Rev. 02, p. {page}"
        if group not in snl_groups:
            snl_groups.add(group)
            node(group, f"{machine_code} · p. {page}", "Sensor register page", evidence,
                 "Machine-wise page of proposed sensor positions in the revised register.")
            link(group, machine, "registers_for", evidence)
            link(group, "SNL", "page_of", evidence)
        normalized_tag = re.sub(r"\s*\(M\)$", "", tag)
        id = f"SNL:{tag}"
        node(id, tag, label if label != "%" else "Position feedback", "sensor position", evidence,
             "Proposed design position; tag and installation remain subject to site verification.")
        link(id, group, "listed_on", evidence)
        if normalized_tag not in snl_tags:
            snl_tags[normalized_tag] = id
    for _, tag, *_ in d4_entries:
        other = snl_tags.get(tag)
        if other:
            link(f"D4:{tag}", other, "same_tag_in_revised_register", "D4-OSW-PE-PYR Rev. 02, pp. 53–58; OSW-PE-SNL-PYR-01 Rev. 02, pp. 3–32",
                 "The exact tag appears in both design-review schedules; this does not establish installed identity.")
    for tag in ("LAB-KLN-01", "MAN-KLN-01"):
        other = snl_tags.get(tag)
        if other:
            link(f"D4:{tag}", other, "same_tag_in_revised_register", "D4-OSW-PE-PYR Rev. 02, p. 58; OSW-PE-SNL-PYR-01 Rev. 02, pp. 16–19")

    # Maintenance checklist: one node per unique task ID. A PDF page group is a
    # source-backed hub so individual tasks do not all point to one machine.
    mnt_row = re.compile(r"^\s*((?:GEN|FSL|KFS|PHC|EXH|KLN|BRN|CLR|HMR|CSL)-\d{3})\s{2,}(.+?)\s{2,}")
    task_ids: set[str] = set()
    mnt_groups: set[str] = set()
    for page_number, page in enumerate(mnt, 1):
        for line in page.splitlines():
            match = mnt_row.match(line)
            if not match:
                continue
            task_id, component = match.group(1), match.group(2).strip()
            if task_id in task_ids:
                continue
            task_ids.add(task_id)
            prefix = task_id.split("-")[0]
            machine = "EXH-IF" if prefix == "EXH" else f"{prefix}-01" if prefix != "GEN" else "MNT"
            group = f"MNT-P{page_number:02d}-{prefix}"
            evidence = f"OSW-PE-MNT-PYR-01 Rev. 05, p. {page_number}"
            if group not in mnt_groups:
                mnt_groups.add(group)
                node(group, f"{prefix} · p. {page_number}", "Maintenance checklist page", evidence,
                     "Page group for equipment maintenance tasks in the design-review checklist.")
                link(group, machine, "checklist_for" if prefix != "GEN" else "page_of", evidence)
            node(task_id, task_id, component or "Equipment maintenance task", "maintenance task", evidence,
                 "Design-review equipment task; site and OEM approval remain pending.")
            link(task_id, group, "listed_on", evidence)
    assert len(task_ids) == 539, f"MNT parsed {len(task_ids)} unique tasks, expected 539"

    missing = [(edge["from_"], edge["to"]) for edge in links if edge["from_"] not in ids or edge["to"] not in ids]
    assert not missing, f"Unresolved links: {missing[:5]}"
    # JSON uses 'from', kept separate from Python's reserved keyword.
    for edge in links:
        edge["from"] = edge.pop("from_")
    graph = {"sources": [path.name for path in (args.d4, args.d5, args.maintenance, args.sensors)],
             "nodes": nodes, "links": links}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(graph, ensure_ascii=False, separators=(",", ":")) + "\n")
    print(f"Wrote {len(nodes)} nodes and {len(links)} source-backed links to {args.output}")
    print(f"D4 online: {len(d4_entries)}; D4 manual: 2; SNL positions: {len(snl_entries)}; MNT tasks: {len(task_ids)}")


if __name__ == "__main__":
    main()
