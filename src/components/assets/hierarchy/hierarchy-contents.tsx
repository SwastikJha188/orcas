"use client";

import React, { useMemo, useState } from "react";
import { PillButton, PillNav } from "@/components/ui";
import type { HierarchyNode } from "../assets-data";
import {
  HealthRing,
  IconChevron,
  SearchPill,
  SegmentBar,
  StatusTag,
  machineTone,
} from "../assets-shell-ui";
import { TypeIcon } from "./hierarchy-icons";
import { PlantTimeZone } from "./plant-time-zone";
import {
  TYPE_LABEL,
  type MachineLookup,
  averageHealth,
  distribution,
  findPath,
  isFolder,
  machineCondition,
  matchesQuery,
  nodeLabel,
  rollupTone,
  subtreeFolders,
  subtreeMachines,
} from "./hierarchy-model";

/* ==========================================================================
   Hierarchy contents (ULTRON HierarchyContents): breadcrumb · title · type
   badge · search · All / Areas / Machines · area cards · machine cards.
   ========================================================================== */

type Filter = "all" | "areas" | "machines";

export interface HierarchyContentsProps {
  roots: HierarchyNode[];
  lookup: MachineLookup;
  node: HierarchyNode;
  onSelectNode: (node: HierarchyNode) => void;
  onOpenMachine: (machineId: string) => void;
}

