"use client";

import React, { useMemo } from "react";
import { Table, type Column } from "@/components/ui";
import { StatusTag, type Tone } from "./assets-shell-ui";
import { validityTone } from "@/components/ui/status";
import type { MachineAcquisition, MachineLivePoint } from "@/types/edge";
import { formatDuration, simTimeMs, type SimFrame } from "@/lib/kiln-sim/engine";
import { formatLocalTime } from "@/lib/time";
import type { PlantDefs } from "@/lib/plant-defs";
import type { AssetMachine } from "./assets-data";
import { CausalChain, KpiStrip, type ChainStep, type KpiItem } from "./analysis/an-ui";

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
  unitText,
  validationMethods,
  type SensorRow,
} from "./sensors-model";

export interface SensorCounts {
  total: number;
  wired: number;
  calculated: number;
  manual: number;
  numeric: number;
  onOff: number;
  q: Record<"valid" | "attention" | "nolive" | "suspect" | "invalid" | "stale" | "nodata", number>;
  status: Record<"Normal" | "Advisory" | "Critical", number>;
  cards: number;
  racks: number;
  linked: number;
  minRate: number | null;
  maxRate: number | null;
  outOfRange: number;
}

export interface SensorsCtx {
  machine: AssetMachine;
  rows: SensorRow[];
  counts: SensorCounts;
  frame: SimFrame | null;
  acquisition: MachineAcquisition | null;
  history: Record<string, number[]>;
  hasSpec: boolean;
  defs: PlantDefs | null;
  timeZone?: string;
  selectedTag: string | null;
  select: (tag: string | null) => void;
  focusNonce: number;
  goTrends: (tag?: string | null) => void;
  goRack: () => void;
  goDevices: (point?: MachineLivePoint) => void;
  goSection: (id: string) => void;
}

