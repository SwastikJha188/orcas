# Homepage & Plant Hierarchy — content extracted from ULTRON

Source: `Documents/ULTRON/ultron-software` (Expo/RN-Web + Next.js console, `app/index.tsx`).
Target: this repo (ORCAS, Next.js App Router). Only features that are **actually live** in ULTRON are listed as "Bring over"; dead/unreachable code is listed separately so we don't port it by accident.

---

## 1. Homepage (ULTRON "Home" = plant digital twin, `DashboardOverview.tsx`)

The hierarchy sidebar is **hidden** on Home. Home is shown when nothing is selected (`#home` / empty hash).

### Layout
- ≥1100px: left column = **Plant map card** (flex) + **graph strip** underneath (~188px); right column (296px, 312px at ≥1700px) = **Plant health** + **Alerts**.
- <1100px: stacked — map (min 560px) → graph strip → right column.
- Metrics resample every **5 s**.

### 1.1 Plant map (3D digital twin)
- Scene config from `GET /api/workspace/plant-overview` (fallback to default scene). Default buildings: Utility Area, Manufacturing Unit, Electrical / Power House, Substation, Gateway House, Cooling System, Preheater & Calciner (+ 8 connections: electrical / network / utility / data / air).
- Per-building telemetry (`PlantAssetTelemetry`): `status (healthy|warning|critical|offline)`, `health /100`, `machines`, `machinesActive`, `alarms`, `powerKw`, `temperatureC`, `oee`, `utilization`, `telemetry ONLINE|OFFLINE`.
- **Floating labels**: at rest = name, status, `NN/100`, micro‑sparkline. Hover/select expands to Machines, Alarms, Power (kW / MW ≥1000), Telemetry. Click/Enter selects.
- **Asset inspector** (docked right, 268px): name + status; rows Machines, Active, Power, Temperature °C, Alarms (tinted if >0), Health /100, OEE %, Telemetry; footer "Telemetry source: <area>". × or background click clears.
- **Scene controls** (left vertical stack): Orbit, Pan, Zoom in, Zoom out, Fit plant.

### 1.2 Plant health gauge (right column, top)
- Label "PLANT HEALTH" + chip: Critical (any critical) / At risk (any warning) / Normal.
- 240° segmented gauge (48 segments), score `NN /100`, `TARGET 90` pointer, ticks 0/50/100.
- Distribution counts: critical / at‑risk / offline / healthy (from building statuses).
- ⚠️ ULTRON fakes the live score (`clamp(90 + …, 90, 99)`). **Use the real computed health** here.

### 1.3 Alerts feed (right column, rest)
- Header "Alerts" + pill `N active · M danger`.
- Newest first; rows: level tag (DANGER / ALERT / CLEARED), machine, relative age (ticks every second), **finding** (bold), reading `point · value unit · limit X`.
- Click expands: recommendation + `Raised HH:MM:SS · cleared HH:MM:SS · subject`.
- Cleared alerts linger 60 s; 20 s hold‑off for flapping alerts; top 12.
- Empty: "No active alerts. Every monitored point is inside its limits."

### 1.4 Graph strip — ROI Impact (left)
- "ROI Impact" · "modelled estimate · ₹ lakh"; range chip cycles 7d / 30d / 90d (default 30d).
- Stats: Est. savings `₹ X.XL` ▲/▼ %, Payback `X.X mo` (decrease = good).
- Bar chart with dashed AVG line, value over active bar (hover changes active).
- Values are **hard-coded** in ULTRON: 7d 6.1L (+9%) / 6.4 mo (−4%); 30d 24.8L (+18%) / 6.2 mo (−22%); 90d 68.3L (+31%) / 6.9 mo (−12%). Label clearly as modelled.

### 1.5 Graph strip — Health over time (right)
- "Health over time" · "Condition score · last <span>"; badge `+N / −N / ±0 steady over X`.
- Period presets 1h, 6h, 24h, 7d, 30d, All (+custom); persist choice in localStorage.
- Spline on 40–100 axis; danger band <55, alert band 55–60.
- Empty: "Collecting samples — the trend draws once there are two."
- ULTRON keeps only 24 in-session samples — ORCAS should read from `/api/trends` / DB instead.

