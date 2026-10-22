"use client";

import { displayName } from "@/lib/display-name";
import React, { useMemo } from "react";
import { PillButton } from "@/components/ui";
import { conditionTone, toCondition } from "@/components/ui/status";
import type { HierarchyNode } from "../assets-data";
import type { AssetsSubPage } from "../assets-view";
import { IconChevron, SegmentBar, StatusTag } from "../assets-shell-ui";
import { TypeIcon } from "./hierarchy-icons";
import {
  TYPE_LABEL,
  type MachineEntry,
  type MachineLookup,
  averageHealth,
  distribution,
  findPath,
  isFolder,
  landingSubPage,
  machineCondition,
  machineEntries,
  nodeLabel,
  nodeTone,
  rollupLabel,
  rollupTone,
  subtreeFolders,
  subtreeMachines,
  toneRank,
  worstTone,
} from "./hierarchy-model";
import type { Tone } from "../assets-shell-ui";
import { PyroLineOverview } from "../pyro/pyro-line-overview";
import { VpcPlantOverview } from "../pyro/vpc-plant-overview";
import { usePlantEngineOf } from "@/providers/kiln-simulation-context";

/* ==========================================================================
   Assets directory contents for the selected plant / area / process cell.
   ========================================================================== */

export interface HierarchyContentsProps {
  roots: HierarchyNode[];
  lookup: MachineLookup;
  node: HierarchyNode;
  onSelectNode: (node: HierarchyNode) => void;
  onOpenMachine: (machineId: string, subPage: AssetsSubPage) => void;
  viewSwitcher?: React.ReactNode;
}

