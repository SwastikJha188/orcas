"use client";

import React, { useMemo } from "react";
import { Tile, TileGrid } from "@/components/ui/tile";
import { validityTone } from "@/components/ui/status";
import type { MachineAcquisition, MachineLivePoint } from "@/types/edge";
import { formatDuration, simTimeMs, type SimFrame } from "@/lib/kiln-sim/engine";
import { formatLocalTime } from "@/lib/time";
import type { PlantDefs } from "@/lib/plant-defs";
import type { AssetMachine } from "./assets-data";
import type { Tone } from "./assets-shell-ui";
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
  assemblies: "sensors-assemblies",
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

/* ================================================================== Sub-assemblies */

/** Sub-assembly key, the same one the register groups by. */
export const assemblyOf = (r: SensorRow) => r.subAssembly || r.component || "Unassigned";

/**
 * One card per sub-assembly: sensor count, data validity split, readings
 * outside limits and the most loaded reading. Click scopes the register.
 */
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

  return (
    <TileGrid label="Sub-assemblies" min={232} compact fill={false}>
      {groups.map(([name, list]) => {
        const alarm = list.filter((r) => r.status === "Critical").length;
        const warn = list.filter((r) => r.status === "Advisory").length;
        const valid = list.filter((r) => r.q.quality === "Valid").length;
        const nolive = list.filter((r) => r.q.quality === "No live feed").length;
        const flagged = list.length - valid - nolive;
        const tone: Tone | undefined = alarm ? "bad" : warn ? "warn" : undefined;
        const worst = list.filter((r) => r.status !== "Normal").sort((a, b) => (a.status === "Critical" ? -1 : b.status === "Critical" ? 1 : 0))[0];
        const pct = (n: number) => `${(n / list.length) * 100}%`;
        return (
          <Tile
            key={name}
            title={<span className="pg-sensors-asm-name">{name}</span>}
            status={alarm || warn ? { label: `${alarm + warn} outside`, tone } : { label: "Normal" }}
            value={list.length}
            unit={list.length === 1 ? "sensor" : "sensors"}
            tone={tone}
            meter={
              <span className="ui-tile-stack" role="img" aria-label={`${valid} valid, ${flagged} flagged, ${nolive} no live feed`}>
                {valid > 0 && <i style={{ width: pct(valid) }} />}
                {flagged > 0 && <i data-tone="warn" style={{ width: pct(flagged) }} />}
                {nolive > 0 && <i className="is-empty" style={{ width: pct(nolive) }} />}
              </span>
            }
            facts={[
              { label: "Valid", value: `${valid} / ${list.length}`, tone: flagged ? "warn" : undefined },
              { label: "Warning", value: warn, tone: warn ? "warn" : undefined },
              { label: "Alarm", value: alarm, tone: alarm ? "bad" : undefined },
            ]}
            foot={worst ? `${tagOf(worst)} ${worst.value}${unitText(worst) ? ` ${unitText(worst)}` : ""}` : undefined}
            selected={activeId === name}
            onSelect={() => onPick(name, name, list.map(tagOf))}
          />
        );
      })}
    </TileGrid>
  );
}

/* ================================================================== Signal validity */

/**
 * Per-shift validity (D5 Table 9.3 sensor health; Table 12.1 "every shift:
 * review suspect / invalid signals"): every sensor of this machine flagged in
 * the current shift, with minutes suspect / invalid / flagged only.
 */
function ShiftValidity({ ctx }: { ctx: SensorsCtx }) {
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
  const dur = (m: number) => (m ? formatDuration(m) : "—");
  return (
    <>
      <h4 className="ui-tiles-head">
        <span>
          <b>This shift</b> · {sh.label} · {formatDuration(sh.minutes)} evaluated
        </span>
        <span className="ast-num">
          {total - invalid - suspect} valid throughout · {suspect} suspect · {invalid} invalid
          {flagOnly ? ` · ${flagOnly} flagged only` : ""}
          {prevN !== null ? ` · previous shift ${prevN} flagged` : ""}
        </span>
      </h4>
      {rows.length > 0 && (
        <TileGrid label="Validity this shift" min={220}>
          {rows.map(([tag, e]) => (
            <Tile
              key={tag}
              title={tag}
              status={{ label: e.invalid ? "Invalid" : e.suspect ? "Suspect" : "Flagged", tone: e.invalid ? "bad" : e.suspect ? "warn" : undefined }}
              facts={[
                { label: "Invalid", value: dur(e.invalid), tone: e.invalid ? "bad" : undefined },
                { label: "Suspect", value: dur(e.suspect), tone: e.suspect ? "warn" : undefined },
                { label: "Flag only", value: dur(e.flagOnly) },
              ]}
              foot={
                <span title={e.note}>
                  {at(e.first)} – {at(e.last)}
                  {e.note ? ` · ${e.note}` : ""}
                </span>
              }
              selected={ctx.selectedTag === tag}
              onSelect={() => ctx.select(ctx.selectedTag === tag ? null : tag)}
            />
          ))}
        </TileGrid>
      )}
    </>
  );
}

