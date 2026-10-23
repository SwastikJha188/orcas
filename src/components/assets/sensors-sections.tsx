"use client";

import React, { useMemo, useState } from "react";
import { RestLine, Table, useFold, type Column } from "@/components/ui";
import { StatusTag, type Tone } from "./assets-shell-ui";
import { validityTone } from "@/components/ui/status";
import type { MachineAcquisition, MachineLivePoint } from "@shared/types/edge";
import { formatDuration, simTimeMs, type SimFrame } from "@shared/lib/kiln-sim/engine";
import { formatLocalTime } from "@/lib/time";
import type { PlantDefs } from "@shared/lib/plant-defs";
import type { MeasurementDto } from "@shared/types/monitoring";
import type { AssetMachine } from "./assets-data";
import { CausalChain, KpiStrip, type ChainStep, type KpiItem } from "./analysis/an-ui";
import { displayName } from "@/lib/display-name";

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
  QUALITY_LABEL,
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
  status: Record<"Normal" | "Alert" | "Critical", number>;
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
  /** True until the first wiring / live-reading answer (GET acquisition) arrives. */
  acquisitionLoading: boolean;
  history: Record<string, number[]>;
  hasSpec: boolean;
  defs: PlantDefs | null;
  /** DB measurements by tag (GET /api/measurements); empty while loading. */
  measurements: ReadonlyMap<string, MeasurementDto>;
  measurementList: ReadonlyArray<MeasurementDto>;
  /** Rule code → DB input tags (catalog reasons). */
  ruleInputs: ReadonlyMap<string, string[]>;
  timeZone?: string;
  selectedTag: string | null;
  select: (tag: string | null) => void;
  focusNonce: number;
  goTrends: (tag?: string | null) => void;
  goRack: () => void;
  goHealth?: () => void;
  /** Open the sensor in Analysis › Sensors (live machines only). */
  goInvestigate?: (tag: string) => void;
  goDevices: (point?: MachineLivePoint) => void;
  goSection: (id: string) => void;
  /** Tags of the part the page shows (`rows` are already only these); null for the whole machine. */
  scopeTags: ReadonlySet<string> | null;
}

export const SENSORS_SECTIONS = {
  summary: "sensors-summary",
  assemblies: "sensors-assemblies",
  validity: "sensors-validity",
  register: "sensors-register",
  chain: "sensors-chain",
} as const;

const issueTone = (bad: number, warn: number): Tone | undefined => (bad ? "bad" : warn ? "warn" : undefined);

/** Everyday name of each sensor check (by method id); the engineering name stays in the tooltip. */
const METHOD_PLAIN: Record<string, string> = {
  range: "Out of range or stuck",
  status: "Instrument reports a fault",
  plausibility: "Impossible jump",
  driven: "Related readings do not follow",
  witness: "Meter disagrees with two estimates",
  thermal: "Oxygen reading has no cause",
  noise: "Too noisy",
  band: "Too steady or too noisy",
  rate: "Changed too fast",
  neighbour: "Disagrees with related sensors",
  vibtmp: "Shaking without warming up",
  manual: "Disagrees with a hand reading",
};

/* ================================================================== Summary */

export function SensorsSummary({ ctx }: { ctx: SensorsCtx }) {
  const { counts } = ctx;
  const flagged = counts.q.attention;
  const outside = counts.status.Alert + counts.status.Critical;
  const rate =
    counts.minRate !== null && counts.maxRate !== null
      ? `${formatSps(counts.minRate)}${counts.maxRate !== counts.minRate ? ` – ${formatSps(counts.maxRate)}` : ""}`
      : "—";
  const req = requiredAvailability(ctx.frame, ctx.measurements, ctx.scopeTags);
  const items: KpiItem[] = [
    req
      ? {
          label: "Must-have sensors working",
          value: String(req.pct),
          unit: "%",
          tone: req.pct < D4_REQUIRED_TARGET_PCT ? "warn" : undefined,
          foot: `${req.valid} of ${req.total} must-have · ${counts.q.valid} of ${counts.total} overall`,
        }
      : {
          label: "Good readings",
          value: String(counts.q.valid),
          unit: `of ${counts.total}`,
          foot: counts.q.nolive ? `${counts.q.nolive} not live` : `${counts.numeric} give numbers · ${counts.onOff} give on or off`,
        },
    {
      label: "Doubtful readings",
      value: String(flagged),
      unit: "sensors",
      tone: issueTone(counts.q.invalid + counts.q.nodata, counts.q.suspect + counts.q.stale),
      foot: `${counts.q.suspect} may be wrong · ${counts.q.invalid} not usable · ${counts.q.stale + counts.q.nodata} not updating`,
    },
    {
      label: "Outside normal limits",
      value: String(outside),
      unit: "sensors",
      tone: issueTone(counts.status.Critical, counts.status.Alert),
      foot: `${counts.status.Critical} Critical · ${counts.status.Alert} Alert`,
    },
    {
      label: "Connected live",
      value: String(counts.linked),
      unit: `of ${counts.wired} wired`,
      tone: counts.wired && counts.linked < counts.wired ? "warn" : undefined,
      foot: `Read ${rate}`,
    },
  ];
  return <KpiStrip page items={items} label="Sensor summary" />;
}