export function HierarchyContents({ roots, lookup, node, onSelectNode, onOpenMachine }: HierarchyContentsProps) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const q = query.trim().toLowerCase();

  const path = useMemo(() => findPath(roots, node.id), [roots, node.id]);
  const allMachines = useMemo(() => subtreeMachines(node), [node]);
  const allFolders = useMemo(() => subtreeFolders(node), [node]);

  // A query searches the whole subtree; without one, "All" and "Areas" show
  // this level, while "Machines" lists every machine below it.
  const folders = useMemo(() => {
    const base = q ? allFolders : (node.children ?? []).filter(isFolder);
    return base.filter((f) => matchesQuery(f, q, lookup));
  }, [q, allFolders, node, lookup]);

  const machines = useMemo(() => {
    const base = q || filter === "machines" ? allMachines : (node.children ?? []).filter((c) => c.type === "machine");
    return base.filter((m) => matchesQuery(m, q, lookup));
  }, [q, filter, allMachines, node, lookup]);

  const showFolders = filter !== "machines" && folders.length > 0;
  const showMachines = filter !== "areas" && machines.length > 0;
  const dist = distribution(allMachines, lookup);
  const health = averageHealth(allMachines, lookup);
  const tone = rollupTone(node, lookup);
  const isEmpty = allMachines.length === 0 && allFolders.length === 0;

  return (
    <div className="assets-directory-workspace ast-root hx-contents" aria-label={`${node.name} contents`}>
      <header className="ast-head hx-head">
        <div className="ast-head-main">
          <ol className="ast-crumbs" aria-label="Location">
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
            <span className="hx-type-badge">
              <TypeIcon type={node.type} size={12} />
              {node.type === "plant" ? "Plant root" : TYPE_LABEL[node.type]}
            </span>
            {allMachines.length > 0 && (
              <StatusTag
                tone={tone}
                label={tone === "bad" ? "Critical" : tone === "warn" ? "Advisory" : tone === "idle" ? "Standby" : "Normal"}
              />
            )}
          </div>
        </div>
      </header>

      {node.type === "plant" && <PlantTimeZone plant={node} />}

      {!isEmpty && (
        <div className="hx-summary" aria-label="Level summary">
          <div className="hx-stat">
            <span className="hx-stat-label">Average health</span>
            <span className="hx-stat-value ast-num">
              {health ?? "—"}
              {health !== null && <span className="ast-unit">/100</span>}
            </span>
          </div>
          <div className="hx-stat">
            <span className="hx-stat-label">Condition</span>
            <SegmentBar
              label={`${dist.healthy} normal, ${dist.atRisk} advisory, ${dist.critical} critical, ${dist.offline} standby`}
              segments={[
                { id: "ok", value: dist.healthy, tone: "good" },
                { id: "warn", value: dist.atRisk, tone: "warn" },
                { id: "bad", value: dist.critical, tone: "bad" },
                { id: "idle", value: dist.offline, tone: "idle" },
              ]}
            />
            <span className="hx-legend ast-num">
              <i data-tone="good" />
              {dist.healthy} normal
              <i data-tone="warn" />
              {dist.atRisk} advisory
              <i data-tone="bad" />
              {dist.critical} critical
              <i data-tone="idle" />
              {dist.offline} standby
            </span>
          </div>
        </div>
      )}

      {!isEmpty && (
        <div className="hx-toolbar">
          <SearchPill value={query} onChange={setQuery} placeholder="Search areas or equipment" label="Search areas or equipment" />
          <PillNav
            items={[
              { id: "all", label: `All ${allFolders.length + allMachines.length}` },
              { id: "areas", label: `Areas ${allFolders.length}` },
              { id: "machines", label: `Machines ${allMachines.length}` },
            ]}
            activeId={filter}
            onChange={(id) => setFilter(id as Filter)}
          />
        </div>
      )}

      {isEmpty ? (
        <div className="ast-card ast-empty">
          <strong className="hx-empty-title">No assets at this level</strong>
        </div>
      ) : !showFolders && !showMachines ? (
        <div className="ast-card ast-empty">
          <strong className="hx-empty-title">No match</strong>
          {q ? `Nothing here matches “${query.trim()}”.` : "Nothing at this level for this filter."}
          <PillButton
            variant="secondary"
            onClick={() => {
              setQuery("");
              setFilter("all");
            }}
          >
            Reset filters
          </PillButton>
        </div>
      ) : (
        <>
          {showFolders && (
            <section className="hx-section" aria-label="Areas">
              <h2 className="ast-section-label">
                Areas<span>{folders.length}</span>
              </h2>
              <div className="hx-grid">
                {folders.map((f) => (
                  <FolderCard key={f.id} node={f} lookup={lookup} onOpen={() => onSelectNode(f)} />
                ))}
              </div>
            </section>
          )}

          {showMachines && (
            <section className="hx-section" aria-label="Machines">
              <h2 className="ast-section-label">
                Machines<span>{machines.length}</span>
              </h2>
              <div className="hx-grid">
                {machines.map((m) => (
                  <MachineCard key={m.id} node={m} lookup={lookup} onOpen={onOpenMachine} />
                ))}
              </div>
            </section>
          )}
        </>
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
    <button type="button" className="ast-card ast-tile hx-card" onClick={onOpen} aria-label={`Open ${node.name}`}>
      <div className="ast-tile-top">
        <span className="ast-icon-tile">
          <TypeIcon type={node.type} size={14} />
        </span>
        <span className="hx-type-tag">{TYPE_LABEL[node.type]}</span>
      </div>
      <div className="hx-card-body">
        <span className="ast-tile-name">{node.name}</span>
        <span className="hx-card-meta ast-num">
          {folders.length > 0 && `${folders.length} ${folders.length === 1 ? "group" : "groups"} · `}
          {machines.length} {machines.length === 1 ? "machine" : "machines"}
          {health !== null && ` · ${health}/100`}
        </span>
      </div>
      {machines.length > 0 && (
        <SegmentBar
          label={`${dist.healthy} normal, ${dist.atRisk} advisory, ${dist.critical} critical, ${dist.offline} standby`}
          segments={[
            { id: "ok", value: dist.healthy, tone: "good" },
            { id: "warn", value: dist.atRisk, tone: "warn" },
            { id: "bad", value: dist.critical, tone: "bad" },
            { id: "idle", value: dist.offline, tone: "idle" },
          ]}
        />
      )}
      <div className="ast-tile-foot">
        <span className="ast-tile-status" data-tone={tone}>
          <i aria-hidden="true" />
          {tone === "bad" ? "Critical inside" : tone === "warn" ? "Advisory inside" : tone === "idle" ? "Standby inside" : "All normal"}
        </span>
        <span className="hx-open">
          Open <IconChevron size={10} />
        </span>
      </div>
    </button>
  );
}

function MachineCard({ node, lookup, onOpen }: { node: HierarchyNode; lookup: MachineLookup; onOpen: (id: string) => void }) {
  const c = machineCondition(node, lookup);
  const m = c.machine;
  const tone = machineTone(c.status);
  if (!node.machineId) return null;
  return (
    <button
      type="button"
      className="ast-card ast-tile hx-card"
      onClick={() => onOpen(node.machineId!)}
      aria-label={`${node.name}, ${node.machineId}, ${c.status}, health ${c.health} %`}
    >
      <div className="ast-tile-top">
        <span className="ast-icon-tile" data-tone={tone}>
          <TypeIcon type="machine" size={14} />
        </span>
        <StatusTag tone={tone} label={c.status} />
      </div>
      <div className="hx-card-body">
        <span className="ast-tile-name">{node.name}</span>
        <span className="hx-card-meta ast-num">
          {node.machineId}
          {m?.type ? ` · ${m.type}` : ""}
        </span>
      </div>
      <dl className="hx-facts">
        <div>
          <dt>Health</dt>
          <dd className="ast-num">
            <HealthRing value={c.health} size={14} stroke={2.2} />
            {c.health}
            <span className="ast-unit">/100</span>
          </dd>
        </div>
        <div>
          <dt>Signals</dt>
          <dd className="ast-num">{m?.signalsCount ?? "—"}</dd>
        </div>
        <div>
          <dt>Criticality</dt>
          <dd>{m?.criticality?.split(" ")[0] ?? "—"}</dd>
        </div>
      </dl>
      <div className="ast-tile-foot">
        <span className="ast-caption">{c.isLive ? "Live telemetry" : m?.manufacturer ?? ""}</span>
        <span className="hx-open">
          Open <IconChevron size={10} />
        </span>
      </div>
    </button>
  );
}
