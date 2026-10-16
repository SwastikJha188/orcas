"use client";

import React, { useMemo } from "react";
import type { CorrelationPair } from "@/server/services/insights-service";
import { fmt, healthStatus, isBaselineRisk, rangeText, roundHours, type RulRow } from "./prognosis-derive";
import { Tile, TileGrid } from "@/components/ui";
import { EvidenceChip, tagsForMode, toneFor, type ProgSectionProps } from "./prog-ui";

type Points = ProgSectionProps["data"]["condition"]["points"];

interface Evidence {
  tag: string;
  label: string;
  value: string;
  z: number | null;
  quality: string;
}

/** Degradation & evidence for the selected failure mode (render in a bare section): P-F bracket and health projection card, then contributing signals and changing couplings as cards. */
export function ProgDegradation({ data, analysis, rows, frame, mode }: ProgSectionProps) {
  const governing = useMemo(() => {
    const k = mode ?? data.risks.find((r) => !isBaselineRisk(r)) ?? null;
    const row: RulRow | undefined = k
      ? rows.find((r) => k.component.toLowerCase().includes(r.name.toLowerCase()) || k.id === `base-${r.id}`)
      : rows[0];
    return { k, row: row ?? rows[0] ?? null };
  }, [mode, data.risks, rows]);
  const { k, row } = governing;
  const tags = useMemo(() => tagsForMode(k, analysis, data), [k, analysis, data]);
  const systemId = useMemo(() => {
    const byTag = tags.map((t) => data.locations[t]?.systemId).find(Boolean);
    if (byTag) return byTag;
    return Object.values(data.locations).find((l) => l.subassemblyId === row?.id)?.systemId ?? null;
  }, [tags, data.locations, row]);

  const rule = frame && k ? frame.rules.find((r) => r.id === k.id) ?? null : null;
  const elapsedH = rule && rule.since !== null && frame ? Math.max(0, (frame.t - rule.since) / 60) : null;

  const evidence = useMemo<Evidence[]>(() => {
    const src = k ? analysis?.sources.find((x) => x.id === k.id) : undefined;
    return tags.map((t) => {
      const sig = frame?.signals[t];
      const e = src?.evidence.find((x) => x.tag === t);
      return {
        tag: t,
        label: e?.label ?? data.forecasts[t]?.[data.horizons[0]?.id ?? ""]?.name ?? t,
        value: e?.detail ?? (sig?.display ?? "—"),
        z: sig?.z ?? null,
        quality: sig ? sig.quality : "—",
      };
    });
  }, [k, tags, analysis, frame, data]);

  const changing = useMemo(
    () =>
      data.correlation.pairs
        .filter((p): p is CorrelationPair & { baseline: number; recent: number } => p.baseline !== undefined && p.recent !== undefined)
        .map((p) => ({ ...p, delta: p.recent - p.baseline }))
        .filter((p) => Math.abs(p.delta) >= 0.3 && Math.max(Math.abs(p.baseline), Math.abs(p.recent)) >= 0.5)
        .sort(
          (a, b) =>
            Number(tags.includes(b.a) || tags.includes(b.b)) - Number(tags.includes(a.a) || tags.includes(a.b)) ||
            Math.round(Math.abs(b.delta) * 5) - Math.round(Math.abs(a.delta) * 5),
        )
        .slice(0, 4),
    [data.correlation.pairs, tags],
  );

  if (data.condition.points.length < 2 || !row) return null;

  const sigma = (z: number | null) => (z === null ? "—" : `${z >= 0 ? "+" : "−"}${Math.abs(z).toFixed(1)}`);
  const validity = (q: string) => (q === "Good" ? "Valid" : q === "—" ? "No data" : q);

  return (
    <>
      <section className="ast-card pg-prog-card" aria-label="Degradation and health projection">
        <div className="pg-prog-pfhead">
          <span className="ast-cell-title">{row.name}</span>
          <span className="ast-muted">{k && !isBaselineRisk(k) ? `${k.fault} · ${k.id}` : "Health-index trend"}</span>
          {rule && (
            <span className="ast-muted ast-num">
              {rule.persistence} of {rule.threshold} samples · {rule.status === "ACTIVE" ? "confirmed" : "pending"}
            </span>
          )}
        </div>
        <PfBracket elapsedH={elapsedH} row={row} />
        <div className="pg-prog-chart-scroll">
          <HealthChart data={data} focus={systemId} />
        </div>
      </section>
      {evidence.length > 0 && (
        <>
          <h4 className="ui-tiles-head">Contributing signals</h4>
          <TileGrid label="Contributing signals" min={240} compact>
            {evidence.map((e) => {
              const r = readingParts(e.value);
              return (
                <Tile
                  key={e.tag}
                  title={<EvidenceChip tag={e.tag} />}
                  sub={<span title={e.label}>{e.label}</span>}
                  value={r.value}
                  unit={r.unit}
                  facts={[
                    { label: "σ vs model", value: sigma(e.z), tone: e.z !== null && Math.abs(e.z) >= 3 ? "warn" : undefined },
                    { label: "Validation", value: validity(e.quality), tone: e.quality !== "Good" && e.quality !== "—" ? "warn" : undefined },
                  ]}
                />
              );
            })}
          </TileGrid>
        </>
      )}
      {changing.length > 0 && (
        <>
          <h4 className="ui-tiles-head">Changing coupling</h4>
          <TileGrid label="Signal couplings changing" min={240} compact>
            {changing.map((p) => (
              <Tile
                key={`${p.a}|${p.b}`}
                className="pg-prog-ctile"
                title={
                  <span className="pg-prog-driver">
                    <EvidenceChip tag={p.a} />
                    <span className="ast-muted" aria-hidden="true">
                      ↔
                    </span>
                    <EvidenceChip tag={p.b} />
                  </span>
                }
                value={(p.delta >= 0 ? "+" : "−") + Math.abs(p.delta).toFixed(2)}
                unit="Δr"
                facts={[
                  { label: "Earlier r", value: p.baseline.toFixed(2) },
                  { label: "Last hour r", value: p.recent.toFixed(2) },
                ]}
              />
            ))}
          </TileGrid>
        </>
      )}
    </>
  );
}

