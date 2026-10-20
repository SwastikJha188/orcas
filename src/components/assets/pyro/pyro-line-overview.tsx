"use client";

/**
 * Pyro overview (D4-OSW-PE-PYR Rev. 02 Table 8.1): the six machines (feed system
 * FSL-01 + KFS-01 and clinker transport HMR-01 + CSL-01 each run as one) on
 * the real process route of Figure 4.1 — material FSL-01 → CSL-01, hot gas
 * counter-current from the kiln up the preheater to the ID fan, secondary air
 * from the cooler, and the single firing point BRN-01 at the kiln outlet —
 * with live health / quality flags, production context, the last validated
 * findings and the cross-machine process influence (Table 8.1 "Process
 * influence"), all read from the running line.
 */

import React, { useMemo } from "react";
import { MX, MachineDefs, PAINT, kitStyle, useKitId } from "@/components/assets/machine-kit/machine-kit";
import { Table, type Column } from "@/components/ui";
import { useKilnFleet } from "@/providers/kiln-simulation-context";
import { PYRO_MACHINES, PYRO_SIGNAL_BY_TAG } from "@/lib/pyro-sim/signals";
import type { SimFrame } from "@/lib/kiln-sim/engine";
import type { AssetsSubPage } from "../assets-view";
import { pyroRule } from "@/lib/pyro-sim/rules";
import { SPEC_RULES, type SpecRule } from "@/lib/pyro-sim/spec-rules";
import { isConditionRule } from "@/lib/plant-defs";
import { displayName, nameIds } from "@/lib/display-name";
import { QUALITY_LABEL } from "../sensors-model";
import { ConditionReport } from "./condition-report";
import { LineSheet, lineSheetCaption } from "./line-sheets/line-sheet";
import { LINE_SHEET_ART, LINE_SHEET_BY_ID, LINE_SHEET_FOCUS_KEY } from "./line-sheets";
import { OV_SECTIONS, OVERVIEW_SECTION_KEY } from "../overview-sections";

const W = 1100;
const H = 300;
const NODE_W = 128;
const NODE_H = 86;
const ROW_Y = 118;
/** Material route order (Figure 4.1); BRN-01 fires into the kiln outlet. */
const ROUTE = ["PYR-FED-01", "PYR-PHC-01", "PYR-KLN-01", "PYR-CLR-01", "PYR-CCT-01"];
const X: Record<string, number> = Object.fromEntries(ROUTE.map((id, i) => [id, 24 + i * ((W - 48 - NODE_W) / (ROUTE.length - 1))]));
X["PYR-BRN-01"] = (X["PYR-KLN-01"] + X["PYR-CLR-01"]) / 2;
const BRN_Y = 214;

const tone = (c: SimFrame["condition"] | undefined) => (c === "Critical" ? MX.bad : c === "Alert" ? MX.warn : MX.good);

