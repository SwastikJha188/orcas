"use client";

import React, { useMemo } from "react";
import { rowActivate } from "@/components/ui/row-activate";
import type { MachineAcquisition, MachineLivePoint } from "@/types/edge";
import { formatDuration, simTimeMs, type SimFrame } from "@/lib/kiln-sim/engine";
import { formatLocalTime } from "@/lib/time";
import type { PlantDefs } from "@/lib/plant-defs";
import type { AssetMachine } from "./assets-data";
import type { Tone } from "./assets-shell-ui";
import { CausalChain, KpiStrip, type ChainStep, type KpiItem } from "./analysis/an-ui";
import { QualityMark } from "./sensors-register";

import {
  CHECK_LABEL,
  D4_REQUIRED_TARGET_PCT,
  calcDefsFor,
  flaggedSince,
  formatSps,
  impactOf,
  isCalculated,
  isManual,
  isWired,
  methodFlagging,
  requiredAvailability,
  scannerEntryOf,
  slotOf,
  tagOf,
  validationMethods,
  type SensorRow,
} from "./sensors-model";

/* ==========================================================================
   Sensors page sections (prefix pg-sensors-): summary KPIs, signal validity
   and the acquisition chain. The register (with calculated values and
   coverage folded in) lives in sensors-register.tsx.
   ========================================================================== */

export interface SensorCounts {
  total: number;
  /** On a gateway channel: total − calculated − manual. */
  wired: number;
  calculated: number;
  /** Dated manual records (laboratory, handheld). */
  manual: number;
  numeric: number;
  onOff: number;
  q: Record<"valid" | "attention" | "nolive" | "suspect" | "invalid" | "stale" | "nodata", number>;
  status: Record<"Normal" | "Advisory" | "Critical", number>;
  cards: number;
  racks: number;
  /** Wired sensors with a gateway point in the edge registry. */
  linked: number;
  minRate: number | null;
  maxRate: number | null;
  outOfRange: number;
}

export interface SensorsCtx {
  machine: AssetMachine;
  rows: SensorRow[];
  counts: SensorCounts;
  /** Live engine frame (kiln fleet or pyro line; values are simulated), else null. */
  frame: SimFrame | null;
  acquisition: MachineAcquisition | null;
  /** MQTT history per pointId. */
  history: Record<string, number[]>;
  /** The machine has a live engine with an instrument specification (kiln fleet, pyro line). */
  hasSpec: boolean;
  /** The machine's catalog: `frame.defs`, or `defsFor(machine.id)`; null without a live engine. */
  defs: PlantDefs | null;
  timeZone?: string;
  selectedTag: string | null;
  select: (tag: string | null) => void;
  /** Changes when another page focuses a sensor (filters reset). */
  focusNonce: number;
  goTrends: (tag?: string | null) => void;
  goRack: () => void;
  goDevices: (point?: MachineLivePoint) => void;
  goSection: (id: string) => void;
}

export const SENSORS_SECTIONS = {
  summary: "sensors-summary",
  validity: "sensors-validity",
  register: "sensors-register",
  chain: "sensors-chain",
} as const;

/** Status tone only for something actually off-normal. */
const issueTone = (bad: number, warn: number): Tone | undefined => (bad ? "bad" : warn ? "warn" : undefined);

/* ================================================================== Summary */