/** "1,039 °C · −9.7σ vs model" → value "1,039", unit "°C" (σ has its own fact); free text stays whole. */
function readingParts(text: string): { value?: string; unit?: string } {
  const head = text.split(" · ")[0].trim();
  if (!head || head === "—") return {};
  const m = /^([+\-−]?[\d.,]+)\s*(.*)$/.exec(head);
  return m ? { value: m[1], unit: m[2] || undefined } : { value: head };
}

/* ------------------------------------------------------------------ */
/* P-F bracket: elapsed since P (first persistent detection) / remaining to F */

function PfBracket({ elapsedH, row }: { elapsedH: number | null; row: RulRow }) {
  const pre = elapsedH ?? 0;
  const span = pre + row.band.hi || 1;
  const x = (h: number) => `${((h + pre) / span) * 100}%`;
  const tone = toneFor(row.status);
  const t = tone === "warn" || tone === "bad" ? tone : undefined;
  return (
    <div className="pg-prog-pf" data-tone={t} role="img" aria-label={`Elapsed since detection ${elapsedH === null ? "unknown" : roundHours(elapsedH)}; remaining to failure ${rangeText(row.band.lo, row.band.hi)}`}>
      <div className="pg-prog-pf-track">
        {elapsedH !== null && <span className="pg-prog-pf-elapsed" style={{ left: 0, width: x(0) }} />}
        <span className="pg-prog-pf-band" style={{ left: x(row.band.lo), width: `${((row.band.hi - row.band.lo) / span) * 100}%` }} />
        <span className="pg-prog-pf-now" style={{ left: x(0) }} />
        <span className="pg-prog-pf-est" style={{ left: x(row.hours) }} />
        {elapsedH !== null && pre / span > 0.08 && <span className="pg-prog-pf-tag" style={{ left: 0 }}>P</span>}
        <span className="pg-prog-pf-tag" style={{ left: x(0) }}>
          now
        </span>
        <span className="pg-prog-pf-tag is-end" style={{ left: x(row.band.lo) }}>
          F
        </span>
      </div>
      <dl className="pg-prog-pf-legend">
        <div>
          <dt>Detected</dt>
          <dd className="ast-num">{elapsedH === null ? "—" : `${roundHours(elapsedH)} ago`}</dd>
        </div>
        <div>
          <dt>Now to failure</dt>
          <dd className="ast-num pg-prog-tone" data-tone={t}>
            {rangeText(row.band.lo, row.band.hi)}
          </dd>
        </div>
        <div>
          <dt>Required lead</dt>
          <dd className="ast-muted">Not set</dd>
        </div>
        <div>
          <dt>Health now</dt>
          <dd className="ast-num">{row.health.toFixed(0)} %</dd>
        </div>
      </dl>
    </div>
  );
}

