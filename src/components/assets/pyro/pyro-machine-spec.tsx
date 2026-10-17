"use client";

import React from "react";
import { Table, type Column } from "@/components/ui";
import { PYRO_MACHINE_BY_ID, PYRO_SIGNALS } from "@/lib/pyro-sim/signals";
import { PYRO_SPEC } from "@/lib/pyro-sim/spec";
import { VPC_MACHINE_BY_ID, VPC_SIGNALS, VPC_SPEC } from "@/lib/vpc-sim/signals";

export function PyroMachineSpec({ machineId }: { machineId: string; t?: number }) {
  const m = PYRO_MACHINE_BY_ID[machineId] ?? VPC_MACHINE_BY_ID[machineId];
  if (!m) return null;
  const isVpc = Boolean(VPC_MACHINE_BY_ID[machineId]);
  const allSigs = isVpc ? VPC_SIGNALS : PYRO_SIGNALS;
  const specMap = isVpc ? VPC_SPEC : PYRO_SPEC;
  const online = allSigs.filter((s) => s.machine === machineId && s.origin === "online");
  const req = online.filter((s) => specMap[s.tag]?.priority === "Required").length;

  const rows: Array<{ key: string; value: string }> = [
    { key: "Boundary", value: m.boundary },
    { key: "Major parts", value: m.majorParts },
    { key: "Monitoring intent", value: m.intent },
    { key: "Production impact", value: m.production },
    { key: "Safety impact", value: m.safety },
    { key: "Cost impact", value: m.cost },
  ];

  const cols: Column<{ key: string; value: string }>[] = [
    { key: "k", header: "Parameter", width: "180px", render: (r) => <strong>{r.key}</strong> },
    { key: "v", header: "Specification", render: (r) => r.value },
  ];

  return (
    <section className="ast-card pg-table-card" aria-label={`${m.code} specification`}>
      <div className="ast-card-head">
        <h2 className="ast-card-title">
          {m.code} · {m.name}
          <span className="ast-caption ast-num">
            {req} required + {online.length - req} optional = {online.length} online sensors · sheets {m.diagrams.join(", ")}
          </span>
        </h2>
      </div>
      <Table columns={cols} data={rows} keyExtractor={(r) => r.key} />
    </section>
  );
}