export function SensorsSummary({ ctx }: { ctx: SensorsCtx }) {
  const { counts } = ctx;
  const flagged = counts.q.attention;
  const outside = counts.status.Advisory + counts.status.Critical;
  const rate =
    counts.minRate !== null && counts.maxRate !== null
      ? `${formatSps(counts.minRate)}${counts.maxRate !== counts.minRate ? ` – ${formatSps(counts.maxRate)}` : ""}`
      : "—";
  // Pyro line: D4 Table 11.1 acceptance is judged on the Required tags only.
  const req = requiredAvailability(ctx.frame);
  const items: KpiItem[] = [
    req
      ? {
          label: "Required tags valid",
          value: String(req.pct),
          unit: "%",
          tone: req.pct < D4_REQUIRED_TARGET_PCT ? "warn" : undefined,
          foot: `${req.valid} / ${req.total} Required · target ≥ ${D4_REQUIRED_TARGET_PCT} % (D4 Table 11.1) · all ${counts.q.valid} / ${counts.total}`,
        }
      : {
          label: "Valid data",
          value: String(counts.q.valid),
          unit: `/ ${counts.total}`,
          foot: counts.q.nolive ? `${counts.q.nolive} no live feed` : `${counts.numeric} numeric · ${counts.onOff} on/off`,
        },
    {
      label: "Flagged",
      value: String(flagged),
      unit: "sensors",
      tone: issueTone(counts.q.invalid + counts.q.nodata, counts.q.suspect + counts.q.stale),
      foot: `${counts.q.suspect} suspect · ${counts.q.invalid} invalid · ${counts.q.stale + counts.q.nodata} stale / no data`,
    },
    {
      label: "Outside limits",
      value: String(outside),
      unit: "sensors",
      tone: issueTone(counts.status.Critical, counts.status.Advisory),
      foot: `${counts.status.Critical} alarm · ${counts.status.Advisory} warning`,
    },
    {
      label: "On gateway points",
      value: String(counts.linked),
      unit: `/ ${counts.wired} wired`,
      tone: counts.wired && counts.linked < counts.wired ? "warn" : undefined,
      foot: `Sampling ${rate}`,
    },
  ];
  return <KpiStrip page items={items} label="Sensor summary" />;
}

/* ================================================================== Signal validity */

/**
 * Per-shift validity list (D5 Table 9.3 sensor health; Table 12.1 "every
 * shift: review suspect / invalid signals"): every sensor of this machine
 * flagged in the current shift, with minutes suspect / invalid / flagged only.
 */