/* ------------------------------------------------------------------ */

const W = 1120;
const H = 200;
const PAD = { l: 40, r: 170, t: 10, b: 22 };

function HealthChart({ data, focus }: { data: ProgSectionProps["data"]; focus: string | null }) {
  const { systems, points } = data.condition;
  const last = points[points.length - 1].day || 1;
  const all = points.flatMap((p) => [p.overall, ...Object.values(p.systems)]);
  const lo = Math.max(0, Math.floor((Math.min(60, ...all) - 5) / 10) * 10);
  const x = (d: number) => PAD.l + (d / last) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (v - lo) / (100 - lo)) * (H - PAD.t - PAD.b);
  const path = (pick: (p: Points[number]) => number | undefined) =>
    points
      .filter((p) => Number.isFinite(pick(p) ?? NaN))
      .map((p, i) => `${i ? "L" : "M"}${x(p.day).toFixed(1)},${y(pick(p)!).toFixed(1)}`)
      .join("");
  const end = points[points.length - 1];

  const labels = [{ id: "overall", name: "Machine", v: end.overall }, ...systems.map((s) => ({ id: s.id, name: s.name, v: end.systems[s.id] }))]
    .filter((l) => Number.isFinite(l.v))
    .sort((a, b) => b.v - a.v)
    .map((l) => ({ ...l, y: y(l.v) }));
  for (let i = 1; i < labels.length; i++) if (labels[i].y - labels[i - 1].y < 13) labels[i].y = labels[i - 1].y + 13;
  const xTicks = points.filter((p, i) => i === 0 || x(p.day) - x(points[i - 1].day) >= 40);

  return (
    <svg className="pg-prog-chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={labels.map((l) => `${l.name} ${fmt(l.v)} % at day ${end.day}`).join("; ")}>
      {[lo, (lo + 100) / 2, 100].map((v) => (
        <g key={v}>
          <line className="pg-prog-grid" x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} />
          <text className="pg-prog-axis" x={PAD.l - 8} y={y(v) + 4} textAnchor="end">
            {Math.round(v)}
          </text>
        </g>
      ))}
      {70 >= lo && <rect className="pg-prog-limband" x={PAD.l} width={W - PAD.r - PAD.l} y={y(70)} height={y(lo) - y(70)} />}
      <g data-tone="warn">
        <line className="pg-prog-lim" x1={PAD.l} x2={W - PAD.r} y1={y(85)} y2={y(85)} />
      </g>
      {70 >= lo && (
        <g data-tone="bad">
          <line className="pg-prog-lim" x1={PAD.l} x2={W - PAD.r} y1={y(70)} y2={y(70)} />
        </g>
      )}
      {xTicks.map((p) => (
        <text key={p.day} className="pg-prog-axis" x={x(p.day)} y={H - 4} textAnchor={p.day === 0 ? "start" : "middle"}>
          {p.day === 0 ? "now" : `${p.day} d`}
        </text>
      ))}
      {systems.map((s) => (
        <path
          key={s.id}
          className={`pg-prog-sysline ${s.id === focus ? "is-focus" : ""}`}
          data-tone={toneFor(healthStatus(end.systems[s.id] ?? 100))}
          d={path((p) => p.systems[s.id])}
        />
      ))}
      <path className="pg-prog-overall" d={path((p) => p.overall)} />
      {labels.map((l) => (
        <text key={l.id} className={`pg-prog-dlabel ${l.id === "overall" || l.id === focus ? "is-main" : ""}`} x={W - PAD.r + 8} y={l.y + 4}>
          {l.name.length > 18 ? `${l.name.slice(0, 17)}…` : l.name} {fmt(l.v)}
        </text>
      ))}
    </svg>
  );
}