### 1.6 Machine quick view (overlay on the map)
Triggered by the top‑bar machine picker:
- "← Plant" / "Open machine →" (→ machine workspace, Overview tab).
- Hero: name, `<template> · <area path>`, Running/Stopped/Unknown + Live/Partly offline/Offline, component pins.
- Verdict: Healthy / Needs attention / Act now / No live data; worst point; sensors x/y; diagnosis.
- Health history card. Empty: "No rack channels are mapped to this machine yet."

### 1.7 Shell items that belong to Home
- **Top bar**: logo → Home; `GATEWAYS online/total ONLINE` lamp (green/red, hidden if 0); **Machine picker** (All areas → area → group → machine with breadcrumbs); **Plant selector**.
- **Search / command panel** (⌘K or `/`): searches machines, areas, racks/devices, views; ranking exact > prefix > word-prefix > subsequence; max 12; "Nothing in the plant matches '…'". (The "Ask Graylock" assistant section is a UI stub — skip until there's a backend.)
- **Status strip** (bottom, 28px): model id, or focused machine `name · NN% · Running · x/y sensors`.
- **Empty workspace**: "Nothing here yet" + "Open Configure" for admins.

### Not worth porting (dead in ULTRON)
- 4‑KPI headline band (Overall health / Machines online / Channels streaming / Gateways connected) — built but never rendered. *Worth reviving*: ORCAS already has the data via `fleetStats`.
- `healthFactorBars`, `TrendChart`, `severitySegments`, `alarmBars`, demo walk, unreachable "immersive" fullscreen twin mode.

### ORCAS today vs. target
| ORCAS now (`src/components/home/fleet-overview.tsx`) | Change |
|---|---|
| Default tab is `assets`, not `home` (`industrial-data-context.tsx:82`) | Default to `home` |
| Fleet Health ring, Circuit breakdown, fake sin/cos trajectory | Replace with Plant health gauge (1.2) + real Health over time (1.5) |
| Static "PTP 0.4 µs" pill, `avgHealth || 96` / `totalSignals || 112` fallbacks | Drive from API; show real empty state |
| Plant cards with machine tiles (schematic) | Keep as the 2D fallback / plant map until a 3D scene exists (1.1) |
| No alerts feed, no ROI | Add 1.3 and 1.4 |
| DB LIVE / Sync DB banner | Keep (dev/admin only) |

---

## 2. Plant hierarchy (sidebar + contents page)

### 2.1 Data model
- Levels: **Project (plant/company)** → **Folders** (nest to any depth; `type` ∈ Plant, Unit, Area, System, Machine Group, Custom Folder) → **Machine** → Components (Motor, Pump, Gearbox, Coupling, Bearing, Fan, Compressor, Custom) → Measurement points (kind + status: Not Configured / Configured / Mapped / Connected / Disconnected / Warning / Alarm).
- Devices (Gateway → Rack) are a separate tree linked by `projectId`.
- Folder fields: `id, projectId, parentId|null, name, type, code, description, sort_order`. Machine: `id, projectId, folderId, name, template, components[], variantId`.
- Integrity: no folder cycles, `parent_id ≠ id`, server repairs orphans (dropped / reparented / reassigned / detached) and reports them.
- ORCAS today: fixed 4 levels `plant | area | group | machine` in `hierarchy_nodes`, and the sidebar only walks 2 levels under area. → **Move to arbitrary-depth typed folders**.

### 2.2 Sidebar tree
- Header "Asset hierarchy" · `N plants` · collapse chevron (316px ↔ 72px collapsed rail with one tile per plant + hover popover of root folders).
- Shows **one plant at a time** (the top‑bar plant selection).
- Filter "Filter plants, areas, machines" — keeps matches + ancestors, force-expands them. Empty: "No match — Nothing in asset hierarchy matches '…'"; none configured: "No plants / Nothing configured yet".
- Order inside a folder: machines first, then subfolders. 16px indent per level.
- Icons by type: Plant/Project factory · Unit cube · Area vector-square · System sitemap · Machine Group industrial robot · Custom folder-cog · Machine engine.
- Expand state persisted (sessionStorage): plants start open, folders closed; clicking a folder selects + expands; selecting a node auto-expands its ancestors; scroll position remembered.
- **Status dots**: filled = own state, ring = worst state rolled up from collapsed descendants (danger > alert > offline; healthy shows no dot). ULTRON never wires these in production — **ORCAS should** (we already store `status`/`health` per node but don't show it).
- **Keyboard**: roving tabindex, ↑/↓, → expand/enter, ← collapse/parent, Home/End, Enter/Space open, type‑ahead (600 ms).
- `role="tree"`/`treeitem`, `aria-level`, `aria-expanded`.
- Row "⋯" menu (dim until hover/focus; right-click / long-press). In ULTRON it is disabled on the sidebar; editing lives in Configure. Recommend same: **read-only sidebar, editing in Configure**.

### 2.3 Contents page (plant or folder selected)
- Breadcrumb `Plant / … / Folder` (clickable), title, type badge ("Plant root" for project).
- Search "Search areas or equipment"; filter pills **All / Areas / Machines** with counts.
- Section **"Functional areas & sections"** — folder cards: type icon + tag, name, description, `N areas · M machines` (subtree counts), "Open →".
- Section **"Configured machines & trains"** — machine cards: template icon/label, "Monitored", `N components · channels`, up to 3 component pills + "+n", model id, "Workspace →".
- Grid `minmax(280px, 1fr)`; follow ORCAS Card Style (14px graphite cards).
- Empty: "Empty level — No assets configured here"; no match → "Reset filters".
- Project root also lists unassigned machines (folder missing).

### 2.4 Machine selected
→ machine workspace. ULTRON tabs: Summary, Sensors, Diagnosis, Alarms (unacked badge), History, Hardware. ORCAS uses the 4 mandated sub-pages (Overview, Machine Sensor Mapping, Diagnosis incl. Trends & History, Rack) — keep ORCAS's; consider adding the **Alarms** unacknowledged badge. Back label "Back to {folder}". Tab synced to URL.

### 2.5 Editing (Configure → Asset tree), admin only
- Plant: Add area, Rename, Duplicate, Delete. Area: Add machine, Add sub-area, Rename, Move, Delete. Machine: Rename, Duplicate, Move, Delete.
- "Unassigned Equipment (n)" with "Assign to area".
- Dialogs: Create Project (name*, code, description) · Create Folder (name*, type chips*, read-only parent path, code, description) · Add Machine (name, searchable template, variant) · Rename · Move (excludes own subtree; disabled if same location) · Confirm delete with scope ("Delete "X" and its N subfolders and M machines?").
- Toasts with **Undo** for move/delete; no drag-and-drop.
- Persistence: whole-tree `PUT` with `baseRevision` → 409 on conflict, rebase once; debounced 700 ms; poll revisions every 5 s.

### 2.6 Seed content available in ULTRON
- Northfield Plant → Area 1 → RAV-01, EXT-01, PUMP-01; Southgate Plant → Area 1 → FAN-01, COMP-01.
- OSWARteck Industries → OSWARteck Compounding Factory → Extrusion Hall → Line n · Compounding → TSE01/02/03 (Alert / Faulty / Working demo).
- Vijay Soya Agro → Ausa Solvent Extraction Plant → SEP → Line n · Desolventizing → DTDC01/02/03.
- ORCAS currently seeds Demo Cement Plant (KLN-01), Kansanshi Copper (Plant 01), Solwezi Nickel (Plant 02) — keep, these are richer for our sub-pages.

---

## 3. Suggested order of work
1. Default tab → Home; replace fake trajectory / hard-coded fallbacks with API data.
2. Home: Plant health gauge, Alerts feed, Health over time, ROI (modelled), KPI headline band.
3. Hierarchy: arbitrary-depth typed folders + status dot roll-up + keyboard nav + filter-with-ancestors.
4. Hierarchy contents page (folder/machine card grid with All/Areas/Machines filter).
5. Top bar: plant selector, machine picker, gateway lamp; ⌘K search.
6. Configure → Asset tree editing with dialogs + Undo.
7. 3D plant twin (largest item; plant-card schematic stays as fallback meanwhile).
