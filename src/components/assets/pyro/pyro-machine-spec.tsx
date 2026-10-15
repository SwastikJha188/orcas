"use client";

/** D4-OSW-PE-PYR Rev. 02 §5.x for one machine: equipment details, why it matters, site verification gate. */

import React from "react";
import { PYRO_MACHINE_BY_ID, PYRO_SIGNALS } from "@/lib/pyro-sim/signals";
import { PYRO_SPEC } from "@/lib/pyro-sim/spec";
import { PYRO_SERVICE_COMPONENTS, SERVICE_DUE_SHARE, serviceUsed } from "@/lib/pyro-sim/service-life";

const SOURCE_NOTE = "No source label asserts an installed device until the plant DCS / E&I inventory is checked.";
/** D4 §5.x closing sentence, verbatim. */
const LIMITS_NOTE =
  "Engineering ranges and alarm values for these entries remain OEM / plant review pending. No automatic warning or alarm set-point is approved by this document (Section 7.2).";

export function PyroMachineSpec({ machineId, t }: { machineId: string; t?: number }) {
  const m = PYRO_MACHINE_BY_ID[machineId];
  if (!m) return null;
  const online = PYRO_SIGNALS.filter((s) => s.machine === machineId && s.origin === "online");
  const req = online.filter((s) => PYRO_SPEC[s.tag]?.priority === "Required").length;
  const rows: Array<[string, React.ReactNode]> = [
    ["Boundary", m.boundary],
    ["Major parts", m.majorParts],
    ["Monitoring intent", m.intent],
    ["Production", m.production],
    ["Safety", m.safety],
    ["Cost", m.cost],
    ["Site verification gate", m.gate],
    ["Source labels", SOURCE_NOTE],
    ["Operating limits", LIMITS_NOTE],
  ];
  if (m.limitations?.length)
    rows.push([
      "Engineering limitation",
      <ol key="lim" style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 4 }}>
        {m.limitations.map((l) => (
          <li key={l}>{l}</li>
        ))}
      </ol>,
    ]);
  const service = PYRO_SERVICE_COMPONENTS.filter((c) => c.machine === machineId);
  if (service.length)
    rows.push([
      "Service records (SW-ALL-01)",
      <span key="svc" style={{ display: "grid", gap: 3 }}>
        {service.map((c) => {
          const used = serviceUsed(c, t ?? 0);
          return (
            <span key={c.id} className="ast-num">
              {c.name} · {(used * 100).toFixed(0)} % of {c.life.toLocaleString("en-GB")} {c.basis === "h" ? "h" : "days"} · installed {c.installed}
              {used >= SERVICE_DUE_SHARE && <span style={{ color: "var(--status-warning)" }}> · service due</span>}
            </span>
          );
        })}
        <span className="ast-caption">Demo records: plant component records are not yet supplied (D4 Table 9.1). Service due is not measured deterioration and never lowers health.</span>
      </span>,
    ]);
  return (
    <section className="ast-card" aria-label={`${m.code} specification`}>
      <div className="ast-card-head">
        <h2 className="ast-card-title">
          {m.code} · D4 §{m.section}
          <span className="ast-caption ast-num">
            D4-OSW-PE-PYR Rev. 02 · proposed, not approved · {req} required + {online.length - req} retained optional = {online.length} online entries · diagrams {m.diagrams.join(", ")} · limits OEM / plant review pending (§7.2)
          </span>
        </h2>
      </div>
      <dl style={{ display: "grid", gridTemplateColumns: "minmax(140px, 180px) minmax(0, 1fr)", gap: "8px 20px", margin: 0, width: "100%" }}>
        {rows.map(([k, v]) => (
          <React.Fragment key={k}>
            <dt className="ast-caption" style={{ fontSize: 12 }}>{k}</dt>
            <dd style={{ margin: 0, fontSize: 13, lineHeight: 1.45, color: "var(--dx-ink-2)" }}>
              {v}
            </dd>
          </React.Fragment>
        ))}
      </dl>
    </section>
  );
}
