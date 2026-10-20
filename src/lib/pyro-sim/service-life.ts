/**
 * Part service lives for SW-ALL-01 (D4 Table 8.3, asset-lifetime yellow
 * advisory; Table B.1 item 2.4) and the Maintenance › Proactive page.
 *
 * The records live in the database (component_service_lives) and reach the
 * engine through the engine configuration (`setServiceParts`). A record says
 * how much of a part's life was used when the machine's running-hours counter
 * read `counterH`; the line's counter is its plant time (it runs around the
 * clock). A service-due advisory is calendar / hour based: it is NOT observed
 * mechanical deterioration, is shown yellow, and never lowers machine health.
 *
 * Pure TypeScript: the engine, the server and the pages share it.
 */

export interface ServicePart {
  id: string;
  machine: string;
  /** Sub-assembly code inside the machine (`kln-lube`). */
  sub: string | null;
  name: string;
  /** Life basis: running hours or days of plant time. */
  basis: "h" | "d";
  /** OEM / plant life criterion in `basis` units. */
  life: number;
  /** Share of life at which the yellow advisory opens. */
  dueShare: number;
  /** Units used when the running-hours counter read `counterH`. */
  used: number;
  counterH: number;
  /** Installation or last rebuild, as recorded. */
  installed: string | null;
  duty: string | null;
}

let parts: ServicePart[] = [];

/** The database's part records (engine configuration). */
export function setServiceParts(list: ServicePart[]): void {
  parts = list;
}

export function servicePartsOf(machine: string): ServicePart[] {
  return parts.filter((p) => p.machine === machine);
}

/** The line's running-hours counter at simulated minute `t`. */
export const runningHours = (t: number) => t / 60;

/** Units of life used when the counter reads `counterH` (never below the recorded value). */
export function serviceUsedUnits(p: Pick<ServicePart, "basis" | "used" | "counterH">, counterH: number): number {
  const elapsed = Math.max(0, counterH - p.counterH);
  return p.used + (p.basis === "h" ? elapsed : elapsed / 24);
}

/** Used share of life when the counter reads `counterH`. */
export function serviceUsedShare(p: Pick<ServicePart, "basis" | "used" | "counterH" | "life">, counterH: number): number {
  return serviceUsedUnits(p, counterH) / p.life;
}

/** Used share of life at a simulated minute. */
export function serviceUsed(p: ServicePart, t: number): number {
  return serviceUsedShare(p, runningHours(t));
}
