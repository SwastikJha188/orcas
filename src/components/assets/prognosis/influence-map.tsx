"use client";

import React, { useMemo, useState } from "react";
import { PillButton, PillNav } from "@/components/ui";
import { useKilnSimulation } from "@/providers/kiln-simulation-context";
import { SIGNAL_BY_TAG, type Severity } from "@/lib/kiln-sim/signals";
import type { SimFrame } from "@/lib/kiln-sim/engine";
import {
  AMBIENT,
  EQUATION_BY_TARGET,
  LEARN_R,
  NODE_BY_TAG,
  REL_LAYOUT,
  REL_NODES,
  SPEC_LINKS,
  WITNESSES,
  learnLinks,
  sensitivity,
  type LearnedLink,
  type RelLink,
  type RelNode,
} from "@/lib/kiln-sim/relationships";

/* ------------------------------------------------------------------ */
/* Geometry (viewBox units)                                            */
/* ------------------------------------------------------------------ */

const NW = 206;
const NH = 46;
const ROW = 54;
const COL_W = 270;
const PAD = 16;
const TOP = 40;
const ROWS = Math.max(...REL_LAYOUT.columns.map((c) => c.length));
const VW = PAD * 2 + (REL_LAYOUT.columns.length - 1) * COL_W + NW;
const VH = TOP + ROWS * ROW - (ROW - NH) + PAD;

const POS: Record<string, { x: number; y: number }> = (() => {
  const out: Record<string, { x: number; y: number }> = {};
  REL_LAYOUT.columns.forEach((c, k) => {
    const offset = ((ROWS - c.length) * ROW) / 2;
    c.forEach((t, i) => (out[t] = { x: PAD + k * COL_W, y: TOP + offset + i * ROW }));
  });
  return out;
})();

function linkPath(from: string, to: string): string {
  const a = POS[from];
  const b = POS[to];
  if (Math.abs(a.x - b.x) < 1) {
    // Same column: arc out on the right side.
    const x = a.x + NW;
    const y1 = a.y + NH / 2;
    const y2 = b.y + NH / 2;
    const bulge = 28 + Math.min(40, Math.abs(y2 - y1) * 0.12);
    return `M ${x} ${y1} C ${x + bulge} ${y1} ${x + bulge} ${y2} ${x + 4} ${y2}`;
  }
  const [l, r] = a.x < b.x ? [a, b] : [b, a];
  const x1 = l.x + NW;
  const y1 = l.y + NH / 2;
  const x2 = r.x - 7;
  const y2 = r.y + NH / 2;
  const dx = (x2 - x1) * 0.5;
  // Always drawn left → right; a right-to-left link puts its arrow on the start.
  return `M ${x1} ${y1} C ${x1 + dx} ${y1} ${x2 - dx} ${y2} ${x2} ${y2}`;
}

/* ------------------------------------------------------------------ */
/* Live readings                                                       */
/* ------------------------------------------------------------------ */

const STATUS_CLASS: Record<Severity, string> = { Normal: "is-ok", Advisory: "is-warn", Critical: "is-bad" };
const MINUS = "−";

interface Reading {
  value: string;
  sigma: number | null;
  status: Severity;
  suspect: boolean;
  model: string | null;
}

function read(node: RelNode, frame: SimFrame): Reading {
  if (node.tag === AMBIENT) {
    return { value: `${frame.drivers.ambientEst.toFixed(1)} °C`, sigma: null, status: "Normal", suspect: false, model: null };
  }
  const s = frame.signals[node.tag];
  if (!s) return { value: "—", sigma: null, status: "Normal", suspect: false, model: null };
  const def = SIGNAL_BY_TAG[node.tag];
  const unit = def.type === "state" ? "" : ` ${def.unit}`;
  return {
    value: `${s.display}${unit}`,
    sigma: s.z !== null && Number.isFinite(s.z) ? Math.abs(s.z) : null,
    status: s.status,
    suspect: s.quality !== "Good",
    model: s.model !== null ? `${s.model.toFixed(def.decimals)}${unit}` : null,
  };
}

function fmtSens(v: number, to: RelNode, from: RelNode): string {
  const a = Math.abs(v);
  const dp = a >= 100 ? 0 : a >= 10 ? 1 : a >= 1 ? 2 : 3;
  const sign = v > 0 ? "+" : v < 0 ? MINUS : "";
  return `${sign}${a.toFixed(dp)} ${to.unit} per ${from.unit}`;
}