/* ================================================================== Sub-assemblies */

export const assemblyOf = (r: SensorRow) => r.subAssembly || r.component || "Unassigned";

/** Sub-assembly sensor summary table with inline stacked validity bar. */
export function SensorsAssemblies({
  ctx,
  activeId,
  onPick,
}: {
  ctx: SensorsCtx;
  activeId: string | null;
  onPick: (id: string, label: string, tags: string[]) => void;
}) {
  const groups = useMemo(() => {
    const map = new Map<string, SensorRow[]>();
    for (const r of ctx.rows) {
      const k = assemblyOf(r);
      map.set(k, [...(map.get(k) ?? []), r]);
    }
    const rank = (list: SensorRow[]) =>
      list.some((r) => r.status === "Critical")
        ? 0
        : list.some((r) => r.status === "Alert")
          ? 1
          : list.some((r) => r.q.tone === "bad" || r.q.tone === "warn")
            ? 2
            : 3;
    return [...map.entries()].sort((a, b) => rank(a[1]) - rank(b[1]) || a[0].localeCompare(b[0]));
  }, [ctx.rows]);

  const cols: Column<[string, SensorRow[]]>[] = [
    {
      key: "name",
      header: "Part",
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
      header: "Good readings",
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
            <span className="ui-tile-stack" style={{ flex: 1, minWidth: 90 }} role="img" aria-label={`${valid} good, ${flagged} doubtful`}>
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
      header: "Status",
      width: "160px",
      render: ([, list]) => {
        const alarm = list.filter((r) => r.status === "Critical").length;
        const warn = list.filter((r) => r.status === "Alert").length;
        if (alarm > 0) return <StatusTag tone="bad" label={`${alarm} Critical${warn ? ` · ${warn} Alert` : ""}`} />;
        if (warn > 0) return <StatusTag tone="warn" label={`${warn} Alert`} />;
        return <StatusTag tone="good" label="Normal" />;
      },
    },
    {
      key: "worst",
      header: "Worst reading",
      render: ([, list]) => {
        const worst = list.filter((r) => r.status !== "Normal").sort((a, b) => (a.status === "Critical" ? -1 : b.status === "Critical" ? 1 : 0))[0];
        if (!worst) return <span className="ast-muted">All within normal limits</span>;
        return (
          <span className="ast-num" title={tagOf(worst)}>
            <strong>{displayName(worst.name)}</strong>: {worst.value} {unitText(worst)}
          </span>
        );
      },
    },
  ];

  // Parts whose readings are all good and within limits fold into one line; the picked part always shows.
  const quiet = ([name, list]: [string, SensorRow[]]) => name !== activeId && list.every((r) => r.status === "Normal" && r.q.quality === "Valid");
  const fold = useFold(groups, quiet);
  const shown = fold.shown;
  return (
    <section className="ast-card pg-table-card" aria-label="Machine parts">
      {shown.length > 0 && (
        <Table
          columns={cols}
          data={shown}
          keyExtractor={([name]) => name}
          selectedKey={activeId ?? undefined}
          onRowClick={([name, list]) => onPick(name, name, list.map(tagOf))}
        />
      )}
      <RestLine rest={fold.rest} shown={shown.length} noun="part" note="every reading good and within limits" open={fold.open} onToggle={fold.toggle} />
    </section>
  );
}

/* ================================================================== Signal validity */

