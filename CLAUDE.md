# ULTRON engineering and design rules

## Product direction

ULTRON is industrial software: precise, composed, fast to scan, and trustworthy. Interfaces should feel operational rather than decorative.

## Mandatory Component Styles (Must Be Followed Everywhere)

ULTRON uses the **Technical Dense Terminal** look (tokens at the top of `src/app/globals.css`): solid graphite surfaces, tight 2–4px corners, hairline borders, dense type. The names "pill" and "card" survive in class and token names (`.nav-pill`, `.btn-pill`, `--corner-pill`) but the shapes are squared. The 4 component styles below are mandated across the product:

### 1. Navigation Style (Segmented Tabs — `PillNav`, `.nav-pill`)
- **Shape**: Horizontal row of tabs, `border-radius: var(--radius-sm)` (2px), padding `4px 12px`, `font-size: var(--fs-md)`.
- **Active Tab**: `background: var(--bg-surface-elevated)`, `1px solid var(--border-hover)`, ink text (`var(--dx-ink)`), `font-weight: 600`.
- **Inactive Tab**: transparent, no border, `color: var(--text-muted)`; hover `background: var(--hover-faint)` and ink text.
- **Keyboard**: one tab stop per row; Arrow / Home / End move and select (built into `PillNav`). Tabs that leave the page are a `role="group"` of plain buttons, not a tablist.
- **Application**: page tabs, section navigation, sub-filters, view switchers and segmented controls. Use `PillNav`; never hand-roll a tab row.

### 2. Card Style (Solid Graphite Cards — `.ast-card`, `.ui-card`)
- **Shape**: `border-radius: var(--corner-card)` (4px).
- **Surface**: solid `var(--card-bg)` (`#141618` dark / `#ffffff` light) with `1px solid var(--card-border)`. No backdrop blur: `--card-glass-bg` resolves to `--card-bg` and `--card-glass-filter` is `none`, so sections pre-rasterize without pop-in. A card's `backdrop-filter` (where one is ever reintroduced) traps `position: fixed` descendants, so render fixed menus/popovers through a portal to `document.body`.
- **Internal Layout**: padding `16px 20px`; optional top-left icon tile (~20–24px, `var(--text-muted)`); title `var(--fs-lg)`, weight 600, ink.
- **Application**: summary cards, equipment tiles, metrics and content containers. One card per section; never a card inside a card.

### 3. Table Style (Divider List with Row Highlight — `Table`, `.ui-table`)
- **Layout**: borderless list-table with `1px solid var(--separator)` row dividers.
- **Headers (`th`, `scope="col"`)**: `var(--text-muted)`, `font-size: var(--fs-xs)`, weight 500, padding `8px 16px`, no background.
- **Row Content**: padding `8px 16px`, `color: var(--page-fg)`; optional leading icon badge (28–32px, `var(--corner-sm)`); metadata in `var(--text-muted)`. Mono (`ast-num`) only in number/tag cells.
- **Hover / Focus / Selected**: the row fills `var(--row-hover-bg)` with `var(--corner-row)` (2px) ends, revealing trailing actions. Clickable rows use `rowActivate(run, selected)` (focusable, Enter/Space, `aria-current`); the focus ring is drawn inside the row.
- **Application**: tables, registers, file lists, asset inventories, device telemetry and audit logs.

### 4. Button Style (`PillButton`, `.btn-pill`)
- **Shape**: `border-radius: var(--radius-md)` (4px), padding `8px 12px`, `font-size: var(--fs-md)`, weight 500, icon gap 6px.
- **Primary**: `background: var(--btn-primary-bg)` (signal blue), `color: var(--btn-primary-fg)`, weight 600. One primary action per view.
- **Secondary**: `background: var(--bg-surface-elevated)`, `1px solid var(--border-subtle)`, ink text; hover mixes 8% ink and `var(--border-hover)`.
- **Danger** (`variant="danger"`): danger ink on a faint danger fill; destructive actions confirm in place (two-step) before running.
- **States**: hover, pressed (scale .97), focus-visible ring, disabled, `loading` (spinner, keeps focus via `aria-disabled`), error/success.
- **Application**: primary actions, dropdown triggers, filters, dialog buttons and submissions.

