"use client";

import React from "react";
import { StatusTag, Table, type Column } from "@/components/ui";
import { validityTone } from "@/components/ui/status";
import type { SimFrame } from "@shared/lib/kiln-sim/engine";
import { VALIDITY_LABEL, type DxSensor } from "../diagnosis-model";
import { limitText } from "../diagnosis-sensor-table";
import { toneFor } from "../prognosis/prog-ui";

/* ==========================================================================
   Analysis · Readings against what is expected — shown when there is no
   problem to explain (a healthy machine or part): every sensor's reading
   now, the value the reference model expects (live machines), how far it is
   from it, its alarm limit and its state. The evidence that nothing is wrong.
   ========================================================================== */

const fmt = (v: number) => {
  const a = Math.abs(v);
  return v.toFixed(a >= 1000 ? 0 : a >= 100 ? 1 : 2);
};
const unitOf = (s: DxSensor) => (s.unit && s.unit !== "state" ? s.unit : "");

/** How far from expected, in plain words: within normal scatter, a little off, clearly off. */
function offText(z: number | null): { text: string; tone?: "warn" | "bad" } | null {
  if (z === null || !Number.isFinite(z)) return null;
  const a = Math.abs(z);
  if (a < 2) return { text: "As expected" };
  if (a < 3) return { text: `A little ${z > 0 ? "high" : "low"}`, tone: "warn" };
  return { text: `Clearly ${z > 0 ? "high" : "low"}`, tone: "bad" };
}

export function ReadingsAgainstExpected({ sensors, frame, onOpenTrend }: { sensors: DxSensor[]; frame: SimFrame | null; onOpenTrend: (tag: string) => void }) {
  const hasModel = sensors.some((s) => s.model !== null);
  const cols: Column<DxSensor>[] = [
    {
      key: "sensor",
      header: "Sensor",
      render: (s) => (
        <span className="ast-cell-stack">
          <button type="button" className="ast-cell-title pg-dx-tag" onClick={() => onOpenTrend(s.tag)} title={`Open the trend chart of this sensor (tag ${s.tag})`}>
            {s.name} <span aria-hidden="true">↗</span>
          </button>
          {s.subAssembly && <span className="ast-cell-sub">{s.subAssembly}</span>}
        </span>
      ),
    },
    {
      key: "now",
      header: "Now",
      width: "130px",
      render: (s) => (
        <span className="ast-num">
          {s.value !== null ? fmt(s.value) : s.display || "—"}
          {s.value !== null && unitOf(s) && <span className="ast-unit"> {unitOf(s)}</span>}
        </span>
      ),
    },
    ...(hasModel
      ? [
          {
            key: "expected",
            header: "Expected now",
            width: "140px",
            render: (s: DxSensor) =>
              s.model !== null ? (
                <span className="ast-num ast-muted">
                  {fmt(s.model)}
                  {unitOf(s) && <span className="ast-unit"> {unitOf(s)}</span>}
                </span>
              ) : (
                <span className="ast-muted">—</span>
              ),
          },
          {
            key: "off",
            header: "Against expected",
            width: "150px",
            render: (s: DxSensor) => {
              const o = offText(s.z);
              return o ? (
                <span className="pg-tone-value" data-tone={o.tone}>
                  {o.text}
                </span>
              ) : (
                <span className="ast-muted">—</span>
              );
            },
          },
        ]
      : []),
    {
      key: "limit",
      header: "Alarm limit",
      width: "150px",
      render: (s) => {
        const l = limitText(s, frame);
        return l ? (
          <span className="ast-cell-stack ast-num">
            <span>{l.alarm}</span>
            {l.warn && <span className="ast-cell-sub">Alert {l.warn}</span>}
          </span>
        ) : (
          <span className="ast-muted">—</span>
        );
      },
    },
    {
      key: "state",
      header: "State",
      width: "130px",
      render: (s) =>
        s.validity !== "valid" && s.validity !== "unvalidated" ? (
          <StatusTag tone={validityTone(VALIDITY_LABEL[s.validity])} label={VALIDITY_LABEL[s.validity]} />
        ) : (
          <StatusTag tone={toneFor(s.severity)} label={s.severity} />
        ),
    },
  ];
  return <Table className="pg-dx-table" columns={cols} data={sensors} keyExtractor={(s) => s.tag} />;
}
