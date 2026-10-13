# ULTRON engineering and design rules

## Product direction

ULTRON is industrial software: precise, composed, fast to scan, and trustworthy. Interfaces should feel operational rather than decorative.

## Mandatory Component Styles (Must Be Followed Everywhere)

The following 4 component styles are strictly mandated across the entire product and all future views:

### 1. Navigation Style (Horizontal Pill Tabs)
- **Shape & Container**: Horizontal flex row of pill tabs with `--corner-pill: 9999px`.
- **Active Tab**: Full pill capsule background (`#2a292c` / `rgba(255, 255, 255, 0.10)` in dark mode, `#e2e2e4` in light mode), crisp text (`#ffffff` / `#111111`), `font-weight: 500`, padding `7px 18px`.
- **Inactive Tab**: No background or border, muted text (`#8e8e93`), padding `7px 16px`, hover reveals faint pill background (`rgba(255, 255, 255, 0.05)`).
- **Application**: Used everywhere for page tabs, section navigation, sub-filters, view switchers, and segmented controls.

### 2. Card Style (Rounded Graphite Cards)
- **Shape**: Generous rounded corners with `14px` border radius (`--corner-card: 14px`).
- **Surface**: Frosted graphite glass: `background: var(--card-glass-bg)` (or `var(--widget-glass-bg)` for widget cards) with `backdrop-filter: var(--card-glass-filter)`. Never set `--card-bg` as a card background; it stays opaque (`#262528` dark / `#f4f4f5` light) for chart knockout strokes and dot fills. No harsh border (subtle `1px solid rgba(255, 255, 255, 0.04)`).
- **New card classes**: add the class to the shared frosted `:is(...)` rule in `src/app/globals.css`. The reduced-transparency and no-blur fallbacks are handled there. A card's `backdrop-filter` traps `position: fixed` descendants, so render fixed menus/popovers inside cards through a portal to `document.body`.
- **Internal Layout**: Top-left icon/symbol tile (~20-24px), comfortable vertical gap (~12-16px), bottom title in Inter medium (`#ffffff` / `#111111`, ~15-16px), padding `16px 20px`.
- **Application**: Used everywhere for summary cards, quick actions, equipment tiles, metrics, and content containers.

### 3. Table Style (Divider List with Capsule Row Hover)
- **Layout**: Clean borderless list-table with subtle horizontal dividers (`1px solid rgba(255, 255, 255, 0.05)` / `var(--separator)`).
- **Headers (`th`)**: Subtle muted labels (`#8e8e93`), `font-size: 12px`, padding `10px 16px`, no background.
- **Row Content**: Leading item with a rounded square icon badge (`28-32px`, `8px` radius with colored outline icon), item name in `#f5f5f7`, metadata in `#8e8e93`, padding `10px 16px`.
- **Hover / Selected State**: Entire row becomes a rounded capsule highlight with `10px` border radius (`--corner-row: 10px`), background `#28272a` (`rgba(255, 255, 255, 0.07)` in dark, `#ebebed` in light), revealing trailing actions (e.g., `...` menu).
- **Application**: Used everywhere for tables, registers, file lists, asset inventories, device telemetry, and audit logs.

### 4. Button Style (Pill Buttons)
- **Shape**: Full capsule pill shape (`border-radius: 9999px` / `--corner-pill: 9999px`).
- **Primary Button**: Solid white background (`#ffffff`), dark ink text (`#141416`), `font-weight: 500`, padding `8px 18px`, clean inline alignment with icons/chevrons (`gap: 6px`).
- **Secondary Button**: Dark graphite pill (`#2a292c` / `rgba(255, 255, 255, 0.08)`), white text (`#ffffff`), hover `rgba(255, 255, 255, 0.12)`.
- **Application**: Used everywhere for primary actions, dropdown triggers, filters, dialog buttons, and submission controls.

## Non-negotiable visual system