## Non-negotiable visual system

- Every feature must support both light and dark themes. Do not hard-code colour values inside components; use semantic CSS variables from `src/app/globals.css`.
- The active theme is controlled by `ThemeProvider` and chosen from the `ThemeToggle` menu: Light, Dark grey, Dark green, Dark blue. The dark palettes (`html[data-palette]`, `src/styles/dark-palettes.css`) only re-tint the neutral tokens at the grey theme's lightness; status, accent, brass and metal never change, so new dark tokens that are neutral surfaces, borders or text need a value in each palette. Respect the OS preference before a visitor makes a choice, then persist that choice in `localStorage`.
- **Inter** (variable, `@fontsource-variable/inter`, via `--font-ui`) is ULTRON's sole UI typeface, with `tnum`, `cv05` and `zero` enabled globally so live values align and tags read unambiguously. Use it throughout the product for headings, body text, controls, tables, charts, empty states, and emails when technically possible. `--font-mono` (JetBrains Mono) is only for number/tag table cells and KPI values. Do not introduce another display or body font without an explicit design-system decision.
- **Surfaces are solid, not glass.** The `liquid-glass*` classes remain as structural hooks on the shell and dialogs but carry no blur, rim or highlight. Do not add mesh gradients, glow, purple, pink, cyan, neon or rainbow effects; colour is reserved for state. The single exception is muted brass for process material inside machine drawings (see Machine Diagram Style).
- Shell structure: compact top bar, one narrow primary icon rail, quiet separators, a solid workspace (`<main id="workspace-content">`, reached by the "Skip to workspace" link). Do not add an adjacent secondary sidebar unless explicitly requested.
- Shell colours (dark / light): canvas, top bar, rail and workspace `#0c0d0e` / `#f6f8fa`; outside canvas `#090a0b` / `#eaeef2`; surface `#141618` / `#ffffff`; elevated `#1a1d20` / `#f0f3f6`; borders `#24282c` / `#d0d7de`. Navbar height `48px`, rail width `56px` (icons only; an item's name shows beside it on hover or keyboard focus, and under the icon in the phone tab bar), info bar `24px`: treat these as a set. Rail order: Home, Maintenance, SAP, Assets, AssetIQ, then the set-up group Devices, Configure, Simulation; Maintenance carries the open-alarm count from `/api/cases/condition`. SAP (rail tab, `src/components/sap`) is the plant's SAP S/4HANA link (`/api/sap`, `backend/src/sap`; credentials sealed with `SAP_CREDENTIALS_ENCRYPTION_KEY`); Simulation › SAP runs a simulated SAP system per plant (`backend/src/sap/sim`, migration 059) that the same client code talks to.
- Corner tokens: `--corner-sm` / `--corner-row` / `--radius-sm` 2px; `--corner-card` / `--corner-shell` / `--corner-pill` / `--radius-md` 4px; `--radius-lg` 6px; `--corner-intersection` 0. Never use a literal radius.
- **Colour roles** (one meaning each):
  - Accent / signal blue (`--accent-primary`, `--signal-blue`, `--btn-primary-bg`): `#58a6ff` dark, `#0969da` light. Focus rings, selection, the primary button, info tones, chart fill. Never used for condition.
  - Status: `--status-success` (Normal), `--status-warning` (Alert), `--status-danger` (Critical). Green means Normal and nothing else.
  - Text: `--dx-ink` / `--text-primary` for values and titles, `--page-fg` body, `--text-muted` secondary (≥ 5:1 in both themes). Form controls use `--input-border` (≥ 3:1).
- Type scale (`--fs-*`): 9 sizes — text tier 11 / 12 / 13 / 14, headings 16 / 20 / 24 / 30 / 36; `--fs-3xs` (10px) only for labels inside machine drawings. Never a literal font size.
- Spacing (`--space-*`): 4px grid — 2 (hairline only), 4, 8, 12, 16, 20, 24, 32, 40, 48. Gaps inside a group are at most half the gap between groups.
- Each screen's primary task is written in `docs/ux-primary-tasks.md`; rank a screen's content and its single primary action against it.
- Motion: `--dur-fast` 140ms, `--dur-modal` 200ms, `--ease-out`; tabs and rows switch instantly. `prefers-reduced-motion` is honoured globally.
- Accessibility floor: a global `:focus-visible` ring (components may restyle, never remove it), WCAG AA contrast in both themes, 44px touch targets on coarse pointers (`src/styles/responsive/foundation.css`), labels bound to every control (`Field`, or `ariaLabel` on `TextInput` / `Select` / `TextArea` / `NumberInput`).
- Forms and dialogs: use `Dialog` (first-field focus, Esc, focus return, `dirty` guards unsaved input) and `Field` (errors next to the field). `NumberInput` accepts a decimal comma. Trim and normalise input rather than rejecting it. Every delete / remove / irreversible cancel uses `ConfirmAction` (two-step in place, Keep focused); removals in long drafts offer Undo.

## Machine Diagram Style (Mandatory for every machine, now and future)

Every machine drawing — overview schematics, sub-assembly windows, process stages and any new machine type — must use the ULTRON machine-drawing kit in `src/components/assets/machine-kit/machine-kit.tsx`. The style reference is the ULTRON Twin Screw Extruder (TSE) drawing (`ULTRON/ultron-software/assets/machines/twin-screw-extruder.png`).

- **Render inside `MachineSvg`** (or call `useKitId` + `MachineDefs` + `kitStyle` on your own `<svg>`), so shapes get per-drawing gradients. Never hard-code fills; use `MX.*` / `PAINT.*`, which resolve to the `--mx-*` tokens in `globals.css` (light and dark values).
- **Bodies**: solid graphite with a soft top-lit vertical gradient (`PAINT.body`), generous rounded corners, one quiet mid-grey rim (1.5 px). Inner hairline inset on large housings.
- **Recesses**: windows, cut-aways, lenses and terminal boxes in near-black (`PAINT.recess`).
- **Built detail**: corner bolts (`CornerBolts`), feet and plinths (`Feet`), couplings, fans, fins. Equipment must read as built, not as boxes.
- **Metal**: shafts, rollers, lances, screws and pistons in brushed metal (`PAINT.shaft`); shells and cylinders with cylindrical shading (`PAINT.cylinder` / `PAINT.cylinderV`).
- **Process material** (meal, clinker, coal, oil, flame core) in muted brass (`MX.material`, `MX.heat`). This is the only non-status colour allowed, and only inside equipment. Everything else stays neutral graphite.
- **No background or grid in the drawing**. The container owns it: wrap drawings in `.mx-canvas` (quiet grid) or place them on a card.
- **Instrument points are TSE measurement pads** (`MachinePad`): hollow ring when the reading is healthy, filled with a halo when it needs attention, status colour only. On value mimics (operator sheets) pass `quiet`: a healthy pad is a neutral ring, so only abnormal points carry colour (Von Restorff / ISA-101). Pad coordinates live in the drawing's own coordinate space so they never drift off the feature.
- **Readings on machine sheets** (`part-blocks.tsx`): every reading stays visible, whatever the count, grouped into one aligned readout block per part (sub-assembly) beside its pads, the way a control-room mimic groups readouts by equipment: part name header, label column left, value column right, Alert/Critical rows marked by a status dot and colour and the block rimmed in the worst colour. A part spread over the sheet gets one block per cluster of pads. Blocks are placed in free space (busy map: lines, bodies, the drawing's words, pads). Pads stay on the drawing; hovering or selecting a row tints it and links it to its pad with a line on a halo (above blocks and drawing, leaving from the block edge nearest the pad, `rowLeader`), a dot at the row and a ring on the pad, all in the reading's status colour (`linkColor`: Normal green, Alert amber, Critical red, no data grey). Numbers bold, states as sentence-case words (`stateWords`). Never hide readings behind clicks (folding was tried and rejected), and don't scatter one plate per sensor (rejected as messy).
- **Labels**: small upper-case technical labels (`MachineLabel`, Inter 600, wide tracking), never on top of metal parts or pads.
- **Callouts** (sub-assembly windows): card-surface box with a status bar, `P# · TAG` line and the live value with unit, linked to the pad by a hairline leader.

## Live Simulation (KLN-01 demonstration)

- The KLN-01 plant runs on `src/lib/kiln-sim` (pure TypeScript, no React): the 43 D4/D5 signals plus calculated values, the D5 Table 9.5 reference model, sensor validation, the 21-rule library with persistence (2–4 samples, 1 for critical) and hysteresis (4 clean samples), sub-assembly / machine health, and the 27 validation scenarios of D5 Table 9.8.
- One instance is mounted at the app root by `KilnSimulationProvider` (`src/providers/kiln-simulation-context.tsx`). Read it with `useKilnSimulation()`; never create a second instance.
- The plant also runs around the clock on the server (`backend/src/plant/runner.ts`, started from `backend/src/index.ts`; one server per database holds the lease, a higher `RUNNER_VERSION` takes it over). It acts as the simulated gateway: every `readings.publish_period_s` it writes each simulated measurement to `readings` (`backend/src/plant/sim-gateway.ts`), runs the server evaluation (`backend/src/monitoring/evaluate.ts`) and saves the fleet to `plant_state` every 5 min. Pages resume that plant (`loadFleet` in `shared/lib/fleet-boot.ts`). Engine changes must stay deterministic and freezable (`freezeFleet` / `plant-codec`).
- The engines' fleet (which machines, seed, profile), signal names/units/limits/states and rule texts come from the database (`/api/simulations/config`, applied by `applyEngineConfig` in `src/lib/engine-config.ts` on the server and in the browser before any engine steps). Never add machine lists, limits or rule text to the engine modules as a source of truth.
- Pages get live values through the existing hooks: `useMachineCatalog` overlays live values, statuses and health; `useMachineInsights` builds the Prognosis / Analysis payload from the live frame (`src/lib/kiln-sim/live-insights.ts`). Health pages use `kiln-live-overlay.ts`. New pages for KLN-01 must read from these, not from static numbers.
- Machine health has one source everywhere (header, directory, hierarchy tree, fleet home, Diagnosis): `liveMachineStatus()`, which reads the server evaluation's Machine Health Index (`/api/fleet/condition`). Health bands come from the machine's health model (`useHealthBands` / `useMachineHealthBands`), never from literals.

## Architecture

- Use the Next.js App Router under `src/app` for routes and route handlers.
- Keep reusable UI in `src/components` and client state/providers in `src/providers`. Code both sides run (domain types, simulation engines, codecs) lives in `shared/` (`@shared/types`, `@shared/lib`); server-only domain logic lives in the backend (`backend/src`, `@backend/*`). The frontend may only `import type` from `@backend/*`.
- The backend is a separate Node.js server (`backend/`, Hono on `@hono/node-server`, port 4000). APIs are one router per resource in `backend/src/routes/<resource>.ts`, mounted at `/api/<resource>` by `backend/src/routes/index.ts`; register static paths before `:param` paths. Keep handlers thin: validate input, call a service, return a typed response. Next.js has no API routes: `next.config.ts` forwards `/api/*` to `ULTRON_API_URL` (default `http://localhost:4000`). `npm run dev` starts both; `npm run dev:api` / `dev:web` start one.
- Do not import server modules into client components. Mark browser-interactive components with `"use client"`.
- Keep API responses predictable: `{ data }` for successful responses and `{ error: { code, message } }` for failures.

## Data, backend and APIs (mandatory)

Reference: `~/Downloads/Ultron_Purpose_and_Information_Flow (1).docx` and `Ultron_Machine_Monitoring_Foundations (1).docx`.

- **The database is the source of truth.** No domain data in code: no machine/plant ids, tag lists, limits, thresholds, health bands, priorities, response times, checklists or demo values in components, providers, services or engines. Read them through the API; while loading show an empty/"—" state. Never substitute a made-up number for an unknown value (null stays null; a silent machine shows "No data", never "Operational").
- **Schema** lives in `backend/src/db/migrations/NNN_name.sql` (000 is the frozen base). Add a new migration for every change; never edit an applied one. Apply with `node --env-file=.env.local scripts/db-migrate.mjs` (the server also applies pending migrations on boot / `POST /api/db/migrate`). Keep tables in 3NF: no stored copies of derived values (status, health, latest value), no repeated parent keys (use `v_measurement_context`, `v_edge_points`, `v_edge_gateways`), lookup tables instead of free-text enums.
- **Monitoring core** (migration 001+): plants → machines → machine_systems → machine_subassemblies → measurement_points → measurements (quantity, unit, statistic, direction, range, acquisition) → readings (acquired_at vs received_at, quality). measurement_limits (with raise/clear persistence and approval), measurement_states, operating_states + criteria + machine_state_periods, reference_sets/values (draft → accepted), process_requirements, rules + rule_inputs/subassemblies/parameters, machine_events, findings + finding_acknowledgements + investigation_entries, health_models + parameters, machine/subassembly_health_scores, system_settings, work_order_priorities, maintenance_* checklists.
- **Calculations run on the server from stored readings** (`backend/src/monitoring/evaluate.ts`, `insights-service.ts`, `asset-read-service.ts`): data validity, operating state, limit checks, reference deviation, sustained change, process requirements, health index, trends/features, forecasts and time-to-limit. Every window, threshold and weight is a `system_settings` / limit / reference / health-model row.
- **APIs**: `{ data }` / `{ error: { code, message } }` via `backend/src/http.ts`; services throw `InputError` / `NotFoundError` (`backend/src/errors.ts`). Monitoring endpoints: `/api/measurements`, `/api/measurements/:id/{readings,features,limit}`, `/api/readings` (ingest), `/api/findings` (+ `/:id/acknowledge`, `/:id/entries`), `/api/machines/:id/{condition,health-scores,events,operating-states,references}`, `/api/references/:id`, `/api/fleet/condition`, `/api/health-models`, `/api/work-order-priorities`, `/api/settings`, `/api/simulations`, `/api/simulations/config`, `/api/maintenance/vocabulary`.
- **Fresh databases** are loaded from `backend/src/db/fixtures` (exported by `node --env-file=.env.local scripts/db-export-fixture.mjs`; loaded by `POST /api/db/init` or automatically when the database is empty). Re-export the fixture after changing configuration data.
- Shared client reference hooks: `src/lib/reference-data.ts` (`useHealthBands`, `useWorkOrderPriorities`), `usePrimaryMachineId()` / `usePlantEngine()` (from `plants.primary_machine_id` and `machine_simulations`).

## Machine Asset Sub-Pages (Scoper Hierarchy Flow)

When a machine is selected from the plant hierarchy sidebar, the machine workspace displays 4 standard sub-pages:
1. **Overview**: Mechanical schematic diagram with green sensor mapping dots, overall machine health master banner, and one-click detailed health navigation.
2. **Machine Sensor Mapping**: Transducer allocation matrix (Sensor ID, instrument, rack slot, Modbus register, sampling rate, health quality).
3. **Diagnosis Page**: Automated AssetIQ ML spectral classification, fault pattern table with probabilities and prescriptive actions, peak frequency explorer, ISO 10816-3 vibration severity zone spectrum, prognostics/RUL multi-subsystem health horizon, and the merged **Trends and History** page (real-time telemetry curves, ISO baseline models, single/all-grid sensor focus, and audited chronologic maintenance & telemetry event log).
4. **Rack Page**: Hardware Acquisition Cabinet specs, PTP grandmaster clock status, and 19" Eurocard chassis slot configuration table.
- Drawing controls (Show / Hide messages, zoom, full screen) are pinned to the drawing's bottom-right corner (`.opc-canvas-controls`), the key to its bottom-left; never put them in a header row, where wrapping moves them between pages.
- **Three navbars, the same on every page (Home Operator view and Assets):** bar 1 the plant's machines and the view toggle; bar 2 the parts (a machine) or the machines with health (Full line / asset directory), pills with `opc-subassembly-pills`; bar 3 the status on the left, quick views then the page tabs (Overview · Diagnosis · Prognosis · Analysis · Sensors) at the right end. Never move the page tabs into another bar: they must sit in the same place on every page.

