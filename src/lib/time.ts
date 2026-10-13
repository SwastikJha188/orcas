// Wall-clock display. The database stores instants (TIMESTAMPTZ) and the API
// sends them as ISO-8601 UTC ("…Z"); they are converted here, in the browser.
//
// Which zone: a timestamp that belongs to a site (a machine, a gateway, a plant)
// is shown in that plant's time zone (hierarchy_nodes.time_zone, set on the
// plant page; resolved by `useSiteTimeZone`). A plant without one, and
// cross-site lists, use the viewer's own zone. `timeZone: undefined` below
// means the viewer's zone.
//
// Never format a timestamp on the server: Node would use the server's zone.

type Instant = string | number | Date | null | undefined;

const formatters = new Map<string, Intl.DateTimeFormat>();

function cached(key: string, make: () => Intl.DateTimeFormat): Intl.DateTimeFormat {
  let f = formatters.get(key);
  if (!f) {
    f = make();
    formatters.set(key, f);
  }
  return f;
}

function toDate(t: Instant): Date | null {
  if (t === null || t === undefined) return null;
  const d = t instanceof Date ? t : new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

export interface TimeFormatOptions {
  /** Prefix the day: "12 Oct 2026, 14:05:09". */
  date?: boolean;
  seconds?: boolean;
  /** Append the zone's short name or offset: "IST", "GMT+2". */
  zone?: boolean;
  /** IANA zone; undefined = the viewer's zone. */
  timeZone?: string | null;
}

/** An instant as wall-clock time in `timeZone` (default: the viewer's). */
export function formatLocalTime(t: Instant, { date = false, seconds = true, zone = false, timeZone }: TimeFormatOptions = {}): string {
  const d = toDate(t);
  if (!d) return "—";
  const tz = timeZone || undefined;
  const f = cached(`f|${date}|${seconds}|${zone}|${tz ?? ""}`, () =>
    new Intl.DateTimeFormat("en-GB", {
      ...(date ? { day: "2-digit", month: "short", year: "numeric" } : {}),
      hour: "2-digit",
      minute: "2-digit",
      ...(seconds ? { second: "2-digit" } : {}),
      hourCycle: "h23",
      ...(zone ? { timeZoneName: "short" } : {}),
      timeZone: tz,
    }),
  );
  return f.format(d);
}

export interface ZonedParts {
  year: number;
  month: number; // 0-11
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/** Calendar fields of an instant in `timeZone` (the viewer's when undefined) — a zone-aware getHours() & co. */
export function zonedParts(t: number, timeZone?: string | null): ZonedParts {
  const tz = timeZone || undefined;
  const f = cached(`p|${tz ?? ""}`, () =>
    new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hourCycle: "h23",
      timeZone: tz,
    }),
  );
  const p: Record<string, number> = {};
  for (const part of f.formatToParts(new Date(t))) if (part.type !== "literal") p[part.type] = Number(part.value);
  return { year: p.year, month: p.month - 1, day: p.day, hour: p.hour % 24, minute: p.minute, second: p.second };
}

/** Offset of `timeZone` from UTC at instant `t`, in ms (IST = +19 800 000). */
export function zoneOffsetMs(t: number, timeZone?: string | null): number {
  const p = zonedParts(t, timeZone);
  const asUtc = Date.UTC(p.year, p.month, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(t / 1000) * 1000;
}

/** The viewer's IANA zone, e.g. "Asia/Kolkata". */
export function viewerTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** "GMT+5:30" for a zone right now. */
export function zoneOffsetLabel(timeZone?: string | null, at = Date.now()): string {
  const tz = timeZone || undefined;
  const f = cached(`o|${tz ?? ""}`, () => new Intl.DateTimeFormat("en-US", { timeZoneName: "shortOffset", timeZone: tz }));
  const name = f.formatToParts(new Date(at)).find((p) => p.type === "timeZoneName")?.value ?? "";
  return name === "GMT" ? "GMT+0" : name;
}

/** "Asia/Kolkata (GMT+5:30)"; the viewer's zone when `timeZone` is empty. */
export function zoneLabel(timeZone?: string | null): string {
  const name = timeZone || viewerTimeZone();
  return `${name.replace(/_/g, " ")} (${zoneOffsetLabel(name)})`;
}

/**
 * Every IANA zone the browser knows, sorted by current offset then name.
 * `include` adds zones the list may spell differently (browsers list some under
 * legacy names, e.g. "Asia/Calcutta" for a stored "Asia/Kolkata").
 */
export function timeZoneOptions(include: (string | null | undefined)[] = []): { value: string; label: string }[] {
  const intl = Intl as typeof Intl & { supportedValuesOf?: (key: "timeZone") => string[] };
  const zones = intl.supportedValuesOf?.("timeZone") ?? [];
  const now = Date.now();
  const extra = include.filter((z): z is string => Boolean(z));
  return [...new Set(["UTC", viewerTimeZone(), ...zones, ...extra])]
    .map((z) => ({ z, off: zoneOffsetMs(now, z) }))
    .sort((a, b) => a.off - b.off || a.z.localeCompare(b.z))
    .map(({ z }) => ({ value: z, label: `(${zoneOffsetLabel(z, now)}) ${z.replace(/_/g, " ")}` }));
}