const truncate = (s: string, n = 28) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

type LinkFilter = "all" | "spec" | "learned";

export function InfluenceMap({ onBack }: { onBack?: () => void }) {
  const sim = useKilnSimulation();
  const frame = sim?.frame ?? null;
  const [hover, setHover] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState<LinkFilter>("all");

  const learned = useMemo(() => (frame ? learnLinks(frame) : []), [frame]);
  const links: RelLink[] = useMemo(
    () => (filter === "learned" ? learned : filter === "spec" ? SPEC_LINKS : [...SPEC_LINKS, ...learned]),
    [filter, learned]
  );

  const readings = useMemo(() => {
    const out: Record<string, Reading> = {};
    if (frame) for (const n of REL_NODES) out[n.tag] = read(n, frame);
    return out;
  }, [frame]);

  const focus = hover ?? selected;
  const lit = useMemo(() => {
    if (!focus) return null;
    const seen = new Set<string>([focus]);
    const walk = (cur: string, down: boolean) => {
      for (const l of links) {
        const [a, b] = down ? [l.from, l.to] : [l.to, l.from];
        if (a === cur && !seen.has(b)) {
          seen.add(b);
          walk(b, down);
        }
      }
    };
    walk(focus, true);
    walk(focus, false);
    return seen;
  }, [focus, links]);

  if (!frame) {
    return (
      <div className="rel-root">
        <section className="rel-card rel-empty">Live plant not running.</section>
      </div>
    );
  }

  const offNormal = REL_NODES.filter((n) => readings[n.tag].status !== "Normal").length;
  const isLearned = (l: RelLink): l is LearnedLink => l.kind === "learned";

  return (
    <div className="rel-root">
      <header className="rel-head">
        <div className="rel-head-left">
          <h2 className="rel-title">Sensor relationships</h2>
          <div className="rel-head-figs">
            <span className="rel-fig">
              <span className="rel-fig-label">Sensors</span>
              <span className="rel-fig-num">{REL_NODES.length}</span>
            </span>
            <span className="rel-fig">
              <span className="rel-fig-label">Specified links</span>
              <span className="rel-fig-num">{SPEC_LINKS.length}</span>
            </span>
            <span className="rel-fig">
              <span className="rel-fig-label">Learned links</span>
              <span className="rel-fig-num">{learned.length}</span>
            </span>
            <span className="rel-fig">
              <span className="rel-fig-label">Off-normal</span>
              <span className="rel-fig-num">{offNormal}</span>
            </span>
          </div>
        </div>
        <div className="rel-head-right">
          <PillNav
            items={[
              { id: "all", label: "All links" },
              { id: "spec", label: "Specification" },
              { id: "learned", label: `Learned · ${learned.length}` },
            ]}
            activeId={filter}
            onChange={(id) => setFilter(id as LinkFilter)}
          />
          {onBack && (
            <PillButton variant="secondary" onClick={onBack} aria-label="Back to assets">
              Back
            </PillButton>
          )}
        </div>
      </header>

      <section className="rel-card">
        <div className="rel-card-head">
          <h3 className="rel-card-title">
            Influence map <span className="inf-live">· Live</span>
          </h3>
          <div className="rel-legend" aria-hidden="true">
            <span className="rel-legend-item"><i className="inf-key is-ok" />Normal</span>
            <span className="rel-legend-item"><i className="inf-key is-warn" />Advisory</span>
            <span className="rel-legend-item"><i className="inf-key is-bad" />Critical</span>
            <span className="rel-legend-item"><i className="inf-line" />Reference model</span>
            <span className="rel-legend-item"><i className="inf-line is-rule" />Rule / status</span>
            <span className="rel-legend-item"><i className="inf-line is-learned" />Learned</span>
            <span className="rel-legend-item">σ = residual vs model</span>
          </div>
        </div>

        <div className="inf-scroll mx-canvas">
          <svg
            className="inf-svg"
            viewBox={`0 0 ${VW} ${VH}`}
            role="group"
            aria-label={`Influence map of ${REL_NODES.length} sensors: ${SPEC_LINKS.length} specified links and ${learned.length} learned links`}
            onPointerLeave={() => setHover(null)}
          >
            <defs>
              {["base", "hot", "learned"].map((k) => (
                <marker key={k} id={`inf-arrow-${k}`} viewBox="0 0 10 10" refX="1" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path className={`inf-arrow is-${k}`} d="M 0 0 L 10 5 L 0 10 z" />
                </marker>
              ))}
            </defs>

            {REL_LAYOUT.headers.map((h, k) => (
              <text key={k} className="inf-col" x={PAD + k * COL_W + 2} y={20}>
                {h === REL_LAYOUT.headers[k - 1] ? "" : h.toUpperCase()}
              </text>
            ))}

            {links.map((l) => {
              const hot = lit ? lit.has(l.from) && lit.has(l.to) : false;
              const learnedLink = isLearned(l);
              const reversed = POS[l.from].x > POS[l.to].x;
              const marker = learnedLink && !l.directed ? undefined : `url(#inf-arrow-${learnedLink ? "learned" : hot ? "hot" : "base"})`;
              return (
                <path
                  key={l.key}
                  className={`inf-edge is-${l.kind} ${hot ? "is-hot" : lit ? "is-dim" : ""}`}
                  d={linkPath(l.from, l.to)}
                  markerEnd={reversed ? undefined : marker}
                  markerStart={reversed ? marker : undefined}
                />
              );
            })}

            {REL_NODES.map((n) => {
              const { x, y } = POS[n.tag];
              const r = readings[n.tag];
              const isSel = selected === n.tag;
              const dim = lit && !lit.has(n.tag);
              const meta = `${r.value}${r.sigma !== null && n.type === "analog" ? ` · ${r.sigma.toFixed(1)}σ` : ""}`;
              return (
                <g
                  key={n.tag}
                  className={`inf-node ${STATUS_CLASS[r.status]} ${isSel ? "is-selected" : ""} ${dim ? "is-dim" : ""} ${r.suspect ? "is-suspect" : ""}`}
                  tabIndex={0}
                  role="button"
                  aria-pressed={isSel}
                  aria-label={`${n.label} (${n.tag}): ${meta}, ${r.status}`}
                  onPointerEnter={() => setHover(n.tag)}
                  onFocus={() => setHover(n.tag)}
                  onBlur={() => setHover(null)}
                  onClick={() => setSelected(isSel ? null : n.tag)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelected(isSel ? null : n.tag);
                    }
                  }}
                >
                  <title>{`${n.tag} · ${n.name}`}</title>
                  <rect className="inf-box" x={x} y={y} width={NW} height={NH} rx="9" />
                  <text className="inf-label" x={x + 12} y={y + 19}>
                    {truncate(n.label)}
                  </text>
                  <text className="inf-meta" x={x + 12} y={y + 36}>
                    {meta}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        {learned.length === 0 && filter === "learned" && (
          <p className="inf-note">
            No unexplained couplings: every sensor&apos;s residual (reading − reference model) is independent noise. Couplings
            with |r| ≥ {LEARN_R} over the last 3 h that no specified link explains appear here.
          </p>
        )}
      </section>

      {selected ? (
        <NodeDetail tag={selected} frame={frame} reading={readings[selected]} learned={learned} onSelect={setSelected} />
      ) : (
        <section className="rel-card rel-empty">Select a sensor to see its model equation, upstream drivers, downstream signals and live sensitivities.</section>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Selected sensor                                                     */
/* ------------------------------------------------------------------ */

function NodeDetail({
  tag,
  frame,
  reading,
  learned,
  onSelect,
}: {
  tag: string;
  frame: SimFrame;
  reading: Reading;
  learned: LearnedLink[];
  onSelect: (tag: string) => void;
}) {
  const node = NODE_BY_TAG[tag];
  const eq = EQUATION_BY_TARGET[tag];
  const all: RelLink[] = [...SPEC_LINKS, ...learned];
  const up = all.filter((l) => l.to === tag);
  const down = all.filter((l) => l.from === tag);
  const witnessFor = Object.entries(WITNESSES).filter(([, ws]) => ws.includes(tag)).map(([d]) => NODE_BY_TAG[d].label);
  const witnessedBy = WITNESSES[tag]?.map((t) => NODE_BY_TAG[t].label);

  return (
    <section className="rel-card inf-detail">
      <div className="rel-card-head">
        <div>
          <h3 className="rel-card-title">
            {node.label} <span className="rel-muted">· {node.tag === AMBIENT ? "estimate" : node.tag}</span>
          </h3>
          <span className="rel-pair-names">{node.subName}</span>
        </div>
        <span className={`rel-chip inf-chip ${STATUS_CLASS[reading.status]}`}>{reading.suspect ? "Suspect" : reading.status}</span>
      </div>

      <dl className="rel-kv">
        <div>
          <dt>Live</dt>
          <dd>{reading.value}</dd>
        </div>
        <div>
          <dt>Model</dt>
          <dd>{reading.model ?? "—"}</dd>
        </div>
        <div>
          <dt>Residual</dt>
          <dd>{reading.sigma !== null && node.type === "analog" ? `${reading.sigma.toFixed(1)}σ` : "—"}</dd>
        </div>
        <div>
          <dt>Expected from</dt>
          <dd className="inf-expr">{eq ? `${eq.expr} · ${eq.ref}` : node.tag === AMBIENT ? "Median of 12 support bearings − offsets · D5 Table 9.5" : "Measured input"}</dd>
        </div>
        {(witnessFor.length > 0 || witnessedBy) && (
          <div>
            <dt>Witness vote</dt>
            <dd>{witnessedBy ? `Checked by ${witnessedBy.join(", ")}` : `Witness for ${witnessFor.join(", ")}`} · D5 Table 9.6</dd>
          </div>
        )}
      </dl>

      <div className="inf-lists">
        <LinkTable title="Driven by" links={up} side="from" frame={frame} onSelect={onSelect} />
        <LinkTable title="Drives" links={down} side="to" frame={frame} onSelect={onSelect} />
      </div>
    </section>
  );
}

const KIND_LABEL: Record<RelLink["kind"], string> = { model: "Model", derived: "Calculated", rule: "Rule", learned: "Learned" };

function LinkTable({
  title,
  links,
  side,
  frame,
  onSelect,
}: {
  title: string;
  links: RelLink[];
  side: "from" | "to";
  frame: SimFrame;
  onSelect: (tag: string) => void;
}) {
  return (
    <div className="inf-list">
      <h4 className="inf-list-title">
        {title} <span className="rel-muted">{links.length}</span>
      </h4>
      {links.length === 0 ? (
        <div className="rel-empty rel-empty-inline">None</div>
      ) : (
        <div className="rel-table-wrap">
          <table className="rel-table">
            <thead>
              <tr>
                <th scope="col">Sensor</th>
                <th scope="col">Source</th>
                <th scope="col" className="num">
                  Sensitivity
                </th>
              </tr>
            </thead>
            <tbody>
              {links.map((l) => {
                const other = NODE_BY_TAG[l[side]];
                const s = sensitivity(frame, l);
                const learned = l.kind === "learned" ? (l as LearnedLink) : null;
                return (
                  <tr
                    key={l.key}
                    tabIndex={0}
                    onClick={() => onSelect(other.tag)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelect(other.tag);
                      }
                    }}
                  >
                    <td>
                      <div className="rel-pair-text">
                        <span className="rel-pair-tags">{other.label}</span>
                        <span className="rel-pair-names">{other.tag === AMBIENT ? "estimate" : other.tag}</span>
                      </div>
                    </td>
                    <td>
                      <div className="rel-pair-text">
                        <span className={`inf-kind is-${l.kind}`}>{KIND_LABEL[l.kind]}</span>
                        <span className="rel-pair-names">{learned?.rule ? `Consistent with ${learned.rule}` : l.kind === "learned" ? l.note : l.ref}</span>
                      </div>
                    </td>
                    <td className="num">
                      {learned ? (
                        <span>
                          r {learned.r >= 0 ? "+" : MINUS}
                          {Math.abs(learned.r).toFixed(2)}
                          {learned.lag ? <small> · {learned.lag} min lag</small> : null}
                        </span>
                      ) : s !== null ? (
                        side === "from" ? fmtSens(s, NODE_BY_TAG[l.to], other) : fmtSens(s, other, NODE_BY_TAG[l.from])
                      ) : (
                        <span className="rel-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
