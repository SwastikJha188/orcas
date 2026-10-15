"use client";

/*
 * Machine › Overview — the page's digest of every sibling page, built from the
 * same hooks those pages read (never from their components):
 *   machine health / condition  liveMachineStatus()            (one source)
 *   sensors, sub-assemblies      useMachineCatalog (live overlay)
 *   findings                     live rule engine (kiln / pyro) · analysis.faults (stored)
 *   outlook                      useMachineInsights → prognosis (rulRows, crossingsAt)
 *   AI insight                   useMachineInsights → analysis.sources / model
 *   data quality                 live frame pipeline · catalog statuses
 *   operating point              frame.defs.operatingTags (live frame) · key sensors (stored)
 */

import { useMemo } from "react";
import type { AssetMachine } from "./assets-data";
import type { KilnSimulation } from "./kiln-seals-simulation";
import { useSiteTimeZone } from "@/providers/use-site-time-zone";
import { formatLocalTime } from "@/lib/time";
import { simTimeMs, type RuleState, type SimFrame } from "@/lib/kiln-sim/engine";
import { limitBand, type LimitRule } from "@/lib/kiln-sim/signals";
import { defsFor } from "@/lib/live-defs";
import type { Severity } from "@/server/services/insights-service";
import { useMachineInsights } from "./use-machine-insights";
import { useMachineRackUnits } from "./use-machine-rack-units";
import { useMachineOverview } from "./overview-data";
import { crossingsAt, rangeText, rulRows, type RulRow } from "./prognosis/prognosis-derive";
import type { DetailedSensorInfo } from "./machine-sensor-mapping-view";
import type { SchematicDot } from "./machine-schematic";

export const SEV_RANK: Record<Severity, number> = { Critical: 0, Advisory: 1, Normal: 2 };
const PRIO_RANK: Record<RuleState["priority"], number> = { P1: 0, P2: 1, P3: 2, P4: 3 };

export const tagOf = (s: DetailedSensorInfo): string => s.parameter || s.id;

/** A signal's severity against its limits, as a limit-state word (Normal / Warning / Alarm). */
export function sevLimit(status: string): "Normal" | "Warning" | "Alarm" {
  return status === "Critical" ? "Alarm" : status === "Advisory" || status === "Warning" ? "Warning" : "Normal";
}

export function toSeverity(status: string): Severity {
  return status === "Critical" ? "Critical" : status === "Advisory" || status === "Warning" ? "Advisory" : "Normal";
}

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface OvGroup {
  id: string;
  name: string;
  parent: string;
  health: number;
  status: Severity;
  tags: string[];
}

export interface OvFinding {
  id: string;
  name: string;
  severity: Severity;
  /** Rule priority (P1–P4) for rule findings; AI priority otherwise. */
  priority: string | null;
  /** Where on the machine (sub-assembly names). */
  where: string;
  cause: string;
  action: string;
  /** 0–100; rule evidence strength or model probability. */
  confidence: number | null;
  tags: string[];
  timeToLimit: string | null;
  kind: "rule" | "AI";
}

export interface OvOperatingRow {
  tag: string;
  name: string;
  unit: string;
  value: number | null;
  display: string;
  decimals: number;
  /** Reference-model value (live machines only). */
  model: number | null;
  z: number | null;
  status: Severity;
  quality: "Good" | "Suspect" | "Invalid" | null;
  normalBand: string;
  normal: { lo: number | null; hi: number | null };
  warn: { lo: number | null; hi: number | null };
  alarm: { lo: number | null; hi: number | null };
  setpoint: number | null;
  calculated: boolean;
}

export interface OvCrossing {
  tag: string;
  name: string;
  unit: string;
  level: "warning" | "alarm";
  hours: number;
  limit: number | null;
}

/* ------------------------------------------------------------------ */
/* Operating point (D4 Table 5.1c / 5.4c / 5.5): process context      */
/* ------------------------------------------------------------------ */

const num = (s: string) => Number(s.replace(/,/g, "").replace(/[−–]/g, "-").trim());

/** Normal band text from D4 ("3.0–4.5", "± 20", "< 1,000", "≥ 95", "−2.5 … −5.0") as numbers. */
export function parseBand(text: string): { lo: number | null; hi: number | null } {
  const t = text.replace(/,/g, "").trim();
  let m = t.match(/^±\s*([\d.]+)$/);
  if (m) return { lo: -Number(m[1]), hi: Number(m[1]) };
  m = t.match(/^[<≤]\s*([−\-\d.]+)$/);
  if (m) return { lo: null, hi: num(m[1]) };
  m = t.match(/^[>≥]\s*([−\-\d.]+)$/);
  if (m) return { lo: num(m[1]), hi: null };
  m = t.match(/^([−\-]?[\d.]+)\s*(?:–|…|\.\.\.|-)\s*([−\-]?[\d.]+)$/);
  if (m) {
    const a = num(m[1]);
    const b = num(m[2]);
    return { lo: Math.min(a, b), hi: Math.max(a, b) };
  }
  return { lo: null, hi: null };
}

