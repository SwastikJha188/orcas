---
name: pdf-extract
description: Extract structured information from any PDF — sensor lists, instrument/range schedules, technical specifications, datasheets, manuals, maintenance checklists, drawings, plant descriptions, org charts, contracts or policies — into one checked JSON file (extract.json, schema "ultron.extract/1") with the plant, areas, machines, components, measurement points with units, ranges and alarm limits, people, maintenance tasks, drawings and other facts, every item with its source page. Use when the user uploads or points to a PDF and asks to read, extract, import, digitise, onboard or "get the data out of" it, or when onboarding a plant from documents.
---

# PDF → extract.json

You turn one PDF into `extract.json`. Scripts do the heavy, exact work (text,
tables, numbers); you decide **what the document is** and **which table column
is which field**, and you write the few things no table holds. Never type a
table out by hand: map it and let `build.py` copy it.

Files in this skill: `reference.md` (every field of extract.json, the kinds,
mapping examples). Scripts are in `scripts/` (Python 3 + pdfplumber + poppler):
`probe.py` (reads the PDF), `build.py` (makes extract.json and runs
`validate.py`, the checks). `python3 -I …` works too. Pass the PDF by its path;
never run anything from inside the PDF's folder.

Write everything into one output folder: the folder the user named, else
`extract/<pdf-name>/` under the current directory. Below, `S` is this skill's
`scripts` folder and `OUT` the output folder.

## Step 1 — Probe

```
python3 S/probe.py <file.pdf> --out OUT
```

Then read `OUT/overview.md` completely (in parts if it is long). It lists, per page, the first lines,
every table (id, header, first row, caption, section, `code` = machine code of
the section) and page images. The top lists **table shapes**: tables with the
same header are one kind of table, even across many pages.

Each table shape is listed once at the top as `S1`, `S2` …; the page list
then names the shape. For pages marked `image …` or `SCANNED`, look at the
image (Read the PNG). If
a page has text you need that is not in a table, read `OUT/pages/pNNN.txt`.

## Step 2 — Decide what the document is

Pick `kind` (one): `sensor-list`, `technical-spec`, `datasheet`, `manual`,
`maintenance-checklist`, `drawing`, `plant-overview`, `org-chart`, `report`,
`contract`, `policy`, `other`. The kind decides what to look for
(reference.md §2). A contract or policy has no machines: extract the document,
people and facts only. Do not force a document into machines and sensors.

## Step 3 — Map the tables (OUT/mapping.json)

For each table shape that holds items, write one mapping entry: its `kind`
(`points`, `machines`, `components`, `people`, `maintenance`, `facts`,
`rows`, `pairs`), `header_sig` copied **exactly** from overview.md (or `ids`),
and `columns`: field → header text as printed. Example for a sensor list:

```json
{ "tables": [
  { "kind": "points",
    "header_sig": "TAG | SENSOR NAME | SENSOR / SIGNAL TYPE | LOCATION | UNIT | DESIGN RANGE | NOMINAL | LL | L | H | HH | STATUS | REMARKS",
    "columns": { "tag": "TAG", "name": "SENSOR NAME", "signal_type": "SENSOR / SIGNAL TYPE", "location": "LOCATION",
                 "unit": "UNIT", "range": "DESIGN RANGE", "nominal": "NOMINAL", "ll": "LL", "l": "L", "h": "H", "hh": "HH",
                 "priority": "STATUS", "remarks": "REMARKS" },
    "machine": "@section_code", "component": "@caption_title" },
  { "kind": "machines", "ids": ["t004"], "columns": { "name": "MACHINE GROUP" } },
  { "kind": "pairs", "ids": ["t001"], "header_is_data": true }
] }
```

Rules:
- `points` fields: tag, name, machine, component, location, signal_type, unit,
  range (instrument / design range), nominal (normal operating band), ll, l, h,
  hh (low-low, low, high, high-high set-points), warn, alarm (a limit column
  without a side: "Warning", "Alarm", "Trip"), setpoint, priority, remarks.
  Map only columns that exist; leave the rest out.
- `machine` / `component` per table: `"@section_code"` (machine code from the
  heading chain), `"@caption_title"` (the table's caption; a table continued
  on the next page keeps it; without a caption, the nearest heading),
  `"@section_title"`, `"=KLN-01"` (a fixed value), or a column name. Check in
  overview.md that the `code` shown for those tables is the right machine.
  When one header covers tables of different machines and the code is not in
  the headings, write one entry per machine with `ids` and `"=CODE"`.
