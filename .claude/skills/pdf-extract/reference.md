# extract.json reference (schema "ultron.extract/1")

## 1. Fields

| Field | What it holds |
|---|---|
| `schema` | always `"ultron.extract/1"` (build.py sets it) |
| `document` | `title`, `number`, `revision`, `date`, `author`, `status`, `file`, `pages` |
| `kind` | what the document is (§2) |
| `summary` | one or two plain sentences |
| `plant` | `name`, `location`, `region`, `time_zone` (IANA, e.g. `Africa/Lusaka`, only when printed or the city is certain), `description`, `capacity` |
| `areas[]` | factories, sections, lines, buildings: `name`, `parent` (name of the area it sits in, or null) |
| `machines[]` | `code` (`KLN-01`), `name`, `type` (plain kind: "rotary kiln", "centrifugal pump"), `area`, `manufacturer`, `model`, `power`, `speed`, `description` |
| `components[]` | sub-assemblies of a machine: `machine` (code or name), `code`, `name`, `description` |
| `points[]` | measurement points (below) |
| `people[]` | `name`, `role`, `email`, `phone` — only people printed in the document |
| `maintenance[]` | `machine`, `component`, `task_id` (as printed), `task` (what to check / do), `criteria` (pass condition / acceptance), `frequency`, `method` (on-line / off-line, tools), `who` (owner / trade) |
| `drawings[]` | pages showing equipment: `page`, `title`, `machine`, `what`, `image` |
| `facts[]` | `topic`, `text` — important statements no other field holds; rows from a `rows` mapping also carry `table` (the table's caption) |
| `gaps[]` | strings: what is missing for onboarding |
| `source` | on every item: `{ "page": n, "table": "t006" }` (build.py adds it for table rows) |

### points[]

| Field | Meaning | Example |
|---|---|---|
| `tag` | instrument tag as printed | `PRS-KFS-02` |
| `name` | what it measures, as printed | `P2 SFM A pressure` |
| `machine`, `component` | where it belongs | `KFS-01`, `Solid-flow meters A / B` |
| `location` | mounting location | `Solid-flow meter A pressure tap` |
| `signal_type` | instrument / signal | `Pressure transmitter` |
| `unit` | unit as printed | `mmWG` |
| `value_kind` | `analog` (a number) or `state` (on/off, open/closed, running) — derived | `analog` |
| `range` | instrument / design range `{lo, hi, text}` | `{-50, 50, "−50 … +50"}` |
| `nominal` | normal operating value or band `{lo, hi, text}` | `{-5, 5, "−5 … +5"}` |
| `limits` | `{ll, l, h, hh, text}`: low-low (trip), low (alarm), high (alarm), high-high (trip) | `{null, null, 20, 40, "H +20 · HH +40"}` |
| `setpoint` | `{value, text}` | |
| `priority` | as printed (`REQUIRED`, `OPTIONAL`) | |
| `origin` | `online`, `manual` (lab / handheld records) or `calculated` — derived from unit, type and name unless mapped | `online` |
| `remarks` | as printed | |

Mapping a "Warning" / "Alarm" (or "Alert", "Trip") column: use `warn` and
`alarm`. A value printed with `<` goes to the low side (L / LL), anything else
to the high side (H / HH). Relative values ("set-point −3 %", "±10 % dev.")
keep only their text.

## 2. What to look for, by kind

| kind | Look for |
|---|---|
| `sensor-list` | points (all of them), machines and components from the headings / summary table |
| `technical-spec` | machine identity (maker, model, power, speed), components, process stages (facts), points and limits tables, utilities, drawings |
| `datasheet` | one machine or instrument: model, ratings (facts), ranges |
| `manual` | machine identity, components, maintenance tasks, limits |
| `maintenance-checklist` | maintenance[] (task, frequency, method, who) per machine / component |
| `drawing` | drawings[] (every page), machines and components named on the drawing, tags |
| `plant-overview` | plant, areas (factories, lines), machines per area |
| `org-chart` | people[] with roles, areas they look after (facts) |
| `report` | facts, findings, machines named |
| `contract`, `policy`, `other` | document, people, facts only |

## 3. Mapping cheatsheet

- `header_sig`: copy the bracketed header from overview.md's "Table shapes"
  list exactly. All tables with that header are mapped by one entry.
- `ids`: list table ids when one table has a unique header.
- Column reference: the header text (spacing / case ignored) or `"#0"`, `"#1"`
  (column number, 0 = first).
- Per-table values: `"@section_code"`, `"@section_title"`, `"@section"`,
  `"@section_path"`, `"@caption_title"`, `"@caption"`, `"=fixed value"`.
- A row that is only "Total" / "Sum" (plus numbers) is skipped for points,
  machines, components and people. Point rows without a tag become facts.
- The same tag in two tables merges into one point; values that disagree are
  listed as warnings (the first is kept).
- `probe.json` → `codes_seen` is every code-like word (tags, machines,
  document numbers): hints only, not a machine list.
- A machine name like `FSL-01 · Raw-meal feed silo` is split into code and
  name automatically.

### Examples

Text table with several columns → one fact per row, every column kept:
```json
{ "kind": "rows", "ids": ["t003"], "columns": { "topic": "Stage" } }
```

Key/value table → facts:
```json
{ "kind": "pairs", "ids": ["t001"], "header_is_data": true }
```

Limits in their own table:
```json
{ "kind": "points", "ids": ["t010"], "columns": { "tag": "Signal", "warn": "Warning (demo)", "alarm": "Alert (demo)", "remarks": "Recommended inspection" } }
```

Maintenance checklist:
```json
{ "kind": "maintenance", "header_sig": "TASK ID | ITEM | CHECK / INSPECTION METHOD | PASS CONDITION | FREQ. / OWNER",
  "columns": { "task_id": "TASK ID", "component": "ITEM", "task": "CHECK / INSPECTION METHOD", "criteria": "PASS CONDITION", "frequency": "FREQ. / OWNER" },
  "machine": "@section_code" }
```

People table:
```json
{ "kind": "people", "ids": ["t002"], "columns": { "role": "Role", "name": "Name / designation" } }
```
