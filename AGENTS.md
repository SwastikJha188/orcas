# Codex instructions — ULTRON

Read and follow [CLAUDE.md](./CLAUDE.md) for the complete ULTRON product, theme, typography, and architecture rules. These requirements apply to every future implementation.

In particular: support light and dark mode in all UI, use only semantic design tokens, and use **Inter** as the product typeface throughout.

## Mandatory Component Styles (Must Be Followed Everywhere)

1. **Navigation Style (Horizontal Pill Tabs)**:
   - Horizontal flex container with `--corner-pill: 9999px`.
   - Active: Solid dark graphite pill background (`#2a292c` / `rgba(255, 255, 255, 0.10)`), crisp text (`#ffffff`), `font-weight: 500`, padding `7px 18px`.
   - Inactive: Background-less, muted text (`#8e8e93`), hover slightly brightens with faint background.
   - Use everywhere for tabs, segmented controls, sub-nav, and filters.

2. **Card Style (Rounded Graphite Cards)**:
   - Rounded corners with `14px` border radius (`--corner-card: 14px`).
   - Solid dark graphite surface (`#262528` / `#28272a`), no harsh border.
   - Internal layout: Top-left icon tile (~20-24px), vertical space (~12-16px), bottom-left title in Inter medium (`#ffffff`), padding `16px 20px`.
   - Use everywhere for overview cards, equipment tiles, metrics, and summary modules.

3. **Table Style (Divider List with Capsule Row Hover)**:
   - Minimalist borderless list-table with subtle horizontal row dividers (`1px solid rgba(255, 255, 255, 0.05)`).
   - Column headers in muted neutral (`#8e8e93`), `font-size: 12px`, padding `10px 16px`.
   - Item row: Left icon badge (rounded square ~28-32px, `8px` radius with colored outline icon), title in `#f5f5f7`, metadata in `#8e8e93`.
   - Hover / selected state: Entire row turns into a rounded capsule/card highlight (`border-radius: 10px`, background `#28272a` / `rgba(255, 255, 255, 0.07)`), showing trailing actions (e.g. `...`).
   - Use everywhere for data tables, file/asset lists, registers, telemetry, and logs.

4. **Button Style (Pill Buttons)**:
   - Full capsule pill shape (`border-radius: 9999px` / `--corner-pill: 9999px`).
   - Primary: Solid crisp white background (`#ffffff`), dark ink text (`#141416`), `font-weight: 500`, padding `8px 18px`. Optional trailing dropdown chevron (`∨`).
   - Secondary: Dark graphite pill (`#2a292c` / `rgba(255, 255, 255, 0.08)`), white text (`#ffffff`), hover `rgba(255, 255, 255, 0.12)`.
   - Use everywhere for action buttons, triggers, dropdowns, and form submissions.

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

## Shell Structure & Tokens

- Dark-mode shell colors: top bar `#28282d`, primary rail `#28282d`, secondary hierarchy sidebar `#28282d`, workspace `#18181c`, outside canvas `#101013`.
- Shell proportions: top bar height `52px`, primary rail width `60px`, outer shell radius `16px`, workspace corner intersection `16px` with clipping.
- Liquid Glass is applied only to floating/navigation UI (navbar, sidebar, bottom bar, dialogs), never primary workspace content, tables, or text-heavy surfaces.
- For new backend functionality, use Node.js Next.js route handlers in `src/app/api`, move domain logic into `src/server`, and keep client/server module boundaries intact.

## Machine Asset Sub-Pages (Hierarchy Scoper)

The 4 machine asset sub-pages:
1. **Overview**: Mechanical schematic diagram with green sensor mapping dots, overall machine health master banner, and one-click detailed health navigation.
2. **Machine Sensor Mapping**: Transducer allocation matrix, rack slots, Modbus addresses, sampling rates.
3. **Diagnosis Page**: AssetIQ ML fault classification, prescriptive actions, peak frequency explorer, ISO 10816-3 severity zone spectrum, prognostics/RUL multi-subsystem health horizon, and the merged **Trends and History** page (real-time telemetry waveform curves, single/grid focus, ISO warning/alarm bands, statistical baseline cards, and audited chronologic maintenance & telemetry event log).
4. **Rack Page**: Acquisition Cabinet specs, PTP grandmaster clock, 19" Eurocard chassis slot configuration table.