/** Warning / alarm sides of a limit; relative limits (pyro D5 Table 9.2) at the live reference model. */
function limitBounds(l: LimitRule | undefined, setpoint: number | null, ref: number | null) {
  const none = { lo: null, hi: null } as { lo: number | null; hi: number | null };
  const b = limitBand(l, ref, setpoint);
  if (!b) return { warn: none, alarm: none };
  return { warn: { lo: b.warnLo ?? null, hi: b.warnHi ?? null }, alarm: { lo: b.alarmLo ?? null, hi: b.alarmHi ?? null } };
}

/**
 * Live operating point: the machine's `defs.operatingTags` in process order,
 * each against its normal band, limits and (for set-point signals) the
 * operator set-point from `frame.drivers`.
 */
export function liveOperatingRows(frame: SimFrame, catByTag: Map<string, { name: string }> = new Map()): OvOperatingRow[] {
  const { operatingTags, signalByTag, setpoints } = frame.defs;
  return operatingTags
    .map((tag): OvOperatingRow | null => {
      const def = signalByTag[tag];
      const sig = frame.signals[tag];
      if (!def || !sig) return null;
      const sp = setpoints[tag];
      const setpoint = sp ? frame.drivers[sp] : null;
      const lim = limitBounds(def.limit, setpoint, sig.model);
      const normal =
        def.limit?.kind === "setpoint" && setpoint
          ? { lo: setpoint * (1 - def.limit.warnPct / 100), hi: setpoint * (1 + def.limit.warnPct / 100) }
          : parseBand(def.normalBand);
      return {
        tag,
        name: catByTag.get(tag)?.name || def.name,
        unit: def.unit,
        value: sig.value,
        display: sig.display,
        decimals: def.decimals,
        model: sig.model,
        z: sig.z,
        status: sig.status,
        quality: sig.quality,
        normalBand: def.normalBand,
        normal,
        warn: lim.warn,
        alarm: lim.alarm,
        setpoint,
        calculated: Boolean(def.calculated),
      };
    })
    .filter((r): r is OvOperatingRow => r !== null);
}

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

