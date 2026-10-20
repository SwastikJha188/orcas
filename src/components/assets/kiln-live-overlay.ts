/**
 * Overlays the live KLN-01 frame onto DB-backed Health rows (catalog
 * sub-assemblies / sensors and `process_stages`). Which rows exist always
 * comes from the database; the frame only supplies running values, model,
 * residual, rule state and health.
 */
import type { SimFrame, LiveSignal } from "@/lib/kiln-sim/engine";
import { SIGNAL_BY_TAG } from "@/lib/kiln-sim/signals";
import type { MachineProcessStage } from "./process-data";
import { isConditionRule } from "@/lib/plant-defs";

type Sev = "Normal" | "Alert" | "Critical";

/** An upstream-driver readout: label and its live value. */
export interface DriverReadout {
  label: string;
  value: string;
}

const signed = (v: number, d: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(d)}`;

export function sigmaLabel(z: number | null): string {
  if (z === null) return "—";
  return `${signed(z, 1)} σ`;
}

function unitSuffix(unit: string): string {
  return unit === "state" ? "" : ` ${unit}`;
}

/** Display a live value with its unit, e.g. "62.4 %". */
export function liveMeasured(sig: LiveSignal, unit: string): string {
  return `${sig.display}${unitSuffix(unit)}`;
}

export function ruleFailureStatus(frame: SimFrame, ruleRef: string): "Clear" | "Alert" | "Active" {
  const ids = ruleRef.match(/R-[A-Z]{2,3}-\d{2}/g) ?? [];
  let out: "Clear" | "Alert" | "Active" = "Clear";
  for (const id of ids) {
    const r = frame.rules.find((x) => x.id === id);
    if (!r) continue;
    if (r.status === "ACTIVE") return "Active";
    if (r.status === "PENDING") out = "Alert";
  }
  return out;
}

const DRIVER_VALUES: Array<[RegExp, (f: SimFrame) => string]> = [
  [/feed/i, (f) => `${f.drivers.feed.toFixed(1)} t/h`],
  [/fuel/i, (f) => `${f.drivers.fuel.toFixed(2)} t/h`],
  [/kiln.*speed|operating speed|rotational speed/i, (f) => `${f.drivers.speed.toFixed(2)} rpm`],
  [/motor input speed/i, (f) => `${Math.round((f.drivers.speed * 35.5 * 7)).toLocaleString("en-US")} rpm`],
  [/torque/i, (f) => `${f.signals["ELE-KLN-01"].display} %`],
  [/oil temp/i, (f) => `${f.signals["TMP-KLN-15"].display} °C`],
  [/ambient/i, (f) => `${f.drivers.ambientEst.toFixed(1)} °C (estimated)`],
  [/draft/i, (f) => `${f.signals["PRS-KLN-01"].display} mbar`],
  [/axial|lvdt/i, (f) => `${f.signals["POS-KLN-01"].display} mm`],
  [/thrust/i, (f) => `${f.signals["PRS-KLN-07"].display} bar`],
  [/o₂|o2/i, (f) => `${f.signals["GAS-KLN-01"].display} vol%`],
  [/burning/i, (f) => `${f.signals["TMP-KLN-14"].display} °C`],
];

/**
 * Live values for a sub-assembly's upstream-driver readouts. Only labels the
 * frame can answer are returned; a driver without a live source is dropped
 * rather than shown with a static number.
 */
export function liveDrivers(drivers: DriverReadout[], frame: SimFrame): DriverReadout[] {
  const out: DriverReadout[] = [];
  for (const d of drivers) {
    const hit = DRIVER_VALUES.find(([re]) => re.test(d.label));
    if (hit) out.push({ ...d, value: hit[1](frame) });
  }
  return out;
}

/** Model / residual / σ strings for one catalog signal from the live frame. */
export function liveSignalStrings(tag: string, frame: SimFrame): { model: string; residual: string; sigma: string } | null {
  const sig = frame.signals[tag];
  const def = SIGNAL_BY_TAG[tag];
  if (!sig || !def) return null;
  if (def.type === "state") {
    return { model: def.states!.normal, residual: sig.display === def.states!.normal ? "—" : "changed", sigma: "—" };
  }
  const d = def.decimals;
  const resUnit = def.unit === "°C" ? "K" : def.unit;
  return {
    model: `${(sig.model ?? 0).toFixed(d)} ${def.unit}`,
    residual: `${signed(sig.residual ?? 0, Math.max(1, d))} ${resUnit}`,
    sigma: sigmaLabel(sig.z),
  };
}

/* ----------------------------------------------------------- Stage linking
   Which sensors and sub-assemblies belong to a process stage, derived from
   the DB rows only:
   - a parameter label carrying a tag, e.g. "Kiln Feed Rate (FLO-01)" or
     "(FLO-KLN-01)", resolved against the machine's catalog tags;
   - an associated part ending in "(P#)" naming a sub-assembly id, or whose
     name equals a catalog sub-assembly name / short name;
   - every catalog sensor mapped to a linked sub-assembly. */

export interface StageLink {
  /** Catalog sensor tags measured in this stage. */
  tags: string[];
  /** Catalog sub-assembly ids taking part in this stage. */
  subs: string[];
}

interface LinkCatalog {
  subassemblies: Array<{ subassemblyId: string; name: string; shortName: string }>;
  sensors: Array<{ tag: string; subassemblyId: string }>;
}

const normName = (s: string) =>
  s.toLowerCase().replace(/\([^)]*\)/g, " ").replace(/[^a-z0-9]+/g, " ").trim();

/** Resolve "FLO-01" / "FLO-KLN-01" to a unique catalog tag. */
function resolveTag(ref: string, tags: readonly string[]): string | null {
  if (tags.includes(ref)) return ref;
  const parts = ref.split("-");
  const prefix = parts[0];
  const num = parts[parts.length - 1];
  const hits = tags.filter((t) => {
    const p = t.split("-");
    return p.length > 2 && p[0] === prefix && p[p.length - 1] === num;
  });
  return hits.length === 1 ? hits[0] : null;
}

/** The catalog tag a stage parameter label refers to, if any. */
export function parameterTag(label: string, tags: readonly string[]): string | null {
  const m = label.match(/\(([A-Z]{2,4}(?:-[A-Z0-9]+)*-\d{2,})\)/);
  return m ? resolveTag(m[1], tags) : null;
}

export function linkProcessStages(stages: MachineProcessStage[], catalog: LinkCatalog): Record<string, StageLink> {
  const tags = catalog.sensors.map((s) => s.tag);
  const subOfTag = new Map(catalog.sensors.map((s) => [s.tag, s.subassemblyId]));
  const subIds = new Set(catalog.subassemblies.map((s) => s.subassemblyId));
  const subByName = new Map<string, string>();
  for (const s of catalog.subassemblies) {
    subByName.set(normName(s.name), s.subassemblyId);
    subByName.set(normName(s.shortName), s.subassemblyId);
  }
  const out: Record<string, StageLink> = {};
  for (const st of stages) {
    const subs = new Set<string>();
    for (const part of st.associatedParts ?? []) {
      const pid = part.match(/\((P\d+)\)\s*$/)?.[1];
      const id = pid && subIds.has(pid) ? pid : subByName.get(normName(part));
      if (id) subs.add(id);
    }
    const stageTags = new Set<string>();
    for (const p of st.parameters ?? []) {
      const tag = parameterTag(p.label, tags);
      if (tag) stageTags.add(tag);
    }
    for (const s of catalog.sensors) if (s.subassemblyId && subs.has(s.subassemblyId)) stageTags.add(s.tag);
    for (const t of stageTags) {
      const sub = subOfTag.get(t);
      if (sub) subs.add(sub);
    }
    out[st.id] = { tags: [...stageTags], subs: [...subs] };
  }
  return out;
}

/** Process stages: live parameter values and live stage health from the stage's linked sub-assemblies. */
export function liveProcessStages(
  stages: MachineProcessStage[],
  frame: SimFrame,
  links: Record<string, StageLink>,
): MachineProcessStage[] {
  const frameTags = Object.keys(frame.signals);
  return stages.map((st) => {
    const subs = links[st.id]?.subs ?? [];
    const cells = subs.map((id) => frame.subs[id as keyof SimFrame["subs"]]).filter(Boolean);
    const health = cells.length ? Math.round(cells.reduce((a, c) => a + c.health, 0) / cells.length * 0.5 + Math.min(...cells.map((c) => c.health)) * 0.5) : st.health;
    const status: Sev = !cells.length ? st.status : cells.some((c) => c.status === "Critical") ? "Critical" : cells.some((c) => c.status === "Alert") ? "Alert" : "Normal";
    const parameters = st.parameters.map((p) => {
      const tag = parameterTag(p.label, frameTags);
      const sig = tag ? frame.signals[tag] : undefined;
      return sig ? { ...p, value: sig.display, status: sig.status } : p;
    });
    const firing = frame.rules.filter((r) => r.status !== "QUIET" && r.subs.some((s) => subs.includes(s)) && isConditionRule(r));
    return {
      ...st,
      health,
      status,
      parameters,
      healthNotes: firing.length ? `${firing[0].id} ${firing[0].name}: ${firing[0].evidence}` : st.healthNotes,
    };
  });
}