/** Small machine-kit glyph per machine group (36 × 24 box), drawn in the node's top-right corner. */
function MachineGlyph({ id, x, y }: { id: string; x: number; y: number }) {
  let body: React.ReactNode = null;
  switch (id) {
    case "PYR-FED-01":
      body = (
        <>
          <path d="M 10 2 H 26 V 15 L 20 21 H 16 L 10 15 Z" {...PAINT.cylinderV} />
          <path d="M 11.5 10 H 24.5 V 14.5 L 19.5 19.5 H 16.5 L 11.5 14.5 Z" {...PAINT.material} />
          <path d="M 12 22 V 24 M 24 22 V 24" {...PAINT.detail} />
        </>
      );
      break;
    case "PYR-PHC-01":
      body = (
        <>
          <path d="M 4 2 H 14 V 8 L 10 14 H 8 L 4 8 Z" {...PAINT.cylinderV} />
          <path d="M 18 9 H 28 V 15 L 24 21 H 22 L 18 15 Z" {...PAINT.cylinderV} />
          <path d="M 14 4 H 30 V 9 M 9 14 V 22 H 23" {...PAINT.detail} />
        </>
      );
      break;
    case "PYR-KLN-01":
      body = (
        <>
          <path d="M 2 7 L 34 13 L 34 19 L 2 13 Z" {...PAINT.cylinder} />
          <path d="M 10 7.5 V 15 M 26 10.5 V 18" stroke={MX.edge} strokeWidth={2.4} />
          <path d="M 6 22.5 H 30" {...PAINT.detail} />
        </>
      );
      break;
    case "PYR-BRN-01":
      body = (
        <>
          <rect x={2} y={10} width={18} height={4} rx={1} {...PAINT.shaft} />
          <path d="M 20 9 L 34 12 L 20 15 Z" fill={MX.heat} stroke="none" />
          <rect x={4} y={7} width={6} height={10} rx={1.5} {...PAINT.body} />
        </>
      );
      break;
    case "PYR-CLR-01":
      body = (
        <>
          <rect x={2} y={4} width={32} height={13} rx={3} {...PAINT.body} />
          <path d="M 5 10 L 31 13" fill="none" stroke={MX.material} strokeWidth={2} strokeLinecap="round" />
          <circle cx={10} cy={21} r={2.4} {...PAINT.recess} />
          <circle cx={18} cy={21} r={2.4} {...PAINT.recess} />
          <circle cx={26} cy={21} r={2.4} {...PAINT.recess} />
        </>
      );
      break;
    case "PYR-CCT-01":
      body = (
        <>
          <rect x={8} y={2} width={20} height={19} rx={4} {...PAINT.body} />
          <circle cx={18} cy={11.5} r={5.5} {...PAINT.recess} />
          <circle cx={18} cy={11.5} r={1.8} {...PAINT.shaft} />
          <path d="M 18 6 V 9.7 M 18 13.3 V 17 M 12.5 11.5 H 16.2 M 19.8 11.5 H 23.5" stroke={MX.metal} strokeWidth={1.2} />
          <path d="M 10 22 V 24 M 26 22 V 24" {...PAINT.detail} />
        </>
      );
      break;
  }
  return (
    <g transform={`translate(${x} ${y})`} aria-hidden="true" pointerEvents="none">
      {body}
    </g>
  );
}

function Arrow({ d, dashed, label, lx, ly }: { d: string; dashed?: boolean; label?: string; lx?: number; ly?: number }) {
  return (
    <g aria-hidden="true">
      <path d={d} fill="none" stroke={MX.edge} strokeWidth={1.4} strokeDasharray={dashed ? "5 4" : undefined} markerEnd="url(#pyro-route-arrow)" />
      {label && (
        <text x={lx} y={ly} textAnchor="middle" fontFamily={MX.font} fontSize={10.5} letterSpacing="0.08em" fill={MX.label}>
          {label}
        </text>
      )}
    </g>
  );
}

function corr(a: number[], b: number[]): number | null {
  const n = Math.min(a.length, b.length);
  if (n < 30) return null;
  const xa = a.slice(-n);
  const xb = b.slice(-n);
  const ma = xa.reduce((s, v) => s + v, 0) / n;
  const mb = xb.reduce((s, v) => s + v, 0) / n;
  let sab = 0;
  let saa = 0;
  let sbb = 0;
  for (let i = 0; i < n; i++) {
    sab += (xa[i] - ma) * (xb[i] - mb);
    saa += (xa[i] - ma) ** 2;
    sbb += (xb[i] - mb) ** 2;
  }
  return saa > 0 && sbb > 0 ? sab / Math.sqrt(saa * sbb) : null;
}

