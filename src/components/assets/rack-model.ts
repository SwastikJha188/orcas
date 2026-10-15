/* ==========================================================================
   Machine › Rack — page model.

   Pure derivation from what RackView fetched: the cabinet (rack units, edge
   registry or mapped_signals), the live acquisition chain (MQTT), the live
   simulation frame and the DB sensor catalog. Nothing here invents a value:
   fields the sources do not carry stay null and the page says "Not reported".

   Hardware state ≠ process state. A channel whose reading is beyond an alarm
   limit is a process finding (Diagnosis); the Rack verdict only looks at the
   acquisition chain: signal quality, gateway link, clock, power and wiring.
   ========================================================================== */

import type { CabinetChannel, CabinetModule, MachineRackInfo, RackChassisInfo } from "./rack-data";
import type { CatalogSensorView } from "./use-machine-catalog";
import type { MachineAcquisition, MachineLivePoint } from "@/types/edge";
import type { SimFrame } from "@/lib/kiln-sim/engine";
import type { PlantDefs } from "@/lib/plant-defs";
import type { Tone } from "./assets-shell-ui";
import { channelState, processState, worstState, type SlotState } from "./eurocard-module";
import { CALCULATED_INPUTS, IEPE_SPEC_CHANNELS, hasKilnSpec } from "./rack-spec";
import { isPyroMachineId } from "@/lib/live-defs";

export const STATE_TONE: Record<SlotState, Tone> = { ok: "good", warn: "warn", bad: "bad", empty: "idle" };

export const toneState = (t: Tone): SlotState => (t === "bad" ? "bad" : t === "warn" ? "warn" : t === "good" ? "ok" : "empty");

export const SIGNAL_LABEL: Record<SlotState, string> = { ok: "Valid", warn: "Suspect", bad: "Invalid", empty: "Spare" };

/* ---------------------------------------------------------------- rows */

export type ReadingOrigin = "mqtt" | "sim" | "stored";

/** One wired channel with the chassis and card it sits on and where its reading comes from. */
export interface ChannelRow {
  rack: MachineRackInfo;
  module: CabinetModule;
  ch: CabinetChannel;
  point: MachineLivePoint | null;
  origin: ReadingOrigin;
}

export const rowKey = (r: ChannelRow) => `${r.rack.rackId}|${r.module.position}|${r.ch.channel}`;

/* ---------------------------------------------------------------- cabinet record */

export type PtpMode = "Locked" | "Holdover" | "As recorded" | "Not reported";

export interface ChassisRecord {
  chassis: RackChassisInfo | null;
  ptp: { mode: PtpMode; state: SlotState; latencyMs: number | null; raw: string };
  psu: { state: SlotState; volts: number[]; redundant: boolean | null; raw: string };
  packetLossPct: number | null;
}

/** Reads the free-text cabinet record (rack_chassis) into typed fields; unknown text stays raw. */
export function readChassisRecord(c: RackChassisInfo | null | undefined): ChassisRecord {
  const latencyRaw = c?.latency?.trim() ?? "";
  const psuRaw = c?.psuStatus?.trim() ?? "";
  const mode: PtpMode = !latencyRaw
    ? "Not reported"
    : /holdover|free.?run|unsync|lost/i.test(latencyRaw)
      ? "Holdover"
      : /synced|lock/i.test(latencyRaw)
        ? "Locked"
        : "As recorded";
  const latency = Number(latencyRaw.match(/([\d.]+)\s*ms/i)?.[1] ?? NaN);
  // Measured rails are in brackets ("Redundant 24V DC Active (24.1V / 24.1V)"); else any voltage given.
  const voltText = psuRaw.match(/\(([^)]*V[^)]*)\)/)?.[1] ?? psuRaw;
  const volts = (voltText.match(/[\d.]+(?=\s*V\b)/g) ?? []).map(Number).filter((v) => v > 5 && v < 60);
  const loss = Number((c?.packetLoss ?? "").match(/([\d.]+)\s*%/)?.[1] ?? NaN);
  return {
    chassis: c ?? null,
    ptp: {
      mode,
      state: mode === "Locked" ? "ok" : mode === "Holdover" ? "warn" : "empty",
      latencyMs: Number.isFinite(latency) ? latency : null,
      raw: latencyRaw,
    },
    psu: {
      state: !psuRaw ? "empty" : /fail|fault|lost|down/i.test(psuRaw) ? "bad" : /active|ok|normal/i.test(psuRaw) ? "ok" : "warn",
      volts,
      redundant: !psuRaw ? null : /redundan/i.test(psuRaw) || volts.length > 1,
      raw: psuRaw,
    },
    packetLossPct: Number.isFinite(loss) ? loss : null,
  };
}

