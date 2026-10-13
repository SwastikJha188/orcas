"use client";

import React, { useMemo, useRef, useState } from "react";
import { PillButton, PillNav } from "@/components/ui";
import type { InsightsResponse } from "@/server/services/insights-service";
import { InfluenceMap } from "./influence-map";
import "./relationships.css";

type PrognosisData = InsightsResponse["prognosis"];

export interface RelationshipsModuleProps {
  data: PrognosisData;
  onBack?: () => void;
}

/* ------------------------------------------------------------------ */
/* Model                                                              */
/* ------------------------------------------------------------------ */

/** |r| at or above this counts as a significant coupling. */
const SIG = 0.5;

interface SensorMeta {
  tag: string;
  name: string;
  unit: string;
  category: string;
  subsystem: string;
}

interface Joint {
  xs: number[];
  ys: number[];
  rolling: number[];
  slope: number;
  intercept: number;
}

interface Pair {
  key: string;
  i: number;
  j: number;
  a: SensorMeta;
  b: SensorMeta;
  r: number;
  /** Paired samples behind r (payload), or the joint history length. */
  n: number | null;
  k: number | null;
  joint: Joint | null;
}

const CATEGORY: Array<[RegExp, string]> = [
  [/^VIB/, "Vibration"],
  [/^TMP/, "Temperature"],
  [/^PRS/, "Pressure"],
  [/^ELE/, "Electrical"],
];

/** Sensor metadata; the sub-assembly comes from the payload's hierarchy locations (DB catalog / sim signal defs). */
function resolveMeta(tag: string, data: PrognosisData): SensorMeta {
  const f = data.forecasts[tag]?.["24h"] ?? Object.values(data.forecasts[tag] ?? {})[0];
  const category = CATEGORY.find(([re]) => re.test(tag))?.[1] ?? "Process";
  const loc = data.locations?.[tag];
  return {
    tag,
    name: f?.name || tag,
    unit: f?.unit || "",
    category,
    subsystem: loc?.subassembly || loc?.component || "",
  };
}

const mean = (v: number[]) => v.reduce((s, x) => s + x, 0) / (v.length || 1);
const sd = (v: number[]) => {
  const m = mean(v);
  return Math.sqrt(mean(v.map((x) => (x - m) ** 2)));
};

function pearson(x: number[], y: number[]): number {
  const mx = mean(x);
  const my = mean(y);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < x.length; i++) {
    sxy += (x[i] - mx) * (y[i] - my);
    sxx += (x[i] - mx) ** 2;
    syy += (y[i] - my) ** 2;
  }
  return sxx > 0 && syy > 0 ? sxy / Math.sqrt(sxx * syy) : 0;
}

/**
 * Measured paired samples from the payload history (same time base for both
 * sensors). Null below 5 pairs or when either series is flat — no samples are
 * generated.
 */
function buildJoint(hA: number[], hB: number[]): Joint | null {
  const n = Math.min(hA.length, hB.length);
  if (n < 5) return null;
  const xs = hA.slice(-n);
  const ys = hB.slice(-n);
  if (sd(xs) < 1e-12 || sd(ys) < 1e-12) return null;

  const w = Math.max(4, Math.round(n / 3));
  const rolling: number[] = [];
  for (let i = w; i <= n; i++) rolling.push(pearson(xs.slice(i - w, i), ys.slice(i - w, i)));

  const mx = mean(xs);
  const my = mean(ys);
  let sxy = 0;
  let sxx = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
  }
  const slope = sxx > 0 ? sxy / sxx : 0;
  return { xs, ys, rolling, slope, intercept: my - slope * mx };
}

/* ------------------------------------------------------------------ */
/* Formatting & scales                                                */
/* ------------------------------------------------------------------ */

const MINUS = "−";
const fmtR = (v: number) => `${v >= 0 ? "+" : MINUS}${Math.abs(v).toFixed(2)}`;

function fmtNum(v: number, step = Math.abs(v) / 100): string {
  const dp = Math.max(0, Math.min(3, -Math.floor(Math.log10(step || 1))));
  const s = Math.abs(v).toFixed(dp);
  return v < 0 ? `${MINUS}${s}` : s;
}

/** Diverging fill class: five |r| bins per arm, neutral below 0.2. */
function rClass(r: number): string {
  const a = Math.abs(r);
  const step = a < 0.2 ? 0 : a < 0.4 ? 1 : a < 0.6 ? 2 : a < 0.8 ? 3 : 4;
  return step === 0 ? "rel-c-z" : `rel-c-${r >= 0 ? "p" : "n"}${step}`;
}

