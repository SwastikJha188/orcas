"use client";

import React, { useEffect, useMemo, useState } from "react";
import { rowActivate } from "@/components/ui/row-activate";
import { createPortal } from "react-dom";
import { PillButton, PillNav } from "@/components/ui";
import { IconClose, IconMore, IconSensor, SearchPill, StatusTag, Ticks, severityTone } from "./assets-shell-ui";
import { Sparkline } from "@/components/ui/sparkline";
import { LimitBar, gaugeScale, twoSided, twoSidedLoad } from "./sensor-gauge";
import { isRelativeLimit, limitNum, limitSummary, resolveLimit } from "@shared/lib/kiln-sim/signals";
import { sensorAlarmLoad, type SensorScope } from "./sensor-mapping-diagram";
import {
  D4_SOURCE_LABEL,
  calcDefsFor,
  fmt,
  isCalculated,
  isManual,
  isWired,
  isHoldChannel,
  isOnOff,
  CHECK_LABEL,
  QUALITY_LABEL,
  limitApprovalText,
  limitValuesText,
  limitsApprovalText,
  pyroOwnerOf,
  scannerEntryOf,
  parseSampleRate,
  slotOf,
  tagOf,
  unitText,
  type Quality,
  type SensorRow,
} from "./sensors-model";
import type { SensorsCtx } from "./sensors-sections";
import { formatLocalTime } from "@/lib/time";
import { simTimeMs } from "@shared/lib/kiln-sim/engine";
import { useMenuFocus } from "./use-menu-focus";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { displayName, isIdOnly, nameOf } from "@/lib/display-name";
import { PYRO_RANGES, PYRO_RANGES_DOC } from "@shared/lib/pyro-sim/ranges";
import { faultsForTag, libraryText, useFaultLibrary } from "./fault-library";

/* ==========================================================================
   Sensors › Sensors.
   The transducer allocation (one divider-list table; toolbar: reading quality,
   limit state, grouping, search):
   sensor ID, measurement, instrument, location, range, rack slot, Modbus
   register, sampling, live value, limit state and data quality — grouped by
   sub-assembly or by process / condition role, with a detail panel.
   ========================================================================== */

type StatusKey = "Normal" | "Alert" | "Critical";
const STATUS_KEYS: StatusKey[] = ["Normal", "Alert", "Critical"];
type QualityFilter = "all" | "valid" | "attention" | "nolive";
type GroupBy = "sub" | "role" | "none";
const needsAttention = (q: Quality) => q !== "Valid" && q !== "No live feed";