/* ---------------------------------------------------------------- gateway */

type GatewayRow = MachineAcquisition["gateways"][number];

export interface GatewayLink {
  gateway: GatewayRow | null;
  /** Code the cabinet names when the registry has no gateway row. */
  code: string;
  state: SlotState;
  label: string;
  /** No MQTT data, values come from the plant simulation. */
  simulated: boolean;
  points: number;
  reporting: number;
}

const LINK: Record<GatewayRow["state"], { state: SlotState; label: string }> = {
  online: { state: "ok", label: "Online" },
  stale: { state: "warn", label: "Stale" },
  offline: { state: "bad", label: "Offline" },
  waiting: { state: "empty", label: "Waiting for data" },
  disabled: { state: "empty", label: "Disabled" },
};

/* ---------------------------------------------------------------- checks */

export interface RackCheck {
  id: "wiring" | "signals" | "gateway" | "clock" | "power" | "spec";
  label: string;
  tone: Tone;
  result: string;
  source: string;
  /** Tags behind the finding (evidence chips). */
  tags: string[];
}

export interface RackModel {
  /** Pyro line: slots and channels are a proposed allocation pending the walkdown (D4 Table 6.4a), not installed hardware. */
  proposed: boolean;
  rows: ChannelRow[];
  rowsByRack: Map<string, ChannelRow[]>;
  chassisCount: number;
  sources: number;
  cards: number;
  positions: number;
  capacity: number;
  signal: { ok: number; warn: number; bad: number };
  processAlarms: ChannelRow[];
  origin: { mqtt: number; sim: number; stored: number };
  catalogTotal: number;
  calculated: CatalogSensorView[];
  /** Manual records in the catalog (no channel by design). */
  manual: CatalogSensorView[];
  unwired: CatalogSensorView[];
  record: ChassisRecord;
  link: GatewayLink;
  gateways: GatewayLink[];
  checks: RackCheck[];
  state: SlotState;
  /** Newest / oldest MQTT time stamp age in seconds (calc.); null without MQTT readings. */
  freshness: { newestS: number; oldestS: number; stamped: number } | null;
  /** Calculated sensor tag → its input rows (where they are wired). */
  calcInputs: Map<string, { tag: string; row: ChannelRow | null }[]>;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function ageText(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s} s`;
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} h`;
  return `${Math.floor(s / 86400)} d`;
}

/** The catalog's calculated sensors (computed on the gateway, no wiring). */
export function isCalculated(s: CatalogSensorView, defs?: PlantDefs | null): boolean {
  return /calculated/i.test(s.source) || /^ANALYTICS/i.test(s.cardId) || /^CAL-/i.test(s.tag) || defs?.signalByTag[s.tag]?.origin === "calculated";
}

/** The catalog's manual records (laboratory, handheld): dated entries, never a wired channel. */
export function isManual(s: CatalogSensorView, defs?: PlantDefs | null): boolean {
  return /^manual/i.test(s.source) || defs?.signalByTag[s.tag]?.origin === "manual";
}

