// Cross-page & cross-layer focus: write a tag, ruleId, or component scope, then
// open the target layer. Diagnosis, Root Cause (Analysis), Prognosis, Overview,
// and Telemetry & Sensors read these keys on mount and listen to the live event.
import { SENSORS_FOCUS_KEY } from "./machine-sensor-mapping-view";
import { TRENDS_FOCUS_KEY } from "./trends-focus";

export const FOCUS_RULE_KEY = "ultron.focus.rule";
export const FOCUS_COMPONENT_KEY = "ultron.focus.component";
export const FOCUS_TAG_KEY = "ultron.focus.tag";
export const LAYER_FOCUS_EVENT = "ultron:layer-focus";
/** When the rule / part hand-off was made: a page opened later than FOCUS_TTL_MS after it ignores it. */
const FOCUS_AT_KEY = "ultron.focus.at";
const FOCUS_TTL_MS = 60_000;

/** One-shot: the sub-assembly (name) another page (Prognosis) asks Diagnosis to filter its sensors to. */
export const DIAGNOSIS_SUB_KEY = "ultron.diagnosis.sub";

export interface LayerFocusPayload {
  ruleId?: string | null;
  component?: string | null;
  tag?: string | null;
  section?: string | null;
}

export function focusSensorOn(page: "sensors" | "trends", tag: string | null | undefined): void {
  if (!tag) return;
  try {
    sessionStorage.setItem(page === "sensors" ? SENSORS_FOCUS_KEY : TRENDS_FOCUS_KEY, tag);
    sessionStorage.setItem(FOCUS_TAG_KEY, tag);
  } catch {
    /* storage unavailable: the page still opens, unfocused */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(LAYER_FOCUS_EVENT, { detail: { tag } }));
  }
}

/**
 * Set the cross-layer context (fault rule, component/part name, sensor tag, or
 * target section anchor) before navigating between Overview, Diagnosis,
 * Root Cause (Analysis), Prognosis, and Telemetry & Sensors.
 */
export function focusLayer(payload: LayerFocusPayload): void {
  try {
    sessionStorage.setItem(FOCUS_AT_KEY, String(Date.now()));
    if (payload.ruleId !== undefined) {
      if (payload.ruleId) {
        sessionStorage.setItem(FOCUS_RULE_KEY, payload.ruleId);
        sessionStorage.setItem("ultron.diagnosis.rule", payload.ruleId);
      } else {
        sessionStorage.removeItem(FOCUS_RULE_KEY);
      }
    }
    if (payload.component !== undefined) {
      if (payload.component) {
        sessionStorage.setItem(FOCUS_COMPONENT_KEY, payload.component);
      } else {
        sessionStorage.removeItem(FOCUS_COMPONENT_KEY);
      }
    }
    if (payload.tag !== undefined && payload.tag) {
      sessionStorage.setItem(FOCUS_TAG_KEY, payload.tag);
      sessionStorage.setItem(SENSORS_FOCUS_KEY, payload.tag);
      sessionStorage.setItem(TRENDS_FOCUS_KEY, payload.tag);
    }
    if (payload.section) {
      sessionStorage.setItem("ultron.diagnosis.section", payload.section);
      sessionStorage.setItem("ultron.analysis.anchor", payload.section);
      sessionStorage.setItem("ultron.prognosis.section", payload.section);
    }
  } catch {
    /* storage unavailable */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<LayerFocusPayload>(LAYER_FOCUS_EVENT, { detail: payload }));
  }
}

export function readLayerFocus(consume = false): {
  ruleId: string | null;
  component: string | null;
  tag: string | null;
} {
  try {
    // A hand-off is for the page opened right after it, not for every later visit.
    const at = Number(sessionStorage.getItem(FOCUS_AT_KEY) ?? 0);
    if (!at || Date.now() - at > FOCUS_TTL_MS) {
      for (const k of [FOCUS_RULE_KEY, FOCUS_COMPONENT_KEY, "ultron.diagnosis.rule"]) sessionStorage.removeItem(k);
      return { ruleId: null, component: null, tag: sessionStorage.getItem(FOCUS_TAG_KEY) || null };
    }
    const ruleId = sessionStorage.getItem(FOCUS_RULE_KEY) || sessionStorage.getItem("ultron.diagnosis.rule") || null;
    const component = sessionStorage.getItem(FOCUS_COMPONENT_KEY) || null;
    const tag = sessionStorage.getItem(FOCUS_TAG_KEY) || null;
    if (consume) {
      sessionStorage.removeItem("ultron.diagnosis.rule");
    }
    return { ruleId, component, tag };
  } catch {
    return { ruleId: null, component: null, tag: null };
  }
}