function groupLine(list: SensorRow[], missing: string[], withSpec: boolean): string {
  const bad = list.filter((r) => needsAttention(r.q.quality)).length;
  const out = list.filter((r) => r.status !== "Normal").length;
  const unlinked = list.filter((r) => isWired(r) && !r.livePoint).length;
  return [
    `${list.length} sensor${list.length === 1 ? "" : "s"}`,
    bad ? `${bad} with doubtful readings` : "",
    out ? `${out} outside normal limits` : "",
    withSpec && missing.length ? `${missing.length} of ${list.length + missing.length} planned sensors not set up yet` : "",
    unlinked && list.some((r) => r.livePoint) ? `${unlinked} not connected to the live feed` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

export function QualityMark({ row, prefix = "" }: { row: SensorRow; prefix?: string }) {
  // Monochrome when valid: status colour only marks data that cannot be trusted.
  const tone = row.q.tone === "good" ? "idle" : row.q.tone;
  return (
    <span className="pg-sensors-quality" data-tone={tone} title={row.q.note}>
      <span className="ast-chip-dot" aria-hidden="true" />
      {prefix}
      {prefix ? QUALITY_LABEL[row.q.quality].toLowerCase() : QUALITY_LABEL[row.q.quality]}
    </span>
  );
}

export function SensorsRegister({ ctx, scope, onClearScope }: { ctx: SensorsCtx; scope: SensorScope | null; onClearScope: () => void }) {
  const { rows, counts, selectedTag, select } = ctx;
  const [qualityFilter, setQualityFilter] = useState<QualityFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusKey | null>(null);
  const [groupBy, setGroupBy] = useState<GroupBy>("sub");
  const [query, setQuery] = useState("");
  const [menuTag, setMenuTag] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number }>({ top: 0, right: 0 });

  // Reset filters when another machine opens, or when another page focuses a sensor.
  useEffect(() => {
    setQualityFilter("all");
    setStatusFilter(null);
    setQuery("");
  }, [ctx.machine.id, ctx.focusNonce]);

  // Close the row menu on outside click / Escape / scroll.
  useEffect(() => {
    if (!menuTag) return;
    const onDown = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest?.("[data-row-menu]")) setMenuTag(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuTag(null);
    const onScroll = () => setMenuTag(null);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [menuTag]);

  const scopeTags = useMemo(() => (scope ? new Set(scope.tags) : null), [scope]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((s) => {
      if (scopeTags && !scopeTags.has(tagOf(s))) return false;
      if (statusFilter && s.status !== statusFilter) return false;
      if (qualityFilter === "valid" && s.q.quality !== "Valid") return false;
      if (qualityFilter === "attention" && !needsAttention(s.q.quality)) return false;
      if (qualityFilter === "nolive" && s.q.quality !== "No live feed") return false;
      if (!q) return true;
      return [tagOf(s), s.name, s.sensorType, s.cardId, s.modbusAddress ?? "", s.component, s.subAssembly ?? "", s.role].some((v) =>
        v.toLowerCase().includes(q)
      );
    });
  }, [rows, scopeTags, statusFilter, qualityFilter, query]);

  const groups = useMemo(() => {
    if (groupBy === "none") return [{ key: "all", label: "", rows: filtered, missing: [] as string[] }];
    const map = new Map<string, SensorRow[]>();
    for (const r of filtered) {
      const k = groupBy === "role" ? r.role : r.subAssembly || r.component || "Unassigned";
      const list = map.get(k) ?? [];
      list.push(r);
      map.set(k, list);
    }
    const dbTags = new Set(rows.map(tagOf));
    const unfiltered = !query.trim() && !statusFilter && qualityFilter === "all";
    const out = [...map.entries()].map(([key, list]) => {
      // Coverage against the machine's specification: specified tags of this sub-assembly that the DB lacks.
      const subs = new Set(list.map((r) => r.spec?.sub).filter(Boolean));
      const missing =
        ctx.hasSpec && ctx.defs && groupBy === "sub" && unfiltered
          ? ctx.defs.signals.filter((x) => subs.has(x.sub) && !dbTags.has(x.tag)).map((x) => x.tag)
          : [];
      return { key, label: key, rows: list, missing };
    });
    if (groupBy === "role") out.sort((a, b) => (a.key === "Condition" ? -1 : b.key === "Condition" ? 1 : 0));
    return out;
  }, [filtered, groupBy, rows, ctx.hasSpec, ctx.defs, query, statusFilter, qualityFilter]);

  const qualityTabs = useMemo(() => {
    const tabs = [{ id: "all", label: `All ${counts.total}` }, { id: "valid", label: `Good readings ${counts.q.valid}` }];
    if (counts.q.attention > 0 || qualityFilter === "attention") tabs.push({ id: "attention", label: `Doubtful readings ${counts.q.attention}` });
    if (counts.q.nolive > 0 || qualityFilter === "nolive") tabs.push({ id: "nolive", label: `Not live ${counts.q.nolive}` });
    return tabs;
  }, [counts, qualityFilter]);

  const selected = selectedTag ? rows.find((s) => tagOf(s) === selectedTag) ?? null : null;
  const COLS = 10;
  // Limit approval from the DB limit rows; slot allocation "proposed" when the registry card says so.
  const limitsNote = useMemo(() => limitsApprovalText(rows.map((r) => r.m?.limit)), [rows]);
  const slotsProposed = useMemo(() => rows.some(isProposedSlot), [rows]);

  return (
    <div className="pg-sensors-register">
      <div className="ast-toolbar">
        <div className="ast-toolbar-group">
          <span className="ast-section-label">
            <span className="ast-num">
              {filtered.length} of {counts.total} sensors
            </span>
          </span>
          {scope && (
            <button type="button" className="ast-filter" aria-pressed="true" onClick={onClearScope} title="Show sensors from every part of the machine">
              {scope.label}
              <IconClose size={11} />
            </button>
          )}
        </div>
        <div className="ast-toolbar-group">
          <PillNav items={qualityTabs} activeId={qualityFilter} onChange={(id) => setQualityFilter(id as QualityFilter)} ariaLabel="Reading quality" />
          <div className="ast-toolbar-group" role="group" aria-label="Filter by status">
            {STATUS_KEYS.filter((k) => k !== "Normal" && (counts.status[k] > 0 || statusFilter === k)).map((k) => (
              <button
                key={k}
                type="button"
                className="ast-filter"
                data-tone={severityTone(k)}
                aria-pressed={statusFilter === k}
                onClick={() => setStatusFilter(statusFilter === k ? null : k)}
              >
                <span className="ast-chip-dot" aria-hidden="true" />
                {k} <b>{counts.status[k]}</b>
              </button>
            ))}
          </div>
          <PillNav
            items={[
              { id: "sub", label: "By part" },
              { id: "role", label: "By purpose" },
              { id: "none", label: "No groups" },
            ]}
            activeId={groupBy}
            onChange={(id) => setGroupBy(id as GroupBy)}
            ariaLabel="Group sensors"
          />
          <SearchPill value={query} onChange={setQuery} placeholder="Search name, tag or instrument" label="Search sensors" />
        </div>
      </div>

      <div className={`ast-sm ${selected ? "has-panel" : ""}`}>
        <section className="ast-card ast-sm-table" aria-label="Sensors">
          {filtered.length === 0 ? (
            <div className="ast-empty">No sensors match these filters. Clear a filter to see more.</div>
          ) : (
            <div className="ui-table-container ast-table pg-sensors-table">
              <table className="ui-table" aria-label="Sensors on this machine">
                <thead>
                  <tr>
                    <th scope="col">Sensor</th>
                    <th scope="col">Measures</th>
                    <th scope="col">Where</th>
                    <th scope="col">Can read</th>
                    <th scope="col">{slotsProposed ? "Wired to (planned)" : "Wired to"}</th>
                    <th scope="col" className="pg-sensors-r">
                      How often
                    </th>
                    <th scope="col" className="pg-sensors-r">
                      Reading now
                    </th>
                    <th scope="col">
                      {limitsNote && limitsNote !== "Approved limits" ? (
                        <span className="ast-cell-stack">
                          <span>Limits</span>
                          <span className="ast-cell-sub">{limitsNote}</span>
                        </span>
                      ) : (
                        "Limits"
                      )}
                    </th>
                    <th scope="col">Reading quality</th>
                    <th scope="col" style={{ width: 48 }} aria-label="Actions" />
                  </tr>
                </thead>
                {groups.map((g) => (
                  <tbody key={g.key}>
                    {g.label && (
                      <tr className="pg-sensors-group">
                        <th colSpan={COLS} scope="colgroup">
                          <span className="pg-sensors-group-name">{g.label}</span>
                          <span className="ast-caption">{groupLine(g.rows, g.missing, ctx.hasSpec && groupBy === "sub")}</span>
                        </th>
                      </tr>
                    )}
                    {g.missing.map((t) => (
                      <tr key={`missing-${t}`} className="pg-sensors-ghost">
                        <td colSpan={COLS}>
                          <span className="ast-num">{t}</span>
                          <span className="ast-muted"> · {ctx.defs?.signalByTag[t]?.name ?? ""} · planned in the sensor list, not set up yet</span>
                        </td>
                      </tr>
                    ))}
                    {g.rows.map((s) => (
                      <RegisterRow
                        key={tagOf(s)}
                        s={s}
                        ctx={ctx}
                        selected={selectedTag === tagOf(s)}
                        menuOpen={menuTag === tagOf(s)}
                        menuPos={menuPos}
                        onMenu={(open, pos) => {
                          if (pos) setMenuPos(pos);
                          setMenuTag(open ? tagOf(s) : null);
                        }}
                        onSelect={() => select(selectedTag === tagOf(s) ? null : tagOf(s))}
                      />
                    ))}
                  </tbody>
                ))}
              </table>
            </div>
          )}
        </section>

        {selected && <SensorPanel sensor={selected} ctx={ctx} onClose={() => select(null)} />}
      </div>
    </div>
  );
}

/**
 * Limit load of a reading. Two-sided limits (band, |x|) from the engine
 * definition: % of the way from the band centre to the limit on the reading's
 * side, so a low-side excursion is not dropped. Otherwise % of the DB alarm value.
 */
function loadOf(s: SensorRow): { pct: number; title: string } | null {
  const lim = s.spec?.limit;
  const ref = s.live?.model;
  const band = twoSided(lim, ref);
  const unit = unitText(s);
  if (band) {
    const v = parseFloat(s.value);
    const l = Number.isFinite(v) ? twoSidedLoad(v, band) : null;
    if (!l || (l.load > 100 && s.status === "Normal")) return null;
    return { pct: l.load, title: `${l.load} % of the way from the middle of the normal range to the ${l.side} ${l.kind === "alarm" ? "Critical" : "Alert"} limit of ${l.limit} ${unit}`.trim() };
  }
  if (isRelativeLimit(lim)) {
    // Relative limits (pyro D5 Table 9.2) move with the reference model: load against the alarm at the live reference.
    const r = resolveLimit(lim, ref);
    const v = parseFloat(s.value);
    if (r?.kind !== "hi" || !(r.alarm > 0) || !Number.isFinite(v) || v < 0) return null;
    const pct = Math.round((v / r.alarm) * 100);
    if (pct > 100 && s.status === "Normal") return null;
    return { pct, title: `${pct} % of the Critical limit of ${limitNum(r.alarm)} ${unit} · ${limitSummary(lim, s.unit, ref)}`.trim() };
  }
  const pct = sensorAlarmLoad(s);
  return pct === null ? null : { pct, title: `${pct} % of the Critical limit of ${s.alarmVal} ${s.unit}` };
}

/** Slot allocation still a proposal: the edge registry card (model / note) says "proposed" or "pending". */
function isProposedSlot(s: SensorRow): boolean {
  const c = s.livePoint?.cardInfo;
  return Boolean(c && /proposed|pending/i.test(`${c.model ?? ""} ${c.note ?? ""}`));
}

/** Values shared by the table row and the sensor card. */
function rowFacts(s: SensorRow, ctx: SensorsCtx) {
  const tag = tagOf(s);
  const calc = isCalculated(s);
  const manual = !calc && isManual(s);
  // Pyro CAL-KLN-03: map maximum of the scanner entry K-K33, not a gateway calculation.
  const scanner = calc ? scannerEntryOf(ctx.defs, tag) : undefined;
  const { slot, module } = slotOf(s.cardId);
  return {
    tag,
    calc,
    manual,
    scanner,
    slot,
    module,
    rate: parseSampleRate(s.sampleRate),
    load: loadOf(s),
    unit: unitText(s),
    hold: isHoldChannel(s.name, s.m),
    source: scanner ? "Hottest point on the shell scan" : calc ? "Worked out from other sensors" : manual ? "Entered by hand" : [s.role === "Process" ? "Process reading" : "Machine health", s.accuracy].filter(Boolean).join(" · "),
    // Drawing point (P4) and system name; ID-only points and system IDs stay in `placeTip`.
    place: [s.point && !isIdOnly(s.point) ? s.point : "", nameOf(s.spec?.system ?? s.systemId ?? "", ctx.defs), s.d4?.diagram].filter(Boolean).join(" · ") || "—",
    placeTip: [s.point, s.spec?.system ?? s.systemId, s.d4?.diagram].filter(Boolean).join(" · "),
    reg: [calc || manual ? "" : module, s.modbusAddress && s.modbusAddress !== "—" ? `reg ${s.modbusAddress}` : ""].filter(Boolean).join(" · ") || "—",
  };
}

function HoldFlag() {
  return (
    <span className="pg-sensors-flag" data-tone="idle" title="On hold: how this sensor is wired is not decided yet (D4 Table 3.1), so its reading is for information only">
      Not final
    </span>
  );
}

function LiveReading({ s, unit, load }: { s: SensorRow; unit: string; load: ReturnType<typeof loadOf> }) {
  return (
    <span className="ast-sm-reading pg-sensors-reading">
      <span className="ast-reading-val ast-num">
        {s.value || "—"}
        {unit && <span className="ast-unit">{unit}</span>}
      </span>
      {load !== null && (
        <span className="ast-health-cell" title={load.title}>
          <Ticks value={Math.min(load.pct, 100)} tone={s.status === "Normal" ? "idle" : severityTone(s.status)} ticks={12} />
          <span className="ast-caption">{load.pct} %</span>
        </span>
      )}
    </span>
  );
}

function LimitState({ s }: { s: SensorRow }) {
  return s.status === "Normal" ? <span className="ast-muted">Normal</span> : <StatusTag tone={severityTone(s.status)} label={s.status} />;
}

function RegisterRow({
  s,
  ctx,
  selected,
  menuOpen,
  menuPos,
  onMenu,
  onSelect,
}: {
  s: SensorRow;
  ctx: SensorsCtx;
  selected: boolean;
  menuOpen: boolean;
  menuPos: { top: number; right: number };
  onMenu: (open: boolean, pos?: { top: number; right: number }) => void;
  onSelect: () => void;
}) {
  const { tag, calc, manual, scanner, slot, module, rate, load, unit, hold, source, place, placeTip, reg } = rowFacts(s, ctx);
  const menu = useMenuFocus(menuOpen, () => onMenu(false));
  /** A menu choice: focus back on the "…" button first, then the action (which may open a pop-up). */
  const choose = (action: () => void) => () => {
    menu.closeToTrigger();
    action();
  };
  return (
    <tr
      className={["is-clickable", selected ? "active" : ""].filter(Boolean).join(" ")}
      {...rowActivate(onSelect, selected)}
    >
      <td>
        <span className="pg-sensors-id" data-sensor-tag={tag}>
          <span className="ast-badge" data-tone={s.status === "Normal" ? undefined : severityTone(s.status)}>
            <IconSensor size={15} />
          </span>
          <span className="ast-cell-stack">
            <span className="ast-cell-title pg-sensors-clip" title={`${tag} · ${s.name}`}>
              {displayName(s.name)}
              {hold && <HoldFlag />}
            </span>
          </span>
        </span>
      </td>
      <td>
        <span className="ast-cell-stack">
          <span className="ast-cell-text pg-sensors-clip" title={s.sensorType}>
            {displayName(s.sensorType) || "—"}
          </span>
          <span className="ast-cell-sub">{source}</span>
        </span>
      </td>
      <td>
        <span className="ast-cell-stack">
          <span className="ast-cell-text pg-sensors-clip" title={s.subAssembly || s.component}>
            {s.subAssembly || s.component || "—"}
          </span>
          <span className="ast-cell-sub" title={placeTip}>
            {place}
          </span>
        </span>
      </td>
      <td>
        <span className={`pg-sensors-clip pg-sensors-clip--sm ${s.range ? "ast-num" : "ast-muted"}`} title={s.outOfRange ? "The reading is outside what this instrument can measure, so it is probably wrong" : s.range}>
          {s.range || "—"}
        </span>
        {s.outOfRange && (
          <span className="pg-sensors-flag" data-tone="bad">
            beyond instrument range
          </span>
        )}
      </td>
      <td>
        <span className="ast-cell-stack">
          {scanner ? <span className="ast-muted">Scanner</span> : calc ? <span className="ast-muted">Gateway</span> : manual ? <span className="ast-muted">Manual</span> : <span className="ast-num">{slot}</span>}
          <span className="ast-cell-sub ast-num pg-sensors-clip pg-sensors-clip--sm" title={[module, s.modbusAddress].filter(Boolean).join(" · ")}>
            {reg}
          </span>
        </span>
      </td>
      <td className="pg-sensors-r">
        <span className={rate.sps === null ? "ast-muted" : "ast-num"} title={s.sampleRate}>
          {rate.label}
        </span>
      </td>
      <td className="pg-sensors-r">
        <LiveReading s={s} unit={unit} load={load} />
      </td>
      <td>
        <LimitState s={s} />
      </td>
      <td>
        <QualityMark row={s} />
      </td>
      <td>
        <span className="ast-trail" data-row-menu>
          <button
            ref={menu.triggerRef}
            type="button"
            className="ast-icon-btn"
            aria-label={`Actions for ${displayName(s.name)}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={(e) => {
              e.stopPropagation();
              const r = e.currentTarget.getBoundingClientRect();
              /* TV tier: rects are zoomed px, the portalled menu is placed in CSS px under body { zoom }. */
              const uz = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--ui-zoom")) || 1;
              onMenu(!menuOpen, { top: r.bottom / uz + 4, right: (window.innerWidth - r.right) / uz });
            }}
          >
            <IconMore />
          </button>
          {/* Portaled: the frosted card's backdrop-filter would otherwise trap position: fixed. */}
          {menuOpen &&
            createPortal(
              <span
                ref={menu.menuRef}
                className="ast-menu ast-menu--fixed"
                data-row-menu
                role="menu"
                aria-label={`Actions for ${displayName(s.name)}`}
                style={{ top: menuPos.top, right: menuPos.right }}
                onClick={(e) => e.stopPropagation()}
                onKeyDown={menu.onMenuKeyDown}
              >
                <button type="button" role="menuitem" tabIndex={-1} onClick={choose(() => ctx.select(tag))}>
                  Show details
                </button>
                <button type="button" role="menuitem" tabIndex={-1} onClick={choose(() => ctx.goTrends(tag))}>
                  See its history chart
                </button>
                {!calc && !manual && s.cardId && (
                  <button type="button" role="menuitem" tabIndex={-1} onClick={choose(ctx.goRack)}>
                    See where it is wired
                  </button>
                )}
                {s.livePoint && (
                  <button type="button" role="menuitem" tabIndex={-1} onClick={choose(() => ctx.goDevices(s.livePoint))}>
                    See its network device
                  </button>
                )}
              </span>,
              document.body
            )}
        </span>
      </td>
    </tr>
  );
}

/* ------------------------------------------------------------ side panel */

function SensorPanel({ sensor, ctx, onClose }: { sensor: SensorRow; ctx: SensorsCtx; onClose: () => void }) {
  const tag = tagOf(sensor);
  const tone = severityTone(sensor.status);
  const unit = unitText(sensor);
  const scale = gaugeScale(sensor, sensor.spec?.limit);
  const live = sensor.live;
  const point = sensor.livePoint;
  const history = live ? ctx.frame?.history[tag] : point ? ctx.history[point.pointId] : undefined;
  const series = history && history.length >= 2 && !isOnOff(sensor) ? history.slice(-120) : null;

  const { slot, module } = slotOf(sensor.cardId);
  const rate = parseSampleRate(sensor.sampleRate);
  const calcDefs = calcDefsFor(ctx.defs, ctx.measurements);
  const calcDef = calcDefs[tag];
  const calc = isCalculated(sensor);
  const manual = !calc && isManual(sensor);
  const d4 = sensor.d4;
  const m = sensor.m;
  const proposedSlot = !calc && !manual && isProposedSlot(sensor);
  const { setActiveSubPage } = useIndustrialData();
  // Fault library (OSW-PE-FLT-PYR-01): the problems this reading is main evidence for, and those it helps confirm.
  const finds = faultsForTag(useFaultLibrary(ctx.machine.id), tag);
  // D4 K-K33 "STS-KLN-08 / CAL-KLN-03": one scanner entry delivering status plus the shell temperature map.
  const scannerEntry = scannerEntryOf(ctx.defs, tag);
  const shellMap = Boolean(scannerEntry && ctx.defs?.hasShell);
  const mapMax = d4 && scannerEntry ? Object.values(calcDefs).find((c) => c.inputs.includes(tag))?.tag : undefined;
  // Install status and priority are the DB measurement's; D4 source codes (R? / N? / R/N?) read as words.
  const installCode = m?.installStatus?.split(/\s/)[0] as keyof typeof D4_SOURCE_LABEL | undefined;
  const installText = m?.installStatus ? (installCode && D4_SOURCE_LABEL[installCode]) || m.installStatus : sensor.source;
  const rows: Array<[string, string]> = [
    ["Where", [sensor.subAssembly || sensor.component, sensor.point && !isIdOnly(sensor.point) ? sensor.point : ""].filter(Boolean).join(" · ") || "—"],
    ["Purpose", sensor.role === "Process" ? "Shows how the process is running" : "Watches the health of the machine"],
    ["Instrument", displayName(sensor.sensorType) || "—"],
    ...(m?.standard ? ([["Standard", m.standard]] as Array<[string, string]>) : []),
    // Pyro line: the D4-OSW-PE-PYR schedule entry (drawing sheet, purpose).
    ...(d4
      ? ([
          ["Drawing point and sheet (D4)", `${d4.point} · ${d4.diagram}`],
          ["Sensor type and unit (D4)", `${d4.sensorType} · ${d4.specUnit}`],
          ["Place on the machine (D4)", d4.location],
          ["Why it is fitted (D4)", d4.purpose],
        ] as Array<[string, string]>)
      : []),
    ...(scannerEntry
      ? ([
          [
            `Gives (D4 ${scannerEntry.point})`,
            d4
              ? `Scanner status and a temperature map of the kiln shell${mapMax ? ` · hottest point is shown as ${displayName(ctx.rows.find((r) => tagOf(r) === mapMax)?.name ?? ctx.defs?.signalByTag[mapMax]?.name ?? mapMax)}` : ""}`
              : `Hottest point on the shell map from ${scannerEntry.point} (scanner status and map)`,
          ],
        ] as Array<[string, string]>)
      : []),
    ["Accuracy", sensor.accuracy || "—"],
    ["Can read", sensor.range || "—"],
    ["Fitted and priority", [installText, m?.priority ?? sensor.priority].filter(Boolean).join(" · ") || "—"],
    [proposedSlot ? "Cabinet (planned)" : "Cabinet", calc ? (scannerEntry ? "Shell scanner" : "Worked out from other sensors") : manual ? "Entered by hand" : sensor.rackId ? sensor.rackId.split(" (")[0] : "—"],
    // The slot is a proposed allocation when the edge registry card says so (pending walkdown).
    [proposedSlot ? "Slot (planned)" : "Slot", calc || manual ? "—" : module ? `${slot} · ${module}` : slot],
    ["Data address (Modbus)", sensor.modbusAddress || "—"],
    ["How often", rate.label === "—" && manual && sensor.sampleRate ? sensor.sampleRate : rate.label],
  ];
  // SW-DATA-01: the engine stamps source and receipt time per value (simulated minutes).
  const simStamp = (t: number) => `${formatLocalTime(simTimeMs(t), { date: true, seconds: true, zone: true, timeZone: ctx.timeZone })}`;
  if (point) {
    rows.push(["Network gateway", `${point.gateway.code}`]);
    rows.push(["Comes from", `${point.source.code} · card ${point.card} · channel ${point.channel}${point.address ? ` · ${point.address}` : ""}`]);
    rows.push(["Name in the plant system", point.sourceTag || "Not recorded"]);
    rows.push(["Security zone", point.source.securityZone || point.gateway.securityZone || "Not recorded"]);
  }
  if (live?.sourceTs !== undefined) {
    rows.push(["Measured at", `${simStamp(live.sourceTs)}${live.receivedTs !== undefined && live.receivedTs - live.sourceTs >= 1 ? " · arrived late" : ""}`]);
    if (live.receivedTs !== undefined) rows.push(["Received at", simStamp(live.receivedTs)]);
  } else if (point) {
    rows.push(["Measured at", "Not recorded (only the time it arrived)"]);
    rows.push(["Received at", point.live.updatedAt ? formatLocalTime(point.live.updatedAt, { date: true, zone: true, timeZone: ctx.timeZone }) : "No reading received yet"]);
  }
  if (live && live.model !== null) {
    rows.push(["Expected now", `${fmt(live.model)} ${unit}`.trim()]);
    if (live.residual !== null) {
      rows.push(["Difference from expected", `${live.residual > 0 ? "+" : ""}${fmt(live.residual)} ${unit}${live.z !== null ? ` · ${fmt(Math.abs(live.z))} × its usual spread` : ""}`]);
    }
  }
  // The DB engineering limit: basis texts, values, the branch that fired, final source and approval.
  const dbLimit = m?.limit ?? null;
  if (dbLimit) {
    const lim = sensor.spec?.limit;
    const normal = dbLimit.basisNormal ?? m?.normalText ?? null;
    if (normal) rows.push(["Normally", normal]);
    const values = lim ? limitSummary(lim, sensor.unit, live?.model) : limitValuesText(dbLimit, sensor.unit);
    if (values) rows.push(["Limits", values]);
    if (dbLimit.basisWarning) rows.push(["Why the Alert limit", dbLimit.basisWarning]);
    if (dbLimit.basisAlarm) rows.push(["Why the Critical limit", dbLimit.basisAlarm]);
    if (live?.limitNote) rows.push(["Limit right now", live.limitNote]);
    if (dbLimit.source) rows.push(["Final limit will come from", dbLimit.source]);
    if (dbLimit.note) rows.push(["Limit note", dbLimit.note]);
  }
  // The plant sensor list's own ranges (OSW-PE-SNL-PYR-01 Rev. 01), as printed in its unit.
  const sheet = PYRO_RANGES[tag];
  if (sheet) {
    const u = sheet.docUnit === "digital" ? "" : ` ${sheet.docUnit}`;
    const pair = (lo: string, hi: string) => (lo === "–" && hi === "–" ? null : `${lo === "–" ? "not set" : lo} below · ${hi === "–" ? "not set" : hi} above`);
    if (sheet.design !== "–") rows.push(["Instrument range (plant list)", `${sheet.design}${u}`]);
    if (sheet.nominal !== "–") rows.push(["Normal (plant list)", `${sheet.nominal}${u}`]);
    const alert = pair(sheet.L, sheet.H);
    const critical = pair(sheet.LL, sheet.HH);
    if (alert) rows.push(["Alert set-points (plant list)", `${alert}${u}`]);
    if (critical) rows.push(["Critical set-points (plant list)", `${critical}${u}`]);
    if (sheet.remarks) rows.push(["Plant list note", sheet.remarks]);
    rows.push(["Ranges from", `Plant sensor list ${PYRO_RANGES_DOC} (proposals for site checking)`]);
  }
  const approval = limitApprovalText(dbLimit);

  return (
    <aside className="ast-card ast-panel" aria-label={`${displayName(sensor.name)} details`}>
      <div className="ast-panel-head">
        <div>
          <h3 className="ast-panel-tag" title={`${tag} · ${sensor.name}`}>
            {displayName(sensor.name)}
            {isHoldChannel(sensor.name, m) && (
              <span className="pg-sensors-flag" data-tone="idle" title="On hold in D4 Table 3.1; its reading is for information only">
                Not final · wiring not decided yet
              </span>
            )}
          </h3>
        </div>
        <button type="button" className="ast-icon-btn" aria-label="Close sensor details" onClick={onClose}>
          <IconClose />
        </button>
      </div>

      <div className="ast-panel-value">
        <strong className="ast-num">
          {sensor.value || "—"}
          {unit && <span className="ast-unit">{unit}</span>}
        </strong>
        {sensor.status === "Normal" ? <span className="ast-muted">Normal</span> : <StatusTag tone={tone} label={sensor.status} />}
      </div>

      <div className="pg-sensors-validity" data-tone={sensor.q.tone}>
        <QualityMark row={sensor} prefix="Reading " />
        <span className="ast-caption">
          {sensor.q.basis}
          {sensor.q.check ? ` · ${CHECK_LABEL[sensor.q.check].toLowerCase()}` : ""}
        </span>
        <p className="pg-sensors-validity-note">{sensor.q.note}</p>
      </div>

      {series && (
        <div className="pg-sensors-spark">
          <span className="ast-caption">
            Last {series.length} {live ? "minutes" : "readings"}
          </span>
          <Sparkline values={series} unit={unit} digits={2} tone={sensor.status === "Normal" ? "info" : tone} height={56} ariaLabel={`${displayName(sensor.name)}, recent readings`} />
        </div>
      )}

      {scale && <LimitBar sensor={sensor} scale={scale} />}
      {approval && dbLimit?.approval === "provisional" && (scale || sensor.status !== "Normal") && <span className="ast-caption">{approval}</span>}

      {calcDef && (
        <div className="pg-sensors-calc">
          <span className="pg-sensors-sub">How it is worked out</span>
          <span className="pg-sensors-formula ast-num">{calcDef.formula}</span>
          <ul className="pg-sensors-inputs">
            {calcDef.inputs.map((t) => {
              const inp = ctx.rows.find((r) => tagOf(r) === t);
              return (
                <li key={t}>
                  <button type="button" className="pg-sensors-input" onClick={() => ctx.select(t)} title={t}>
                    {displayName(inp?.name ?? ctx.defs?.signalByTag[t]?.name ?? t)}
                  </button>
                  {inp ? (
                    <QualityMark row={inp} />
                  ) : (
                    <span className="ast-muted">{(ctx.defs?.plant === "pyro" && !ctx.defs.signalByTag[t] && pyroOwnerOf(t)) || "not set up yet"}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {finds.primary.length + finds.support.length > 0 && (
        <div className="pg-sensors-calc">
          <span className="pg-sensors-sub">Problems it helps find</span>
          {finds.primary.length > 0 && (
            <ul className="pg-sensors-inputs">
              {finds.primary.map((f) => (
                <li key={f.id} title={`${f.id} · ${f.component}`}>
                  <span>{libraryText(f.title)}</span>
                  <span className="ast-muted">{libraryText(f.component)}</span>
                </li>
              ))}
            </ul>
          )}
          {finds.support.length > 0 && (
            <span className="ast-caption" title={finds.support.map((f) => f.id).join(", ")}>
              Also helps confirm: {finds.support.map((f) => libraryText(f.title)).join(" · ")}
            </span>
          )}
        </div>
      )}

      <dl className="ast-dl">
        {rows.map(([k, v]) => (
          <React.Fragment key={k}>
            <dt>{k}</dt>
            <dd title={v} className="ast-num">
              {v}
            </dd>
          </React.Fragment>
        ))}
      </dl>

      <div className="ast-panel-actions">
        <PillButton variant="primary" onClick={() => ctx.goTrends(tag)}>
          See history chart
        </PillButton>
        {!calc && !manual && sensor.cardId && (
          <PillButton variant="secondary" onClick={ctx.goRack}>
            Where it is wired
          </PillButton>
        )}
        {shellMap && (
          <PillButton variant="secondary" onClick={() => setActiveSubPage("thermal")}>
            Shell heat map
          </PillButton>
        )}
        {point && (
          <PillButton variant="secondary" onClick={() => ctx.goDevices(point)}>
            Network device
          </PillButton>
        )}
      </div>
    </aside>
  );
}