function ShiftValidityTable({ ctx }: { ctx: SensorsCtx }) {
  const sv = ctx.frame?.shiftValidity;
  const sh = sv?.current;
  if (!sh) return null;
  const at = (t: number) => formatLocalTime(simTimeMs(t), { seconds: false, timeZone: ctx.timeZone });
  const rows = Object.entries(sh.tags).sort((a, b) => b[1].invalid - a[1].invalid || b[1].suspect - a[1].suspect || b[1].flagOnly - a[1].flagOnly);
  const total = ctx.frame ? Object.keys(ctx.frame.signals).length : 0;
  const invalid = rows.filter(([, e]) => e.invalid > 0).length;
  const suspect = rows.filter(([, e]) => e.invalid === 0 && e.suspect > 0).length;
  const flagOnly = rows.length - invalid - suspect;
  const prev = sv?.previous;
  const prevN = prev ? Object.values(prev.tags).filter((e) => e.suspect + e.invalid > 0).length : null;
  return (
    <>
      <h4 className="pg-sensors-sub">This shift</h4>
      <p className="ast-caption">
        {sh.label} · {formatDuration(sh.minutes)} evaluated · {total - invalid - suspect} valid throughout · {suspect} suspect · {invalid} invalid
        {flagOnly ? ` · ${flagOnly} flagged only` : ""}
        {prevN !== null ? ` · previous shift: ${prevN} flagged` : ""}
      </p>
      {rows.length > 0 && (
        <div className="ui-table-container ast-table pg-sensors-table">
          <table className="ui-table" aria-label="Validity this shift">
            <thead>
              <tr>
                <th scope="col">Sensor</th>
                <th scope="col" className="pg-sensors-r">
                  Invalid
                </th>
                <th scope="col" className="pg-sensors-r">
                  Suspect
                </th>
                <th scope="col" className="pg-sensors-r">
                  Flag only
                </th>
                <th scope="col">First / last</th>
                <th scope="col">Latest note</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([tag, e]) => (
                <tr key={tag} className={`is-clickable ${ctx.selectedTag === tag ? "active" : ""}`} {...rowActivate(() => ctx.select(ctx.selectedTag === tag ? null : tag), ctx.selectedTag === tag)}>
                  <td className="ast-cell-title ast-num">{tag}</td>
                  <td className="pg-sensors-r ast-num">{e.invalid ? formatDuration(e.invalid) : <span className="ast-muted">—</span>}</td>
                  <td className="pg-sensors-r ast-num">{e.suspect ? formatDuration(e.suspect) : <span className="ast-muted">—</span>}</td>
                  <td className="pg-sensors-r ast-num">{e.flagOnly ? formatDuration(e.flagOnly) : <span className="ast-muted">—</span>}</td>
                  <td className="ast-num">
                    {at(e.first)} – {at(e.last)}
                  </td>
                  <td>
                    <span className="pg-sensors-wrap ast-muted">{e.note}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export function SensorsValidity({ ctx }: { ctx: SensorsCtx }) {
  const { rows, frame } = ctx;
  const flagged = rows.filter((r) => r.q.quality !== "Valid" && r.q.quality !== "No live feed");
  const dbTags = useMemo(() => new Set(rows.map(tagOf)), [rows]);
  const methods = validationMethods(ctx.defs);

  return (
    <section className="ast-card pg-table-card pg-sensors-card" aria-label="Signal validity">
      {flagged.length > 0 && (
        <>
          <h4 className="pg-sensors-sub">Flagged</h4>
          <div className="ui-table-container ast-table pg-sensors-table">
            <table className="ui-table" aria-label="Flagged sensors">
              <thead>
                <tr>
                  <th scope="col">Sensor</th>
                  <th scope="col">Data</th>
                  <th scope="col">Check</th>
                  <th scope="col">Rule</th>
                  <th scope="col">Since</th>
                  <th scope="col" className="pg-sensors-r">
                    Rules held
                  </th>
                  <th scope="col">Health input</th>
                  <th scope="col">Finding</th>
                </tr>
              </thead>
              <tbody>
                {flagged.map((r) => {
                  const tag = tagOf(r);
                  const since = frame ? flaggedSince(frame.events, tag) : null;
                  const impact = impactOf(tag, ctx.defs);
                  return (
                    <tr key={tag} className={`is-clickable ${ctx.selectedTag === tag ? "active" : ""}`} {...rowActivate(() => ctx.select(ctx.selectedTag === tag ? null : tag), ctx.selectedTag === tag)}>
                      <td>
                        <span className="ast-cell-stack">
                          <span className="ast-cell-title ast-num">{tag}</span>
                          <span className="ast-cell-sub pg-sensors-clip">{r.name}</span>
                        </span>
                      </td>
                      <td>
                        <QualityMark row={r} />
                      </td>
                      <td>{r.q.check ? CHECK_LABEL[r.q.check] : "—"}</td>
                      <td className="ast-num">{r.q.rule ?? "—"}</td>
                      <td className="ast-num">
                        {since !== null && frame ? (
                          <span className="ast-cell-stack">
                            <span>{formatLocalTime(simTimeMs(since), { seconds: false, timeZone: ctx.timeZone })}</span>
                            <span className="ast-cell-sub">{formatDuration(frame.t - since)}</span>
                          </span>
                        ) : r.livePoint?.live.updatedAt ? (
                          formatLocalTime(r.livePoint.live.updatedAt, { seconds: false, timeZone: ctx.timeZone })
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="pg-sensors-r ast-num" title={impact.rules.map((x) => `${x.id} ${x.name}`).join("\n")}>
                        {impact.rules.length}
                      </td>
                      <td>{impact.health ? impact.health.sub : "—"}</td>
                      <td>
                        <span className="pg-sensors-wrap ast-muted">{r.q.note}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {frame?.shiftValidity?.current && <ShiftValidityTable ctx={ctx} />}

      {ctx.hasSpec && frame && (
        <>
          <h4 className="pg-sensors-sub">Checks</h4>
          <div className="ui-table-container ast-table pg-sensors-table">
            <table className="ui-table" aria-label="Validation checks">
              <thead>
                <tr>
                  <th scope="col">Method</th>
                  <th scope="col">Check</th>
                  <th scope="col">Rule</th>
                  <th scope="col">Criterion</th>
                  <th scope="col" className="pg-sensors-r">
                    Covers
                  </th>
                  <th scope="col" className="pg-sensors-r">
                    Flagged
                  </th>
                </tr>
              </thead>
              <tbody>
                {methods.map((m) => {
                  const covered = m.tags.filter((t) => dbTags.has(t)).length;
                  const now = flagged.filter((r) => methodFlagging(r, methods)?.id === m.id);
                  return (
                    <tr key={m.id}>
                      <td>
                        <span className="ast-cell-stack">
                          <span className="ast-cell-title">{m.method}</span>
                          <span className="ast-cell-sub">{m.appliesTo}</span>
                        </span>
                      </td>
                      <td>{CHECK_LABEL[m.check]}</td>
                      <td className="ast-num">{m.rule}</td>
                      <td>
                        <span className="pg-sensors-wrap ast-muted">{m.flagsWhen}</span>
                      </td>
                      <td className="pg-sensors-r ast-num">{covered}</td>
                      <td className="pg-sensors-r ast-num">
                        {!m.evaluated ? (
                          <span className="ast-muted">not evaluated</span>
                        ) : now.length ? (
                          <span className="pg-sensors-quality" data-tone="warn" title={now.map(tagOf).join(", ")}>
                            <span className="ast-chip-dot" aria-hidden="true" />
                            {now.length}
                          </span>
                        ) : (
                          <span className="ast-muted">0</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                <tr>
                  <td>
                    <span className="ast-cell-stack">
                      <span className="ast-cell-title">Instrument range</span>
                      <span className="ast-cell-sub">Analog sensors with a recorded range</span>
                    </span>
                  </td>
                  <td>{CHECK_LABEL.range}</td>
                  <td className="ast-muted">page</td>
                  <td>
                    <span className="pg-sensors-wrap ast-muted">Reading outside the instrument range</span>
                  </td>
                  <td className="pg-sensors-r ast-num">{rows.filter((r) => r.range && r.unit !== "state").length}</td>
                  <td className="pg-sensors-r ast-num">
                    {ctx.counts.outOfRange ? (
                      <span className="pg-sensors-quality" data-tone="bad">
                        <span className="ast-chip-dot" aria-hidden="true" />
                        {ctx.counts.outOfRange}
                      </span>
                    ) : (
                      <span className="ast-muted">0</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

/* ================================================================== Acquisition chain */

const GW_TONE: Record<string, Tone> = { online: "idle", stale: "warn", offline: "bad", waiting: "idle", disabled: "idle" };

export function SensorsChain({ ctx }: { ctx: SensorsCtx }) {
  const { rows, acquisition } = ctx;
  const gateways = acquisition?.gateways ?? [];
  const selected = ctx.selectedTag ? rows.find((r) => tagOf(r) === ctx.selectedTag) ?? null : null;
  const subject = selected ?? rows.find((r) => r.q.quality !== "Valid" && r.livePoint) ?? rows.find((r) => r.livePoint) ?? rows[0] ?? null;

  const steps: ChainStep[] = [];
  if (subject) {
    const p = subject.livePoint;
    const calc = isCalculated(subject);
    const manual = !calc && isManual(subject);
    const gw = p ? gateways.find((g) => g.id === p.gateway.id) : gateways[0];
    const { slot, module } = slotOf(subject.cardId);
    const sensorTone: Tone = subject.q.tone === "good" ? "idle" : subject.q.tone;
    steps.push({ id: "sensor", step: "Sensor", name: tagOf(subject), meta: subject.sensorType || subject.name, tone: sensorTone });
    if (calc) {
      const scanner = scannerEntryOf(ctx.defs, tagOf(subject));
      steps.push({
        id: "calc",
        step: scanner ? "Scanner map" : "Calculation",
        name: scanner ? `Shell scanner (${scanner.point})` : "Gateway analytics",
        meta: calcDefsFor(ctx.defs)[tagOf(subject)]?.formula ?? "calculated",
        tone: sensorTone,
      });
    } else if (manual) {
      steps.push({ id: "record", step: "Record", name: "Manual entry", meta: subject.sampleRate || "entered in ULTRON", tone: sensorTone });
    } else {
      steps.push({
        id: "card",
        step: "Card / channel",
        name: p ? `Card ${p.card} · ch ${p.channel}` : module || subject.cardId || "—",
        meta: p ? [p.cardInfo.model ?? p.cardInfo.type, p.address].filter(Boolean).join(" · ") : "not in edge registry",
        tone: p ? (p.live.state === "stale" ? "warn" : "idle") : "warn",
        onClick: p ? () => ctx.goDevices(p) : undefined,
        external: Boolean(p),
      });
      steps.push({
        id: "slot",
        step: "Rack slot",
        name: p?.cardInfo.note ?? slot,
        meta: p ? `${p.source.code} · ${p.source.protocol}` : subject.rackId.split(" (")[0] || "—",
        tone: "idle",
        onClick: ctx.goRack,
        external: true,
      });
    }
    // A manual record is entered in ULTRON; it has no gateway or broker hop.
    if (!manual) {
      steps.push({
        id: "gateway",
        step: "Gateway",
        name: p?.gateway.code ?? gw?.code ?? (subject.rackId.split(" (")[0] || "—"),
        meta: gw ? [gw.state, gw.ip].filter(Boolean).join(" · ") : "not registered",
        tone: gw ? GW_TONE[gw.state] ?? "idle" : "warn",
        onClick: () => ctx.goDevices(p),
        external: true,
      });
      steps.push({ id: "broker", step: "Broker", name: gw?.brokerName ?? "—", meta: gw?.brokerName ? "MQTT" : "none", tone: gw?.brokerName ? "idle" : "warn" });
    }
  }

  const sources = useMemo(() => {
    const map = new Map<string, { code: string; name: string; kind: string; protocol: string; gateway: string; cards: Set<string>; points: MachineLivePoint[] }>();
    for (const p of acquisition?.points ?? []) {
      const e = map.get(p.source.id) ?? { code: p.source.code, name: p.source.name, kind: p.source.kind, protocol: p.source.protocol, gateway: p.gateway.code, cards: new Set<string>(), points: [] };
      e.cards.add(p.card);
      e.points.push(p);
      map.set(p.source.id, e);
    }
    return [...map.values()].sort((a, b) => a.code.localeCompare(b.code));
  }, [acquisition]);

  const wiredUnlinked = rows.filter((r) => isWired(r) && !r.livePoint);
  const dash = <span className="ast-muted">—</span>;
  const n = (v: number) => (v ? v : <span className="ast-muted">0</span>);

  return (
    <section className="ast-card pg-table-card pg-sensors-card" aria-label="Acquisition chain">
      {subject && (
        <div className="pg-sensors-chain">
          <span className="pg-sensors-sub">{selected ? "Selected sensor" : "Signal path"}</span>
          <CausalChain steps={steps} label="Acquisition chain" />
        </div>
      )}
      <h4 className="pg-sensors-sub">Sources</h4>
      <div className="ui-table-container ast-table pg-sensors-table">
        <table className="ui-table" aria-label="Acquisition sources">
          <thead>
            <tr>
              <th scope="col">Source</th>
              <th scope="col">Kind · protocol</th>
              <th scope="col">Gateway</th>
              <th scope="col" className="pg-sensors-r">
                Cards
              </th>
              <th scope="col" className="pg-sensors-r">
                Sensors
              </th>
              <th scope="col" className="pg-sensors-r">
                Live
              </th>
              <th scope="col" className="pg-sensors-r">
                Stale
              </th>
              <th scope="col" className="pg-sensors-r">
                No data
              </th>
            </tr>
          </thead>
          <tbody>
            {sources.map((s) => {
              const live = s.points.filter((p) => p.live.state === "normal" || p.live.state === "alert" || p.live.state === "danger").length;
              const stale = s.points.filter((p) => p.live.state === "stale").length;
              const nodata = s.points.filter((p) => p.live.state === "nodata").length;
              return (
                <tr key={s.code}>
                  <td>
                    <span className="ast-cell-stack">
                      <span className="ast-cell-title ast-num">{s.code}</span>
                      <span className="ast-cell-sub">{s.name}</span>
                    </span>
                  </td>
                  <td>
                    {s.kind} · {s.protocol}
                  </td>
                  <td className="ast-num">{s.gateway}</td>
                  <td className="pg-sensors-r ast-num">{s.cards.size}</td>
                  <td className="pg-sensors-r ast-num">{s.points.length}</td>
                  <td className="pg-sensors-r ast-num">{n(live)}</td>
                  <td className="pg-sensors-r ast-num">{n(stale)}</td>
                  <td className="pg-sensors-r ast-num">{n(nodata)}</td>
                </tr>
              );
            })}
            {ctx.counts.calculated > 0 && (
              <tr>
                <td>
                  <span className="ast-cell-stack">
                    <span className="ast-cell-title">Gateway analytics</span>
                    <span className="ast-cell-sub">Calculated values</span>
                  </span>
                </td>
                <td>calculated</td>
                <td className="ast-num">{gateways[0]?.code ?? "—"}</td>
                <td className="pg-sensors-r">{dash}</td>
                <td className="pg-sensors-r ast-num">{ctx.counts.calculated}</td>
                <td className="pg-sensors-r ast-num">{n(rows.filter((r) => isCalculated(r) && r.live).length)}</td>
                <td className="pg-sensors-r">{dash}</td>
                <td className="pg-sensors-r">{dash}</td>
              </tr>
            )}
            {ctx.counts.manual > 0 && (
              <tr>
                <td>
                  <span className="ast-cell-stack">
                    <span className="ast-cell-title">Manual entry</span>
                    <span className="ast-cell-sub">Manual records</span>
                  </span>
                </td>
                <td>manual</td>
                <td>{dash}</td>
                <td className="pg-sensors-r">{dash}</td>
                <td className="pg-sensors-r ast-num">{ctx.counts.manual}</td>
                <td className="pg-sensors-r ast-num">{n(rows.filter((r) => !isCalculated(r) && isManual(r) && r.live).length)}</td>
                <td className="pg-sensors-r">{dash}</td>
                <td className="pg-sensors-r">{dash}</td>
              </tr>
            )}
            {wiredUnlinked.length > 0 && (
              <tr>
                <td>
                  <span className="ast-cell-stack">
                    <span className="ast-cell-title">Not on a gateway point</span>
                    <span className="ast-cell-sub pg-sensors-clip" title={wiredUnlinked.map(tagOf).join(", ")}>
                      {wiredUnlinked.slice(0, 3).map(tagOf).join(", ")}
                      {wiredUnlinked.length > 3 ? ` +${wiredUnlinked.length - 3}` : ""}
                    </span>
                  </span>
                </td>
                <td>{dash}</td>
                <td>{dash}</td>
                <td className="pg-sensors-r">{dash}</td>
                <td className="pg-sensors-r">
                  <span className="pg-sensors-quality" data-tone="warn">
                    <span className="ast-chip-dot" aria-hidden="true" />
                    <span className="ast-num">{wiredUnlinked.length}</span>
                  </span>
                </td>
                <td className="pg-sensors-r">{dash}</td>
                <td className="pg-sensors-r">{dash}</td>
                <td className="pg-sensors-r">{dash}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
