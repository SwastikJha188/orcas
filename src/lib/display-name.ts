/**
 * Name for display: drops bracketed references that only carry IDs, e.g.
 * "Shell temperature map maximum (K-K33 STS-KLN-08 / CAL-KLN-03)" →
 * "Shell temperature map maximum". Brackets with plain words stay
 * ("Kiln axial position (LVDT on thrust cylinder)"). The tag itself stays in
 * tooltips, so nothing is lost.
 */
const ID_TOKEN = /\b[A-Z]{1,4}-[A-Z0-9]{1,4}(?:-[A-Z]?\d{1,3})?\b/;

export function displayName(name: string): string {
  return name
    .replace(/\s*\(([^()]*)\)/g, (whole, inner: string) => (ID_TOKEN.test(inner) ? "" : whole))
    .trim();
}

/** True when a label is only an ID (a tag such as "K-K33" or "TMP-KLN-19"), not words. */
export function isIdOnly(label: string): boolean {
  return new RegExp(`^${ID_TOKEN.source}$`).test(label.trim());
}

/**
 * Short label for a machine: the code its name ends with
 * ("Clinker Cooler and Fans CLR-01" → "CLR-01"); the whole name when it has none.
 */
export function machineCode(name: string): string {
  return /\b[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+$/.exec(name.trim())?.[0] ?? name;
}

/** What `nameIds` needs from plant definitions (structural, so `PlantDefs` fits). */
export interface IdNameSource {
  signals: ReadonlyArray<{ tag: string; name: string }>;
  rules: ReadonlyArray<{ id: string; name: string }>;
  subassemblies?: ReadonlyArray<{ id: string; name: string }>;
  systems?: ReadonlyArray<{ id: string; name: string }>;
}

const ID_GLOBAL = new RegExp(ID_TOKEN.source, "g");
const ID_LIST = new RegExp(`^\\s*${ID_TOKEN.source}(?:[\\s/,;·+&]+${ID_TOKEN.source})*\\s*$`);
const nameMaps = new WeakMap<object, Map<string, string>>();

function nameMapOf(defs: IdNameSource): Map<string, string> {
  let m = nameMaps.get(defs);
  if (!m) {
    m = new Map();
    for (const s of defs.systems ?? []) m.set(s.id, s.name);
    for (const s of defs.subassemblies ?? []) m.set(s.id, s.name);
    for (const s of defs.signals) m.set(s.tag, displayName(s.name));
    for (const r of defs.rules) m.set(r.id, r.name);
    nameMaps.set(defs, m);
  }
  return m;
}

/**
 * Free text (event titles, details, notes) with known sensor tags, rule IDs,
 * system and sub-assembly IDs replaced by their names: "R-KLN-19 Shell hot
 * spot confirmed" → "Shell hot spot confirmed", "TMP-KLN-21 alert" → "Motor
 * winding temperature alert". `extra` adds names (e.g. machine ID → name).
 * Unknown IDs (work orders, gateways) stay. Keep the raw text in a tooltip.
 */
export function nameIds(text: string, defs: IdNameSource | null | undefined, extra?: Readonly<Record<string, string>>): string {
  if (!text) return text;
  const map = defs ? nameMapOf(defs) : null;
  const nameOf = (id: string) => extra?.[id] ?? map?.get(id);
  return text
    // A bracket of IDs only ("(K-K33 STS-KLN-08 / CAL-KLN-03)") is a reference, not words: drop it.
    .replace(/ ?\(([^()]*)\)/g, (whole, inner: string) => (ID_LIST.test(inner) ? "" : whole))
    .replace(ID_GLOBAL, (id, offset: number, whole: string) => {
      const name = nameOf(id);
      if (!name) return id;
      // "R-KLN-19 Shell hot spot" already carries the name: drop the ID.
      const rest = whole.slice(offset + id.length).replace(/^[\s:·]+/, "");
      if (rest.startsWith(name)) return "\u0000";
      // "Shell hot spot (R-KLN-19)" already names it: drop the bracket.
      if (whole.slice(0, offset).endsWith(`${name} (`) && whole[offset + id.length] === ")") return "\u0001";
      return name;
    })
    .replace(/\u0000[ :·]*/g, "")
    .replace(/ \(\u0001\)/g, "")
    .replace(/\( *\)/g, "")
    .replace(/ {2,}/g, " ")
    .trim();
}

/** Name of one exact ID (tag, rule, system or sub-assembly such as "main-motor"); the ID itself when unknown. */
export function nameOf(id: string, defs: IdNameSource | null | undefined): string {
  return (defs ? nameMapOf(defs).get(id) : undefined) ?? id;
}

/** A comma-separated ID list ("main-motor, gearbox") as names ("Main motor, Gearbox"). */
export function namesOf(list: string, defs: IdNameSource | null | undefined): string {
  return list
    .split(/\s*,\s*/)
    .map((id) => nameOf(id, defs))
    .join(", ");
}
