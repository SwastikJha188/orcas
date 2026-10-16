"use client";

import React, { useMemo } from "react";
import { PillNav, Tile, TileGrid } from "@/components/ui";
import type { FailureRisk, Severity } from "@/server/services/insights-service";
import { toCondition } from "@/components/ui/status";
import { formatRiskWindow, isBaselineRisk } from "./prognosis-derive";
import { Note, type ProgSectionProps } from "./prog-ui";

const P_BANDS = [
  { label: "< 5", lo: 0, hi: 5 },
  { label: "5–20", lo: 5, hi: 20 },
  { label: "20–50", lo: 20, hi: 50 },
  { label: "50–80", lo: 50, hi: 80 },
  { label: "≥ 80", lo: 80, hi: 101 },
];
/** Consequence = the rule severity class, in the one condition vocabulary. */
const CONSEQUENCE: { sev: Severity; label: string; rank: number }[] = [
  { sev: "Critical", label: toCondition("Critical"), rank: 2 },
  { sev: "Advisory", label: toCondition("Advisory"), rank: 1 },
  { sev: "Normal", label: toCondition("Normal"), rank: 0 },
];

const shortId = (r: FailureRisk) => (isBaselineRisk(r) ? r.component.split(/[ ,&]/)[0] : r.id);

/** Probability (stated window) × consequence matrix and one card per failure mode (render in a bare section); a card selects the mode for the sections below. */
export function ProgRisk({ data, mode, setMode }: ProgSectionProps) {
  const all = useMemo(
    () =>
      [...data.risks].sort(
        (a, b) =>
          Number(isBaselineRisk(a)) - Number(isBaselineRisk(b)) ||
          (a.severity === "Critical" ? 0 : a.severity === "Advisory" ? 1 : 2) -
            (b.severity === "Critical" ? 0 : b.severity === "Advisory" ? 1 : 2),
      ),
    [data.risks],
  );
  const listed = all.filter((r) => !isBaselineRisk(r) || r.probability >= 10);
  const hidden = all.length - listed.length;

  return (
    <>
      <section className="ast-card pg-prog-card" aria-label="Risk matrix">
        {listed.length > 1 && (
          <div className="pg-prog-toolbar">
            <PillNav items={listed.map((r) => ({ id: r.id, label: shortId(r) }))} activeId={mode?.id ?? listed[0]?.id ?? ""} onChange={setMode} arrows />
          </div>
        )}
        <div className="pg-prog-matrix" role="table" aria-label="Failure modes by probability and consequence">
          {CONSEQUENCE.map((c) => (
            <div key={c.sev} role="row" className="pg-prog-matrix-row">
              <span role="rowheader" className="pg-prog-matrix-h">
                {c.label}
              </span>
              {P_BANDS.map((b, bi) => {
                const inCell = all.filter((r) => r.severity === c.sev && r.probability >= b.lo && r.probability < b.hi);
                const score = bi + c.rank * 1.5;
                const hot = score >= 4.5;
                return (
                  <span key={b.label} role="cell" className="pg-prog-matrix-cell" style={{ "--lvl": Math.min(1, score / 7) } as React.CSSProperties}>
                    {inCell.slice(0, 3).map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        className={`pg-prog-mdot ${mode?.id === r.id ? "is-active" : ""}`}
                        data-tone={hot && !isBaselineRisk(r) ? (c.sev === "Critical" ? "bad" : "warn") : undefined}
                        onClick={() => setMode(r.id)}
                        title={`${r.fault} · ${r.probability} % ${formatRiskWindow(r.window)}`}
                      >
                        <i aria-hidden="true" />
                        {shortId(r)}
                      </button>
                    ))}
                    {inCell.length > 3 && <span className="pg-prog-mmore">+{inCell.length - 3}</span>}
                  </span>
                );
              })}
            </div>
          ))}
          <div role="row" className="pg-prog-matrix-row is-foot">
            <span />
            {P_BANDS.map((b) => (
              <span key={b.label} role="columnheader" className="pg-prog-matrix-h">
                {b.label} %
              </span>
            ))}
          </div>
        </div>
      </section>
      {listed.length > 0 && (
        <TileGrid label="Failure modes" min={300}>
          {listed.map((r) => {
            const base = isBaselineRisk(r);
            const hot = !base && r.probability >= 50 ? (r.severity === "Critical" ? "bad" : "warn") : undefined;
            return (
              <Tile
                key={r.id}
                className="pg-prog-ftile"
                title={r.fault}
                sub={r.component}
                status={{ label: toCondition(r.severity), tone: base ? undefined : r.severity === "Critical" ? "bad" : r.severity === "Advisory" ? "warn" : undefined }}
                value={r.probability.toFixed(0)}
                unit="% probability"
                tone={hot}
                meter={r.probability}
                facts={[
                  { label: "Horizon", value: formatRiskWindow(r.window) },
                  { label: "Source", value: base ? "Health index" : r.id },
                ]}
                selected={mode?.id === r.id}
                onSelect={() => setMode(r.id)}
              />
            );
          })}
        </TileGrid>
      )}
      {hidden > 0 && <Note>{hidden} sub-assemblies below 10 % not listed.</Note>}
    </>
  );
}