/** Drivers (rows) and the downstream signals they move (columns), D4 Table 8.1. */
const DRIVERS = ["FLO-KFS-01", "FLO-BRN-01", "PRS-BRN-03", "SPD-PHC-01", "ELE-PHC-01", "SPD-KLN-01"];
/** Driver rows that need their own reading note. */
const DRIVER_NOTE: Record<string, string> = { "ELE-PHC-01": "Oxygen against exhaust fan power (B.1 1.3.3) · context only, not a cause" };
const EFFECTS = ["TMP-KLN-13", "PRS-KLN-01", "GAS-KLN-01", "TMP-KLN-14", "GAS-PHC-01", "ELE-PHC-01", "ELE-KLN-01", "PRS-PHC-01", "PRS-CLR-01", "TMP-CLR-08", "ELE-HMR-01", "ELE-CSL-01"];

export function PyroLineOverview({ onOpenMachine }: { onOpenMachine: (machineId: string, subPage: AssetsSubPage) => void }) {
  const fleet = useKilnFleet();
  const kitId = useKitId();
  const frames = useMemo(() => Object.fromEntries(PYRO_MACHINES.map((m) => [m.id, fleet[m.id]?.frame ?? null])), [fleet]);
  const live = Object.values(frames).some(Boolean);

  const value = (tag: string) => {
    const def = PYRO_SIGNAL_BY_TAG[tag];
    const f = def ? frames[def.machine] : null;
    return f?.signals[tag] ?? null;
  };
  const series = (tag: string) => {
    const def = PYRO_SIGNAL_BY_TAG[tag];
    const f = def ? frames[def.machine] : null;
    return f?.history[tag] ?? [];
  };

  const findings = useMemo(() => {
    const out: Array<{ key: string; t: number; clock: string; machine: string; code: string; machineName: string; title: string; detail: string; severity: string; defs: SimFrame["defs"] }> = [];
    for (const m of PYRO_MACHINES) {
      const f = frames[m.id];
      if (!f) continue;
      // Machine findings only: data-quality flags (R-DQ-*, R-ANM-01) are input validity, not condition.
      for (const e of f.events)
        if (e.kind === "rule" && e.severity !== "Normal" && !/^R-(DQ|ANM)-/.test(e.title))
          out.push({ key: `${m.id}-${e.t}-${e.title}`, t: e.t, clock: e.clock, machine: m.id, code: m.code, machineName: m.shortName, title: e.title.replace(/ confirmed$/, ""), detail: e.detail, severity: e.severity, defs: f.defs });
    }
    return out.sort((a, b) => b.t - a.t).slice(0, 6);
  }, [frames]);

  const influence = useMemo(
    () =>
      DRIVERS.map((d) => ({
        driver: d,
        cells: EFFECTS.map((e) => (e === d ? null : corr(series(d), series(e)))),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [frames],
  );

  if (!live) return null;

  const ruleCols: Column<SpecRule>[] = [
    {
      key: "id",
      header: "Planned check (D4)",
      width: "260px",
      render: (r) => (
        <span className="ast-cell-stack">
          <span className="ast-cell-title" title={r.id}>
            {r.purpose}
          </span>
        </span>
      ),
    },
    {
      key: "inputs",
      header: "Uses and conditions",
      render: (r) => (
        <span className="ast-cell-stack">
          <span className="ast-cell-text">{r.inputs}</span>
          <span className="ast-cell-sub">{r.qualification}</span>
          {r.note && <span className="ast-cell-sub">Note: {r.note}</span>}
        </span>
      ),
    },
    {
      key: "impl",
      header: "Checks running",
      width: "220px",
      render: (r) => {
        const parts = Object.entries(r.implementation);
        if (!parts.length) return <span className="ast-cell-sub">{r.state === "inherent" ? "Every finding" : "—"}</span>;
        const machines = parts.length === PYRO_MACHINES.length ? `All ${PYRO_MACHINES.length} machines` : parts.map(([m]) => PYRO_MACHINES.find((p) => p.id === m)?.shortName ?? m).join(", ");
        const named = [...new Map(parts.flatMap(([m, ids]) => ids.map((id) => [id, pyroRule(m, id)?.plainTitle ?? pyroRule(m, id)?.name ?? id] as const))).entries()];
        const ids = named.map(([id]) => id).join(", ");
        // Up to three rules by name; longer lists as a count (names and IDs in the tooltip).
        const text = named.length <= 3 ? named.map(([, n]) => n).join(", ") : `${named.length} checks`;
        return (
          <span className="ast-cell-stack">
            <span className="ast-cell-text" title={named.map(([id, n]) => `${id} ${n}`).join("\n") || ids}>
              {text}
            </span>
            <span className="ast-cell-sub">{machines}</span>
          </span>
        );
      },
    },
    {
      key: "state",
      header: "Now",
      width: "118px",
      render: (r) => {
        if (r.state === "inherent" || r.state === "not evaluated" || !Object.keys(r.implementation).length)
          return (
            <span className="ast-badge" data-tone="idle">
              {r.state === "inherent" ? "Built in" : r.state === "hold" ? "On hold" : "Not running"}
            </span>
          );
        // Count the D4 rule itself, not the extra engine rules mapped beside it.
        let active = 0;
        let critical = false;
        for (const [m, ids] of Object.entries(r.implementation)) {
          for (const rs of frames[m]?.rules ?? []) {
            if (!ids.includes(rs.id) || rs.status !== "ACTIVE" || pyroRule(m, rs.id)?.spec !== r.id) continue;
            active++;
            if (rs.severity === "Critical") critical = true;
          }
        }
        const hold = r.state === "hold" ? "On hold · " : "";
        return active ? (
          <span className="ast-badge" data-tone={critical ? "bad" : "warn"}>
            {hold}
            {active} active
          </span>
        ) : (
          <span className="ast-badge" data-tone={hold ? "idle" : "good"}>
            {hold}Nothing found
          </span>
        );
      },
    },
  ];

  const ctx: Array<{ label: string; tag: string; extra?: string }> = [
    { label: "Kiln feed", tag: "FLO-KFS-01", extra: frames["PYR-FED-01"] ? `target ${frames["PYR-FED-01"]!.drivers.feedSp.toFixed(0)}` : undefined },
    { label: "Kiln coal", tag: "FLO-BRN-01", extra: frames["PYR-BRN-01"] ? `target ${frames["PYR-BRN-01"]!.drivers.fuelSp.toFixed(2)}` : undefined },
    { label: "Coal to feed ratio", tag: "CAL-BRN-01" },
    { label: "Kiln speed", tag: "SPD-KLN-01" },
    { label: "Exhaust fan speed", tag: "SPD-PHC-01" },
    { label: "Burning zone", tag: "TMP-KLN-14" },
    { label: "Preheater exit oxygen", tag: "GAS-PHC-01" },
    { label: "Clinker discharge", tag: "TMP-CLR-08" },
  ];

  const machineNode = (id: string, x: number, y: number) => {
    const m = PYRO_MACHINES.find((p) => p.id === id)!;
    const f = frames[id];
    const flagged = f ? f.pipeline.invalid + f.pipeline.suspect : 0;
    const top = f?.rules.find((r) => r.status === "ACTIVE" && isConditionRule(r));
    return (
      <g
        key={id}
        role="button"
        tabIndex={0}
        aria-label={`${m.code} ${m.name}: health ${f?.overall ?? "—"} %, ${f?.condition ?? "no data"}`}
        style={{ cursor: "pointer" }}
        onClick={() => onOpenMachine(id, f?.condition === "Healthy" ? "overview" : "diagnosis")}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpenMachine(id, "overview");
          }
        }}
      >
        <rect
          x={x}
          y={y}
          width={NODE_W}
          height={NODE_H}
          rx={12}
          fill={MX.padPanel}
          stroke={f && f.condition !== "Healthy" ? tone(f.condition) : MX.fine}
          strokeWidth={f && f.condition !== "Healthy" ? 1.6 : 1}
        />
        <circle cx={x + 16} cy={y + 19} r={4.5} fill={tone(f?.condition)} />
        <title>{`${m.code} · ${m.name}`}</title>
        <text x={x + 28} y={y + 23} fontFamily={MX.font} fontSize={13} fontWeight={600} fill="var(--dx-ink)">
          {m.shortName}
        </text>
        <MachineGlyph id={id} x={x + NODE_W - 46} y={y + 7} />
        <text x={x + NODE_W - 12} y={y + 44} textAnchor="end" fontFamily={MX.font} fontSize={13} fontWeight={500} fill="var(--dx-ink)" style={{ fontFeatureSettings: '"tnum","zero"' }}>
          {f ? `${f.overall} %` : "—"}
        </text>
        <text x={x + 14} y={y + 62} fontFamily={MX.font} fontSize={10.5} fill={top ? tone(top.severity === "Critical" ? "Critical" : "Alert") : MX.label}>
          {top ? ((top.plainTitle ?? top.name).length > 26 ? `${(top.plainTitle ?? top.name).slice(0, 25).trimEnd()}…` : (top.plainTitle ?? top.name)) : "No problem found"}
        </text>
        <text x={x + 14} y={y + 77} fontFamily={MX.font} fontSize={10.5} fill={flagged ? MX.warn : MX.label} style={{ fontFeatureSettings: '"tnum"' }}>
          {flagged ? `${flagged} doubtful reading${flagged === 1 ? "" : "s"}` : "Readings good"}
        </text>
      </g>
    );
  };

  const cx = (id: string) => X[id] + NODE_W / 2;
  const findingCols: Column<(typeof findings)[number]>[] = [
    { key: "clock", header: "Time", width: "84px", render: (r) => <span className="ast-num">{r.clock}</span> },
    { key: "code", header: "Machine", width: "120px", render: (r) => <span title={r.code}>{r.machineName}</span> },
    {
      key: "title",
      header: "Problem",
      render: (r) => (
        <span className="ast-cell-stack">
          <span className="ast-cell-title" title={r.title}>
            {r.defs.ruleById[r.title.split(" ")[0]]?.plainTitle ?? nameIds(r.title, r.defs)}
          </span>
          <span className="ast-cell-sub" title={r.detail}>
            {nameIds(r.detail, r.defs)}
          </span>
        </span>
      ),
    },
    {
      key: "sev",
      header: "Severity",
      width: "96px",
      render: (r) => (
        <span className="ast-badge" data-tone={r.severity === "Critical" ? "bad" : "warn"}>
          {r.severity === "Critical" ? "Critical" : "Alert"}
        </span>
      ),
    },
  ];

  // Sheet index: open the sheet's (first) machine on its Overview at that sheet (detail sheets open their component).
  const openSheet = (id: string) => {
    const machineId = LINE_SHEET_BY_ID[id]?.machines[0];
    if (!machineId) return;
    try {
      sessionStorage.setItem(LINE_SHEET_FOCUS_KEY, id);
      sessionStorage.setItem(OVERVIEW_SECTION_KEY, OV_SECTIONS.machine);
    } catch {
      /* storage unavailable: the machine still opens */
    }
    onOpenMachine(machineId, "overview");
  };

  return (
    <>
      {LINE_SHEET_ART["PYR-0"]?.ready && (
        <section className="ast-card" aria-label="Pyro line diagram">
          <div className="ast-card-head">
            <h2 className="ast-card-title">
              PYR-0 · Feed silo to clinker silo
              <span className="ast-caption">{lineSheetCaption("PYR-0")}</span>
            </h2>
          </div>
          <LineSheet sheetId="PYR-0" onOpenMachine={(id) => onOpenMachine(id, "overview")} onOpenSheet={openSheet} />
        </section>
      )}

      <section className="ast-card" aria-label="Pyro line process route">
        <div className="ast-card-head">
          <h2 className="ast-card-title">
            Process route
            <span className="ast-caption">
              D4 Figure 4.1 · the order material flows through the machines, not a pipe drawing · hot gas flows the opposite way · one flame at the kiln, no burner in the preheater · no hot-air duct to the preheater
            </span>
          </h2>
        </div>
        <div className="mx-canvas" style={{ padding: 8 }}>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="group" aria-label="Pyro line process route" style={{ display: "block", ...kitStyle(kitId) }}>
            <MachineDefs id={kitId} />
            <defs>
              <marker id="pyro-route-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0,0 L8,4 L0,8 z" fill={MX.edge} />
              </marker>
            </defs>
            {/* Hot gas: kiln → riser → C6 … C1 → ID fan (counter-current). */}
            <Arrow d={`M ${cx("PYR-KLN-01")} ${ROW_Y - 4} L ${cx("PYR-KLN-01")} 52 L ${cx("PYR-PHC-01") + 10} 52 L ${cx("PYR-PHC-01") + 10} ${ROW_Y - 4}`} dashed />
            <Arrow d={`M ${cx("PYR-PHC-01") - 10} ${ROW_Y - 4} L ${cx("PYR-PHC-01") - 10} 34 L ${cx("PYR-PHC-01") - 70} 34`} />
            <text x={cx("PYR-PHC-01") + 22} y={46} textAnchor="start" fontFamily={MX.font} fontSize={10.5} letterSpacing="0.08em" fill={MX.label}>
              HOT GAS · KILN → RISER → C6 … C1
            </text>
            <text x={cx("PYR-PHC-01") - 76} y={38} textAnchor="end" fontFamily={MX.font} fontSize={10.5} letterSpacing="0.08em" fill={MX.label}>
              ID FAN → STACK
            </text>
            {/* Secondary air: cooler → kiln hood. */}
            <Arrow d={`M ${cx("PYR-CLR-01") + 20} ${ROW_Y - 4} L ${cx("PYR-CLR-01") + 20} 76 L ${X["PYR-KLN-01"] + NODE_W - 24} 76 L ${X["PYR-KLN-01"] + NODE_W - 24} ${ROW_Y - 4}`} dashed />
            <text x={(cx("PYR-CLR-01") + X["PYR-KLN-01"] + NODE_W) / 2 + 30} y={70} textAnchor="middle" fontFamily={MX.font} fontSize={10.5} letterSpacing="0.08em" fill={MX.label}>
              SECONDARY AIR
            </text>
            {/* Material path. */}
            {ROUTE.slice(0, -1).map((id, i) => (
              <Arrow key={id} d={`M ${X[id] + NODE_W} ${ROW_Y + NODE_H / 2} L ${X[ROUTE[i + 1]] - 2} ${ROW_Y + NODE_H / 2}`} />
            ))}
            {/* Single firing point at the kiln outlet. */}
            <Arrow
              d={`M ${X["PYR-BRN-01"] + 18} ${BRN_Y} L ${X["PYR-BRN-01"] + 18} ${BRN_Y - 18} L ${X["PYR-KLN-01"] + NODE_W - 10} ${BRN_Y - 18} L ${X["PYR-KLN-01"] + NODE_W - 10} ${ROW_Y + NODE_H + 2}`}
            />
            <text x={X["PYR-BRN-01"] - 14} y={BRN_Y + 36} textAnchor="end" fontFamily={MX.font} fontSize={10.5} letterSpacing="0.08em" fill={MX.label}>
              SINGLE FIRING POINT · FUEL + AIR AT KILN OUTLET
            </text>
            <text x={X["PYR-BRN-01"] - 14} y={BRN_Y + 52} textAnchor="end" fontFamily={MX.font} fontSize={10.5} letterSpacing="0.08em" fill={MX.label}>
              NO BURNER IN THE PREHEATER
            </text>
            {ROUTE.map((id) => machineNode(id, X[id], ROW_Y))}
            {machineNode("PYR-BRN-01", X["PYR-BRN-01"], BRN_Y)}
          </svg>
        </div>
        <dl className="pyro-ctx" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(128px, 1fr))", gap: "10px 16px", margin: "14px 0 0" }}>
          {ctx.map((c) => {
            const v = value(c.tag);
            const def = PYRO_SIGNAL_BY_TAG[c.tag];
            return (
              <div key={c.tag}>
                <dt className="ast-caption">{c.label}</dt>
                <dd className="ast-num" style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>
                  {v?.display ?? "—"} <span className="ast-unit">{def?.unit}</span>
                  {c.extra && <span className="ast-caption ast-num"> · {c.extra}</span>}
                </dd>
                {v && v.quality !== "Good" && (
                  <dd className="ast-caption" style={{ margin: 0, color: "var(--status-warning)" }} title={v.qualityNote ?? undefined}>
                    {((QUALITY_LABEL as Record<string, string>)[v.quality] ?? v.quality).toLowerCase()} · {v.qualityNote ? v.qualityNote.split(":")[0] : "not used for problem checks"}
                  </dd>
                )}
              </div>
            );
          })}
        </dl>
      </section>

      <section className="ast-card pg-table-card" aria-label="Latest confirmed problems">
        <div className="ast-card-head">
          <h2 className="ast-card-title">
            Latest confirmed problems
            <span className="ast-caption ast-num">
              {findings.length ? `${findings.length} most recent across the line` : "none confirmed in this time"} · Alert and Critical use
              demo limits; no limit is approved by the plant yet (D4 §7.2)
            </span>
          </h2>
        </div>
        {findings.length > 0 && <Table columns={findingCols} data={findings} keyExtractor={(r) => r.key} onRowClick={(r) => onOpenMachine(r.machine, "diagnosis")} />}
      </section>

      <section className="ast-card pg-table-card" aria-label="Process influence">
        <div className="ast-card-head">
          <h2 className="ast-card-title">
            What moves together
            <span className="ast-caption">
              How closely each setting (rows) moves with readings further down the line (columns) over the last 6 h · +1 = together, −1 = opposite · moving together does not prove one causes the other (D4 Table B.1 1.3.3)
            </span>
          </h2>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="ui-table" style={{ minWidth: 820 }}>
            <thead>
              <tr>
                <th style={{ minWidth: 200 }}>Setting</th>
                {EFFECTS.map((e) => (
                  <th key={e} title={`${e} · ${PYRO_SIGNAL_BY_TAG[e]?.name ?? ""}`}>
                    {displayName(PYRO_SIGNAL_BY_TAG[e]?.name ?? e)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {influence.map((row) => (
                <tr key={row.driver}>
                  <td style={{ minWidth: 200, whiteSpace: "nowrap" }}>
                    <span className="ast-cell-stack">
                      <span className="ast-cell-title" title={row.driver}>
                        {displayName(PYRO_SIGNAL_BY_TAG[row.driver]?.name ?? row.driver)}
                      </span>
                      {DRIVER_NOTE[row.driver] && <span className="ast-cell-sub">{DRIVER_NOTE[row.driver]}</span>}
                    </span>
                  </td>
                  {row.cells.map((r, i) => (
                    <td key={EFFECTS[i]} className="ast-num" style={{ opacity: r === null ? 0.4 : 0.35 + 0.65 * Math.min(1, Math.abs(r)), fontWeight: r !== null && Math.abs(r) >= 0.5 ? 600 : 400 }}>
                      {r === null ? "—" : `${r >= 0 ? "+" : "−"}${Math.abs(r).toFixed(2)}`}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <ConditionReport />

      <section className="ast-card pg-table-card" aria-label="Planned checks">
        <div className="ast-card-head">
          <h2 className="ast-card-title">
            Planned checks
            <span className="ast-caption ast-num">D4-OSW-PE-PYR Rev. 02 Table 8.3 (proposed, not approved) · 19 software and data checks · these only advise; they never replace the plant&apos;s own control and safety systems</span>
          </h2>
        </div>
        <Table columns={ruleCols} data={SPEC_RULES} keyExtractor={(r) => r.id} />
      </section>
    </>
  );
}