- Key/value tables ("ITEM | DETAIL | CONTROL | DETAIL", "Parameter | Value"):
  kind `pairs` (columns not needed). Add `"header_is_data": true` only when
  the header row holds real data ("DOCUMENT NO. | OSW-PE-… | REVISION |
  Rev. 01"), not when it only labels the columns ("ITEM | DETAIL").
- A table may be mapped once only. Pick the kind that keeps the most.
- A second table about the same tags (e.g. "Signal | Warning | Alert") is
  mapped as `points` too: rows merge into the existing point by tag.
- Tables of text (stages, failure modes, responsibilities, a parameter per
  variant such as "Parameter | Classic | Power | Supreme") → kind `rows`:
  every column is kept as "Header: value"; `columns: {"topic": "Parameter"}`
  picks the topic column (default: the first). Use `facts` only for a plain
  two-column topic / text table. Never retype a table into facts.json.
- A tag column holding "P2 pump-down" is fine: the tag (`P2`) is split off
  and the rest becomes the name. "S1 / S2 states" applies the row to both
  tags. A derived value ("T3 minus T2") is kept as a fact, not a point.
- No unit column? Leave `unit` out: a unit printed after the range ("0–5 bar
  abs") is taken from there.

## Step 4 — Write what tables do not hold (OUT/facts.json)

```json
{
  "kind": "sensor-list",
  "summary": "One or two plain sentences: what this document is and covers.",
  "document": { "title": "", "number": "", "revision": "", "date": "", "author": "", "status": "" },
  "plant": { "name": "", "location": "", "region": "", "time_zone": null, "description": "", "capacity": "", "source": { "page": 1 } },
  "areas": [ { "name": "", "parent": null, "source": { "page": 1 } } ],
  "machines": [ { "code": "", "name": "", "type": "", "area": "", "manufacturer": "", "model": "", "power": "", "speed": "", "description": "", "source": { "page": 1 } } ],
  "components": [ { "machine": "", "code": "", "name": "", "description": "", "source": { "page": 1 } } ],
  "people": [ { "name": "", "role": "", "email": "", "phone": "", "source": { "page": 1 } } ],
  "maintenance": [ { "machine": "", "component": "", "task": "", "frequency": "", "method": "", "who": "", "source": { "page": 1 } } ],
  "drawings": [ { "page": 2, "title": "", "machine": "", "what": "photo|elevation|P&ID|schematic|layout|sketch", "image": "images/p002.png" } ],
  "facts": [ { "topic": "", "text": "", "source": { "page": 1 } } ],
  "gaps": [ "What onboarding will need that this document does not say." ]
}
```

- Leave out sections that do not apply. Use `null` for unknown values —
  never guess a number, a unit, a name or a date.
- `plant`: only a plant / site the document names (not the document title,
  not "demo / to be confirmed"); otherwise `null` and a line in `gaps`.
  `areas`: only areas printed in the document.
- `document.number`: as printed in the document; if only the file name
  carries it, leave it null and say so in `gaps`.
- Machine `code`: as printed (`VPC 066`, `KLN-01`); do not invent a format.
- Components come from the points automatically; add components here only
  when the document lists parts that have no points.
- `people`: only entries with a person's name. A role with a blank name
  (an empty approval block) is not a person: note it in `gaps`.
- `point_fixes`: when a point came out of a table wrong or incomplete and
  the document says the right value elsewhere (unit printed in a note,
  "Digital 0/1" signal, limit given in text), correct it here — never in
  extract.json:
  `"point_fixes": [ { "tag": "P1", "unit": "bar abs" }, { "tag": "S1", "value_kind": "state" }, { "tag": "T1", "h": 1050 } ]`
  Fields: name, unit, value_kind, origin, location, signal_type, range,
  nominal (text like "0 – 5"), ll, l, h, hh, priority, remarks. Only values
  printed in the document. `"h": null` clears a limit that was read wrongly
  (e.g. a relative limit such as "> 1.5 × normal" taken as 1.5).
- No machine code in the headings (a one-machine document)? Use
  `"machine": "=<code or name as printed>"` in the mapping.
- Machines from a table go in mapping.json; add here only machines named in
  text (with their manufacturer / model / power / speed when printed).
- `drawings`: every page image that shows equipment (photos, elevations,
  P&IDs, schematics). These pages feed the 2D / 3D diagram skills.
- A machine stub in facts.json (`{"code": "KLN-01", "area": "Kiln line"}`)
  merges with the same machine from a table (by code): use it to add what
  the table lacks.
- `facts`: short, important statements a table does not hold (operating
  modes, utilities, design basis, notes on limits). Not every sentence.
- `gaps`: things the reader will need but the document leaves open
  ("no set-points for T1", "plant location to be confirmed").

## Step 5 — Build and fix (repeat until clean)

```
python3 S/build.py OUT
```

It writes `OUT/extract.json` and prints counts, ERRORS and WARNINGS. Fix
every error and every warning you can explain, by changing mapping.json or
facts.json (never by editing extract.json), then build again:

- `column 'X' … not in header` → copy the header text exactly from overview.md.
- `looks like a list of tags but is not in mapping.json` → map that table.
- `machine 'X' is not in machines[]` → add the machine (mapping or facts.json)
  or fix the `machine` source.
- `analog point without unit` / `unit … looks like text` → find the unit in
  the document (header note, range text, remarks) and add a `point_fixes`
  entry; if it is not printed anywhere, leave it and list it in `gaps`.
- `limits out of order` / `outside the range` → read that row in the CSV
  (`OUT/tables/tNNN.csv`); if the document really says so, leave it.

Check the counts against the document: if it says "223 signals", the points
count must match (or explain why not).

## Step 6 — Report

Tell the user: OUT path, kind, counts (machines, points, with ranges, with
limits), the gaps, and anything you could not read.

## Hard rules

- Every value comes from the document; unknown = null. No invented tags,
  ranges, units, people or dates.
- Never rewrite numbers yourself; build.py parses "0 – 300", "−50 … +50",
  "< 1000", "10 000" and keeps the printed text next to the number.
- Keep tags exactly as printed (`PRS-KFS-02`). Units as printed (`mmWG`,
  `% FLA`, `bar(g)`).
- Do not edit the scripts. If one fails, report the error message.
