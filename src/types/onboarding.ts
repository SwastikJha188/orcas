/**
 * Plant onboarding: the working draft an onboarding package carries until it is
 * committed into the monitoring tables (format "ultron.onboarding/1"). Filled
 * by hand in Configure › Onboarding and from processed uploads: PDFs through
 * the pdf-extract skill (extract.json, "ultron.extract/1"), machine images
 * through the diagram skills (drawings stored in `diagrams`).
 *
 * Keys (`key`) are draft-local ids so rows can reference each other before
 * anything exists in the DB. Unknown = null; nothing is invented.
 */

export interface DraftSource {
  fileId: number | null;
  page: number | null;
}

export interface DraftPlant {
  name: string;
  code: string;
  shortName: string | null;
  region: string | null;
  location: string | null;
  coordinates: string | null;
  timeZone: string | null;
  description: string | null;
  designCapacity: string | null;
}

/** A factory, section, line or building of the plant. */
export interface DraftArea {
  key: string;
  name: string;
  parentKey: string | null;
  /** Drawing kind made from the area's photo or layout (stored diagrams); null until one is made. */
  diagramType?: string | null;
}

export interface DraftUser {
  key: string;
  fullName: string;
  email: string;
  title: string | null;
  department: string | null;
  roleId: string;
  access: "read" | "write" | "admin";
}

export interface DraftComponent {
  key: string;
  name: string;
}

export interface DraftMachine {
  key: string;
  /** The plant's own equipment code ("KLN-01"). */
  code: string;
  name: string;
  areaKey: string | null;
  /** Plain kind ("rotary kiln", "vacuum casting cell"). */
  type: string | null;
  manufacturer: string | null;
  model: string | null;
  powerRating: string | null;
  operatingSpeed: string | null;
  criticality: "A (Critical)" | "B (Essential)" | "C (General)";
  /** Drawing kind (stored diagrams / code drawings); null until one is made or chosen. */
  diagramType: string | null;
  components: DraftComponent[];
  source: DraftSource | null;
}

export interface DraftPoint {
  key: string;
  tag: string;
  name: string;
  machineKey: string | null;
  componentKey: string | null;
  location: string | null;
  /** quantities.id ("temperature", "pressure" …). */
  quantity: string | null;
  /** Unit as printed / chosen ("°C", "mmWG"). */
  unit: string | null;
  valueKind: "analog" | "state";
  origin: "online" | "manual" | "calculated";
  signalType: string | null;
  rangeLo: number | null;
  rangeHi: number | null;
  rangeText: string | null;
  nominalLo: number | null;
  nominalHi: number | null;
  nominalText: string | null;
  ll: number | null;
  l: number | null;
  h: number | null;
  hh: number | null;
  limitsText: string | null;
  priority: string | null;
  remarks: string | null;
  source: DraftSource | null;
}

export interface OnboardingDraft {
  format: "ultron.onboarding/1";
  plant: DraftPlant;
  areas: DraftArea[];
  users: DraftUser[];
  machines: DraftMachine[];
  points: DraftPoint[];
  /** Things the documents leave open (from the extracts' gaps), for the reviewer. */
  gaps: string[];
}

export type OnboardingStatus = "draft" | "waiting" | "processed" | "committed";

export interface OnboardingFile {
  id: number;
  kind: "document" | "image";
  /** Photo: the draft key of the machine or area (factory, line) it shows. */
  machineKey: string | null;
  fileName: string;
  mime: string;
  sizeBytes: number;
  status: "waiting" | "processed" | "failed";
  note: string | null;
  /** Short result: extract counts, or the drawing kind made. */
  summary: string | null;
  createdAt: string;
  processedAt: string | null;
}

export interface OnboardingPackage {
  id: string;
  name: string;
  status: OnboardingStatus;
  draft: OnboardingDraft;
  plantId: string | null;
  files: OnboardingFile[];
  createdAt: string;
  updatedAt: string;
  committedAt: string | null;
}

export const emptyDraft = (name = ""): OnboardingDraft => ({
  format: "ultron.onboarding/1",
  plant: { name, code: "", shortName: null, region: null, location: null, coordinates: null, timeZone: null, description: null, designCapacity: null },
  areas: [],
  users: [],
  machines: [],
  points: [],
  gaps: [],
});

/** Tag prefix → quantity (ISA-style first letters used by the plant's tag lists); null when unsure. */
export function guessQuantity(tag: string, unit: string | null, valueKind: "analog" | "state"): string | null {
  if (valueKind === "state") return "state";
  const u = (unit ?? "").toLowerCase();
  if (/°c|°f|degc|\bk\b/.test(u)) return "temperature";
  if (/mm\/s/.test(u)) return "vibration_velocity";
  if (/bar|pa\b|kpa|mpa|psi|mmwg|mmh2o|mwc/.test(u)) return "pressure";
  if (/^a$|\bma\b|amp|fla/.test(u)) return "current";
  if (/kw|mw|\bw\b/.test(u)) return "power";
  if (/rpm/.test(u)) return "speed";
  if (/ppm|vol%|mg\/nm/.test(u)) return "gas_concentration";
  if (/t\/h|m³\/h|m3\/h|l\/min|nm³\/h|kg\/h/.test(u)) return "flow";
  const p = tag.toUpperCase().split(/[-_ ]/)[0];
  const byPrefix: Record<string, string> = {
    TMP: "temperature", TE: "temperature", TT: "temperature", PRS: "pressure", PT: "pressure", PE: "pressure",
    VIB: "vibration_velocity", ELE: "current", SPD: "speed", FLO: "flow", FT: "flow", LEV: "level", LT: "level",
    WGT: "mass", GAS: "gas_concentration", POS: "position",
  };
  return byPrefix[p] ?? null;
}
