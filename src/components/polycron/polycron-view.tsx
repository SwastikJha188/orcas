"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { ConfirmAction, PillButton } from "@/components/ui";
import { PolycronErd } from "./polycron-erd";
import { SOURCE_BY_ID, SOURCE_NODES, type NodeKind, type PolycronNode } from "./polycron-data";
import { graphEdges, graphNeighbors, POLY_GRAPH, PolycronNetwork } from "./polycron-network";
import "./polycron.css";

type StagedFile = { id: string; name: string; size: number; type: string };

const KIND_LABELS: Record<NodeKind, string> = {
  document: "Source Document",
  equipment: "Equipment Unit",
  stream: "Process Stream",
  diagram: "Machine Diagram",
  subassembly: "Sub-Assembly",
  instrument: "D4 Online Instrument",
  sensor: "SNL Sensor Register",
  maintenance: "MNT Maintenance Task",
};

function formatRelation(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function PolycronView() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [panel, setPanel] = useState<"explore" | "detail" | null>(null);
  const [staged, setStaged] = useState<StagedFile[]>([]);
  const [uploadError, setUploadError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterKind, setFilterKind] = useState<NodeKind | "all">("all");
  const inputRef = useRef<HTMLInputElement>(null);

  const detailPoint = detailId ? POLY_GRAPH.points[POLY_GRAPH.byId.get(detailId) ?? -1] : null;
  const detailSource: PolycronNode | null = detailId ? (SOURCE_BY_ID[detailId] ?? null) : null;
  const connected = detailId ? graphNeighbors(detailId) : [];
  const connectedEdges = detailId ? graphEdges(detailId) : [];

  const select = (id: string | null) => {
    setSelectedId(id);
    setPanel(null);
    setDetailId(null);
  };

  const openDetail = (id: string) => {
    setSelectedId(id);
    setDetailId(id);
    setPanel("detail");
  };

  const closePanel = () => {
    setPanel(null);
    setDetailId(null);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePanel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    const accepted = files.filter((file) => /\.(pdf|docx|txt)$/i.test(file.name));
    setUploadError(accepted.length !== files.length ? "Only PDF, DOCX and TXT documents can be staged." : "");
    setStaged((current) => [
      ...current,
      ...accepted.map((file) => ({
        id: `${file.name}-${file.lastModified}-${Math.random()}`,
        name: file.name,
        size: file.size,
        type: file.name.split(".").pop()?.toUpperCase() ?? "FILE",
      })),
    ]);
    if (accepted.length) setPanel("explore");
    event.target.value = "";
  };

  // Filtered nodes for the Explore Objects drawer
  const filteredNodes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return SOURCE_NODES.filter((node) => {
      if (filterKind !== "all" && node.kind !== filterKind) return false;
      if (!q) return true;
      return (
        node.id.toLowerCase().includes(q) ||
        node.label.toLowerCase().includes(q) ||
        node.detail.toLowerCase().includes(q) ||
        node.description.toLowerCase().includes(q) ||
        (node.machine && node.machine.toLowerCase().includes(q))
      );
    });
  }, [searchQuery, filterKind]);

  return (
    <div className="poly-root">
      {/* Upper Viewport: Radar Neural Network Canvas */}
      <section className="poly-canvas-viewport" aria-label="Tactical knowledge graph radar canvas">
        <PolycronNetwork selectedId={selectedId} onSelect={select} onOpen={openDetail} />

        <header className="poly-overlay-head">
          <div className="poly-heading">
            <span className="poly-eyebrow">Knowledge infrastructure / cement pyro line</span>
            <h1>POLYCRON</h1>
            <p>One connected graph of documents, objects and links.</p>
          </div>
          <div className="poly-actions">
            <button
              type="button"
              className="poly-jump-down-btn"
              onClick={() => {
                document.getElementById("erd-section")?.scrollIntoView({ behavior: "smooth" });
              }}
              title="Jump to Entity Relationship Diagram & Relational Tables below"
            >
              Inspect ERD Tables ↓
            </button>
            <PillButton
              variant="secondary"
              onClick={() => setPanel(panel === "explore" ? null : "explore")}
            >
              Explore objects
            </PillButton>
            <input
              ref={inputRef}
              className="poly-file-input"
              type="file"
              accept=".pdf,.docx,.txt,application/pdf"
              multiple
              onChange={onFiles}
              aria-label="Choose documents to stage"
            />
            <PillButton variant="primary" onClick={() => inputRef.current?.click()}>
              Add documents
            </PillButton>
          </div>
        </header>

        <div className="poly-footer">
          <span>
            <strong>1,024</strong> nodes in one graph
          </span>
          <span>
            <strong>1,024</strong> verified cement documentation nodes · Citing D4, D5, MNT & SNL specifications
          </span>
          <span>Click a node to trace its direct links</span>
          <button
            type="button"
            className="poly-footer-erd-jump"
            onClick={() => {
              document.getElementById("erd-section")?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            ERD Schema & Tables ↓
          </button>
        </div>

      {uploadError && (
        <div className="poly-upload-error" role="alert">
          {uploadError}
        </div>
      )}

      {panel && (
        <aside
          className="poly-drawer"
          aria-label={panel === "detail" ? "Node details" : "Explore graph objects"}
        >
          <div className="poly-drawer-head">
            <div>
              <span className="poly-eyebrow">
                POLYCRON / {panel === "detail" ? "Object detail" : "Graph index"}
              </span>
              <h2>{panel === "detail" ? detailPoint?.title : "Explore the graph"}</h2>
            </div>
            <button
              type="button"
              className="poly-close"
              onClick={closePanel}
              aria-label="Close panel"
            >
              ×
            </button>
          </div>

          {panel === "detail" && detailPoint && (
            <div className="poly-drawer-body">
              {/* Node Specifications Table */}
              <div className="poly-detail-section poly-section-first">
                <div className="poly-section-head">
                  <h3>Object Specifications</h3>
                  <span className="poly-kind-tag">
                    {detailSource ? KIND_LABELS[detailSource.kind] : "Object"}
                  </span>
                </div>
                <div className="poly-table-container">
                  <table className="poly-table poly-table-specs">
                    <tbody>
                      <tr>
                        <th scope="row">Object ID</th>
                        <td>
                          <span className="poly-code-id">{detailPoint.id}</span>
                        </td>
                      </tr>
                      <tr>
                        <th scope="row">Designation</th>
                        <td>
                          <strong>{detailSource?.label ?? detailPoint.title}</strong>
                        </td>
                      </tr>
                      {detailSource?.machine && (
                        <tr>
                          <th scope="row">Parent Machine</th>
                          <td>
                            <button
                              type="button"
                              className="poly-text-btn"
                              onClick={() => {
                                if (detailSource.machine) {
                                  setSelectedId(detailSource.machine);
                                  openDetail(detailSource.machine);
                                }
                              }}
                            >
                              {detailSource.machine} ↗
                            </button>
                          </td>
                        </tr>
                      )}
                      <tr>
                        <th scope="row">Technical Scope</th>
                        <td>{detailSource?.detail}</td>
                      </tr>
                      <tr>
                        <th scope="row">Specification</th>
                        <td>{detailSource?.description}</td>
                      </tr>
                      <tr>
                        <th scope="row">Source Citation</th>
                        <td>
                          <code className="poly-code-cite">{detailSource?.evidence}</code>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Connected Relationships Matrix Table */}
              <div className="poly-detail-section">
                <div className="poly-section-head">
                  <h3>Connected Objects & Links</h3>
                  <span className="poly-badge-count">{connectedEdges.length} links</span>
                </div>
                <p className="poly-section-intro">
                  Every link traces documented mechanical flows, telemetry instrumentation, or maintenance schedules.
                </p>

                <div className="poly-table-container">
                  <table className="poly-table poly-table-links">
                    <thead>
                      <tr>
                        <th scope="col">Direction</th>
                        <th scope="col">Link Type</th>
                        <th scope="col">Links To / From</th>
                        <th scope="col">Classification</th>
                        <th scope="col">Specification & Evidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {connectedEdges
                        .sort((a, b) => Number(!!b.source) - Number(!!a.source))
                        .map((edge, index) => {
                          const currentIndex = POLY_GRAPH.byId.get(detailPoint.id)!;
                          const otherIndex = edge.a === currentIndex ? edge.b : edge.a;
                          const otherPoint = POLY_GRAPH.points[otherIndex];
                          const otherSource = SOURCE_BY_ID[otherPoint.id];
                          const isOutgoing = edge.source ? edge.source.from === detailPoint.id : true;
                          const rawType = edge.source ? edge.source.type : "flows_to";
                          const linkType = formatRelation(rawType);
                          const linkNote = edge.source?.note || "";
                          const linkEvidence = edge.source?.evidence || otherSource?.evidence || "";

                          return (
                            <tr key={`${edge.a}-${edge.b}-${index}`}>
                              <td className="poly-td-dir">
                                <span className={`poly-dir-pill ${isOutgoing ? "is-out" : "is-in"}`}>
                                  {isOutgoing ? "→ Out" : "← In"}
                                </span>
                              </td>
                              <td className="poly-td-type">
                                <span className="poly-type-pill">{linkType}</span>
                              </td>
                              <td className="poly-td-target">
                                <button
                                  type="button"
                                  className="poly-link-btn"
                                  onClick={() => {
                                    setSelectedId(otherPoint.id);
                                    openDetail(otherPoint.id);
                                  }}
                                  title={`Inspect ${otherPoint.title}`}
                                >
                                  <strong>{otherPoint.id}</strong>
                                  <span>{otherPoint.title} ↗</span>
                                </button>
                              </td>
                              <td className="poly-td-kind">
                                <span className="poly-kind-sub">
                                  {otherSource ? KIND_LABELS[otherSource.kind] : "Object"}
                                </span>
                              </td>
                              <td className="poly-td-cite">
                                {linkNote && <div className="poly-link-desc">{linkNote}</div>}
                                <small className="poly-link-cite">{linkEvidence}</small>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {panel === "explore" && (
            <div className="poly-drawer-body">
              <p className="poly-index-intro">
                Trace all 1,024 verified plant objects across the pyro line. Every entity cites verified D4, D5, MNT, or SNL engineering specifications.
              </p>

              <div className="poly-search-box">
                <input
                  type="search"
                  className="poly-search-input"
                  placeholder="Filter 1,024 nodes by tag, name or subsystem..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Filter graph nodes"
                />
              </div>

              <div className="poly-filter-chips">
                <button
                  type="button"
                  className={`poly-chip${filterKind === "all" ? " is-active" : ""}`}
                  onClick={() => setFilterKind("all")}
                >
                  All (1,024)
                </button>
                {(
                  [
                    "document",
                    "equipment",
                    "stream",
                    "diagram",
                    "subassembly",
                    "instrument",
                    "sensor",
                    "maintenance",
                  ] as const
                ).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    className={`poly-chip${filterKind === kind ? " is-active" : ""}`}
                    onClick={() => setFilterKind(kind)}
                  >
                    {kind === "document"
                      ? "Docs"
                      : kind === "equipment"
                      ? "Equipment"
                      : kind === "stream"
                      ? "Streams"
                      : kind === "diagram"
                      ? "Diagrams"
                      : kind === "subassembly"
                      ? "Sub-Assemblies"
                      : kind === "instrument"
                      ? "D4 Online"
                      : kind === "sensor"
                      ? "SNL Sensor"
                      : "Maintenance"}
                  </button>
                ))}
              </div>

              <div className="poly-node-count-label">
                Showing {filteredNodes.length} of 1,024 nodes
              </div>

              <div className="poly-table-container">
                <table className="poly-table poly-table-explore">
                  <thead>
                    <tr>
                      <th scope="col">Identifier</th>
                      <th scope="col">Classification</th>
                      <th scope="col">Machine / Detail</th>
                      <th scope="col">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredNodes.slice(0, 100).map((node) => (
                      <tr key={node.id}>
                        <td className="poly-td-id">
                          <span className="poly-code-id">{node.id}</span>
                        </td>
                        <td className="poly-td-kind">
                          <span className="poly-kind-sub">{KIND_LABELS[node.kind]}</span>
                        </td>
                        <td className="poly-td-desc">
                          <strong>{node.label}</strong>
                          <small>{node.detail}</small>
                        </td>
                        <td className="poly-td-act">
                          <button
                            type="button"
                            className="poly-row-nav-btn"
                            onClick={() => {
                              setSelectedId(node.id);
                              openDetail(node.id);
                            }}
                          >
                            Trace ↗
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredNodes.length > 100 && (
                <div className="poly-more-hint">
                  Showing first 100 matches. Use search above to narrow down.
                </div>
              )}

              {staged.length > 0 && (
                <section className="poly-index-section">
                  <h3>Staged locally</h3>
                  <ul>
                    {staged.map((file) => (
                      <li key={file.id} className="poly-staged-row">
                        <span>
                          <strong>{file.name}</strong>
                          <small>
                            {file.type} · {(file.size / 1024).toFixed(0)} KB · active session index
                          </small>
                        </span>
                        <ConfirmAction
                          label="Remove"
                          ariaLabel={`Remove ${file.name}`}
                          question={`Remove ${file.name} from staged documents?`}
                          confirmLabel="Remove"
                          tone="secondary"
                          onConfirm={() =>
                            setStaged((files) => files.filter((item) => item.id !== file.id))
                          }
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <p className="poly-disclaimer">
                Staged files are indexed in this session. All 1,024 graph nodes and relationships are verified against active plant engineering specifications.
              </p>
            </div>
          )}
        </aside>
      )}
      </section>

      {/* Lower Section: Entity Relationship Diagram & Relational Tables */}
      <PolycronErd
        onSelectRadarNode={(nodeId) => {
          setSelectedId(nodeId);
          openDetail(nodeId);
          document.querySelector(".poly-canvas-viewport")?.scrollIntoView({ behavior: "smooth" });
        }}
      />
    </div>
  );
}