function niceTicks(lo: number, hi: number, count = 4): { ticks: number[]; step: number } {
  const span = hi - lo || Math.abs(hi) || 1;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
  const ticks: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + step * 1e-6; v += step) ticks.push(v);
  return { ticks, step };
}

function paddedDomain(v: number[]): [number, number] {
  const lo = Math.min(...v);
  const hi = Math.max(...v);
  const pad = (hi - lo) * 0.08 || Math.max(Math.abs(hi) * 0.01, 0.01);
  return [lo - pad, hi + pad];
}

/* ------------------------------------------------------------------ */
/* Module                                                             */
/* ------------------------------------------------------------------ */

type View = "matrix" | "graph";
type TableFilter = "all" | "inverse" | "sig";

/** KLN-01 shows the live influence map of its reference model; other machines keep the measured correlation view. */
export function RelationshipsModule({ data, onBack }: RelationshipsModuleProps) {
  const isKiln = data.correlation.tags.some((t) => t.includes("-KLN-")) || Object.keys(data.forecasts).some((t) => t.includes("-KLN-"));
  return isKiln ? <InfluenceMap onBack={onBack} /> : <CorrelationView data={data} onBack={onBack} />;
}

function CorrelationView({ data, onBack }: RelationshipsModuleProps) {
  const { tags, matrix } = data.correlation;

  const [view, setView] = useState<View>("matrix");
  const [selectedKey, setSelectedKey] = useState<string>("");
  const [filter, setFilter] = useState<TableFilter>("all");
  const [showAll, setShowAll] = useState(false);

  const metas = useMemo(() => tags.map((t) => resolveMeta(t, data)), [tags, data]);

  const makePair = useMemo(
    () =>
      (a: SensorMeta, b: SensorMeta, r: number, i: number, j: number, n: number | null = null): Pair => {
        const link =
          data.influences[a.tag]?.find((l) => l.tag === b.tag) ??
          data.influences[b.tag]?.find((l) => l.tag === a.tag);
        const hA = data.forecasts[a.tag]?.["24h"]?.history ?? [];
        const hB = data.forecasts[b.tag]?.["24h"]?.history ?? [];
        const joint = buildJoint(hA, hB);
        return {
          key: `${a.tag}|${b.tag}`,
          i,
          j,
          a,
          b,
          r,
          n: n ?? (joint ? joint.xs.length : null),
          k: link ? link.coefficient : null,
          joint,
        };
      },
    [data.influences, data.forecasts]
  );

  /** Pairs inside the key-sensor matrix (drive the heat-map and graph cells). */
  const matrixPairs = useMemo<Pair[]>(() => {
    const out: Pair[] = [];
    for (let i = 1; i < tags.length; i++) {
      for (let j = 0; j < i; j++) {
        out.push(makePair(metas[j], metas[i], matrix[i]?.[j] ?? matrix[j]?.[i] ?? 0, i, j));
      }
    }
    return out;
  }, [tags, metas, matrix, makePair]);

  /** Matrix pairs plus every other forecast-sensor pair the payload computed (table + KPIs). */
  const pairs = useMemo<Pair[]>(() => {
    const seen = new Set(matrixPairs.flatMap((p) => [`${p.a.tag}|${p.b.tag}`, `${p.b.tag}|${p.a.tag}`]));
    const extra = (data.correlation.pairs ?? [])
      .filter((p) => !seen.has(`${p.a}|${p.b}`))
      .map((p) => makePair(resolveMeta(p.a, data), resolveMeta(p.b, data), p.r, -1, -1, p.n));
    return matrixPairs.concat(extra);
  }, [matrixPairs, data, makePair]);

  const ranked = useMemo(() => [...pairs].sort((x, y) => Math.abs(y.r) - Math.abs(x.r)), [pairs]);
  const pairByCell = useMemo(() => new Map(matrixPairs.map((p) => [`${p.i}-${p.j}`, p])), [matrixPairs]);

  const stats = useMemo(() => {
    return {
      strongest: ranked[0],
      sig: pairs.filter((p) => Math.abs(p.r) >= SIG).length,
      inverse: pairs.filter((p) => p.r <= -SIG).length,
    };
  }, [pairs, ranked]);

  const selected =
    pairs.find((p) => p.key === selectedKey) ?? ranked[0] ?? null;

  const tableRows = useMemo(() => {
    const rows =
      filter === "inverse"
        ? ranked.filter((p) => p.r <= -SIG)
        : filter === "sig"
        ? ranked.filter((p) => Math.abs(p.r) >= SIG)
        : ranked;
    return rows;
  }, [ranked, filter]);
  const visibleRows = showAll ? tableRows : tableRows.slice(0, 10);

  if (tags.length < 2 || !stats.strongest) {
    return (
      <div className="rel-root">
        <section className="rel-card rel-empty">No correlation data for this asset.</section>
      </div>
    );
  }

  const top = stats.strongest;

  return (
    <div className="rel-root">
      {/* 1 · Header */}
      <header className="rel-head">
        <div className="rel-head-left">
          <h2 className="rel-title">Sensor relationships</h2>
          <div className="rel-head-figs">
            <span className="rel-fig">
              <span className="rel-fig-label">Strongest</span>
              <span className="rel-fig-val">
                {top.a.tag} ↔ {top.b.tag}
              </span>
              <span className="rel-fig-num">
                {fmtR(top.r)} <small>r</small>
              </span>
            </span>
            <span className="rel-fig">
              <span className="rel-fig-label">Significant</span>
              <span className="rel-fig-num">
                {stats.sig} <small>links</small>
              </span>
            </span>
          </div>
        </div>
        <div className="rel-head-right">
          <PillNav
            items={[
              { id: "matrix", label: "Matrix" },
              { id: "graph", label: "Graph" },
            ]}
            activeId={view}
            onChange={(id) => setView(id as View)}
          />
          {onBack && (
            <PillButton variant="secondary" onClick={onBack} aria-label="Back to assets">
              Back
            </PillButton>
          )}
        </div>
      </header>

      {/* 3 · Primary visual + selected pair */}
      <section className="rel-main">
        <div className="rel-card rel-visual">
          <div className="rel-card-head">
            <h3 className="rel-card-title">{view === "matrix" ? "Correlation matrix" : "Coupling graph"}</h3>
            {view === "matrix" ? <MatrixLegend /> : <GraphLegend />}
          </div>
          {view === "matrix" ? (
            <CorrelationMatrix
              metas={metas}
              pairByCell={pairByCell}
              selectedKey={selected?.key ?? ""}
              onSelect={setSelectedKey}
            />
          ) : (
            <CouplingGraph metas={metas} pairs={matrixPairs} selectedKey={selected?.key ?? ""} onSelect={setSelectedKey} />
          )}
        </div>

        <aside className="rel-card rel-side" aria-label="Selected pair">
          {selected && <PairDetail pair={selected} />}
        </aside>
      </section>

      {/* 4 · Ranked coupling pairs */}
      <section className="rel-card rel-table-card">
        <div className="rel-card-head">
          <h3 className="rel-card-title">Coupling pairs</h3>
          <PillNav
            items={[
              { id: "all", label: `All ${pairs.length}` },
              { id: "sig", label: `|r| ≥ ${SIG.toFixed(2)} · ${stats.sig}` },
              { id: "inverse", label: `Inverse ${stats.inverse}` },
            ]}
            activeId={filter}
            onChange={(id) => setFilter(id as TableFilter)}
          />
        </div>
        <PairTable rows={visibleRows} selectedKey={selected?.key ?? ""} onSelect={setSelectedKey} />
        {tableRows.length > 10 && (
          <div className="rel-table-foot">
            <PillButton variant="secondary" onClick={() => setShowAll((v) => !v)}>
              {showAll ? "Show top 10" : `Show all ${tableRows.length}`}
            </PillButton>
          </div>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Matrix view                                                        */
/* ------------------------------------------------------------------ */

const CELL = 44;
const LABEL_W = 92;

function MatrixLegend() {
  const segs = Array.from({ length: 10 }, (_, k) => -0.9 + k * 0.2);
  return (
    <div className="rel-legend" aria-hidden="true">
      <span className="rel-legend-key">r</span>
      <svg className="rel-legend-bar" viewBox="0 0 160 22">
        {segs.map((mid, k) => (
          <rect key={k} className={rClass(mid)} x={k * 16 + 0.5} y="0" width="15" height="8" rx="1.5" />
        ))}
        {[-1, -0.5, 0, 0.5, 1].map((t) => (
          <text key={t} x={((t + 1) / 2) * 160} y="20" textAnchor={t === -1 ? "start" : t === 1 ? "end" : "middle"}>
            {t === 0 ? "0" : fmtR(t).replace(/0+$/, "").replace(/\.$/, "")}
          </text>
        ))}
      </svg>
    </div>
  );
}

function CorrelationMatrix({
  metas,
  pairByCell,
  selectedKey,
  onSelect,
}: {
  metas: SensorMeta[];
  pairByCell: Map<string, Pair>;
  selectedKey: string;
  onSelect: (key: string) => void;
}) {
  const n = metas.length;
  const W = n * CELL + LABEL_W;
  const H = n * CELL;
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<{ i: number; j: number } | null>(null);
  const [cursor, setCursor] = useState<{ i: number; j: number }>({ i: 1, j: 0 });
  const hovered = hover ? pairByCell.get(`${hover.i}-${hover.j}`) : undefined;

  const moveTo = (i: number, j: number) => {
    const ni = Math.max(1, Math.min(n - 1, i));
    const nj = Math.max(0, Math.min(ni - 1, j));
    setCursor({ i: ni, j: nj });
    setHover({ i: ni, j: nj });
    svgRef.current?.querySelector<SVGRectElement>(`[data-cell="${ni}-${nj}"]`)?.focus();
  };

  const onKey = (e: React.KeyboardEvent, i: number, j: number, key: string) => {
    const map: Record<string, [number, number]> = {
      ArrowUp: [i - 1, j],
      ArrowDown: [i + 1, j],
      ArrowLeft: [i, j - 1],
      ArrowRight: [i, j + 1],
    };
    if (map[e.key]) {
      e.preventDefault();
      moveTo(...map[e.key]);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(key);
    }
  };

  return (
    <div className="rel-plot rel-plot-matrix" style={{ maxWidth: W * 1.25 }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Lower-triangle correlation matrix of ${n} sensors. Use arrow keys to move between cells, Enter to inspect a pair.`}
        onPointerLeave={() => setHover(null)}
      >
        {metas.map((m, i) => {
          const active = hover && (hover.i === i || hover.j === i);
          return (
            <g key={m.tag}>
              <line className="rel-diag-tick" x1={i * CELL + 4} x2={i * CELL + 4} y1={i * CELL + 10} y2={i * CELL + CELL - 10} />
              <text className={`rel-axis-label ${active ? "is-active" : ""}`} x={i * CELL + 10} y={i * CELL + CELL / 2} dominantBaseline="central">
                {m.tag}
              </text>
            </g>
          );
        })}
        {Array.from(pairByCell.values()).map((p) => {
          const x = p.j * CELL;
          const y = p.i * CELL;
          const isSel = p.key === selectedKey;
          const isCursor = cursor.i === p.i && cursor.j === p.j;
          return (
            <g key={p.key}>
              <rect
                data-cell={`${p.i}-${p.j}`}
                className={`rel-cell ${rClass(p.r)} ${isSel ? "is-selected" : ""}`}
                x={x + 1}
                y={y + 1}
                width={CELL - 2}
                height={CELL - 2}
                rx="4"
                tabIndex={isCursor ? 0 : -1}
                role="button"
                aria-pressed={isSel}
                aria-label={`${p.a.tag} and ${p.b.tag}, r ${fmtR(p.r)}`}
                onPointerEnter={() => setHover({ i: p.i, j: p.j })}
                onFocus={() => {
                  setCursor({ i: p.i, j: p.j });
                  setHover({ i: p.i, j: p.j });
                }}
                onBlur={() => setHover(null)}
                onClick={() => onSelect(p.key)}
                onKeyDown={(e) => onKey(e, p.i, p.j, p.key)}
              />
            </g>
          );
        })}
      </svg>
      {hovered && (
        <div
          className="rel-tip"
          style={{
            left: `${((hovered.j * CELL + CELL / 2) / W) * 100}%`,
            top: `${((hovered.i * CELL) / H) * 100}%`,
          }}
          role="presentation"
        >
          <strong>
            {fmtR(hovered.r)} <small>r</small>
          </strong>
          <span>
            {hovered.a.tag} ↔ {hovered.b.tag}
          </span>
          <span className="rel-tip-muted">{hovered.n ? `n ${hovered.n} paired samples` : "No paired history"}</span>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Graph view                                                         */
/* ------------------------------------------------------------------ */

const GW = 460;
const GH = 400;
const GR = 138;

function GraphLegend() {
  return (
    <div className="rel-legend" aria-hidden="true">
      <span className="rel-legend-item">
        <svg width="18" height="8" viewBox="0 0 18 8">
          <line className="rel-link pos" x1="1" x2="17" y1="4" y2="4" strokeWidth="2.5" />
        </svg>
        +r
      </span>
      <span className="rel-legend-item">
        <svg width="18" height="8" viewBox="0 0 18 8">
          <line className="rel-link neg" x1="1" x2="17" y1="4" y2="4" strokeWidth="2.5" />
        </svg>
        {MINUS}r
      </span>
      <span className="rel-legend-item">
        <svg width="46" height="10" viewBox="0 0 46 10">
          {[0.2, 0.5, 0.9].map((v, k) => (
            <line key={v} className="rel-link mute" x1={k * 16 + 1} x2={k * 16 + 13} y1="5" y2="5" strokeWidth={0.75 + v * 5} />
          ))}
        </svg>
        |r| 0.2 · 0.5 · 0.9
      </span>
    </div>
  );
}

function CouplingGraph({
  metas,
  pairs,
  selectedKey,
  onSelect,
}: {
  metas: SensorMeta[];
  pairs: Pair[];
  selectedKey: string;
  onSelect: (key: string) => void;
}) {
  const [hoverNode, setHoverNode] = useState<number | null>(null);
  const [hoverLink, setHoverLink] = useState<string | null>(null);
  const n = metas.length;
  const cx = GW / 2;
  const cy = GH / 2;

  const nodes = useMemo(
    () =>
      metas.map((m, k) => {
        const t = -Math.PI / 2 + (2 * Math.PI * k) / n;
        const cos = Math.cos(t);
        const sin = Math.sin(t);
        return {
          m,
          x: cx + GR * cos,
          y: cy + GR * sin,
          lx: cx + (GR + 14) * cos,
          ly: cy + (GR + 14) * sin,
          anchor: cos > 0.25 ? "start" : cos < -0.25 ? "end" : "middle",
          baseline: sin < -0.6 ? "auto" : sin > 0.6 ? "hanging" : "central",
        } as const;
      }),
    [metas, n, cx, cy]
  );

  const links = useMemo(
    () =>
      pairs
        .filter((p) => Math.abs(p.r) >= 0.2)
        .sort((a, b) => Math.abs(a.r) - Math.abs(b.r))
        .map((p) => {
          const A = nodes[p.j];
          const B = nodes[p.i];
          const mx = (A.x + B.x) / 2;
          const my = (A.y + B.y) / 2;
          const qx = cx + (mx - cx) * 0.18;
          const qy = cy + (my - cy) * 0.18;
          return {
            p,
            d: `M ${A.x} ${A.y} Q ${qx} ${qy} ${B.x} ${B.y}`,
            tx: 0.25 * A.x + 0.5 * qx + 0.25 * B.x,
            ty: 0.25 * A.y + 0.5 * qy + 0.25 * B.y,
            w: 0.75 + Math.abs(p.r) * 5,
          };
        }),
    [pairs, nodes, cx, cy]
  );

  const focusIdx = hoverNode;
  const selectStrongest = (k: number) => {
    const best = pairs
      .filter((p) => p.i === k || p.j === k)
      .reduce<Pair | null>((acc, p) => (!acc || Math.abs(p.r) > Math.abs(acc.r) ? p : acc), null);
    if (best) onSelect(best.key);
  };
  const tipLink = links.find((l) => l.p.key === hoverLink);

  return (
    <div className="rel-plot rel-plot-graph" style={{ maxWidth: GW * 1.2 }}>
      <svg viewBox={`0 0 ${GW} ${GH}`} role="img" aria-label={`Coupling graph of ${n} sensors; link width scales with |r|, colour with sign.`}>
        <circle className="rel-ring" cx={cx} cy={cy} r={GR} />
        {links.map((l) => {
          const touches = focusIdx !== null && (l.p.i === focusIdx || l.p.j === focusIdx);
          const isSel = l.p.key === selectedKey;
          const isHover = l.p.key === hoverLink;
          const dim = (focusIdx !== null && !touches) || (hoverLink !== null && !isHover);
          const strong = Math.abs(l.p.r) >= SIG;
          return (
            <g key={l.p.key}>
              <path
                className={`rel-link ${l.p.r >= 0 ? "pos" : "neg"} ${strong ? "" : "weak"} ${dim ? "dim" : ""} ${isSel ? "is-selected" : ""} ${touches || isHover ? "is-hot" : ""}`}
                d={l.d}
                strokeWidth={l.w + (isSel ? 1.5 : 0)}
              />
              <path
                className="rel-link-hit"
                d={l.d}
                tabIndex={strong ? 0 : -1}
                role="button"
                aria-pressed={isSel}
                aria-label={`${l.p.a.tag} and ${l.p.b.tag}, r ${fmtR(l.p.r)}`}
                onPointerEnter={() => setHoverLink(l.p.key)}
                onPointerLeave={() => setHoverLink(null)}
                onFocus={() => setHoverLink(l.p.key)}
                onBlur={() => setHoverLink(null)}
                onClick={() => onSelect(l.p.key)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(l.p.key);
                  }
                }}
              />
            </g>
          );
        })}
        {nodes.map((nd, k) => {
          const inSel = selectedKey.split("|").includes(nd.m.tag);
          const active = focusIdx === k || inSel;
          return (
            <g
              key={nd.m.tag}
              className={`rel-node ${active ? "is-active" : ""}`}
              tabIndex={0}
              role="button"
              aria-label={`${nd.m.tag}: inspect strongest link`}
              onPointerEnter={() => setHoverNode(k)}
              onPointerLeave={() => setHoverNode(null)}
              onFocus={() => setHoverNode(k)}
              onBlur={() => setHoverNode(null)}
              onClick={() => selectStrongest(k)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  selectStrongest(k);
                }
              }}
            >
              <circle className="rel-node-hit" cx={nd.x} cy={nd.y} r="14" />
              <circle className="rel-node-dot" cx={nd.x} cy={nd.y} r="6" />
              <text className="rel-axis-label" x={nd.lx} y={nd.ly} textAnchor={nd.anchor} dominantBaseline={nd.baseline}>
                {nd.m.tag}
              </text>
            </g>
          );
        })}
      </svg>
      {tipLink && (
        <div className="rel-tip" style={{ left: `${(tipLink.tx / GW) * 100}%`, top: `${(tipLink.ty / GH) * 100}%` }} role="presentation">
          <strong>
            {fmtR(tipLink.p.r)} <small>r</small>
          </strong>
          <span>
            {tipLink.p.a.tag} ↔ {tipLink.p.b.tag}
          </span>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Selected pair                                                      */
/* ------------------------------------------------------------------ */

const SW = 360;
const SH = 240;
const SM = { l: 46, r: 10, t: 10, b: 40 };

function PairDetail({ pair }: { pair: Pair }) {
  const unitA = pair.a.unit;
  const unitB = pair.b.unit;
  const curA = pair.joint?.xs.at(-1);
  const curB = pair.joint?.ys.at(-1);
  const slopeUnit = unitA && unitB ? `${unitB}/${unitA}` : "";

  return (
    <>
      <div className="rel-side-head">
        <div className="rel-side-pair">
          <span className="rel-side-tags">
            {pair.a.tag} ↔ {pair.b.tag}
          </span>
          <span className="rel-side-names">
            {pair.a.name} · {pair.b.name}
          </span>
          {(pair.a.subsystem || pair.b.subsystem) && (
            <span className="rel-side-names">
              {pair.a.subsystem === pair.b.subsystem
                ? pair.a.subsystem
                : `${pair.a.subsystem || "—"} · ${pair.b.subsystem || "—"}`}
            </span>
          )}
        </div>
        <StatusChip pair={pair} />
      </div>

      <div className="rel-side-fig">
        <span className="rel-side-r">{fmtR(pair.r)}</span>
        <span className="rel-side-r-unit">r</span>
        <RTrack r={pair.r} />
      </div>

      {pair.joint ? (
        <PairScatter pair={pair} joint={pair.joint} />
      ) : (
        <div className="rel-empty rel-empty-inline">No paired history recorded for this pair.</div>
      )}

      <dl className="rel-kv">
        <div>
          <dt>Samples</dt>
          <dd>{pair.n ?? "—"}</dd>
        </div>
        <div>
          <dt>Direction</dt>
          <dd>{Math.abs(pair.r) < 0.2 ? "None" : pair.r > 0 ? "Together" : "Opposite"}</dd>
        </div>
        <div>
          <dt>Slope</dt>
          <dd>
            {pair.joint ? fmtNum(pair.joint.slope) : "—"} <small>{slopeUnit}</small>
          </dd>
        </div>
        <div>
          <dt>Sensitivity k</dt>
          <dd>
            {pair.k === null ? "—" : fmtR(pair.k)} <small>%/%</small>
          </dd>
        </div>
        <div>
          <dt>{pair.a.tag}</dt>
          <dd>
            {curA === undefined ? "—" : fmtNum(curA)} <small>{unitA}</small>
          </dd>
        </div>
        <div>
          <dt>{pair.b.tag}</dt>
          <dd>
            {curB === undefined ? "—" : fmtNum(curB)} <small>{unitB}</small>
          </dd>
        </div>
      </dl>
    </>
  );
}

function StatusChip({ pair }: { pair: Pair }) {
  return <span className="rel-chip">{Math.abs(pair.r) < SIG ? "Weak" : pair.r > 0 ? "Coupled" : "Inverse"}</span>;
}

/** −1…+1 track: solid bar = r from 0. */
function RTrack({ r }: { r: number }) {
  const x = (v: number) => ((v + 1) / 2) * 100;
  return (
    <svg className="rel-rtrack" viewBox="0 0 100 12" preserveAspectRatio="none" role="img" aria-label={`r ${fmtR(r)}`}>
      <rect className="rel-rtrack-bg" x="0" y="4" width="100" height="4" rx="2" />
      <rect className={`rel-rtrack-fill ${r >= 0 ? "pos" : "neg"}`} x={Math.min(50, x(r))} y="4" width={Math.abs(x(r) - 50)} height="4" rx="2" />
      <line className="rel-rtrack-mid" x1="50" x2="50" y1="1" y2="11" />
    </svg>
  );
}

function PairScatter({ pair, joint }: { pair: Pair; joint: Joint }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const geo = useMemo(() => {
    const [x0, x1] = paddedDomain(joint.xs);
    const [y0, y1] = paddedDomain(joint.ys);
    const pw = SW - SM.l - SM.r;
    const ph = SH - SM.t - SM.b;
    const sx = (v: number) => SM.l + ((v - x0) / (x1 - x0)) * pw;
    const sy = (v: number) => SM.t + ph - ((v - y0) / (y1 - y0)) * ph;
    const xt = niceTicks(x0, x1, 4);
    const yt = niceTicks(y0, y1, 4);
    const n = joint.xs.length;
    const pts = joint.xs.map((xv, i) => ({ x: sx(xv), y: sy(joint.ys[i]), xv, yv: joint.ys[i], age: i / (n - 1) }));
    const clampY = (v: number) => Math.max(SM.t, Math.min(SM.t + ph, v));
    const fit = {
      x1: sx(x0),
      y1: clampY(sy(joint.intercept + joint.slope * x0)),
      x2: sx(x1),
      y2: clampY(sy(joint.intercept + joint.slope * x1)),
    };
    return { sx, sy, xt, yt, pts, fit, pw, ph };
  }, [joint]);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const box = svgRef.current?.getBoundingClientRect();
    if (!box) return;
    const px = ((e.clientX - box.left) / box.width) * SW;
    const py = ((e.clientY - box.top) / box.height) * SH;
    let best = -1;
    let bestD = 24 * 24;
    geo.pts.forEach((p, i) => {
      const d = (p.x - px) ** 2 + (p.y - py) ** 2;
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    });
    setHover(best >= 0 ? best : null);
  };

  const hp = hover !== null ? geo.pts[hover] : null;
  const last = geo.pts[geo.pts.length - 1];
  const n = geo.pts.length;

  return (
    <div className="rel-plot rel-plot-scatter">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SW} ${SH}`}
        role="img"
        aria-label={`Scatter of ${pair.b.tag} against ${pair.a.tag}, ${n} samples, regression slope ${fmtNum(joint.slope)}`}
        onPointerMove={onMove}
        onPointerLeave={() => setHover(null)}
      >
        {geo.yt.ticks.map((t) => (
          <g key={`y${t}`}>
            <line className="rel-grid" x1={SM.l} x2={SW - SM.r} y1={geo.sy(t)} y2={geo.sy(t)} />
            <text className="rel-tick" x={SM.l - 6} y={geo.sy(t)} textAnchor="end" dominantBaseline="central">
              {fmtNum(t, geo.yt.step)}
            </text>
          </g>
        ))}
        {geo.xt.ticks.map((t) => (
          <text key={`x${t}`} className="rel-tick" x={geo.sx(t)} y={SH - SM.b + 14} textAnchor="middle">
            {fmtNum(t, geo.xt.step)}
          </text>
        ))}
        <line className="rel-axis" x1={SM.l} x2={SW - SM.r} y1={SH - SM.b} y2={SH - SM.b} />
        <text className="rel-axis-title" x={SM.l + geo.pw / 2} y={SH - 4} textAnchor="middle">
          {pair.a.tag}
          {pair.a.unit ? ` (${pair.a.unit})` : ""}
        </text>
        <text className="rel-axis-title" transform={`translate(10 ${SM.t + geo.ph / 2}) rotate(-90)`} textAnchor="middle">
          {pair.b.tag}
          {pair.b.unit ? ` (${pair.b.unit})` : ""}
        </text>

        {geo.pts.map((p, i) => (
          <circle key={i} className="rel-pt" cx={p.x} cy={p.y} r="3.2" style={{ opacity: 0.25 + 0.65 * p.age }} />
        ))}
        <line className="rel-fit" x1={geo.fit.x1} y1={geo.fit.y1} x2={geo.fit.x2} y2={geo.fit.y2} />
        <circle className="rel-pt-last" cx={last.x} cy={last.y} r="5" />
        {hp && <circle className="rel-pt-hover" cx={hp.x} cy={hp.y} r="6" />}
      </svg>
      {hp && hover !== null && (
        <div className="rel-tip" style={{ left: `${(hp.x / SW) * 100}%`, top: `${(hp.y / SH) * 100}%` }} role="presentation">
          <strong>
            {fmtNum(hp.yv)} <small>{pair.b.unit}</small>
          </strong>
          <span>
            {fmtNum(hp.xv)} <small>{pair.a.unit}</small>
          </span>
          <span className="rel-tip-muted">{hover === n - 1 ? "Latest" : `t ${MINUS}${n - 1 - hover}`}</span>
        </div>
      )}
      <div className="rel-scatter-key">
        <span>
          <i className="rel-key-dot old" />
          Older
        </span>
        <span>
          <i className="rel-key-dot new" />
          Latest
        </span>
        <span>
          <i className="rel-key-line" />
          Fit
        </span>
        <span className="rel-scatter-n">n {n} measured</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ranked table                                                       */
/* ------------------------------------------------------------------ */

function RSpark({ values, r }: { values: number[]; r: number }) {
  if (values.length < 2) return <span className="rel-muted">—</span>;
  const lo = Math.min(...values, r) - 0.05;
  const hi = Math.max(...values, r) + 0.05;
  const span = Math.max(hi - lo, 0.3);
  const mid = (hi + lo) / 2;
  const y0 = mid - span / 2;
  const W = 80;
  const H = 22;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * (W - 4) + 2, H - 2 - ((v - y0) / span) * (H - 4)] as const);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg className="rel-spark" viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true">
      <path className="rel-spark-line" d={d} />
      <circle className={`rel-spark-end ${r >= 0 ? "pos" : "neg"}`} cx={lx} cy={ly} r="2.5" />
    </svg>
  );
}

function PairTable({ rows, selectedKey, onSelect }: { rows: Pair[]; selectedKey: string; onSelect: (k: string) => void }) {
  if (rows.length === 0) return <div className="rel-empty rel-empty-inline">No pairs match this filter.</div>;
  return (
    <div className="rel-table-wrap">
      <table className="rel-table" aria-label="Coupling pairs ranked by |r|">
        <thead>
          <tr>
            <th scope="col">Pair</th>
            <th scope="col" className="num">
              r
            </th>
            <th scope="col" className="num">
              n
            </th>
            <th scope="col">Rolling r</th>
            <th scope="col">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => {
            const isSel = p.key === selectedKey;
            return (
              <tr
                key={p.key}
                className={isSel ? "is-selected" : ""}
                tabIndex={0}
                aria-selected={isSel}
                onClick={() => onSelect(p.key)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(p.key);
                  }
                }}
              >
                <td>
                  <div className="rel-pair-cell">
                    <span className={`rel-badge ${p.r >= 0 ? "pos" : "neg"}`} aria-hidden="true">
                      <svg viewBox="0 0 16 16" width="14" height="14">
                        <circle cx="4" cy="8" r="2.5" />
                        <circle cx="12" cy="8" r="2.5" />
                        <path d="M6.5 8h3" />
                      </svg>
                    </span>
                    <span className="rel-pair-text">
                      <span className="rel-pair-tags">
                        {p.a.tag} ↔ {p.b.tag}
                      </span>
                      <span className="rel-pair-names">
                        {p.a.name} · {p.b.name}
                      </span>
                    </span>
                  </div>
                </td>
                <td className="num">
                  <div className="rel-r-cell">
                    <span className="rel-r-val">{fmtR(p.r)}</span>
                    <span className="rel-mini-track" aria-hidden="true">
                      <i
                        className={p.r >= 0 ? "pos" : "neg"}
                        style={p.r >= 0 ? { left: "50%", width: `${p.r * 50}%` } : { right: "50%", width: `${-p.r * 50}%` }}
                      />
                    </span>
                  </div>
                </td>
                <td className="num rel-muted">{p.n ?? "—"}</td>
                <td>
                  <RSpark values={p.joint?.rolling ?? []} r={p.r} />
                </td>
                <td>
                  <StatusChip pair={p} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