export function SensorsValidity({ ctx }: { ctx: SensorsCtx }) {
  const { rows, frame } = ctx;
  const flagged = rows.filter((r) => r.q.quality !== "Valid" && r.q.quality !== "No live feed");
  const dbTags = useMemo(() => new Set(rows.map(tagOf)), [rows]);
  const methods = useMemo(
    () => validationMethods(ctx.defs, { measurements: ctx.measurementList, ruleInputs: ctx.ruleInputs }),
    [ctx.defs, ctx.measurementList, ctx.ruleInputs],
  );
  const ranged = rows.filter((r) => r.range && r.unit !== "state").length;

  const flaggedCols: Column<SensorRow>[] = [
    {
      key: "name",
      header: "Sensor",
      width: "240px",
      render: (r) => <strong title={`${tagOf(r)} · ${r.name}`}>{displayName(r.name)}</strong>,
    },
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
      header: "Reading",
      width: "120px",
      render: (r) => <StatusTag tone={validityTone(r.q.quality)} label={QUALITY_LABEL[r.q.quality]} />,
    },
    {
      key: "check",
      header: "What the check found",
      width: "180px",
      render: (r) => <span title={r.q.rule ?? undefined}>{r.q.check ? CHECK_LABEL[r.q.check] : "—"}</span>,
    },
    {
      key: "note",
      header: "Details",
      render: (r) => {
        const tag = tagOf(r);
        const impact = impactOf(tag, ctx.defs);
        const since = frame ? flaggedSince(frame.events, tag) : null;
        const dur = since !== null && frame ? ` (${formatDuration(frame.t - since)})` : "";
        return (
          [r.q.note, impact.rules.length ? `${impact.rules.length} machine check${impact.rules.length === 1 ? "" : "s"} paused until it is fixed` : null]
            .filter(Boolean)
            .join(" · ") + dur || "—"
        );
      },
    },
  ];

  const checkRows = useMemo(() => {
    const list = methods.map((m) => {
      const covered = m.tags.filter((t) => dbTags.has(t)).length;
      const now = flagged.filter((r) => methodFlagging(r, methods)?.id === m.id);
      return {
        id: m.id,
        method: METHOD_PLAIN[m.id] ?? m.method,
        engineering: m.method,
        appliesTo: m.appliesTo,
        check: CHECK_LABEL[m.check],
        rule: m.rule,
        flaggedCount: m.evaluated ? now.length : null,
        covered,
        detail: now.length ? now.map((r) => displayName(r.name)).join(", ") : m.flagsWhen,
      };
    });
    list.push({
      // Its own id: the pyro methods already have a "range" (Range / stale) row.
      id: "instrument-range",
      method: "Beyond instrument range",
      engineering: "Instrument range",
      appliesTo: "Sensors that give a number and have a known measuring range",
      check: CHECK_LABEL.range,
      rule: "R-DQ-01",
      flaggedCount: ctx.counts.outOfRange,
      covered: ranged,
      detail: ctx.counts.outOfRange
        ? rows
            .filter((r) => r.outOfRange)
            .map((r) => displayName(r.name))
            .join(", ")
        : "The reading is outside what the instrument can physically measure",
    });
    return list;
  }, [methods, dbTags, flagged, ctx.counts.outOfRange, ranged, rows]);

  const checkCols: Column<(typeof checkRows)[number]>[] = [
    { key: "method", header: "Check", width: "210px", render: (m) => <strong title={`${m.engineering} · ${m.rule}`}>{m.method}</strong> },
    { key: "applies", header: "Used on", width: "220px", render: (m) => m.appliesTo },
    {
      key: "flagged",
      header: "Doubtful now",
      width: "150px",
      render: (m) =>
        m.flaggedCount === null ? (
          <span className="ast-muted">Not running</span>
        ) : (
          <StatusTag tone={m.flaggedCount > 0 ? "warn" : "good"} label={`${m.flaggedCount} of ${m.covered}`} />
        ),
    },
    { key: "detail", header: "Raises a doubt when", render: (m) => m.detail },
  ];

  return (
    <>
      {flagged.length > 0 && (
        <section className="ast-card pg-table-card" aria-label="Sensors with doubtful readings">
          <div className="ast-card-head">
            <h4 className="ast-card-title">
              Sensors with doubtful readings ({flagged.length} of {rows.length})
            </h4>
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
        <section className="ast-card pg-table-card" aria-label="How readings are checked">
          <div className="ast-card-head">
            <h4 className="ast-card-title">How readings are checked</h4>
          </div>
          <Table columns={checkCols} data={checkRows} keyExtractor={(m) => m.id} />
        </section>
      )}
    </>
  );
}

/* ================================================================== Acquisition chain */

const GW_TONE: Record<string, Tone> = { online: "idle", stale: "warn", offline: "bad", waiting: "idle", disabled: "idle" };
const GW_WORD: Record<string, string> = {
  online: "online",
  stale: "not updating",
  offline: "offline",
  waiting: "waiting for first data",
  disabled: "switched off",
};

