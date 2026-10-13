# KLN-01 — UI component inventory

Taken from **D4-OSW-PE-KLN Rev. 02** (Technical Specification) and **D5-OSW-PE-KLN Rev. 01** (Internal System Specification), 11 Oct 2026.
The rule for this inventory: **if the spec doesn't ask for it, it doesn't go on screen.**

---

## 1. Information structure (the sidebar / hierarchy)

Everything in the product hangs off this tree. The specs define nothing else.

```
KLN-01  Rotary kiln · 5,000 t/d · Ø4.8 × 74 m
├── DRV-KLN-01  Drive train                 crit A · 17 signals · health score
│   ├── Main motor            P1 TMP-KLN-20 · P2 TMP-KLN-21 · P3 ELE-KLN-01 · P4 VIB-KLN-01 · P5 TMP-KLN-19 · P6 SPD-KLN-01
│   ├── Gearbox               P1 VIB-KLN-02 · P2 TMP-KLN-22 · P3 VIB-KLN-03 · P4 TMP-KLN-23
│   ├── Pinion & girth gear   P1 STS-KLN-05 · P2 VIB-KLN-04 · P3 SPD-KLN-01
│   ├── Lubrication           P1 TMP-KLN-15 · P2 LEV-KLN-01 · P3 FLO-KLN-05 · P4 PRS-KLN-04
│   └── Auxiliary drive       P1 STS-KLN-11
├── SUP-KLN-01  Support & thrust            crit A · 15 signals · health score
│   ├── Station 1             P1 TMP-KLN-01 · P2 TMP-KLN-03 · P3 TMP-KLN-02 · P4 TMP-KLN-04
│   ├── Station 2             P1 TMP-KLN-05 · P2 TMP-KLN-07 · P3 TMP-KLN-06 · P4 TMP-KLN-08
│   ├── Station 3             P1 TMP-KLN-09 · P2 TMP-KLN-11 · P3 TMP-KLN-10 · P4 TMP-KLN-12
│   └── Thrust                P1 POS-KLN-01 · P2 PRS-KLN-07 · P3 POS-KLN-02
├── SHL-KLN-01  Shell, refractory & seals   crit A · 2 signals · health score
│   ├── Shell & refractory    P1 CAL-KLN-03 · P2 STS-KLN-08
│   ├── Inlet seal            P1 GAS-KLN-01 · P2 TMP-KLN-13 · P3 CAL-KLN-06 · P4 CAL-KLN-07
│   └── Outlet seal           P1 CAL-KLN-07 · P2 STS-KLN-10 · P3 PRS-KLN-03
└── PRC-KLN-01  Process context             context · 9 signals · NO health score
    ├── Kiln inlet            P1 STS-KLN-06 · P2 GAS-KLN-01 · P3 GAS-KLN-02 · P4 TMP-KLN-13 · P5 PRS-KLN-01
    ├── Feed & fuel           P1 FLO-KLN-01 · P2 FLO-KLN-02
    └── Burner & hood         P1 TMP-KLN-14 · P2 PRS-KLN-03
```

**Totals:** 1 kiln → 3 machines + 1 context group → 15 sub-assemblies → 43 signals (33 Req, 10 Opt; 4 new, 39 existing) + 5 calculated values.

Calculated values (software only, no sensor): `CAL-KLN-03` shell max · `CAL-KLN-06` inlet false-air index · `CAL-KLN-07` seal overlap margin · `AMB-EST` ambient estimate · `FLO-EST / FUEL-EST` witness estimates.

---

## 2. Views (the top-level tabs) — exactly 9

These are the only top-level views the specs define (D5 Table 9.4, D4 Table 8.1). Each line is **all** that view needs.

| # | View | Must contain | Nothing else |
|---|------|--------------|--------------|
| 1 | **Overview** | Kiln image with sub-assembly status outlines (solid = machine, dashed = context) · kiln health · 3 machine cards + 1 context card · confirmed findings with root cause · process context strip · operating state · ambient estimate | |
| 2 | **Machines** | Sub-assembly switcher (15) · animated diagram with numbered P-point tags · gauge/signal cards (value, model mark, σ) · sub-assembly health · location-on-kiln thumbnail · findings · "driven by" upstream drivers | |
| 3 | **Thermal** | Shell map 74 m × 360° at 0.5 m × 5° · zone bands (inlet / transition / burning / outlet) · tyre T1–T3 + girth-gear marks · profile vs model · circumferential plot · hottest section · hot area ≥ 380 °C (m²) · colour scale with alert 380 / danger 420 | |
| 4 | **Influence** | Cause-and-effect graph (drivers → intermediate → driven) with live propagation · sensitivities · what-if calculator | |
| 5 | **Analysis** | 5-step pipeline counts (data quality → reference model → rules → confirmation → action) · diagnosis card per machine (severity, priority, confidence, time to limit, health) · cause ranking + evidence + alternatives + actions · sensor validation · rule library (21 rules) · event log | |
| 6 | **Alarms** | All signals with value, model, deviation (σ), status vs alarm matrix | |
| 7 | **Trends** | Trend chart with ±3σ model band and residual · time to limit with range | |
| 8 | **Test Lab** | 27-scenario library · custom fault builder (real change / sensor error, 8 shapes, ≤ 4 faults) · sensitivity sweep · validation suite (27/27) | |
| 9 | **Rack** | Edge gateway · DAQ channels (8 IEPE, 4 used / 4 spare) · data sources (OPC UA / Modbus TCP / MQTT) | |

Persistent across every view (header): asset identity (KLN-01), gateway status, demo-scenario bar (scenario name, state chip, sim clock, Resume / Change scenario).