export function buildRackModel(input: {
  machineId: string;
  racks: MachineRackInfo[];
  acq: MachineAcquisition | null;
  frame: SimFrame | null | undefined;
  catalog: CatalogSensorView[];
}): RackModel {
  const { machineId, racks, acq, frame, catalog } = input;

  const pointByTag = new Map<string, MachineLivePoint>();
  for (const p of acq?.points ?? []) {
    pointByTag.set(p.tag, p);
    if (p.signalTag) pointByTag.set(p.signalTag, p);
  }

  const rowsByRack = new Map<string, ChannelRow[]>();
  const rows: ChannelRow[] = [];
  for (const rack of racks) {
    const list: ChannelRow[] = [];
    for (const card of rack.modules)
      for (const ch of card.channels) {
        const point = pointByTag.get(ch.tag) ?? null;
        const origin: ReadingOrigin = point && point.live.state !== "nodata" ? "mqtt" : frame?.signals[ch.tag] ? "sim" : "stored";
        list.push({ rack, module: card, ch, point, origin });
      }
    rowsByRack.set(rack.rackId, list);
    rows.push(...list);
  }

  const states = rows.map((r) => channelState(r.ch));
  const signal = {
    ok: states.filter((s) => s === "ok").length,
    warn: states.filter((s) => s === "warn").length,
    bad: states.filter((s) => s === "bad").length,
  };
  const processAlarms = rows.filter((r) => processState(r.ch) !== "ok");
  const origin = {
    mqtt: rows.filter((r) => r.origin === "mqtt").length,
    sim: rows.filter((r) => r.origin === "sim").length,
    stored: rows.filter((r) => r.origin === "stored").length,
  };

  const wiredTags = new Set(rows.map((r) => r.ch.tag));
  const defs = frame?.defs ?? null;
  const calculated = catalog.filter((s) => isCalculated(s, defs));
  const manual = catalog.filter((s) => !isCalculated(s, defs) && isManual(s, defs) && !wiredTags.has(s.tag));
  const unwired = catalog.filter((s) => !isCalculated(s, defs) && !isManual(s, defs) && !wiredTags.has(s.tag));

  const record = readChassisRecord(racks.find((r) => r.chassis)?.chassis ?? null);

  /* ---------- gateways: the registry's, else the one the cabinet names ---------- */
  const reportingBy = new Map<string, { points: number; reporting: number }>();
  for (const p of acq?.points ?? []) {
    const e = reportingBy.get(p.gateway.id) ?? { points: 0, reporting: 0 };
    e.points += 1;
    if (p.live.state !== "nodata") e.reporting += 1;
    reportingBy.set(p.gateway.id, e);
  }
  const linkOf = (g: GatewayRow): GatewayLink => {
    const counts = reportingBy.get(g.id) ?? { points: 0, reporting: 0 };
    const simulated = g.state === "waiting" && origin.sim > 0;
    const base = LINK[g.state];
    return {
      gateway: g,
      code: g.code,
      state: simulated ? "ok" : base.state,
      label: simulated ? "Simulated feed" : base.label,
      simulated,
      ...counts,
    };
  };
  const machineGateways = (acq?.gateways ?? []).filter((g) => reportingBy.has(g.id) || racks.some((r) => r.gateway === g.code));
  const gateways = machineGateways.map(linkOf);
  const firstPoint = rows.find((r) => r.point)?.point ?? null;
  const link: GatewayLink =
    gateways.find((g) => g.gateway?.id === firstPoint?.gateway.id) ??
    gateways[0] ?? {
      gateway: null,
      code: record.chassis?.id ?? racks[0]?.gateway ?? "—",
      state: "empty",
      label: "Not registered",
      simulated: false,
      points: 0,
      reporting: 0,
    };

  /* ---------- MQTT time stamps (calc.) ---------- */
  const now = acq ? Date.parse(acq.serverNow) : NaN;
  const stamps = (acq?.points ?? []).map((p) => (p.live.updatedAt ? Date.parse(p.live.updatedAt) : NaN)).filter(Number.isFinite);
  const freshness =
    Number.isFinite(now) && stamps.length
      ? { newestS: (now - Math.max(...stamps)) / 1000, oldestS: (now - Math.min(...stamps)) / 1000, stamped: stamps.length }
      : null;

  /* ---------- calculated inputs (kiln D5 Table 9.2 only; other machines have no input record) ---------- */
  const rowByTag = new Map(rows.map((r) => [r.ch.tag, r]));
  const calcInputs = new Map<string, { tag: string; row: ChannelRow | null }[]>();
  for (const s of hasKilnSpec(machineId) ? calculated : []) {
    const spec = CALCULATED_INPUTS[s.tag];
    if (spec) calcInputs.set(s.tag, spec.inputs.map((tag) => ({ tag, row: rowByTag.get(tag) ?? null })));
  }

  /* ---------- checks ---------- */
  const checks: RackCheck[] = [];
  const catalogTotal = catalog.length;
  const proposed = frame?.defs.plant === "pyro" || isPyroMachineId(machineId);
  const wiredWord = proposed ? "allocated (proposed)" : "wired";
  checks.push({
    id: "wiring",
    label: "Sensors accounted for",
    tone: catalogTotal === 0 ? "idle" : unwired.length ? "warn" : "good",
    result:
      catalogTotal === 0
        ? `${plural(rows.length, "channel", "channels")} ${wiredWord}; sensor catalog not loaded`
        : `${rows.length} ${wiredWord} + ${calculated.length} calculated${manual.length ? ` + ${manual.length} manual` : ""} of ${catalogTotal} sensors${unwired.length ? ` · ${unwired.length} ${proposed ? "not allocated" : "not wired"}` : ""}`,
    source: "Cabinet model vs DB sensor catalog",
    tags: unwired.map((s) => s.tag),
  });
  const faulty = rows.filter((r) => channelState(r.ch) !== "ok");
  checks.push({
    id: "signals",
    label: "Signal quality",
    tone: signal.bad ? "bad" : signal.warn ? "warn" : rows.length ? "good" : "idle",
    result: `${signal.ok} valid · ${signal.warn} suspect / stale · ${signal.bad} invalid`,
    source: frame ? "Data-quality flags (R-DQ-01), live" : origin.mqtt ? "MQTT point state" : "Stored quality",
    tags: faulty.map((r) => r.ch.tag),
  });
  checks.push({
    id: "gateway",
    label: "Gateway link",
    tone: STATE_TONE[link.state],
    result: link.gateway ? `${link.code} · ${link.label}` : "No gateway in the edge registry",
    source: "Edge registry · MQTT heartbeat",
    tags: [],
  });
  checks.push({
    id: "clock",
    label: "Clock sync",
    tone: STATE_TONE[record.ptp.state],
    result:
      record.ptp.mode === "Not reported"
        ? "Not reported"
        : `${record.ptp.mode}${record.ptp.latencyMs !== null ? ` · path delay ${record.ptp.latencyMs} ms` : ""}`,
    source: "Cabinet record (rack_chassis)",
    tags: [],
  });
  checks.push({
    id: "power",
    label: "Power supply",
    tone: STATE_TONE[record.psu.state],
    result: record.psu.raw || "Not reported",
    source: "Cabinet record (rack_chassis)",
    tags: [],
  });
  if (hasKilnSpec(machineId)) {
    const slots = racks.flatMap((r) => r.modules);
    const iepe = slots.find((m) => m.sensorType === "VIB");
    const iepeMapped = iepe ? slots.filter((m) => m.code === iepe.code).length : 0;
    if (iepe && iepe.cardCapacity !== IEPE_SPEC_CHANNELS)
      checks.push({
        id: "spec",
        label: "IEPE module vs specification",
        tone: "info",
        result: `Registry records ${iepe.cardCapacity} channels; D5 Table 7.1 specifies ${IEPE_SPEC_CHANNELS} inputs (${IEPE_SPEC_CHANNELS - iepeMapped} spare)`,
        source: "Edge registry (edge_cards) vs D5 Table 7.1",
        tags: [],
      });
  }

  const state = worstState(checks.filter((c) => c.tone !== "idle" && c.tone !== "info").map((c) => toneState(c.tone)));

  return {
    proposed,
    rows,
    rowsByRack,
    chassisCount: racks.length,
    sources: new Set(racks.map((r) => r.code)).size,
    cards: racks.reduce((n, r) => n + r.modules.length, 0),
    positions: racks.reduce((n, r) => n + r.positions, 0),
    capacity: racks.reduce((n, r) => n + r.modules.reduce((m, mod) => m + mod.capacity, 0), 0),
    signal,
    processAlarms,
    origin,
    catalogTotal,
    calculated,
    manual,
    unwired,
    record,
    link,
    gateways: gateways.length ? gateways : [link],
    checks,
    state,
    freshness,
    calcInputs,
  };
}
