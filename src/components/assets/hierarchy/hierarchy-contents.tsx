"use client";

import React, { useMemo } from "react";
import { KpiCard, KpiCards, PillButton } from "@/components/ui";
import type { HierarchyNode } from "../assets-data";
import type { AssetsSubPage } from "../assets-view";
import { SegmentBar, StatusTag } from "../assets-shell-ui";
import { TypeIcon } from "./hierarchy-icons";
import { MachineRegister } from "./hierarchy-register";
import {
  TYPE_LABEL,
  type MachineLookup,
  findPath,
  landingSubPage,
  machineEntries,
  nodeLabel,
  rollupLabel,
  subtreeFolders,
  toneRank,
  worstTone,
} from "./hierarchy-model";
import type { Tone } from "../assets-shell-ui";
import { toCondition } from "@/components/ui/status";
import { PyroLineOverview } from "../pyro/pyro-line-overview";
import { VpcPlantOverview } from "../pyro/vpc-plant-overview";
import { PYRO_PLANT_ID, VPC_PLANT_ID } from "@/providers/kiln-simulation-context";

/* ==========================================================================
   Assets directory contents for the selected plant / area / process cell.
   Skeleton: header → KPI strip → machine register.
   ========================================================================== */

export interface HierarchyContentsProps {
  roots: HierarchyNode[];
  lookup: MachineLookup;
  node: HierarchyNode;
  onSelectNode: (node: HierarchyNode) => void;
  onOpenMachine: (machineId: string, subPage: AssetsSubPage) => void;
}

export function HierarchyContents({ roots, lookup, node, onSelectNode, onOpenMachine }: HierarchyContentsProps) {
  const path = useMemo(() => findPath(roots, node.id), [roots, node.id]);
  const entries = useMemo(() => machineEntries(node, path, lookup), [node, path, lookup]);
  const folders = useMemo(() => subtreeFolders(node), [node]);

  const areas = folders.filter((f) => f.type === "area").length;
  const cells = folders.filter((f) => f.type === "group").length;
  const tone = entries.reduce<Tone>((t, e) => worstTone(t, e.tone), "good");
  const critical = entries.filter((e) => e.tone === "bad").length;
  const advisory = entries.filter((e) => e.tone === "warn").length;
  const standby = entries.filter((e) => e.tone === "idle").length;
  const normal = entries.length - critical - advisory - standby;
  const sensors = entries.reduce((n, e) => n + (e.machine?.signalsCount ?? 0), 0);
  const withSensors = entries.filter((e) => (e.machine?.signalsCount ?? 0) > 0).length;
  const live = entries.filter((e) => e.isLive).length;
  const worst = [...entries].sort((a, b) => toneRank(a.tone) - toneRank(b.tone) || a.health - b.health)[0];
  const needsAttention = critical + advisory;

  const context = [
    node.type === "plant" ? null : nodeLabel(path[0] ?? node),
    areas ? `${areas} ${areas === 1 ? "area" : "areas"}` : null,
    cells ? `${cells} ${cells === 1 ? "process cell" : "process cells"}` : null,
    `${entries.length} ${entries.length === 1 ? "machine" : "machines"}`,
    live ? `${live} on live telemetry` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="assets-directory-workspace ast-root hx-contents" aria-label={`${node.name} assets`}>
      <header className="ast-head hx-head">
        <div className="ast-head-main">
          <ol className="ast-crumbs" aria-label="Location">
            <li>Assets</li>
            {path.map((p, i) => (
              <li key={p.id}>
                {i < path.length - 1 ? (
                  <button type="button" className="hx-crumb" onClick={() => onSelectNode(p)}>
                    {nodeLabel(p)}
                  </button>
                ) : (
                  <span aria-current="page">{nodeLabel(p)}</span>
                )}
              </li>
            ))}
          </ol>
          <div className="ast-title-row">
            <h1 className="ast-title">{node.name}</h1>
            {node.id !== VPC_PLANT_ID && (
              <>
                <span className="hx-type-badge">
                  <TypeIcon type={node.type} size={12} />
                  {TYPE_LABEL[node.type]}
                </span>
                {entries.length > 0 && <StatusTag tone={tone} label={rollupLabel(tone)} />}
              </>
            )}
          </div>
          {node.id !== VPC_PLANT_ID && <span className="ast-caption ast-num">{context}</span>}
        </div>
        {worst && needsAttention > 0 && (
          <div className="pg-actions">
            <PillButton variant="secondary" onClick={() => onOpenMachine(worst.machineId, landingSubPage(worst.tone))}>
              Diagnose {worst.machineId}
            </PillButton>
          </div>
        )}
      </header>

      {entries.length > 0 && node.id !== VPC_PLANT_ID && (
        <KpiCards label="Level summary">
          <KpiCard
            label="Machines"
            value={entries.length}
            unit={` ${entries.length === 1 ? "machine" : "machines"}`}
            footClassName="ast-kpi-foot"
            foot={
              <>
                <SegmentBar
                  label={`${normal} normal, ${advisory} advisory, ${critical} critical, ${standby} standby`}
                  segments={[
                    { id: "ok", value: normal, tone: "good" },
                    { id: "warn", value: advisory, tone: "warn" },
                    { id: "bad", value: critical, tone: "bad" },
                    { id: "idle", value: standby, tone: "idle" },
                  ]}
                />
                <span className="ast-caption ast-num">
                  {normal} normal · {advisory} advisory · {critical} critical · {standby} standby
                </span>
              </>
            }
          />
          <KpiCard
            label="Needs attention"
            value={needsAttention}
            unit={` ${needsAttention === 1 ? "machine" : "machines"}`}
            tone={critical ? "bad" : advisory ? "warn" : undefined}
            footClassName="ast-kpi-foot"
            foot={<span className="ast-caption">{needsAttention && worst ? `Worst: ${worst.node.name} · ${toCondition(worst.status)}` : "No advisory or critical machine"}</span>}
          />
          <KpiCard
            label="Sensors mapped"
            value={sensors}
            unit={` ${sensors === 1 ? "sensor" : "sensors"}`}
            footClassName="ast-kpi-foot"
            foot={<span className="ast-caption ast-num">Database total across {withSensors} of {entries.length} machines, incl. calculated</span>}
          />
        </KpiCards>
      )}

      {node.id === PYRO_PLANT_ID && <PyroLineOverview onOpenMachine={onOpenMachine} />}
      {node.id === VPC_PLANT_ID && <VpcPlantOverview onOpenMachine={onOpenMachine} />}

      {entries.length === 0 && folders.length === 0 ? (
        <div className="ast-card ast-empty">
          <strong className="hx-empty-title">No assets at this level</strong>
          Nothing is registered under {node.name} in the plant hierarchy.
        </div>
      ) : node.id !== VPC_PLANT_ID ? (
        <MachineRegister key={node.id} entries={entries} onOpenMachine={onOpenMachine} />
      ) : null}
    </div>
  );
}