---

## 3. Reusable UI components (build once, use everywhere)

Mapped to the 4 mandated styles in `CLAUDE.md`. Anything not on this list should be questioned.

### Shell & navigation
| Component | Style | Used in |
|---|---|---|
| `AppShell` (top bar 52 px + rail 60 px + workspace) | Liquid glass shell | Global |
| `HierarchyTree` (kiln → machine → sub-assembly) | Table-row capsule hover | Global sidebar |
| `ViewTabs` (9 views) | **Pill tabs** | Global |
| `SubTabs` (machine → sub-assembly switcher, e.g. "Station 2 · 97") | **Pill tabs** | Machines |
| `ScenarioBar` (scenario, state chip, sim clock, Resume / Change) | Card + pill buttons | Global (demo) |
| `Breadcrumb` / back link | Pill button (secondary) | Global |

### Cards
| Component | Style | Used in |
|---|---|---|
| `MachineCard` (tag, name, health score or "context") | **Card** | Overview, Machines |
| `HealthCard` (score + HEALTHY/WARN/ALARM chip) | **Card** | Machines, Analysis |
| `SignalCard` (tag, value, unit, model mark, σ, status chip) | **Card** | Machines, Alarms |
| `DiagnosisCard` (severity · priority · confidence · time to limit · health) | **Card** | Analysis, Overview |
| `PipelineStepCard` (step n, count, sub-counts) | **Card** | Analysis |
| `FindingCard` (rule, root cause, actions) | **Card** | Overview, Machines, Analysis |
| `DriversPanel` ("driven by" list + "Open influence map") | **Card** + table rows | Machines |
| `LocationThumbnail` (kiln image, sub-assembly highlighted) | **Card** | Machines |

### Tables (all one component — `DataTable`)
| Instance | Columns |
|---|---|
| Signal list / Alarms | Tag · Parameter · Value · Unit · Model · σ · Status |
| Sensor mapping | Tag · Point · Type · Parameter · Purpose · Src (N/R) · Pri (Req/Opt) |
| Rule library | Rule · Name · Logic |
| Event log | Time · Tag/Rule · Event · State |
| Validation suite | Scenario · Expected · Detected after · Result |
| Rack channels | Channel · Tag · Type · Source · Rate · Quality |

### Visualisations (specialised; one each)
| Component | Used in |
|---|---|
| `KilnOverviewImage` (status outlines over the kiln render) | Overview, location thumbnails |
| `SubAssemblyDiagram` (SVG, P-point tags with live values) — 15 instances | Machines |
| `PointTag` (P-number, tag, value, unit; click → trend) | Inside every diagram |
| `ShellThermalMap` (heat map + zones + tyre marks + colour scale) | Thermal |
| `InfluenceGraph` (3-column node graph) | Influence |
| `TrendChart` (value + ±3σ band + residual) | Trends, drill-down from any tag |

### Primitives
| Component | Notes |
|---|---|
| `StatusChip` | One set only: NORMAL · WARNING · ALARM · INVALID/SUSPECT · CONTEXT. Colour = state, nothing else. |
| `Button` | Primary / secondary pill. Nothing else. |
| `Banner` | One style for "Demo limits — not field calibrated". |
| `EmptyState` | e.g. "None — signals follow the model." |

**Count: ~30 components total.** If the codebase has many more, that's where the "different everywhere" feeling comes from.

---

## 4. Not in the spec → candidates to remove

`CLAUDE.md` → *Machine Asset Sub-Pages* lists things the kiln specs **do not** ask for. They conflict with the 9 views above:

| In CLAUDE.md / current UI | Spec says | Action |
|---|---|---|
| "Machine Sensor Mapping" with rack slot, Modbus register, sampling rate | Sensor mapping = tag · point · type · parameter · purpose · src · pri. Comms details belong in **Rack** | Move comms columns to Rack |
| AssetIQ ML spectral classification, peak frequency explorer | Analysis is rule-based on a reference model (21 rules) — no ML spectra | Remove |
| ISO 10816-3 severity zone spectrum | Spec uses **ISO 20816-3** alarm limits only, as values | Remove spectrum; show limits on SignalCard |
| Prognostics / RUL multi-subsystem horizon | Spec gives **time to limit with range** per finding | Replace with time-to-limit on DiagnosisCard |
| PTP grandmaster clock, 19" Eurocard slot table | Rack = gateway, 8 IEPE DAQ channels, data sources | Remove |
| "Trends and History" merged into Diagnosis | Trends and Alarms are their own views | Split back out |
| 4 machine sub-pages (Overview / Mapping / Diagnosis / Rack) per machine | 9 **global** views; the machine is selected *inside* them | Restructure |

Also out of scope per D4 §1 / Appendix B (should not appear anywhere): cooler, ID fan, preheater/calciner, stack emissions, tyre migration, roller vibration, seal gap lasers, wireless seal sensors, NO/SO₂/CO₂, oil lab, periodic inspections.

---

## 5. Inconsistencies visible in the spec screenshots (Fig. 9.1, 9.2)

- Monospace type used for tags, labels and tabs — `CLAUDE.md` mandates Inter only.
- View tabs are outlined/underlined text, not pill tabs.
- Sub-assembly switcher ("Station 1 · 97") uses a third, outlined-chip style.
- Status chips use a bracket/left-border outline; signal tags use a green left bar; machine cards use a green outline when selected — three different "selected/OK" treatments.
- "Change scenario" is an orange outlined button — orange is reserved for warnings.
- Small uppercase micro-labels (`SUB-ASSEMBLY HEALTH`, `CONFIRMED FINDINGS`, `DRIVEN BY`) at several sizes.
