"use client";

import { useMemo, useState } from "react";
import { SOURCE_NODES, SOURCE_LINKS, type NodeKind, type PolycronNode, type PolycronLink } from "./polycron-data";

export interface PolycronErdProps {
  onSelectRadarNode?: (nodeId: string) => void;
}

export type MachineKey =
  | "ALL"
  | "KLN-01"
  | "PHC-01"
  | "CLR-01"
  | "BRN-01"
  | "KFS-01"
  | "FSL-01"
  | "HMR-01"
  | "CSL-01"
  | "BGH-01"
  | "EXH-IF";

export type RelationTabKey =
  | "all_links"
  | "objects"
  | "process_flows"
  | "telemetry_sensors"
  | "maintenance";

export interface MachineMeta {
  key: MachineKey;
  id: string;
  name: string;
  description: string;
}

export const MACHINES: MachineMeta[] = [
  { key: "ALL", id: "ALL", name: "All Pyro Line Machines", description: "Complete pyroprocessing line: 1,024 plant nodes and 2,291 authentic relational links." },
  { key: "KLN-01", id: "KLN-01", name: "Rotary Kiln System", description: "Direct-fired clinker kiln 4.8m x 72m, 3 support piers, hydraulic thrust station, 4.0 RPM drive, shell scanner." },
  { key: "PHC-01", id: "PHC-01", name: "Preheater & Calciner", description: "Six-stage suspension preheater cyclones C1–C6 with inline low-NOx calciner and meal splitters." },
  { key: "CLR-01", id: "CLR-01", name: "Clinker Grate Cooler", description: "Reciprocating 3-grate clinker cooler with hydraulic drives, under-grate aeration fans, and secondary/tertiary air recovery." },
  { key: "BRN-01", id: "BRN-01", name: "Main Kiln Burner", description: "Multi-channel pulverized coal/petcoke burner with primary air swirl dampers and flame sensor telemetry." },
  { key: "KFS-01", id: "KFS-01", name: "Kiln Feed System", description: "Continuous meal dosing gate, weigh bin load cells, and heavy-duty preheater bucket elevator train." },
  { key: "FSL-01", id: "FSL-01", name: "Raw Meal Feed Silo", description: "Homogenizing raw meal concrete silo with bottom aeration blower cones and bin level radar." },
  { key: "HMR-01", id: "HMR-01", name: "Hammer Crusher", description: "Cooler discharge clinker lump breaker with heavy-duty rotor hammers and grizzly over-size reject." },
  { key: "CSL-01", id: "CSL-01", name: "Clinker Storage Silo", description: "Clinker storage silo, discharge vibratory feeders, and deep-bucket dispatch conveyor line." },
  { key: "BGH-01", id: "BGH-01", name: "Process Baghouse", description: "Pulse-jet fabric filter dust collector, differential pressure transmitters, and exhaust stack sampling." },
  { key: "EXH-IF", id: "EXH-IF", name: "Main Exhaust ID Fan", description: "Variable speed induced draft train regulating kiln system draft and flue gas evacuation to stack." },
];

export function normalizeMachineId(machine?: string): MachineKey {
  if (!machine) return "ALL";
  if (machine.startsWith("KLN-01")) return "KLN-01";
  if (machine.startsWith("PHC-01")) return "PHC-01";
  if (machine.startsWith("CLR-01")) return "CLR-01";
  if (machine.startsWith("BRN-01")) return "BRN-01";
  if (machine.startsWith("KFS-01")) return "KFS-01";
  if (machine.startsWith("FSL-01")) return "FSL-01";
  if (machine.startsWith("HMR-01")) return "HMR-01";
  if (machine.startsWith("CSL-01")) return "CSL-01";
  if (machine.startsWith("BGH-01")) return "BGH-01";
  if (machine.startsWith("EXH-IF")) return "EXH-IF";
  return "ALL";
}

const KIND_DISPLAY: Record<NodeKind, string> = {
  document: "Document",
  equipment: "Equipment Unit",
  stream: "Process Stream",
  diagram: "Machine Diagram",
  subassembly: "Sub-Assembly",
  instrument: "D4 Online Instrument",
  sensor: "SNL Sensor Register",
  maintenance: "MNT Maintenance Task",
};

export interface EnrichedLink {
  from: string;
  to: string;
  type: string;
  evidence: string;
  note: string;
  flow?: boolean;
  fromLabel: string;
  toLabel: string;
  fromKind: NodeKind;
  toKind: NodeKind;
  fromMach: MachineKey;
  toMach: MachineKey;
  primaryMach: MachineKey;
}