export const SENSORS_SECTIONS = {
  summary: "sensors-summary",
  assemblies: "sensors-assemblies",
  validity: "sensors-validity",
  register: "sensors-register",
  chain: "sensors-chain",
} as const;

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
  const req = requiredAvailability(ctx.frame);
  const items: KpiItem[] = [
    req
      ? {
          label: "Required tags valid",
          value: String(req.pct),
          unit: "%",
          tone: req.pct < D4_REQUIRED_TARGET_PCT ? "warn" : undefined,
          foot: `${req.valid} / ${req.total} required · all ${counts.q.valid} / ${counts.total}`,
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
      foot: `${counts.q.suspect} suspect · ${counts.q.invalid} invalid · ${counts.q.stale + counts.q.nodata} stale`,
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

/* ================================================================== Sub-assemblies */

export const assemblyOf = (r: SensorRow) => r.subAssembly || r.component || "Unassigned";

/** Sub-assembly sensor summary table with inline stacked validity bar. */
export function SensorsAssemblies({ ctx, activeId, onPick }: { ctx: SensorsCtx; activeId: string | null; onPick: (id: string, label: string, tags: string[]) => void }) {
  const groups = useMemo(() => {
    const map = new Map<string, SensorRow[]>();
    for (const r of ctx.rows) {
      const k = assemblyOf(r);
      map.set(k, [...(map.get(k) ?? []), r]);
    }
    const rank = (list: SensorRow[]) =>
      list.some((r) => r.status === "Critical") ? 0 : list.some((r) => r.status === "Advisory") ? 1 : list.some((r) => r.q.tone === "bad" || r.q.tone === "warn") ? 2 : 3;
    return [...map.entries()].sort((a, b) => rank(a[1]) - rank(b[1]) || a[0].localeCompare(b[0]));
  }, [ctx.rows]);

  const cols: Column<[string, SensorRow[]]>[] = [
    {
      key: "name",
      header: "Sub-assembly",
      width: "240px",
      render: ([name]) => <strong>{name}</strong>,
    },
    {
      key: "count",
      header: "Sensors",
      width: "100px",
      render: ([, list]) => <span className="ast-num">{list.length}</span>,
    },
    {
      key: "validity",
      header: "Valid data",
      width: "220px",
      render: ([, list]) => {
        const valid = list.filter((r) => r.q.quality === "Valid").length;
        const nolive = list.filter((r) => r.q.quality === "No live feed").length;
        const flagged = list.length - valid - nolive;
        const pct = (n: number) => `${(n / list.length) * 100}%`;
        return (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="ast-num" style={{ minWidth: 48 }}>
              {valid} / {list.length}
            </span>
            <span className="ui-tile-stack" style={{ flex: 1, minWidth: 90 }} role="img" aria-label={`${valid} valid, ${flagged} flagged`}>
              {valid > 0 && <i style={{ width: pct(valid) }} />}
              {flagged > 0 && <i data-tone="warn" style={{ width: pct(flagged) }} />}
              {nolive > 0 && <i className="is-empty" style={{ width: pct(nolive) }} />}
            </span>
          </div>
        );
      },
    },
    {
      key: "status",
      header: "Limit status",
      width: "160px",
      render: ([, list]) => {
        const alarm = list.filter((r) => r.status === "Critical").length;
        const warn = list.filter((r) => r.status === "Advisory").length;
        if (alarm > 0) return <StatusTag tone="bad" label={`${alarm} alarm${warn ? ` · ${warn} warn` : ""}`} />;
        if (warn > 0) return <StatusTag tone="warn" label={`${warn} warning`} />;
        return <StatusTag tone="good" label="Normal" />;
      },
    },
    {
      key: "worst",
      header: "Off-normal reading",
      render: ([, list]) => {
        const worst = list.filter((r) => r.status !== "Normal").sort((a, b) => (a.status === "Critical" ? -1 : b.status === "Critical" ? 1 : 0))[0];
        if (!worst) return <span className="ast-muted">All within limits</span>;
        return (
          <span className="ast-num">
            <strong>{tagOf(worst)}</strong>: {worst.value} {unitText(worst)}
          </span>
        );
      },
    },
  ];

  return (
    <section className="ast-card pg-table-card" aria-label="Sub-assemblies">
      <Table
        columns={cols}
        data={groups}
        keyExtractor={([name]) => name}
        onRowClick={([name, list]) => onPick(name, name, list.map(tagOf))}
      />
    </section>
  );
}

/* ================================================================== Signal validity */

export function SensorsValidity({ ctx }: { ctx: SensorsCtx }) {
  const { rows, frame } = ctx;
  const flagged = rows.filter((r) => r.q.quality !== "Valid" && r.q.quality !== "No live feed");
  const dbTags = useMemo(() => new Set(rows.map(tagOf)), [rows]);
  const methods = validationMethods(ctx.defs);
  const ranged = rows.filter((r) => r.range && r.unit !== "state").length;

  const flaggedCols: Column<SensorRow>[] = [
    { key: "tag", header: "Sensor", width: "120px", render: (r) => <span className="ast-mono">{tagOf(r)}</span> },
    { key: "name", header: "Parameter", width: "220px", render: (r) => <strong>{r.name}</strong> },
    {
      key: "value",
      header: "Reading",
      width: "130px",
      render: (r) => (
        <span className="ast-num">
          {r.value || "—"} {unitText(r)}
        </span>
      ),
    },
    {
      key: "quality",
      header: "Status",
      width: "120px",
      render: (r) => <StatusTag tone={validityTone(r.q.quality)} label={r.q.quality} />,
    },
    {
      key: "check",
      header: "Validation check",
      width: "180px",
      render: (r) => (r.q.check ? CHECK_LABEL[r.q.check] : "—"),
    },
    {
      key: "rule",
      header: "Rule",
      width: "110px",
      render: (r) => <span className="ast-mono">{r.q.rule ?? "—"}</span>,
    },
    {
      key: "note",
      header: "Impact / Detail",
      render: (r) => {
        const tag = tagOf(r);
        const impact = impactOf(tag, ctx.defs);
        const since = frame ? flaggedSince(frame.events, tag) : null;
        const dur = since !== null && frame ? ` (${formatDuration(frame.t - since)})` : "";
        return [r.q.note, impact.rules.length ? `${impact.rules.length} rules held` : null].filter(Boolean).join(" · ") + dur || "—";
      },
    },
  ];

  const checkRows = useMemo(() => {
    const list = methods.map((m) => {
      const covered = m.tags.filter((t) => dbTags.has(t)).length;
      const now = flagged.filter((r) => methodFlagging(r, methods)?.id === m.id);
      return {
        id: m.id,
        method: m.method,
        appliesTo: m.appliesTo,
        check: CHECK_LABEL[m.check],
        rule: m.rule,
        flaggedCount: m.evaluated ? now.length : null,
        covered,
        detail: now.length ? now.map(tagOf).join(", ") : m.flagsWhen,
      };
    });
    list.push({
      id: "range",
      method: "Instrument range",
      appliesTo: "Analog sensors with calibrated range",
      check: CHECK_LABEL.range,
      rule: "R-DQ-01",
      flaggedCount: ctx.counts.outOfRange,
      covered: ranged,
      detail: ctx.counts.outOfRange ? rows.filter((r) => r.outOfRange).map(tagOf).join(", ") : "Reading outside calibrated physical range",
    });
    return list;
  }, [methods, dbTags, flagged, ctx.counts.outOfRange, ranged, rows]);

  const checkCols: Column<(typeof checkRows)[number]>[] = [
    { key: "method", header: "Validation check", width: "210px", render: (m) => <strong>{m.method}</strong> },
    { key: "applies", header: "Applies to", width: "220px", render: (m) => m.appliesTo },
    { key: "rule", header: "Rule", width: "110px", render: (m) => <span className="ast-mono">{m.rule}</span> },
    {
      key: "flagged",
      header: "Flagged / Covered",
      width: "150px",
      render: (m) =>
        m.flaggedCount === null ? (
          <span className="ast-muted">Not evaluated</span>
        ) : (
          <StatusTag tone={m.flaggedCount > 0 ? "warn" : "good"} label={`${m.flaggedCount} / ${m.covered}`} />
        ),
    },
    { key: "detail", header: "Condition", render: (m) => m.detail },
  ];

  return (
    <>
      {flagged.length > 0 && (
        <section className="ast-card pg-table-card" aria-label="Flagged sensors">
          <div className="ast-card-head">
            <h4 className="ast-card-title">Flagged sensors ({flagged.length} of {rows.length})</h4>
          </div>
          <Table
            columns={flaggedCols}
            data={flagged}
            keyExtractor={(r) => tagOf(r)}
            onRowClick={(r) => ctx.select(ctx.selectedTag === tagOf(r) ? null : tagOf(r))}
          />
        </section>
      )}

      {ctx.hasSpec && frame && (
        <section className="ast-card pg-table-card" aria-label="Validation checks">
          <div className="ast-card-head">
            <h4 className="ast-card-title">Sensor validation checks</h4>
          </div>
          <Table columns={checkCols} data={checkRows} keyExtractor={(m) => m.id} />
        </section>
      )}
    </>
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

  const sourceCols: Column<(typeof sources)[number]>[] = [
    { key: "code", header: "Source ID", width: "140px", render: (s) => <span className="ast-mono">{s.code}</span> },
    { key: "name", header: "Name", render: (s) => <strong>{s.name}</strong> },
    { key: "protocol", header: "Protocol", width: "160px", render: (s) => `${s.kind} · ${s.protocol}` },
    { key: "gateway", header: "Gateway", width: "150px", render: (s) => <span className="ast-mono">{s.gateway}</span> },
    { key: "cards", header: "Cards", width: "90px", render: (s) => <span className="ast-num">{s.cards.size}</span> },
    {
      key: "points",
      header: "Live / Total sensors",
      width: "160px",
      render: (s) => {
        const live = s.points.filter((p) => p.live.state === "normal" || p.live.state === "alert" || p.live.state === "danger").length;
        return (
          <span className="ast-num">
            {live} / {s.points.length}
          </span>
        );
      },
    },
  ];

  return (
    <>
      {subject && (
        <>
          <h4 className="ui-tiles-head">
            <b>Signal path</b>
            <span className="ast-num">{selected ? `selected · ${tagOf(subject)}` : tagOf(subject)}</span>
          </h4>
          <CausalChain steps={steps} label="Acquisition chain" />
        </>
      )}
      {sources.length > 0 && (
        <section className="ast-card pg-table-card" aria-label="Acquisition sources">
          <div className="ast-card-head">
            <h4 className="ast-card-title">
              Acquisition sources ({ctx.counts.linked} / {ctx.counts.wired} wired sensors linked)
            </h4>
          </div>
          <Table columns={sourceCols} data={sources} keyExtractor={(s) => s.code} onRowClick={(s) => ctx.goDevices(s.points[0])} />
        </section>
      )}
    </>
  );
}
