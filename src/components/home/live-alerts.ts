/**
 * The alarm rows a live machine's frame raises: its confirmed (ACTIVE) Alert / Critical rules and its
 * readings past an Alert / Critical limit, in everyday words (docs/plain-language.md). The Home alarm
 * list and the Simulation page's Alarms view both build their rows here, so they read the same.
 */
import { formatClock, formatDuration, type SimFrame } from "@shared/lib/kiln-sim/engine";
import { normalPhrase, plainLimitAlarm } from "@/lib/plain-words";
import type { PlantDefs } from "@shared/lib/plant-defs";
import type { HomeAlert } from "./home-widgets";

const partName = (defs: PlantDefs, sub: string | undefined): string | undefined => (sub ? defs.subassemblies.find((s) => s.id === sub)?.name : undefined);

export function liveFrameAlerts(node: { machineId?: string | null; name: string }, f: SimFrame): HomeAlert[] {
  const out: HomeAlert[] = [];
  const cleanName = node.name.replace(/\s*\([A-Z0-9-]+\)\s*$/, "");
  for (const r of f.rules) {
    if (r.status !== "ACTIVE" || r.severity === "Normal") continue;
    out.push({
      id: `${node.machineId}:${r.id}`,
      level: r.severity === "Critical" ? "danger" : "alert",
      machine: cleanName,
      machineId: node.machineId!,
      finding: r.name,
      reading: r.evidence,
      recommendation: `${r.action} Likely cause: ${r.cause}.`,
      cause: r.cause,
      consequence: r.consequence,
      ruleLogic: r.logic,
      action: r.action,
      age: r.since !== null ? `${formatDuration(f.t - r.since)} ago` : null,
      raised: r.since !== null ? formatClock(r.since).clock : null,
      t: r.since,
      subs: r.subs,
      tags: r.tags,
      plainTitle: r.plainTitle,
      plainWhat: r.plainWhat,
      plainTodo: r.plainTodo,
      where: partName(f.defs, r.subs?.[0]),
    });
  }
  for (const sig of Object.values(f.signals)) {
    if (sig.limitSeverity !== "Critical" && sig.limitSeverity !== "Alert") continue;
    const def = f.defs.signalByTag[sig.tag];
    if (!def) continue;
    const onset = f.t - Math.max(1, f.scenarioMinute);
    const sub = "sub" in def && typeof def.sub === "string" ? def.sub : undefined;
    const where = partName(f.defs, sub);
    const plain = plainLimitAlarm({
      name: def.name,
      reading: `${sig.display}${def.unit && def.unit !== "state" ? ` ${def.unit}` : ""}`,
      normal: normalPhrase(def.normalBand, def.unit),
      higher: sig.limitDir ? sig.limitDir === "high" : typeof sig.value === "number" && typeof sig.model === "number" ? sig.value > sig.model : null,
      settling: sig.limitNow === "Normal",
      critical: sig.limitSeverity === "Critical",
      where: where ?? null,
    });
    out.push({
      id: `${node.machineId}:sig:${sig.tag}`,
      level: sig.limitSeverity === "Critical" ? "danger" : "alert",
      machine: cleanName,
      machineId: node.machineId!,
      finding: `${def.name} — ${sig.limitSeverity === "Critical" ? "Critical" : "Alert"} limit`,
      reading: `${sig.display}${def.unit ? ` ${def.unit}` : ""}${sig.limitNote ? ` · ${sig.limitNote}` : ` · normal ${def.normalBand}`}`,
      recommendation: `Check ${def.name}. Its normal range is ${def.normalBand}.`,
      age: f.scenarioMinute > 0 ? `${formatDuration(f.scenarioMinute)} ago` : "just now",
      raised: formatClock(onset).clock,
      t: onset,
      subs: sub ? [sub] : undefined,
      tags: [sig.tag],
      plainTitle: plain.title,
      plainWhat: plain.what,
      plainTodo: plain.todo,
      where,
    });
  }
  return out;
}