- Every feature must support both light and dark themes. Do not hard-code colour values inside components; use semantic CSS variables from `src/app/globals.css`.
- The active theme is controlled by `ThemeProvider` and toggled with `ThemeToggle`. Respect the OS preference before a visitor makes a choice, then persist that choice in `localStorage`.
- **Inter** (variable, `@fontsource-variable/inter`, via `--font-ui`) is ULTRON's sole UI typeface, with `tnum`, `cv05` and `zero` enabled globally so live values align and tags read unambiguously. Use it throughout the product for headings, body text, controls, tables, charts, empty states, and emails when technically possible. Do not introduce another display or body font without an explicit design-system decision.
- **Liquid Glass is mandatory for ULTRON navigation and controls.** Follow the local `LiquidGlassSkill-main` web skill: build the ambient mesh backdrop first; pair the `liquid-glass` CSS surface (colorless tint, three-part rim) with the browser-gated SVG refraction implementation for large panels; use the cheap CSS-only tier for repeated small controls. Apply glass to floating/navigation UI (navbar, sidebar, bottom bar, dialogs, controls) and to every card surface (see Card Style). Never apply it to tables, lists, table rows, or other text-heavy surfaces inside a card. Keep the plain blur fallback for non-Chromium browsers.
- ULTRON's glass must be sober and industrial: use neutral graphite and black only. Do not use decorative mesh gradients, purple, pink, cyan, neon, or rainbow effects; colour is reserved for operational status and alerts. The single exception is muted brass for process material inside machine drawings (see Machine Diagram Style).
- Do not use bright white glass rims, glowing borders, decorative panel outlines, or visible gradients. Follow the ChatGPT/Codex shell structure: compact top bar, one narrow primary icon rail, quiet separators, and a solid inset workspace. Do not add an adjacent secondary sidebar unless explicitly requested. Keep navigation regions empty until product content is explicitly requested.
- Dark-mode shell colors are updated to the refined greyish palette: top bar `#28282d`, primary rail `#28282d`, secondary hierarchy sidebar `#28282d`, workspace `#18181c`, and outside canvas `#101013`. Use opaque values so these are the exact rendered colors.
- Glass character comes from restrained translucency and backdrop blur, not highlights, glow, or gradients.
- Corner tokens:
  - Outer shell radius: `16px` (`--corner-shell`)
  - Workspace-to-rail intersection: `16px` (`--corner-intersection`) with clipping
  - Standard UI controls / cards: `14px` (`--corner-card`)
  - Pill navigation tabs & buttons: `9999px` (`--corner-pill`)
  - Table row hover capsules: `10px` (`--corner-row`)
  - Small badges/tiles: `6px` - `8px` (`--corner-sm`)
- The navbar height is `52px` and primary rail width is `60px`. Treat these proportions as a set; do not tune them independently.
- Use a restrained industrial palette: high-contrast ink/surface tokens, a single signal-blue accent, and semantic success/warning/danger colours. Colour communicates state; it is not decoration.
- Maintain keyboard accessibility, visible focus rings, and WCAG-conscious contrast in both themes.

## Machine Diagram Style (Mandatory for every machine, now and future)

Every machine drawing — overview schematics, sub-assembly windows, process stages and any new machine type — must use the ULTRON machine-drawing kit in `src/components/assets/machine-kit/machine-kit.tsx`. The style reference is the ULTRON Twin Screw Extruder (TSE) drawing (`ULTRON/ultron-software/assets/machines/twin-screw-extruder.png`).

