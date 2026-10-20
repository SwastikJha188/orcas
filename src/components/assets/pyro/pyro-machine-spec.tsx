"use client";

import React from "react";
import { Table, type Column } from "@/components/ui";
import { PYRO_MACHINE_BY_ID, PYRO_SIGNALS } from "@/lib/pyro-sim/signals";
import { PYRO_SPEC } from "@/lib/pyro-sim/spec";
import { VPC_MACHINE_BY_ID, VPC_SIGNALS, VPC_SPEC } from "@/lib/vpc-sim/signals";
import { plainWords } from "@/lib/plain-words";

export function PyroMachineSpec({ machineId }: { machineId: string; t?: number }) {
  const m = PYRO_MACHINE_BY_ID[machineId] ?? VPC_MACHINE_BY_ID[machineId];
  if (!m) return null;
  const isVpc = Boolean(VPC_MACHINE_BY_ID[machineId]);
  const allSigs = isVpc ? VPC_SIGNALS : PYRO_SIGNALS;
  const specMap = isVpc ? VPC_SPEC : PYRO_SPEC;
  const online = allSigs.filter((s) => s.machine === machineId && s.origin === "online");
  const req = online.filter((s) => specMap[s.tag]?.priority === "Required").length;

  const rows: Array<{ key: string; value: string }> = [
    { key: "What it includes", value: m.boundary },
    { key: "Main parts", value: m.majorParts },
    { key: "What we watch for", value: m.intent },
    { key: "If it fails: production", value: m.production },
    { key: "If it fails: safety", value: m.safety },
    { key: "If it fails: cost", value: m.cost },
  ];

  const cols: Column<{ key: string; value: string }>[] = [
    { key: "k", header: "Topic", width: "180px", render: (r) => <strong>{r.key}</strong> },
    { key: "v", header: "Details", render: (r) => plainWords(r.value) },
  ];

  return (
    <section className="ast-card pg-table-card" aria-label={`${m.code} specification`}>
      <div className="ast-card-head">
        <h2 className="ast-card-title" title={m.code}>
          {m.name}
          <span className="ast-caption ast-num">
            {online.length} live sensors: {req} must have, {online.length - req} nice to have · drawings {m.diagrams.join(", ")}
          </span>
        </h2>
      </div>
      <Table columns={cols} data={rows} keyExtractor={(r) => r.key} />
    </section>
  );
}
