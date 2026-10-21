# Codex instructions — ULTRON

Read and follow [CLAUDE.md](./CLAUDE.md) for the complete ULTRON product, theme, typography, and architecture rules. These requirements apply to every future implementation.

In particular: support light and dark mode in all UI, use only semantic design tokens, and use **Inter** as the product typeface throughout.

## Mandatory Component Styles (Must Be Followed Everywhere)

ULTRON uses the **Technical Dense Terminal** look defined by the tokens in `src/app/globals.css`. CLAUDE.md is the full reference; in short:

1. **Navigation (`PillNav`, `.nav-pill`)**: segmented tabs, 2px corners (`--radius-sm`), padding `4px 12px`. Active: `--bg-surface-elevated` fill, `--border-hover` border, ink text, weight 600. Inactive: transparent, `--text-muted`, hover `--hover-faint`. Arrow keys move between tabs.
2. **Cards (`.ast-card`, `.ui-card`)**: solid `--card-bg` with `1px solid --card-border`, 4px corners (`--corner-card`), padding `16px 20px`. No blur, no card inside a card.
3. **Tables (`Table`, `.ui-table`)**: borderless, `--separator` dividers, muted `--fs-xs` headers, `8px 16px` cells, row highlight `--row-hover-bg` with 2px ends (`--corner-row`); clickable rows via `rowActivate`.
4. **Buttons (`PillButton`, `.btn-pill`)**: 4px corners (`--radius-md`), padding `8px 12px`. Primary = signal blue (`--btn-primary-bg`), one per view; secondary = `--bg-surface-elevated` with `--border-subtle`; danger confirms in place.

Colour roles: accent / signal blue (`#58a6ff` dark, `#0969da` light) for focus, selection, primary and info only; green (`--status-success`) means Normal and nothing else; amber Alert; red Critical.

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

- Shell colours (dark / light): canvas, top bar, rail and workspace `#0c0d0e` / `#f6f8fa`; outside canvas `#090a0b` / `#eaeef2`; surface `#141618` / `#ffffff`; borders `#24282c` / `#d0d7de`.
- Shell proportions: top bar `48px`, primary rail `56px` (icons; names on hover), info bar `24px`; outer shell radius `4px` (`--corner-shell`), workspace intersection `0`.
- Surfaces are solid; the `liquid-glass*` classes carry no blur, rim or highlight.
- For new backend functionality, add a route to the resource's Hono router in `backend/src/routes/` and put domain logic in `backend/src/services`; code both sides need goes in `shared/`. Keep client/server module boundaries intact (the frontend only `import type`s from `@backend/*`).

## Machine Asset Sub-Pages (Hierarchy Scoper)

The 4 machine asset sub-pages:
1. **Overview**: Mechanical schematic diagram with green sensor mapping dots, overall machine health master banner, and one-click detailed health navigation.
2. **Machine Sensor Mapping**: Transducer allocation matrix, rack slots, Modbus addresses, sampling rates.
3. **Diagnosis Page**: AssetIQ ML fault classification, prescriptive actions, peak frequency explorer, ISO 10816-3 severity zone spectrum, prognostics/RUL multi-subsystem health horizon, and the merged **Trends and History** page (real-time telemetry waveform curves, single/grid focus, ISO warning/alarm bands, statistical baseline cards, and audited chronologic maintenance & telemetry event log).
4. **Rack Page**: Acquisition Cabinet specs, PTP grandmaster clock, 19" Eurocard chassis slot configuration table.