- **Render inside `MachineSvg`** (or call `useKitId` + `MachineDefs` + `kitStyle` on your own `<svg>`), so shapes get per-drawing gradients. Never hard-code fills; use `MX.*` / `PAINT.*`, which resolve to the `--mx-*` tokens in `globals.css` (light and dark values).
- **Bodies**: solid graphite with a soft top-lit vertical gradient (`PAINT.body`), generous rounded corners, one quiet mid-grey rim (1.5 px). Inner hairline inset on large housings.
- **Recesses**: windows, cut-aways, lenses and terminal boxes in near-black (`PAINT.recess`).
- **Built detail**: corner bolts (`CornerBolts`), feet and plinths (`Feet`), couplings, fans, fins. Equipment must read as built, not as boxes.
- **Metal**: shafts, rollers, lances, screws and pistons in brushed metal (`PAINT.shaft`); shells and cylinders with cylindrical shading (`PAINT.cylinder` / `PAINT.cylinderV`).
- **Process material** (meal, clinker, coal, oil, flame core) in muted brass (`MX.material`, `MX.heat`). This is the only non-status colour allowed, and only inside equipment. Everything else stays neutral graphite.
- **No background or grid in the drawing**. The container owns it: wrap drawings in `.mx-canvas` (quiet grid) or place them on a card.
- **Instrument points are TSE measurement pads** (`MachinePad`): hollow ring when the reading is healthy, filled with a halo when it needs attention, status colour only. Pad coordinates live in the drawing's own coordinate space so they never drift off the feature.
- **Labels**: small upper-case technical labels (`MachineLabel`, Inter 600, wide tracking), never on top of metal parts or pads.
- **Callouts** (sub-assembly windows): card-surface box with a status bar, `P# · TAG` line and the live value with unit, linked to the pad by a hairline leader.

## Live Simulation (KLN-01 demonstration)

- The KLN-01 plant runs on `src/lib/kiln-sim` (pure TypeScript, no React): the 43 D4/D5 signals plus calculated values, the D5 Table 9.5 reference model, sensor validation, the 21-rule library with persistence (2–4 samples, 1 for critical) and hysteresis (4 clean samples), sub-assembly / machine health, and the 27 validation scenarios of D5 Table 9.8.
- One instance is mounted at the app root by `KilnSimulationProvider` (`src/providers/kiln-simulation-context.tsx`). Read it with `useKilnSimulation()`; never create a second instance.
- Pages get live values through the existing hooks: `useMachineCatalog` overlays live values, statuses and health; `useMachineInsights` builds the Prognosis / Analysis payload from the live frame (`src/lib/kiln-sim/live-insights.ts`). Health pages use `kiln-live-overlay.ts`. New pages for KLN-01 must read from these, not from static numbers.
- Machine health has one source everywhere (header, directory, hierarchy tree, fleet home, Diagnosis): `liveMachineStatus()`.

## Architecture

- Use the Next.js App Router under `src/app` for routes and route handlers.
- Keep reusable UI in `src/components`, client state/providers in `src/providers`, domain types in `src/types`, and server-only domain logic in `src/server`.
- APIs live at `src/app/api/<resource>/route.ts`. Keep handlers thin: validate input, call a service, return a typed response. Set `runtime = "nodejs"` for Node-backed endpoints.
- Do not import server modules into client components. Mark browser-interactive components with `"use client"`.
- Keep API responses predictable: `{ data }` for successful responses and `{ error: { code, message } }` for failures.

## Machine Asset Sub-Pages (Scoper Hierarchy Flow)

When a machine is selected from the plant hierarchy sidebar, the machine workspace displays 4 standard sub-pages:
1. **Overview**: Mechanical schematic diagram with green sensor mapping dots, overall machine health master banner, and one-click detailed health navigation.
2. **Machine Sensor Mapping**: Transducer allocation matrix (Sensor ID, instrument, rack slot, Modbus register, sampling rate, health quality).
3. **Diagnosis Page**: Automated AssetIQ ML spectral classification, fault pattern table with probabilities and prescriptive actions, peak frequency explorer, ISO 10816-3 vibration severity zone spectrum, prognostics/RUL multi-subsystem health horizon, and the merged **Trends and History** page (real-time telemetry curves, ISO baseline models, single/all-grid sensor focus, and audited chronologic maintenance & telemetry event log).
4. **Rack Page**: Hardware Acquisition Cabinet specs, PTP grandmaster clock status, and 19" Eurocard chassis slot configuration table.