export function PolycronErd({ onSelectRadarNode }: PolycronErdProps) {
  const [selectedMachine, setSelectedMachine] = useState<MachineKey>("ALL");
  const [activeTab, setActiveTab] = useState<RelationTabKey>("all_links");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // Node lookup map
  const nodeMap = useMemo(() => {
    return new Map<string, PolycronNode>(SOURCE_NODES.map((n) => [n.id, n]));
  }, []);

  // Enriched links with machine association and full labels
  const allEnrichedLinks = useMemo(() => {
    return SOURCE_LINKS.map((link): EnrichedLink => {
      const fromNode = nodeMap.get(link.from);
      const toNode = nodeMap.get(link.to);
      const fromMach = normalizeMachineId(fromNode?.machine || (fromNode?.kind === "equipment" ? fromNode.id : ""));
      const toMach = normalizeMachineId(toNode?.machine || (toNode?.kind === "equipment" ? toNode.id : ""));
      const primaryMach = fromMach !== "ALL" ? fromMach : toMach !== "ALL" ? toMach : "ALL";

      return {
        from: link.from,
        to: link.to,
        type: link.type,
        evidence: link.evidence,
        note: link.note,
        flow: link.flow,
        fromLabel: fromNode?.label || link.from,
        toLabel: toNode?.label || link.to,
        fromKind: fromNode?.kind || "instrument",
        toKind: toNode?.kind || "equipment",
        fromMach,
        toMach,
        primaryMach,
      };
    });
  }, [nodeMap]);

  // Compute machine node and link counts
  const { machineNodeCounts, machineLinkCounts } = useMemo(() => {
    const nodeCounts: Record<string, number> = { ALL: SOURCE_NODES.length };
    const linkCounts: Record<string, number> = { ALL: SOURCE_LINKS.length };

    for (const m of MACHINES) {
      if (m.key === "ALL") continue;
      nodeCounts[m.key] = 0;
      linkCounts[m.key] = 0;
    }

    for (const node of SOURCE_NODES) {
      const norm = normalizeMachineId(node.machine || (node.kind === "equipment" ? node.id : ""));
      if (nodeCounts[norm] !== undefined) {
        nodeCounts[norm] = (nodeCounts[norm] || 0) + 1;
      }
    }

    for (const link of allEnrichedLinks) {
      if (link.fromMach !== "ALL" && linkCounts[link.fromMach] !== undefined) {
        linkCounts[link.fromMach] = (linkCounts[link.fromMach] || 0) + 1;
      } else if (link.toMach !== "ALL" && linkCounts[link.toMach] !== undefined) {
        linkCounts[link.toMach] = (linkCounts[link.toMach] || 0) + 1;
      }
    }

    return { machineNodeCounts: nodeCounts, machineLinkCounts: linkCounts };
  }, [allEnrichedLinks]);

  // Node inventory filtered by machine
  const filteredNodes = useMemo(() => {
    if (selectedMachine === "ALL") return SOURCE_NODES;
    return SOURCE_NODES.filter((n) => {
      if (n.kind === "equipment") return n.id === selectedMachine;
      const norm = normalizeMachineId(n.machine);
      return norm === selectedMachine;
    });
  }, [selectedMachine]);

  // Links filtered by machine
  const filteredLinks = useMemo(() => {
    if (selectedMachine === "ALL") return allEnrichedLinks;
    return allEnrichedLinks.filter(
      (l) => l.fromMach === selectedMachine || l.toMach === selectedMachine || l.primaryMach === selectedMachine
    );
  }, [selectedMachine, allEnrichedLinks]);

  // Links specific to process flows
  const processFlowLinks = useMemo(() => {
    return filteredLinks.filter((l) =>
      ["flows_to", "secondary_air_loop", "heats", "counter_current_gas", "exhaust_draft", "discharges_to", "passes_through", "originates_at", "stores_at"].includes(l.type)
    );
  }, [filteredLinks]);

  // Links specific to telemetry & sensor cross-references
  const telemetryLinks = useMemo(() => {
    return filteredLinks.filter((l) =>
      ["monitors", "registers_for", "verified_cross_reference", "allocated_to"].includes(l.type)
    );
  }, [filteredLinks]);

  // Links specific to maintenance checklists
  const maintenanceLinks = useMemo(() => {
    return filteredLinks.filter((l) =>
      ["maintains", "checklist_item", "maintained_under"].includes(l.type)
    );
  }, [filteredLinks]);

  // Active records based on active tab
  const activeRecords = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    if (activeTab === "all_links") {
      if (!q) return filteredLinks;
      return filteredLinks.filter(
        (l) =>
          l.from.toLowerCase().includes(q) ||
          l.to.toLowerCase().includes(q) ||
          l.type.toLowerCase().includes(q) ||
          l.note.toLowerCase().includes(q) ||
          l.evidence.toLowerCase().includes(q) ||
          l.fromLabel.toLowerCase().includes(q) ||
          l.toLabel.toLowerCase().includes(q)
      );
    }

    if (activeTab === "objects") {
      if (!q) return filteredNodes;
      return filteredNodes.filter(
        (n) =>
          n.id.toLowerCase().includes(q) ||
          n.label.toLowerCase().includes(q) ||
          n.detail.toLowerCase().includes(q) ||
          n.description.toLowerCase().includes(q) ||
          n.evidence.toLowerCase().includes(q)
      );
    }

    if (activeTab === "process_flows") {
      if (!q) return processFlowLinks;
      return processFlowLinks.filter(
        (l) =>
          l.from.toLowerCase().includes(q) ||
          l.to.toLowerCase().includes(q) ||
          l.type.toLowerCase().includes(q) ||
          l.note.toLowerCase().includes(q) ||
          l.evidence.toLowerCase().includes(q)
      );
    }

    if (activeTab === "telemetry_sensors") {
      if (!q) return telemetryLinks;
      return telemetryLinks.filter(
        (l) =>
          l.from.toLowerCase().includes(q) ||
          l.to.toLowerCase().includes(q) ||
          l.type.toLowerCase().includes(q) ||
          l.note.toLowerCase().includes(q) ||
          l.evidence.toLowerCase().includes(q)
      );
    }

    if (activeTab === "maintenance") {
      if (!q) return maintenanceLinks;
      return maintenanceLinks.filter(
        (l) =>
          l.from.toLowerCase().includes(q) ||
          l.to.toLowerCase().includes(q) ||
          l.type.toLowerCase().includes(q) ||
          l.note.toLowerCase().includes(q) ||
          l.evidence.toLowerCase().includes(q)
      );
    }

    return filteredLinks;
  }, [activeTab, filteredLinks, filteredNodes, processFlowLinks, telemetryLinks, maintenanceLinks, searchQuery]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(activeRecords.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * pageSize;
    return activeRecords.slice(start, start + pageSize);
  }, [activeRecords, page]);

  const activeMachineMeta = MACHINES.find((m) => m.key === selectedMachine);

  const scrollToRadar = () => {
    const elem = document.querySelector(".poly-canvas-viewport");
    if (elem) {
      elem.scrollIntoView({ behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleTraceNode = (nodeId: string) => {
    onSelectRadarNode?.(nodeId);
    scrollToRadar();
  };

  return (
    <section id="erd-section" className="poly-erd-section" aria-label="Object Relations and Links Table">
      {/* Header and Jump Button */}
      <header className="poly-erd-header">
        <div className="poly-erd-title-wrap">
          <span className="poly-eyebrow">Plant Knowledge Graph // Relational Index</span>
          <h2>Object Relations & Connected Links</h2>
          <p>
            Tabular index of plant machines, engineering blueprints, online instruments, physical sensors, maintenance checklists, and continuous process workflows traced in the radar network above.
          </p>
        </div>

        <div className="poly-erd-header-actions">
          <button
            type="button"
            className="poly-erd-radar-jump-btn"
            onClick={scrollToRadar}
            title="Scroll up to the radar network graph"
          >
            ↑ Return to Radar Canvas
          </button>
        </div>
      </header>

      {/* Machine Object Toggles Bar */}
      <div className="poly-erd-filter-bar">
        <div className="poly-erd-filter-label">
          <span>Machine Object Toggles</span>
          <span className="poly-active-filter-indicator">
            Active: <strong>{selectedMachine === "ALL" ? "All Pyro Line Equipment" : selectedMachine}</strong>
          </span>
        </div>

        <div className="poly-machine-toggles" role="tablist" aria-label="Machine object selector">
          {MACHINES.map((mach) => {
            const nodeCount = machineNodeCounts[mach.key] || 0;
            const linkCount = machineLinkCounts[mach.key] || 0;
            const isSelected = selectedMachine === mach.key;
            return (
              <button
                key={mach.key}
                type="button"
                role="tab"
                aria-selected={isSelected}
                className={`poly-machine-toggle-btn${isSelected ? " is-active" : ""}`}
                onClick={() => {
                  setSelectedMachine(mach.key);
                  setPage(1);
                }}
              >
                <span className="poly-toggle-key">{mach.key}</span>
                <span className="poly-toggle-count">
                  {mach.key === "ALL" ? `${nodeCount} nodes` : `${nodeCount}n · ${linkCount}l`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Machine Telemetry Summary Banner */}
      {selectedMachine !== "ALL" && activeMachineMeta && (
        <div className="poly-machine-banner">
          <div className="poly-banner-lead">
            <span className="poly-badge-machine">{activeMachineMeta.key}</span>
            <div>
              <h3>{activeMachineMeta.name}</h3>
              <p>{activeMachineMeta.description}</p>
            </div>
          </div>
          <div className="poly-banner-metrics">
            <div className="poly-metric-cell">
              <span className="poly-metric-num">{filteredNodes.length}</span>
              <span className="poly-metric-lbl">Subsystem Nodes</span>
            </div>
            <div className="poly-metric-cell">
              <span className="poly-metric-num">{filteredLinks.length}</span>
              <span className="poly-metric-lbl">Connected Links</span>
            </div>
            <div className="poly-metric-cell">
              <span className="poly-metric-num">{processFlowLinks.length}</span>
              <span className="poly-metric-lbl">Process Flows</span>
            </div>
            <div className="poly-metric-cell">
              <span className="poly-metric-num">{telemetryLinks.length}</span>
              <span className="poly-metric-lbl">Telemetry Links</span>
            </div>
            <div className="poly-metric-cell">
              <span className="poly-metric-num">{maintenanceLinks.length}</span>
              <span className="poly-metric-lbl">MNT Checklists</span>
            </div>
            <button
              type="button"
              className="poly-banner-clear-btn"
              onClick={() => {
                setSelectedMachine("ALL");
                setPage(1);
              }}
              title="Show all line entities"
            >
              Reset Filter
            </button>
          </div>
        </div>
      )}

      {/* Relation Category Tabs */}
      <div className="poly-table-subtabs" role="tablist" aria-label="Relational view categories">
        {(
          [
            { key: "all_links", label: "All Graph Links & Relations", count: filteredLinks.length },
            { key: "objects", label: "Subsystem Objects Inventory", count: filteredNodes.length },
            { key: "process_flows", label: "Process Material & Gas Flows", count: processFlowLinks.length },
            { key: "telemetry_sensors", label: "Telemetry & Sensor Links", count: telemetryLinks.length },
            { key: "maintenance", label: "Maintenance Checklist Links", count: maintenanceLinks.length },
          ] as const
        ).map((tab) => {
          const isSelected = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isSelected}
              className={`poly-subtab-btn${isSelected ? " is-active" : ""}`}
              onClick={() => {
                setActiveTab(tab.key);
                setSearchQuery("");
                setPage(1);
              }}
            >
              <span>{tab.label}</span>
              <span className="poly-tab-count">{tab.count}</span>
            </button>
          );
        })}
      </div>

      {/* Search Input & Counter Bar */}
      <div className="poly-table-ctrls">
        <div className="poly-table-search-wrap">
          <input
            type="search"
            className="poly-table-search-input"
            placeholder="Search links by tag, relationship, description, or citation..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            aria-label="Search relational tables"
          />
        </div>
        <div className="poly-table-meta-counts">
          <span>
            Showing <strong>{activeRecords.length}</strong> matches (Page {page} of {totalPages})
          </span>
          {selectedMachine !== "ALL" && (
            <span className="poly-filtered-badge">Subsystem: {selectedMachine}</span>
          )}
        </div>
      </div>

      {/* TAB 1, 3, 4, 5: LINKS & RELATIONS TABLES */}
      {activeTab !== "objects" && (
        <div className="poly-table-container">
          <table className="poly-table poly-erd-data-table">
            <thead>
              <tr>
                <th scope="col">Direction</th>
                <th scope="col">Source Object (From)</th>
                <th scope="col">Relationship Type</th>
                <th scope="col">Target Object (To)</th>
                <th scope="col">Physical Role & Specification</th>
                <th scope="col">Evidence Citation</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="poly-empty-td">
                    No graph links match the current filter or search criteria.
                  </td>
                </tr>
              ) : (
                (paginatedRecords as EnrichedLink[]).map((link, idx) => {
                  return (
                    <tr key={`${link.from}-${link.to}-${link.type}-${idx}`}>
                      <td className="poly-td-dir">
                        <span className={`poly-dir-pill ${link.flow ? "is-flow" : "is-out"}`}>
                          {link.flow ? "★ Flow" : "→ Link"}
                        </span>
                      </td>

                      <td className="poly-td-target">
                        <button
                          type="button"
                          className="poly-link-btn"
                          onClick={() => handleTraceNode(link.from)}
                          title={`Trace ${link.fromLabel} in graph`}
                        >
                          <strong>{link.from}</strong>
                          <span>{link.fromLabel}</span>
                          <small className="poly-kind-sub">{KIND_DISPLAY[link.fromKind] || link.fromKind}</small>
                        </button>
                      </td>

                      <td className="poly-td-type">
                        <span className="poly-type-pill">{link.type.replace(/_/g, " ")}</span>
                      </td>

                      <td className="poly-td-target">
                        <button
                          type="button"
                          className="poly-link-btn"
                          onClick={() => handleTraceNode(link.to)}
                          title={`Trace ${link.toLabel} in graph`}
                        >
                          <strong>{link.to}</strong>
                          <span>{link.toLabel}</span>
                          <small className="poly-kind-sub">{KIND_DISPLAY[link.toKind] || link.toKind}</small>
                        </button>
                      </td>

                      <td className="poly-td-desc">
                        <div className="poly-link-desc">{link.note || "Connected plant object."}</div>
                      </td>

                      <td className="poly-td-cite">
                        <span className="poly-cite-tag">{link.evidence}</span>
                      </td>

                      <td className="poly-td-act">
                        <button
                          type="button"
                          className="poly-row-radar-btn"
                          onClick={() => handleTraceNode(link.from)}
                          title="Trace source node in radar"
                        >
                          Trace ↑
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: OBJECTS INVENTORY TABLE */}
      {activeTab === "objects" && (
        <div className="poly-table-container">
          <table className="poly-table poly-erd-data-table">
            <thead>
              <tr>
                <th scope="col">Object Tag / ID</th>
                <th scope="col">Classification</th>
                <th scope="col">Designation & Scope</th>
                <th scope="col">Engineering Specification</th>
                <th scope="col">Parent Machine</th>
                <th scope="col">Evidence Citation</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="poly-empty-td">
                    No plant objects match the current filter or search criteria.
                  </td>
                </tr>
              ) : (
                (paginatedRecords as PolycronNode[]).map((node) => {
                  return (
                    <tr key={node.id}>
                      <td className="poly-td-pk">
                        <span className="poly-pk-pill">{node.id}</span>
                      </td>

                      <td className="poly-td-type">
                        <span className="poly-kind-sub">{KIND_DISPLAY[node.kind] || node.kind}</span>
                      </td>

                      <td className="poly-td-title">
                        <strong>{node.label}</strong>
                        <small>{node.detail}</small>
                      </td>

                      <td className="poly-td-desc">
                        <div>{node.description}</div>
                      </td>

                      <td className="poly-td-fk">
                        {node.machine ? (
                          <button
                            type="button"
                            className="poly-fk-btn"
                            onClick={() => {
                              setSelectedMachine(normalizeMachineId(node.machine));
                              setPage(1);
                            }}
                            title={`Filter by ${node.machine}`}
                          >
                            {node.machine} ↗
                          </button>
                        ) : (
                          <span className="poly-null-fk">—</span>
                        )}
                      </td>

                      <td className="poly-td-cite">
                        <span className="poly-cite-tag">{node.evidence}</span>
                      </td>

                      <td className="poly-td-act">
                        <button
                          type="button"
                          className="poly-row-radar-btn"
                          onClick={() => handleTraceNode(node.id)}
                          title="Trace node in upper radar"
                        >
                          Trace ↑
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="poly-table-pagination">
          <button
            type="button"
            className="poly-page-btn"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ← Prev
          </button>
          <span className="poly-page-status">
            Page <strong>{page}</strong> of <strong>{totalPages}</strong>
          </span>
          <button
            type="button"
            className="poly-page-btn"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next →
          </button>
        </div>
      )}
    </section>
  );
}