export function HierarchyContents({ roots, lookup, node, onSelectNode, onOpenMachine, viewSwitcher }: HierarchyContentsProps) {
  const path = useMemo(() => findPath(roots, node.id), [roots, node.id]);
  const entries = useMemo(() => machineEntries(node, path, lookup), [node, path, lookup]);
  const folders = useMemo(() => subtreeFolders(node), [node]);
  const childFolders = useMemo(() => (node.children ?? []).filter(isFolder), [node]);
  // Plant-specific overviews follow the plant's simulation engine (from the database), only on the plant node.
  const plantEngine = usePlantEngineOf(node.type === "plant" ? node.id : null);
  const nodeEngine = node.type === "plant" ? plantEngine : null;

  const areas = folders.filter((f) => f.type === "area").length;
  const cells = folders.filter((f) => f.type === "group").length;
  const tone = entries.reduce<Tone>((t, e) => worstTone(t, e.tone), "good");
  const critical = entries.filter((e) => e.tone === "bad").length;
  const advisory = entries.filter((e) => e.tone === "warn").length;
  const live = entries.filter((e) => e.isLive).length;
  const worst = [...entries].sort((a, b) => toneRank(a.tone) - toneRank(b.tone) || (a.health ?? Infinity) - (b.health ?? Infinity))[0];
  const needsAttention = critical + advisory;

  const context = [
    node.type === "plant" ? null : nodeLabel(path[0] ?? node),
    areas ? `${areas} ${areas === 1 ? "area" : "areas"}` : null,
    cells ? `${cells} ${cells === 1 ? "line section" : "line sections"}` : null,
    `${entries.length} ${entries.length === 1 ? "machine" : "machines"}`,
    live ? `${live} sending live readings` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const areaGrid =
    node.type === "plant" && childFolders.length > 0 ? (
      <div className="hx-grid" role="group" aria-label="Areas">
        {childFolders.map((f) => (
          <FolderCard key={f.id} node={f} lookup={lookup} onOpen={() => onSelectNode(f)} />
        ))}
      </div>
    ) : null;

  return (
    <div className="assets-directory-workspace ast-root hx-contents" aria-label={`${node.name} assets`}>
      <header className="ast-head hx-head">
        <div className="ast-head-main">
          <nav aria-label="Location">
            <ol className="ast-crumbs">
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
          </nav>
          <div className="ast-title-row">
            <h1 className="ast-title">{node.name}</h1>
            {nodeEngine !== "vpc" && (
              <>
                <span className="hx-type-badge">
                  <TypeIcon type={node.type} size={12} />
                  {TYPE_LABEL[node.type]}
                </span>
                {entries.length > 0 && <StatusTag tone={tone} label={rollupLabel(tone)} />}
              </>
            )}
          </div>
          {nodeEngine !== "vpc" && <span className="ast-caption">{context}</span>}
        </div>
        {((worst && needsAttention > 0) || viewSwitcher) && (
          <div className="pg-actions">
            {worst && needsAttention > 0 && (
              <PillButton
                variant="secondary"
                onClick={() => onOpenMachine(worst.machineId, landingSubPage(worst.tone))}
                title={`See what is wrong with ${displayName(worst.node.name)} (${worst.machineId})`}
              >
                See problems on {displayName(worst.node.name)}
              </PillButton>
            )}
            {viewSwitcher}
          </div>
        )}
      </header>

      {/* The pyro line places its areas after its latest problems; other plants show them here. */}
      {nodeEngine === "pyro" ? <PyroLineOverview plantId={node.id} onOpenMachine={onOpenMachine} areas={areaGrid} /> : areaGrid}

      {nodeEngine === "vpc" && (
        <VpcPlantOverview node={node} lookup={lookup} onSelectNode={onSelectNode} onOpenMachine={onOpenMachine} />
      )}

      {node.type !== "plant" && entries.length > 0 && (
        <div className="hx-grid" role="group" aria-label="Machines">
          {entries.map((entry) => (
            <MachineCard
              key={entry.node.id}
              entry={entry}
              onOpen={() => onOpenMachine(entry.machineId, "overview")}
            />
          ))}
        </div>
      )}

      {entries.length === 0 && folders.length === 0 && (
        <div className="ast-card ast-empty">
          <strong className="hx-empty-title">No equipment here</strong>
          No machines or areas are set up under {node.name} yet.
        </div>
      )}
    </div>
  );
}

function FolderCard({ node, lookup, onOpen }: { node: HierarchyNode; lookup: MachineLookup; onOpen: () => void }) {
  const machines = subtreeMachines(node);
  const folders = subtreeFolders(node);
  const dist = distribution(machines, lookup);
  const tone = rollupTone(node, lookup);
  const health = averageHealth(machines, lookup);
  return (
    <button type="button" className="ast-card ast-tile hx-card" onClick={onOpen}>
      <div className="ast-tile-top">
        <span className="ast-icon-tile" data-tone={tone}>
          <TypeIcon type={node.type} size={14} />
        </span>
        <StatusTag tone={tone} label={rollupLabel(tone)} />
      </div>
      <div className="hx-card-body">
        <span className="ast-tile-name">{node.name}</span>
        <span className="hx-card-meta">
          {folders.length > 0 && `${folders.length} ${folders.length === 1 ? "group" : "groups"} · `}
          {machines.length} {machines.length === 1 ? "machine" : "machines"}
          {health !== null && ` · health ${health}/100`}
        </span>
      </div>
      {/* Each machine's health, so the directory shows it without opening the area. */}
      {machines.length > 0 && (
        <ul className="hx-units" aria-label={`Machines in ${node.name}`}>
          {machines.map((m) => {
            const h = machineCondition(m, lookup).health;
            return (
              <li key={m.id}>
                <span className="ast-chip-dot" data-tone={nodeTone(m, lookup)} aria-hidden="true" />
                <span className="hx-unit-name">{displayName(m.name)}</span>
                <span className="hx-unit-health">{h !== null ? `${Math.round(h)}/100` : "—"}</span>
              </li>
            );
          })}
        </ul>
      )}
      {machines.length > 0 && (
        <SegmentBar
          label={`${dist.healthy} normal, ${dist.atRisk} alert, ${dist.critical} critical, ${dist.offline} on standby`}
          segments={[
            { id: "ok", value: dist.healthy, tone: "good" },
            { id: "warn", value: dist.atRisk, tone: "warn" },
            { id: "bad", value: dist.critical, tone: "bad" },
            { id: "idle", value: dist.offline, tone: "idle" },
          ]}
        />
      )}
      <div className="ast-tile-foot">
        <span className="hx-open">
          Open <IconChevron size={10} />
        </span>
      </div>
    </button>
  );
}

function MachineCard({ entry, onOpen }: { entry: MachineEntry; onOpen: () => void }) {
  const { node, machineId, machine, health, location } = entry;
  const condition = toCondition(entry.status);
  const tone = conditionTone(condition);
  return (
    <button type="button" className="ast-card ast-tile hx-card" onClick={onOpen}>
      <div className="ast-tile-top">
        <span className="ast-icon-tile" data-tone={tone}>
          <TypeIcon type={node.type} size={14} />
        </span>
        <StatusTag tone={tone} label={condition} />
      </div>
      <div className="hx-card-body">
        <span className="ast-tile-name">{node.name}</span>
        <span className="hx-card-meta">
          {machineId}
          {machine?.type ? ` · ${machine.type}` : ""}
          {location.length > 0 ? ` · ${location[location.length - 1]}` : ""}
        </span>
      </div>
      <dl className="hx-facts hx-facts--2">
        <div>
          <dt>Health</dt>
          <dd className="ast-num">{health === null ? "—" : `${health}/100`}</dd>
        </div>
        <div>
          <dt>Sensors</dt>
          <dd className="ast-num">{machine ? machine.signalsCount : "—"}</dd>
        </div>
      </dl>
    </button>
  );
}