/** Flagged sensors, this shift and the validation checks — as cards (render in a bare section). */
export function SensorsValidity({ ctx }: { ctx: SensorsCtx }) {
  const { rows, frame } = ctx;
  const flagged = rows.filter((r) => r.q.quality !== "Valid" && r.q.quality !== "No live feed");
  const dbTags = useMemo(() => new Set(rows.map(tagOf)), [rows]);
  const methods = validationMethods(ctx.defs);
  const ranged = rows.filter((r) => r.range && r.unit !== "state").length;

  return (
    <>
      {flagged.length > 0 && (
        <>
          <h4 className="ui-tiles-head">
            <b>Flagged</b>
            <span className="ast-num">{flagged.length} of {rows.length}</span>
          </h4>
          <TileGrid label="Flagged sensors" min={260}>
            {flagged.map((r) => {
              const tag = tagOf(r);
              const since = frame ? flaggedSince(frame.events, tag) : null;
              const impact = impactOf(tag, ctx.defs);
              const sinceText =
                since !== null && frame
                  ? `${formatLocalTime(simTimeMs(since), { seconds: false, timeZone: ctx.timeZone })} · ${formatDuration(frame.t - since)}`
                  : r.livePoint?.live.updatedAt
                    ? formatLocalTime(r.livePoint.live.updatedAt, { seconds: false, timeZone: ctx.timeZone })
                    : "—";
              return (
                <Tile
                  key={tag}
                  title={tag}
                  sub={r.name}
                  status={{ label: r.q.quality, tone: validityTone(r.q.quality) }}
                  tone={validityTone(r.q.quality)}
                  value={r.value || "—"}
                  unit={unitText(r)}
                  facts={[
                    { label: "Check", value: r.q.check ? CHECK_LABEL[r.q.check] : "—" },
                    { label: "Rule", value: r.q.rule ?? "—" },
                    { label: "Since", value: sinceText },
                    { label: "Rules held", value: <span title={impact.rules.map((x) => `${x.id} ${x.name}`).join("\n")}>{impact.rules.length}</span> },
                  ]}
                  foot={<span title={r.q.note ?? undefined}>{[impact.health?.sub, r.q.note].filter(Boolean).join(" · ") || "—"}</span>}
                  selected={ctx.selectedTag === tag}
                  onSelect={() => ctx.select(ctx.selectedTag === tag ? null : tag)}
                />
              );
            })}
          </TileGrid>
        </>
      )}

      {frame?.shiftValidity?.current && <ShiftValidity ctx={ctx} />}

      {ctx.hasSpec && frame && (
        <>
          <h4 className="ui-tiles-head">
            <b>Checks</b>
            <span className="ast-num">{methods.filter((m) => m.evaluated).length + 1} evaluated · {methods.length + 1} methods</span>
          </h4>
          <TileGrid label="Validation checks" min={232} compact>
            {methods.map((m) => {
              const covered = m.tags.filter((t) => dbTags.has(t)).length;
              const now = flagged.filter((r) => methodFlagging(r, methods)?.id === m.id);
              return (
                <Tile
                  key={m.id}
                  title={<span className="pg-sensors-asm-name">{m.method}</span>}
                  sub={m.appliesTo}
                  status={m.evaluated ? null : { label: "Not evaluated" }}
                  tone={m.evaluated && now.length ? "warn" : undefined}
                  value={m.evaluated ? now.length : "—"}
                  unit={`flagged / ${covered}`}
                  facts={[
                    { label: "Check", value: CHECK_LABEL[m.check] },
                    { label: "Rule", value: m.rule },
                  ]}
                  foot={<span title={m.flagsWhen}>{now.length ? now.map(tagOf).join(", ") : m.flagsWhen}</span>}
                />
              );
            })}
            <Tile
              title={<span className="pg-sensors-asm-name">Instrument range</span>}
              sub="Analog sensors with a recorded range"
              tone={ctx.counts.outOfRange ? "bad" : undefined}
              value={ctx.counts.outOfRange}
              unit={`flagged / ${ranged}`}
              facts={[
                { label: "Check", value: CHECK_LABEL.range },
                { label: "Rule", value: "page" },
              ]}
              foot={
                ctx.counts.outOfRange
                  ? rows.filter((r) => r.outOfRange).map(tagOf).join(", ")
                  : "Reading outside the instrument range"
              }
            />
          </TileGrid>
        </>
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
  const calcLive = rows.filter((r) => isCalculated(r) && r.live).length;
  const manualLive = rows.filter((r) => !isCalculated(r) && isManual(r) && r.live).length;
  const pct = (n: number, of: number) => `${of ? (n / of) * 100 : 0}%`;

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
      <h4 className="ui-tiles-head">
        <b>Sources</b>
        <span className="ast-num">
          {sources.length} on gateway · {ctx.counts.linked} / {ctx.counts.wired} wired linked
        </span>
      </h4>
      <TileGrid label="Acquisition sources" min={232}>
        {sources.map((s) => {
          const live = s.points.filter((p) => p.live.state === "normal" || p.live.state === "alert" || p.live.state === "danger").length;
          const stale = s.points.filter((p) => p.live.state === "stale").length;
          const nodata = s.points.filter((p) => p.live.state === "nodata").length;
          const idle = s.points.length - live - stale - nodata;
          const tone: Tone | undefined = nodata ? "bad" : stale ? "warn" : undefined;
          return (
            <Tile
              key={s.code}
              title={s.code}
              sub={s.name}
              status={{ label: `${s.kind} · ${s.protocol}` }}
              tone={tone}
              value={s.points.length}
              unit={s.points.length === 1 ? "sensor" : "sensors"}
              meter={
                <span className="ui-tile-stack" role="img" aria-label={`${live} live, ${stale} stale, ${nodata} no data`}>
                  {live > 0 && <i style={{ width: pct(live, s.points.length) }} />}
                  {stale > 0 && <i data-tone="warn" style={{ width: pct(stale, s.points.length) }} />}
                  {nodata > 0 && <i data-tone="bad" style={{ width: pct(nodata, s.points.length) }} />}
                  {idle > 0 && <i className="is-empty" style={{ width: pct(idle, s.points.length) }} />}
                </span>
              }
              facts={[
                { label: "Live", value: live },
                { label: "Stale", value: stale, tone: stale ? "warn" : undefined },
                { label: "No data", value: nodata, tone: nodata ? "bad" : undefined },
                { label: "Cards", value: s.cards.size },
              ]}
              foot={`Gateway ${s.gateway}`}
              onSelect={() => ctx.goDevices(s.points[0])}
            />
          );
        })}
        {ctx.counts.calculated > 0 && (
          <Tile
            title="Gateway analytics"
            sub="Calculated values"
            status={{ label: "calculated" }}
            value={ctx.counts.calculated}
            unit="values"
            meter={calcLive / ctx.counts.calculated * 100}
            facts={[
              { label: "Live", value: calcLive },
              { label: "Gateway", value: gateways[0]?.code ?? "—" },
            ]}
          />
        )}
        {ctx.counts.manual > 0 && (
          <Tile
            title="Manual entry"
            sub="Manual records"
            status={{ label: "manual" }}
            value={ctx.counts.manual}
            unit="records"
            meter={manualLive / ctx.counts.manual * 100}
            facts={[{ label: "Live", value: manualLive }]}
          />
        )}
        {wiredUnlinked.length > 0 && (
          <Tile
            title="Not on a gateway point"
            sub="Wired, no edge-registry point"
            status={{ label: "Unlinked", tone: "warn" }}
            tone="warn"
            value={wiredUnlinked.length}
            unit={`/ ${ctx.counts.wired} wired`}
            foot={<span title={wiredUnlinked.map(tagOf).join(", ")}>{wiredUnlinked.slice(0, 4).map(tagOf).join(", ")}{wiredUnlinked.length > 4 ? ` +${wiredUnlinked.length - 4}` : ""}</span>}
            onSelect={() => ctx.goDevices()}
          />
        )}
      </TileGrid>
    </>
  );
}