export function SensorsChain({ ctx }: { ctx: SensorsCtx }) {
  const { rows, acquisition } = ctx;
  const gateways = acquisition?.gateways ?? [];
  const selected = ctx.selectedTag ? (rows.find((r) => tagOf(r) === ctx.selectedTag) ?? null) : null;
  const subject = selected ?? rows.find((r) => r.q.quality !== "Valid" && r.livePoint) ?? rows.find((r) => r.livePoint) ?? rows[0] ?? null;

  const steps: ChainStep[] = [];
  if (subject) {
    const p = subject.livePoint;
    const calc = isCalculated(subject);
    const manual = !calc && isManual(subject);
    const gw = p ? gateways.find((g) => g.id === p.gateway.id) : gateways[0];
    const { slot, module } = slotOf(subject.cardId);
    const sensorTone: Tone = subject.q.tone === "good" ? "idle" : subject.q.tone;
    steps.push({ id: "sensor", step: "Sensor", name: displayName(subject.name), meta: subject.sensorType || "—", tone: sensorTone });
    if (calc) {
      const scanner = scannerEntryOf(ctx.defs, tagOf(subject));
      steps.push({
        id: "calc",
        step: scanner ? "Shell scan" : "Worked out",
        name: scanner ? "Shell scanner" : "Calculated on the gateway",
        meta: calcDefsFor(ctx.defs, ctx.measurements)[tagOf(subject)]?.formula ?? "calculated",
        tone: sensorTone,
      });
    } else if (manual) {
      steps.push({ id: "record", step: "Hand record", name: "Typed in by hand", meta: subject.sampleRate || "typed into this system", tone: sensorTone });
    } else {
      steps.push({
        id: "card",
        step: "Input card",
        name: p ? `Card ${p.card}, channel ${p.channel}` : module || subject.cardId || "—",
        meta: p ? [p.cardInfo.model ?? p.cardInfo.type, p.address].filter(Boolean).join(" · ") : ctx.acquisitionLoading ? "loading…" : "not registered yet",
        tone: p ? (p.live.state === "stale" ? "warn" : "idle") : ctx.acquisitionLoading ? "idle" : "warn",
        onClick: p ? () => ctx.goDevices(p) : undefined,
        external: Boolean(p),
      });
      steps.push({
        id: "slot",
        step: "Cabinet slot",
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
        step: "Network gateway",
        name: p?.gateway.code ?? gw?.code ?? (subject.rackId.split(" (")[0] || "—"),
        meta: gw ? [GW_WORD[gw.state] ?? gw.state, gw.ip].filter(Boolean).join(" · ") : ctx.acquisitionLoading ? "loading…" : "not registered yet",
        tone: gw ? (GW_TONE[gw.state] ?? "idle") : ctx.acquisitionLoading ? "idle" : "warn",
        onClick: () => ctx.goDevices(p),
        external: true,
      });
      steps.push({
        id: "broker",
        step: "Message server",
        name: gw?.brokerName ?? "—",
        meta: gw?.brokerName ? "MQTT" : ctx.acquisitionLoading ? "loading…" : "none set up",
        tone: gw?.brokerName || ctx.acquisitionLoading ? "idle" : "warn",
      });
    }
  }

  const sources = useMemo(() => {
    const map = new Map<
      string,
      { code: string; name: string; kind: string; protocol: string; gateway: string; cards: Set<string>; points: MachineLivePoint[] }
    >();
    for (const p of acquisition?.points ?? []) {
      const e = map.get(p.source.id) ?? {
        code: p.source.code,
        name: p.source.name,
        kind: p.source.kind,
        protocol: p.source.protocol,
        gateway: p.gateway.code,
        cards: new Set<string>(),
        points: [],
      };
      e.cards.add(p.card);
      e.points.push(p);
      map.set(p.source.id, e);
    }
    return [...map.values()].sort((a, b) => a.code.localeCompare(b.code));
  }, [acquisition]);

  const sourceCols: Column<(typeof sources)[number]>[] = [
    { key: "code", header: "Code", width: "140px", render: (s) => <span className="ast-mono">{s.code}</span> },
    { key: "name", header: "Name", render: (s) => <strong>{s.name}</strong> },
    { key: "protocol", header: "Connection", width: "160px", render: (s) => `${s.kind} · ${s.protocol}` },
    { key: "gateway", header: "Gateway", width: "150px", render: (s) => <span className="ast-mono">{s.gateway}</span> },
    { key: "cards", header: "Input cards", width: "90px", render: (s) => <span className="ast-num">{s.cards.size}</span> },
    {
      key: "points",
      header: "Live sensors",
      width: "160px",
      render: (s) => {
        const live = s.points.filter((p) => p.live.state === "normal" || p.live.state === "alert" || p.live.state === "danger").length;
        return (
          <span className="ast-num">
            {live} of {s.points.length}
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
            <b>How the reading gets here</b>
            <span title={tagOf(subject)}>{selected ? `${displayName(subject.name)} (selected)` : displayName(subject.name)}</span>
          </h4>
          <CausalChain steps={steps} label="Path of the reading" />
        </>
      )}
      {sources.length > 0 && (
        <section className="ast-card pg-table-card" aria-label="Where readings come from">
          <div className="ast-card-head">
            <h4 className="ast-card-title">
              Where readings come from ({ctx.counts.linked} of {ctx.counts.wired} wired sensors connected)
            </h4>
          </div>
          <Table columns={sourceCols} data={sources} keyExtractor={(s) => s.code} onRowClick={(s) => ctx.goDevices(s.points[0])} />
        </section>
      )}
    </>
  );
}
