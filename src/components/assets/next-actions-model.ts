import { estimateOf, minutesIn, type NextAction } from "@/components/ui";
import type { RuleState } from "@shared/lib/kiln-sim/engine";
import type { ClearedAlarm } from "@shared/lib/alarm-journal";
import type { PmsModel } from "@/components/maintenance/pms-model";
import type { DxSensor } from "./diagnosis-model";
import { isOpenStage } from "@shared/lib/pms";
import type { Rec } from "./prognosis/prog-maintenance";
import { alarmText, type SignalForecastRow } from "./prognosis/prog-signals";

/* ==========================================================================
   Next actions for the machine pages (Diagnosis, Full line Diagnosis): what a
   person does about a live problem or a doubtful sensor. One action per thing:
   acknowledge an alarm nobody has seen, ask for a repair once it is seen,
   check a sensor whose reading cannot be trusted.
   ========================================================================== */

const priorityTone = (p: string): NextAction["tone"] => (p === "P1" ? "bad" : p === "P2" ? "warn" : "info");

/** The facts behind a problem: priority, time to its limit, how sure. */
export function ruleFacts(r: Pick<RuleState, "priority" | "timeToLimit" | "confidence">): string[] {
  const mins = minutesIn(r.timeToLimit);
  return [r.priority, mins !== null ? `limit in ${estimateOf(r.timeToLimit)}` : null, `${Math.round(r.confidence)} % sure`].filter((x): x is string => !!x);
}

export interface RuleActionInput {
  machineId: string;
  /** Added to each row on pages that show several machines ("· CLR-01"). */
  machineLabel?: string;
  rules: RuleState[];
  acked: Set<string>;
  cleared: Map<string, ClearedAlarm>;
  /** Plain name of a rule that is no longer in the frame (a cleared alarm). */
  ruleName: (ruleId: string) => string;
  acknowledge: (ruleId: string) => void | Promise<void>;
  pms: PmsModel;
}

/** A repair is already asked for (a work order is linked to the problem). */
const hasRepair = (pms: PmsModel, machineId: string, ruleId: string) => pms.findings.some((f) => f.machineId === machineId && f.ruleId === ruleId && f.workOrderId);

export function ruleActions({ machineId, machineLabel, rules, acked, cleared, ruleName, acknowledge, pms }: RuleActionInput): NextAction[] {
  const at = machineLabel ? ` · ${machineLabel}` : "";
  const out: NextAction[] = [];
  for (const r of rules) {
    if (r.status !== "ACTIVE") continue;
    const name = r.plainTitle || r.name;
    const rank = minutesIn(r.timeToLimit) ?? undefined;
    if (!acked.has(r.id)) {
      out.push({ key: `ack|${machineId}|${r.id}`, tone: r.severity === "Critical" ? "bad" : "warn", rank, what: `${name}${at}`, why: [...ruleFacts(r), "nobody has acknowledged it"].join(" · "), label: "Acknowledge", run: () => void acknowledge(r.id) });
    } else if (!hasRepair(pms, machineId, r.id)) {
      out.push({
        key: `fix|${machineId}|${r.id}`,
        tone: priorityTone(r.priority),
        rank,
        what: `${name}${at}`,
        why: [...ruleFacts(r), "acknowledged, no repair asked for"].join(" · "),
        label: "Ask for a repair",
        run: async () => (await pms.propose({ machineId, ruleId: r.id, title: name, priority: r.priority, notes: r.plainTodo || r.action || null })).tone === "good",
      });
    }
  }
  for (const c of cleared.values()) {
    out.push({ key: `clr|${machineId}|${c.ruleId}`, tone: "info", what: `${ruleName(c.ruleId)}${at}`, why: "back to normal · nobody acknowledged the alarm", label: "Acknowledge", run: () => void acknowledge(c.ruleId) });
  }
  return out;
}

const VALIDITY_WHY: Partial<Record<DxSensor["validity"], string>> = {
  invalid: "reading not usable",
  stale: "reading not updating",
  suspect: "reading may be wrong",
};

/** Sensors whose readings cannot be trusted: open the trend to check them. */
export function sensorActions(sensors: DxSensor[], openTrend: (tag: string) => void, machineLabel?: string): NextAction[] {
  return sensors
    .filter((s) => VALIDITY_WHY[s.validity])
    .map((s) => ({
      key: `sensor|${s.tag}`,
      tone: s.validity === "invalid" ? ("warn" as const) : ("info" as const),
      rank: s.validity === "invalid" ? 0 : s.validity === "stale" ? 1 : 2,
      what: `${s.name}${machineLabel ? ` · ${machineLabel}` : ""}`,
      why: [s.tag, VALIDITY_WHY[s.validity], s.qualityNote].filter(Boolean).join(" · "),
      label: "Check the sensor",
      run: () => openTrend(s.tag),
    }));
}

/* ---------------------------------------------------------------- prognosis */

const BASIS: Record<string, string> = { RUL: "time left estimate", Risk: "failure risk", Forecast: "reading forecast", Finding: "live problem" };

export interface PrognosisActionInput {
  machineId: string;
  machineLabel?: string;
  recs: Rec[];
  /** Readings forecast to reach their alarm limit. */
  alarms: SignalForecastRow[];
  pms: PmsModel;
  openTrend: (tag: string) => void;
}

/** Work the forecast calls for (asked for in one click, unless already asked), and readings heading for an alarm. */
export function prognosisActions({ machineId, machineLabel, recs, alarms, pms, openTrend }: PrognosisActionInput): NextAction[] {
  const at = machineLabel ? ` · ${machineLabel}` : "";
  const asked = (title: string) => (pms.data?.workOrders ?? []).some((w) => w.machineId === machineId && w.title === title && isOpenStage(w.stage));
  const out: NextAction[] = [];
  for (const r of recs) {
    if (asked(r.title)) continue;
    const life = r.id.startsWith("life-");
    out.push({
      key: `rec|${machineId}|${r.id}`,
      tone: r.due === null ? "info" : r.due <= 24 ? "bad" : r.due <= 168 ? "warn" : "info",
      rank: r.due === null ? undefined : r.due * 60,
      what: `${r.title}${at}`,
      why: [r.title.includes(r.component) ? null : r.component, r.window ? (r.window === "Now" ? "do it now" : r.window.charAt(0).toLowerCase() + r.window.slice(1)) : null, `from the ${r.supports.map((x) => BASIS[x] ?? x.toLowerCase()).join(" and ")}`].filter(Boolean).join(" · "),
      label: life ? "Plan the replacement" : r.id.startsWith("rul-") ? "Ask for an inspection" : "Ask for this work",
      run: async () => (await pms.propose({ machineId, title: r.title, component: r.component, priority: r.priority, type: life ? "proactive" : "predictive" })).tone === "good",
    });
  }
  for (const s of alarms) {
    const past = s.alarmEarly === 0 || s.alarmLate === 0;
    out.push({ key: `fc|${machineId}|${s.tag}`, tone: past ? "warn" : "info", rank: (s.alarmEarly ?? s.alarmLate ?? 720) * 60, what: `${s.name}${at}`, why: [s.tag, `alarm limit: ${alarmText(s).toLowerCase()}`].join(" · "), label: "Open the trend", run: () => openTrend(s.tag) });
  }
  return out;
}