export function useOverviewDigest(machine: AssetMachine, sensorData?: KilnSimulation["sensorData"]) {
  const base = useMachineOverview(machine, sensorData);
  const { catalog, frame, sensors, systems, dots } = base;
  const insights = useMachineInsights(machine);
  const racks = useMachineRackUnits(machine);
  const tz = useSiteTimeZone({ machineId: machine.id });

  const data = insights.data;
  const analysis = data?.analysis ?? null;
  const prognosis = data?.prognosis ?? null;

  /* ------------------------------------------------ last update */
  const updatedAt = frame
    ? formatLocalTime(simTimeMs(frame.t), { seconds: false, zone: true, timeZone: tz.timeZone })
    : data?.generatedAt && !Number.isNaN(Date.parse(data.generatedAt))
      ? formatLocalTime(data.generatedAt, { date: true, seconds: false, zone: true, timeZone: tz.timeZone })
      : null;

  /* ---------------------------------------------- sub-assemblies */
  const groups = useMemo<{ level: string; rows: OvGroup[] }>(() => {
    const systemName = new Map(catalog.systems.map((s) => [s.systemId, s.shortName || s.name]));
    if (catalog.subassemblies.length > 0) {
      return {
        level: "Sub-assembly",
        rows: catalog.subassemblies.map((sa) => ({
          id: sa.subassemblyId,
          name: sa.shortName || sa.name,
          parent: systemName.get(sa.systemId) ?? sa.systemId,
          health: Math.round(sa.health),
          status: sa.status,
          tags: catalog.sensors.filter((s) => s.subassemblyId === sa.subassemblyId).map((s) => s.tag),
        })),
      };
    }
    if (catalog.systems.length > 0) {
      return {
        level: "System",
        rows: catalog.systems.map((sy) => ({
          id: sy.systemId,
          name: sy.shortName || sy.name,
          parent: sy.systemId,
          health: Math.round(sy.health),
          status: sy.status,
          tags: catalog.sensors.filter((s) => s.systemId === sy.systemId).map((s) => s.tag),
        })),
      };
    }
    return {
      level: "Component",
      rows: systems.map((p) => ({ id: p.id, name: p.name, parent: "", health: Math.round(p.health), status: toSeverity(p.status), tags: [] })),
    };
  }, [catalog.subassemblies, catalog.systems, catalog.sensors, systems]);

  const sortedGroups = useMemo(() => groups.rows, [groups]);

  const groupOfTag = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of groups.rows) for (const t of g.tags) m.set(t, g.id);
    return m;
  }, [groups]);

  // Pads keyed to the listed group, so a row focus dims every other pad.
  const pageDots = useMemo<SchematicDot[]>(() => dots.map((d) => ({ ...d, systemId: groupOfTag.get(d.tag) })), [dots, groupOfTag]);
  const placedTags = useMemo(() => new Set(dots.filter((d) => d.x > 0 || d.y > 0).map((d) => d.tag)), [dots]);
  const statusByTag = useMemo(() => new Map(dots.map((d) => [d.tag, d.status])), [dots]);

  /* ------------------------------------------- machine-level health */
  // Scored systems only (D4 §4: process-context systems carry no health score).
  const processSystems = useMemo(() => new Set((frame?.defs ?? defsFor(machine.id))?.processSystems ?? []), [frame?.defs, machine.id]);
  const machineHealth = useMemo(
    () =>
      catalog.systems
        .filter((s) => !processSystems.has(s.systemId) && !/^PRC-/.test(s.systemId))
        .map((s) => ({ id: s.systemId, name: s.shortName || s.name, health: Math.round(s.health), status: s.status })),
    [catalog.systems, processSystems],
  );

  const healthTrend = useMemo(() => {
    const h = frame?.healthHistory.overall ?? [];
    if (h.length < 2) return null;
    const span = Math.min(60, h.length - 1);
    return { values: h, delta: Math.round(h[h.length - 1] - h[h.length - 1 - span]), span };
  }, [frame]);

  /* ----------------------------------------------------- findings */
  const subName = useMemo(() => new Map((frame?.defs.subassemblies ?? []).map((s) => [s.id, s.name])), [frame?.defs]);

  const findings = useMemo<{ source: "rule" | "AI" | "none"; active: OvFinding[]; pending: number }>(() => {
    if (frame) {
      const active = frame.rules
        .filter((r) => r.status === "ACTIVE")
        .sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity] || PRIO_RANK[a.priority] - PRIO_RANK[b.priority])
        .map<OvFinding>((r) => ({
          id: r.id,
          name: r.name,
          severity: r.severity,
          priority: r.priority,
          where: r.subs.map((s) => subName.get(s) ?? s).join(", "),
          cause: r.cause,
          action: r.action,
          confidence: r.confidence,
          tags: r.tags,
          timeToLimit: r.timeToLimit || null,
          kind: "rule",
        }));
      return { source: "rule", active, pending: frame.rules.filter((r) => r.status === "PENDING").length };
    }
    if (analysis) {
      const active = analysis.faults
        .filter((f) => f.id !== "nominal" && f.severity !== "Normal")
        .sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity])
        .map<OvFinding>((f) => {
          const src = analysis.sources.find((s) => s.id === f.id);
          const act = analysis.actions.find((a) => a.id !== "routine" && src && a.component.toLowerCase().includes(src.subsystem.split(",")[0].trim().toLowerCase()));
          return {
            id: f.id,
            name: f.label,
            severity: f.severity,
            priority: act?.priority ?? null,
            where: src?.subsystem ?? "",
            cause: src?.cause ?? "",
            action: act?.title ?? "",
            confidence: f.probability,
            tags: src ? [...new Set(src.evidence.map((e) => e.tag))] : [],
            timeToLimit: null,
            kind: "AI",
          };
        });
      return { source: "AI", active, pending: 0 };
    }
    return { source: "none", active: [], pending: 0 };
  }, [frame, analysis, subName]);

  /* ------------------------------------------------------ outlook */
  const outlook = useMemo(() => {
    if (!prognosis) return null;
    const rows: RulRow[] = rulRows(prognosis, analysis);
    const horizons = [...prognosis.horizons].sort((a, b) => a.hours - b.hours);
    let crossing: OvCrossing | null = null;
    for (const h of horizons) {
      // A series already "beyond" a limit while its status is Normal is a band limit read as a
      // one-sided one (e.g. a low warning below a high alarm) — not a real crossing.
      const c = crossingsAt(prognosis, h.id).find((x) => !(x.c.hours === 0 && x.s.status === "Normal"));
      if (c) {
        crossing = {
          tag: c.s.tag,
          name: c.s.name,
          unit: c.s.unit,
          level: c.c.level,
          hours: c.c.hours,
          limit: c.c.level === "alarm" ? c.s.alarm : c.s.warning,
        };
        break;
      }
    }
    const maxHorizon = horizons.length ? horizons[horizons.length - 1].hours : null;
    const first = rows.find((r) => r.status !== "Normal") ?? rows[0] ?? null;
    // Same figure as Prognosis "Intervene within" (lower bound – estimate).
    const intervene = first ? rangeText(first.band.lo, first.hours) : null;
    // Row condition from the sub-assembly the machine's own condition is built from, never
    // from the RUL hour threshold; capped at the machine condition so no row out-ranks the header.
    const gov = first ? groups.rows.find((g) => g.id === first.id || g.name === first.name) ?? null : null;
    const raw: Severity = gov ? gov.status : first ? first.status : "Normal";
    const cap: Severity = base.worst;
    const condition: Severity = SEV_RANK[raw] < SEV_RANK[cap] ? cap : raw;
    return { rows, first, intervene, condition, crossing, maxHorizon };
  }, [prognosis, analysis, groups, base.worst]);

  /* --------------------------------------------------- AI insight */
  const ai = useMemo(() => {
    if (!analysis) return null;
    const sources = analysis.sources
      .filter((s) => s.id !== "src-baseline" && s.severity !== "Normal")
      .sort((a, b) => SEV_RANK[a.severity] - SEV_RANK[b.severity]);
    const features = analysis.features.slice(0, 4);
    const actions = analysis.actions.filter((a) => a.id !== "routine");
    return { model: analysis.model, top: sources[0] ?? null, others: sources.slice(1, 3), features, action: actions[0] ?? null };
  }, [analysis]);

  /* ------------------------------------------------ data & sensors */
  const dataQuality = useMemo(() => {
    const mapped = catalog.counts.sensors || sensors.length;
    const placed = placedTags.size;
    const calculated = catalog.sensors.filter((s) => /^CAL-/.test(s.tag) || /calculated/i.test(s.instrument)).length;
    if (frame) {
      const p = frame.pipeline;
      return {
        live: true,
        mapped,
        placed,
        calculated,
        valid: p.valid,
        held: p.held,
        suspect: p.suspect,
        invalid: p.invalid,
        total: p.valid + p.held + p.suspect + p.invalid,
      };
    }
    return { live: false, mapped, placed, calculated, valid: null, held: null, suspect: null, invalid: null, total: null };
  }, [frame, catalog.counts.sensors, catalog.sensors, sensors.length, placedTags]);

  const suspectSignals = useMemo(
    () =>
      frame
        ? Object.values(frame.signals)
            .filter((s) => s.quality !== "Good")
            .map((s) => ({ tag: s.tag, quality: s.quality, note: s.qualityNote }))
        : [],
    [frame],
  );

  /* ---------------------------------------------- operating point */
  const operating = useMemo<{ source: "live" | "stored" | "none"; rows: OvOperatingRow[] }>(() => {
    const catByTag = new Map(catalog.sensors.map((s) => [s.tag, s]));
    if (frame) return { source: "live", rows: liveOperatingRows(frame, catByTag) };
    // Stored machines: the model's key sensors, against their DB nominal band and limits.
    const keys = (data?.keySensors ?? []).map((t) => catByTag.get(t)).filter((s): s is NonNullable<typeof s> => Boolean(s));
    const rows = keys
      .filter((s) => s.unit && s.unit !== "state")
      .map<OvOperatingRow>((s) => {
        const high = !(s.alarmVal < s.warningVal);
        return {
          tag: s.tag,
          name: s.name,
          unit: s.unit,
          value: Number.isFinite(s.numericValue) ? s.numericValue : null,
          display: s.value,
          decimals: 1,
          model: null,
          z: null,
          status: s.status,
          quality: null,
          normalBand: s.nominalBand || s.normalThreshold || "",
          normal: parseBand(s.nominalBand || s.normalThreshold || ""),
          warn: s.warningVal ? (high ? { lo: null, hi: s.warningVal } : { lo: s.warningVal, hi: null }) : { lo: null, hi: null },
          alarm: s.alarmVal ? (high ? { lo: null, hi: s.alarmVal } : { lo: s.alarmVal, hi: null }) : { lo: null, hi: null },
          setpoint: null,
          calculated: false,
        };
      });
    return { source: rows.length ? "stored" : "none", rows };
  }, [frame, catalog.sensors, data?.keySensors]);

  return {
    ...base,
    insights,
    racks,
    tz,
    updatedAt,
    groups,
    sortedGroups,
    groupOfTag,
    pageDots,
    placedTags,
    statusByTag,
    machineHealth,
    healthTrend,
    findings,
    outlook,
    ai,
    dataQuality,
    suspectSignals,
    operating,
  };
}

export type OverviewDigest = ReturnType<typeof useOverviewDigest>;
