"use client";

import React from "react";
import type { Tone } from "./assets-shell-ui";
import { ISO_ZONE_TEXT, VALIDITY_LABEL, isoBounds, isoZone, type DxSensor, type IsoBounds } from "./diagnosis-model";

/* ==========================================================================
   Vibration severity: each vibration velocity point on the ISO 10816-3 /
   ISO 20816-3 zones. B/C and C/D are the point's alert and alarm limits
   (D5 Table 9.3); A/B = 2.3 mm/s only where the default 4.5 / 7.1 apply.
   ========================================================================== */

/** Thin zone bar: muted zone segments, boundary ticks, value marker, hollow model mark. */
function ZoneBar({ value, model, b, label }: { value: number | null; model: number | null; b: IsoBounds; label: string }) {
  const W = 200;
  const max = Math.max(b.cd * 1.3, (value ?? 0) * 1.08, 1);
  const x = (v: number) => (Math.max(0, Math.min(max, v)) / max) * W;
  const segs = [
    { from: 0, to: b.bc, tone: "good" },
    { from: b.bc, to: b.cd, tone: "warn" },
    { from: b.cd, to: max, tone: "bad" },
  ];
  const ticks = [b.ab, b.bc, b.cd].filter((t): t is number => t !== null);
  return (
    <svg className="pg-diag-zonebar" viewBox={`0 0 ${W} 22`} role="img" aria-label={label}>
      {segs.map((s, i) => (
        <rect key={i} x={x(s.from) + (i ? 1 : 0)} y="6" width={Math.max(0, x(s.to) - x(s.from) - (i ? 1 : 0))} height="3" className={`pg-diag-zseg is-${s.tone}`} />
      ))}
      {ticks.map((t) => (
        <text key={t} x={x(t)} y="21" textAnchor="middle" className="pg-diag-ztick">
          {t}
        </text>
      ))}
      {model !== null && <circle cx={x(model)} cy="7.5" r="3" className="pg-diag-zmodel" />}
      {value !== null && <rect x={x(value) - 1} y="1" width="2" height="13" className="pg-diag-zmark" />}
    </svg>
  );
}

export function VibrationSeverity({ sensors, onOpenTrend }: { sensors: DxSensor[]; onOpenTrend: (tag: string) => void }) {
  return (
    <div className="dxo-card dxo-table-card pg-diag-sub" aria-label="Vibration severity">
      <h4 className="pg-diag-subhead">Vibration severity · ISO 10816-3 / 20816-3</h4>
      <div className="dxo-table-wrap">
        <table className="dxo-table pg-diag-table">
          <thead>
            <tr>
              <th scope="col">Point</th>
              <th scope="col" className="is-right">
                Velocity
              </th>
              <th scope="col" className="is-right">
                Model
              </th>
              <th scope="col" className="is-right">
                Residual
              </th>
              <th scope="col">Zone</th>
              <th scope="col">Zone limits, mm/s</th>
              <th scope="col" className="is-right">
                <span className="dxo-sr">Trend</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {sensors.map((s) => {
              const b = isoBounds(s);
              const trusted = s.value !== null && s.validity !== "invalid" && s.validity !== "stale";
              const zone = trusted ? isoZone(s.value as number, b) : null;
              const zoneName = zone === "B" && b.ab === null ? "A/B" : zone;
              const tone: Tone = zone === "D" ? "bad" : zone === "C" ? "warn" : "idle";
              return (
                <tr key={s.tag} className="dxo-row">
                  <td>
                    <span className="ast-cell-stack">
                      <span className="pg-diag-name">{s.tag}</span>
                      <span className="dxo-secondary-text">
                        {s.name} · {s.subAssembly}
                      </span>
                    </span>
                  </td>
                  <td className="is-right ast-num">
                    <span className="pg-diag-val" data-tone={tone}>
                      {s.value !== null ? s.value.toFixed(2) : s.display}
                    </span>{" "}
                    <span className="pg-diag-unit">mm/s</span>
                  </td>
                  <td className="is-right ast-num pg-diag-muted">{s.model !== null ? s.model.toFixed(2) : "—"}</td>
                  <td className="is-right ast-num">{s.z !== null ? `${s.z >= 0 ? "+" : "−"}${Math.abs(s.z).toFixed(1)} σ` : "—"}</td>
                  <td>
                    <span className="ast-cell-stack">
                      <span className="pg-diag-state" data-tone={tone}>
                        <span className="ast-chip-dot" aria-hidden="true" />
                        {zoneName ? `Zone ${zoneName}` : "Not rated"}
                      </span>
                      <span className="dxo-secondary-text">{zone ? ISO_ZONE_TEXT[zone] : `${VALIDITY_LABEL[s.validity]} reading`}</span>
                    </span>
                  </td>
                  <td>
                    <ZoneBar
                      value={trusted ? s.value : null}
                      model={s.model}
                      b={b}
                      label={`${s.tag}: zone boundaries ${b.ab !== null ? `A/B ${b.ab}, ` : ""}B/C ${b.bc}, C/D ${b.cd} mm/s`}
                    />
                  </td>
                  <td className="is-right">
                    <button type="button" className="pg-diag-inline-link" onClick={() => onOpenTrend(s.tag)}>
                      Trend
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
