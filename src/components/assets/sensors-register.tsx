"use client";

import React, { useEffect, useMemo, useState } from "react";
import { rowActivate } from "@/components/ui/row-activate";
import { createPortal } from "react-dom";
import { PillButton, PillNav } from "@/components/ui";
import { IconClose, IconMore, IconSensor, SearchPill, StatusTag, Ticks, severityTone } from "./assets-shell-ui";
import { Sparkline } from "@/components/ui/sparkline";
import { LimitBar, gaugeScale, twoSided, twoSidedLoad } from "./sensor-gauge";
import { SensorTileChart } from "./sensor-tile-chart";
import { isRelativeLimit, limitNum, limitSummary, resolveLimit } from "@/lib/kiln-sim/signals";
import { PYRO_D5_LIMITS } from "@/lib/pyro-sim/limits";
import { sensorAlarmLoad, type SensorScope } from "./sensor-mapping-diagram";
import {
  D4_SENSOR_SPEC,
  D4_SOURCE_LABEL,
  PYRO_PROPOSED_RACK,
  calcDefsFor,
  fmt,
  isCalculated,
  isManual,
  isWired,
  isHoldChannel,
  isOnOff,
  PYRO_DEMO_LIMIT,
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
import { simTimeMs } from "@/lib/kiln-sim/engine";
import { useIndustrialData } from "@/providers/industrial-data-context";

/* ==========================================================================
   Sensors › Sensors.
   The transducer allocation (divider-list table or a grid of sensor cards):
   sensor ID, measurement, instrument, location, range, rack slot, Modbus
   register, sampling, live value, limit state and data quality — grouped by
   sub-assembly or by process / condition role, with a detail panel.
   ========================================================================== */

type StatusKey = "Normal" | "Advisory" | "Critical";
const STATUS_KEYS: StatusKey[] = ["Normal", "Advisory", "Critical"];
type QualityFilter = "all" | "valid" | "attention" | "nolive";
type GroupBy = "sub" | "role" | "none";
type ViewMode = "table" | "cards";
const VIEW_KEY = "ultron.sensors.view";
const needsAttention = (q: Quality) => q !== "Valid" && q !== "No live feed";

function groupLine(list: SensorRow[], missing: string[], withSpec: boolean): string {
  const bad = list.filter((r) => needsAttention(r.q.quality)).length;
  const out = list.filter((r) => r.status !== "Normal").length;
  const unlinked = list.filter((r) => isWired(r) && !r.livePoint).length;
  return [
    `${list.length}`,
    bad ? `${bad} data issue${bad === 1 ? "" : "s"}` : "",
    out ? `${out} outside limits` : "",
    withSpec && missing.length ? `${missing.length} of ${list.length + missing.length} specified missing` : "",
    unlinked && list.some((r) => r.livePoint) ? `${unlinked} not on gateway` : "",
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
      {prefix ? row.q.quality.toLowerCase() : row.q.quality}
    </span>
  );
}

export function SensorsRegister({ ctx, scope, onClearScope }: { ctx: SensorsCtx; scope: SensorScope | null; onClearScope: () => void }) {
  const { rows, counts, selectedTag, select } = ctx;
  const [qualityFilter, setQualityFilter] = useState<QualityFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusKey | null>(null);
  const [groupBy, setGroupBy] = useState<GroupBy>("sub");
  const [view, setView] = useState<ViewMode>("table");
  const [query, setQuery] = useState("");

  // Table or cards, remembered per browser (read after mount: no hydration mismatch).
  useEffect(() => {
    try {
      if (localStorage.getItem(VIEW_KEY) === "cards") setView("cards");
    } catch {
      /* storage unavailable: table view */
    }
  }, []);
  const changeView = (next: ViewMode) => {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {
      /* storage unavailable: choice kept for this view only */
    }
  };
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
    const tabs = [{ id: "all", label: `All ${counts.total}` }, { id: "valid", label: `Valid ${counts.q.valid}` }];
    if (counts.q.attention > 0 || qualityFilter === "attention") tabs.push({ id: "attention", label: `Data issues ${counts.q.attention}` });
    if (counts.q.nolive > 0 || qualityFilter === "nolive") tabs.push({ id: "nolive", label: `No live feed ${counts.q.nolive}` });
    return tabs;
  }, [counts, qualityFilter]);

  const selected = selectedTag ? rows.find((s) => tagOf(s) === selectedTag) ?? null : null;
  const COLS = 10;

  return (
    <div className="pg-sensors-register">
      <div className="ast-toolbar">
        <div className="ast-toolbar-group">
          <span className="ast-section-label">
            <span className="ast-num">
              {filtered.length} / {counts.total}
            </span>
          </span>
          {scope && (
            <button type="button" className="ast-filter" aria-pressed="true" onClick={onClearScope} title="Show sensors from every sub-assembly">
              {scope.label}
              <IconClose size={11} />
            </button>
          )}
        </div>
        <div className="ast-toolbar-group">
          <PillNav items={qualityTabs} activeId={qualityFilter} onChange={(id) => setQualityFilter(id as QualityFilter)} />
          <div className="ast-toolbar-group" role="group" aria-label="Filter by limit state">
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
              { id: "sub", label: "By sub-assembly" },
              { id: "role", label: "Process / condition" },
              { id: "none", label: "Flat" },
            ]}
            activeId={groupBy}
            onChange={(id) => setGroupBy(id as GroupBy)}
            ariaLabel="Group sensors"
          />
          <PillNav
            items={[
              { id: "table", label: "Table" },
              { id: "cards", label: "Cards" },
            ]}
            activeId={view}
            onChange={(id) => changeView(id as ViewMode)}
            ariaLabel="Sensors view"
          />
          <SearchPill value={query} onChange={setQuery} placeholder="Search tag, instrument, slot" label="Search sensors" />
        </div>
      </div>

      <div className={`ast-sm ${selected ? "has-panel" : ""}`}>
        <section className="ast-card ast-sm-table" aria-label="Sensors">
          {filtered.length === 0 ? (
            <div className="ast-empty">No sensors match the current filters.</div>
          ) : view === "cards" ? (
            <div className="pg-sensors-tiles" aria-label="Transducer allocation">
              {groups.map((g) => (
                <div key={g.key} className="pg-sensors-tile-group" role="group" aria-label={g.label || "Sensors"}>
                  {g.label && (
                    <h4 className="pg-sensors-tile-head">
                      <span className="pg-sensors-group-name">{g.label}</span>
                      <span className="ast-caption ast-num">{groupLine(g.rows, g.missing, ctx.hasSpec && groupBy === "sub")}</span>
                    </h4>
                  )}
                  {g.missing.length > 0 && (
                    <p className="pg-sensors-tile-missing">
                      <span className="ast-num">{g.missing.join(" · ")}</span>
                      <span className="ast-muted"> · specified in D4, not in the DB catalog</span>
                    </p>
                  )}
                  <div className="pg-sensors-tile-grid">
                    {g.rows.map((s) => (
                      <SensorTile
                        key={tagOf(s)}
                        s={s}
                        ctx={ctx}
                        selected={selectedTag === tagOf(s)}
                        onSelect={() => select(selectedTag === tagOf(s) ? null : tagOf(s))}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="ui-table-container ast-table pg-sensors-table">
              <table className="ui-table" aria-label="Transducer allocation">
                <thead>
                  <tr>
                    <th scope="col">Sensor ID</th>
                    <th scope="col">Measurement</th>
                    <th scope="col">Location</th>
                    <th scope="col">Range</th>
                    <th scope="col" title={ctx.defs?.plant === "pyro" ? PYRO_PROPOSED_RACK : undefined}>
                      {ctx.defs?.plant === "pyro" ? "Rack slot · reg. (proposed)" : "Rack slot · reg."}
                    </th>
                    <th scope="col" className="pg-sensors-r">
                      Sampling
                    </th>
                    <th scope="col" className="pg-sensors-r">
                      Live value
                    </th>
                    <th scope="col" title={ctx.defs?.plant === "pyro" ? PYRO_DEMO_LIMIT : undefined}>
                      {ctx.defs?.plant === "pyro" ? (
                        <span className="ast-cell-stack">
                          <span>Limits</span>
                          <span className="ast-cell-sub">Provisional (D5) · not plant-approved</span>
                        </span>
                      ) : (
                        "Limits"
                      )}
                    </th>
                    <th scope="col">Data</th>
                    <th scope="col" style={{ width: 48 }} aria-label="Actions" />
                  </tr>
                </thead>
                {groups.map((g) => (
                  <tbody key={g.key}>
                    {g.label && (
                      <tr className="pg-sensors-group">
                        <th colSpan={COLS} scope="colgroup">
                          <span className="pg-sensors-group-name">{g.label}</span>
                          <span className="ast-caption ast-num">{groupLine(g.rows, g.missing, ctx.hasSpec && groupBy === "sub")}</span>
                        </th>
                      </tr>
                    )}
                    {g.missing.map((t) => (
                      <tr key={`missing-${t}`} className="pg-sensors-ghost">
                        <td colSpan={COLS}>
                          <span className="ast-num">{t}</span>
                          <span className="ast-muted"> · {ctx.defs?.signalByTag[t]?.name ?? ""} · specified in D4, not in the DB catalog</span>
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
    return { pct: l.load, title: `${l.load} % of the way from band centre to the ${l.side} ${l.kind} limit ${l.limit} ${unit}`.trim() };
  }
  if (isRelativeLimit(lim)) {
    // Relative limits (pyro D5 Table 9.2) move with the reference model: load against the alarm at the live reference.
    const r = resolveLimit(lim, ref);
    const v = parseFloat(s.value);
    if (r?.kind !== "hi" || !(r.alarm > 0) || !Number.isFinite(v) || v < 0) return null;
    const pct = Math.round((v / r.alarm) * 100);
    if (pct > 100 && s.status === "Normal") return null;
    return { pct, title: `${pct} % of alarm limit ${limitNum(r.alarm)} ${unit} · ${limitSummary(lim, s.unit, ref)}`.trim() };
  }
  const pct = sensorAlarmLoad(s);
  return pct === null ? null : { pct, title: `${pct} % of alarm limit ${s.alarmVal} ${s.unit}` };
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
    hold: ctx.defs?.plant === "pyro" && isHoldChannel(s.name, s.d4),
    source: scanner ? `Scanner map maximum (${scanner.point})` : calc ? "Calculated on gateway" : manual ? "Manual record" : [s.role, s.accuracy].filter(Boolean).join(" · "),
    place: [s.point, s.spec?.system ?? s.systemId, s.d4?.diagram].filter(Boolean).join(" · ") || "—",
    reg: [calc || manual ? "" : module, s.modbusAddress && s.modbusAddress !== "—" ? `reg ${s.modbusAddress}` : ""].filter(Boolean).join(" · ") || "—",
  };
}

function HoldFlag() {
  return (
    <span className="pg-sensors-flag" data-tone="idle" title="HOLD · channel design pending (D4 Table 3.1); advisory evidence only">
      HOLD
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
          <span className="ast-caption ast-num">{load.pct} %</span>
        </span>
      )}
    </span>
  );
}

function LimitState({ s }: { s: SensorRow }) {
  return s.status === "Normal" ? <span className="ast-muted">Normal</span> : <StatusTag tone={severityTone(s.status)} label={s.status} />;
}

/** Card view: one sensor per tile, same facts as a table row; click selects like a row. */
function SensorTile({ s, ctx, selected, onSelect }: { s: SensorRow; ctx: SensorsCtx; selected: boolean; onSelect: () => void }) {
  const { tag, calc, manual, scanner, slot, rate, load, unit, hold, place, reg } = rowFacts(s, ctx);
  const tone = s.status === "Normal" ? undefined : severityTone(s.status);
  const rack = scanner ? "Scanner" : calc ? "Gateway" : manual ? "Manual" : slot;
  const history = s.live ? ctx.frame?.history[tag] : s.livePoint ? ctx.history[s.livePoint.pointId] : undefined;
  const model = s.live ? ctx.frame?.modelHistory[tag] : undefined;
  return (
    <button type="button" className="pg-sensors-tile" data-tone={tone} aria-pressed={selected} onClick={onSelect}>
      <span className="pg-sensors-tile-top">
        <span className="pg-sensors-id" data-sensor-tag={tag}>
          <span className="ast-badge" data-tone={tone}>
            <IconSensor size={15} />
          </span>
          <span className="ast-cell-stack">
            <span className="ast-cell-title ast-num">
              {tag}
              {hold && <HoldFlag />}
            </span>
            <span className="ast-cell-sub pg-sensors-tile-clip" title={s.name}>
              {s.name}
            </span>
          </span>
        </span>
        <LimitState s={s} />
      </span>

      <span className="pg-sensors-tile-value">
        <span className="ast-sm-reading pg-sensors-reading">
          <span className="ast-reading-val ast-num">
            {s.value || "—"}
            {unit && <span className="ast-unit">{unit}</span>}
          </span>
        </span>
        {load !== null && (
          <span className="ast-caption ast-num" title={load.title}>
            {load.pct} % of limit
          </span>
        )}
        {s.outOfRange && (
          <span className="pg-sensors-flag" data-tone="bad" title="Reading is outside the instrument range (calc.)">
            out of range
          </span>
        )}
      </span>

      <SensorTileChart s={s} history={history} model={model} span={s.live ? "min" : "reading"} />

      {s.q.quality !== "Valid" && <QualityMark row={s} prefix="Data " />}

      <span className="pg-sensors-tile-facts">
        <span className="pg-sensors-tile-k">Measurement</span>
        <span className="pg-sensors-tile-v" title={s.sensorType}>
          {s.sensorType || "—"}
        </span>
        <span className="pg-sensors-tile-k">Location</span>
        <span className="pg-sensors-tile-v" title={`${s.subAssembly || s.component || "—"} · ${place}`}>
          {s.subAssembly || s.component || "—"}
          <span className="ast-muted ast-num"> · {place}</span>
        </span>
        <span className="pg-sensors-tile-k">{ctx.defs?.plant === "pyro" && !calc && !manual && !scanner ? "Rack slot (prop.)" : "Rack slot"}</span>
        <span className="pg-sensors-tile-v ast-num" title={reg}>
          {rack}
          {reg !== "—" && <span className="ast-muted"> · {reg}</span>}
        </span>
        <span className="pg-sensors-tile-k">Sampling</span>
        <span className={`pg-sensors-tile-v ${rate.sps === null ? "ast-muted" : "ast-num"}`} title={s.sampleRate}>
          {rate.label}
        </span>
      </span>
    </button>
  );
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
  const { tag, calc, manual, scanner, slot, module, rate, load, unit, hold, source, place, reg } = rowFacts(s, ctx);
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
            <span className="ast-cell-title ast-num">
              {tag}
              {hold && <HoldFlag />}
            </span>
            <span className="ast-cell-sub pg-sensors-clip" title={s.name}>
              {s.name}
            </span>
          </span>
        </span>
      </td>
      <td>
        <span className="ast-cell-stack">
          <span className="ast-cell-text pg-sensors-clip" title={s.sensorType}>
            {s.sensorType || "—"}
          </span>
          <span className="ast-cell-sub">{source}</span>
        </span>
      </td>
      <td>
        <span className="ast-cell-stack">
          <span className="ast-cell-text pg-sensors-clip" title={s.subAssembly || s.component}>
            {s.subAssembly || s.component || "—"}
          </span>
          <span className="ast-cell-sub ast-num">{place}</span>
        </span>
      </td>
      <td>
        <span className={`pg-sensors-clip pg-sensors-clip--sm ${s.range ? "ast-num" : "ast-muted"}`} title={s.outOfRange ? "Reading is outside the instrument range (calc.)" : s.range}>
          {s.range || "—"}
        </span>
        {s.outOfRange && (
          <span className="pg-sensors-flag" data-tone="bad">
            out of range
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
            type="button"
            className="ast-icon-btn"
            aria-label={`Actions for ${tag}`}
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
                className="ast-menu ast-menu--fixed"
                data-row-menu
                role="menu"
                style={{ top: menuPos.top, right: menuPos.right }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    ctx.select(tag);
                    onMenu(false);
                  }}
                >
                  Show details
                </button>
                <button type="button" role="menuitem" onClick={() => ctx.goTrends(tag)}>
                  Open in Trends
                </button>
                {!calc && !manual && s.cardId && (
                  <button type="button" role="menuitem" onClick={ctx.goRack}>
                    Open rack slot
                  </button>
                )}
                {s.livePoint && (
                  <button type="button" role="menuitem" onClick={() => ctx.goDevices(s.livePoint)}>
                    Open in Devices
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
  const calcDef = calcDefsFor(ctx.defs)[tag];
  const calc = isCalculated(sensor);
  const manual = !calc && isManual(sensor);
  const d4 = sensor.d4;
  const pyro = ctx.defs?.plant === "pyro";
  const { setActiveSubPage } = useIndustrialData();
  // D4 K-K33 "STS-KLN-08 / CAL-KLN-03": one scanner entry delivering status plus the shell temperature map.
  const scannerEntry = scannerEntryOf(ctx.defs, tag);
  const shellMap = Boolean(scannerEntry && ctx.defs?.hasShell);
  const mapMax = d4 && scannerEntry ? Object.values(calcDefsFor(ctx.defs)).find((c) => c.inputs.includes(tag))?.tag : undefined;
  const rows: Array<[string, string]> = [
    ["Location", [sensor.subAssembly || sensor.component, sensor.point].filter(Boolean).join(" · ") || "—"],
    ["Role", sensor.role === "Process" ? "Process context" : "Condition monitoring"],
    ["Instrument", sensor.sensorType || "—"],
    // Kiln fleet: D4 Table 7.1 by instrument family. Pyro line: the D4-OSW-PE-PYR schedule entry.
    ...(!d4 && ctx.defs?.plant === "kiln" && sensor.spec && D4_SENSOR_SPEC[sensor.spec.instrument]
      ? ([["Mounting · output (D4)", `${D4_SENSOR_SPEC[sensor.spec.instrument].mounting} · ${D4_SENSOR_SPEC[sensor.spec.instrument].output}`]] as Array<[string, string]>)
      : []),
    ...(d4
      ? ([
          ["D4 point · sheet", `${d4.point} · ${d4.diagram}`],
          ["Sensor type · unit (D4)", `${d4.sensorType} · ${d4.specUnit}`],
          ["Location (D4)", d4.location],
          ["Purpose (D4)", d4.purpose],
        ] as Array<[string, string]>)
      : []),
    ...(scannerEntry
      ? ([
          [
            `Delivers (D4 ${scannerEntry.point})`,
            d4
              ? `Scanner status + shell temperature map${mapMax ? ` · map maximum is ${mapMax}` : ""}`
              : `Map maximum of ${scannerEntry.point} (scanner status + map)`,
          ],
        ] as Array<[string, string]>)
      : []),
    ["Accuracy", sensor.accuracy || "—"],
    ["Range", sensor.range || "—"],
    d4
      ? ["Source / priority (D4)", `${D4_SOURCE_LABEL[d4.source]} · ${d4.priority}`]
      : ["Source / priority", [sensor.source, sensor.priority].filter(Boolean).join(" · ") || "—"],
    [pyro && !calc && !manual ? "Rack (proposed)" : "Rack", calc ? (scannerEntry ? `Scanner data (${scannerEntry.point})` : "Gateway (calculated)") : manual ? "Manual entry" : sensor.rackId ? sensor.rackId.split(" (")[0] : "—"],
    // Pyro line: the slot is a proposed allocation pending the walkdown (D4 Table 6.4a).
    [pyro && !calc && !manual ? "Slot (proposed)" : "Slot", calc || manual ? "—" : module ? `${slot} · ${module}` : slot],
    ["Modbus register", sensor.modbusAddress || "—"],
    ["Sampling", rate.label === "—" && manual && sensor.sampleRate ? sensor.sampleRate : rate.label],
  ];
  // SW-DATA-01: the engine stamps source and receipt time per value (simulated minutes).
  const simStamp = (t: number) => `${formatLocalTime(simTimeMs(t), { date: true, seconds: true, zone: true, timeZone: ctx.timeZone })} · sim.`;
  if (point) {
    rows.push(["Gateway", `${point.gateway.code}`]);
    rows.push(["Source point", `${point.source.code} · card ${point.card} · ch ${point.channel}${point.address ? ` · ${point.address}` : ""}`]);
    rows.push(["Original tag", point.sourceTag || "Not recorded"]);
    rows.push(["Security zone", point.source.securityZone || point.gateway.securityZone || "Not recorded"]);
  }
  if (live?.sourceTs !== undefined) {
    rows.push(["Source time", `${simStamp(live.sourceTs)}${live.receivedTs !== undefined && live.receivedTs - live.sourceTs >= 1 ? " · stale" : ""}`]);
    if (live.receivedTs !== undefined) rows.push(["Received", simStamp(live.receivedTs)]);
  } else if (point) {
    rows.push(["Source time", "Not recorded (receipt time only)"]);
    rows.push(["Received", point.live.updatedAt ? formatLocalTime(point.live.updatedAt, { date: true, zone: true, timeZone: ctx.timeZone }) : "No gateway reading"]);
  }
  if (live && live.model !== null) {
    rows.push(["Reference model (calc.)", `${fmt(live.model)} ${unit}`.trim()]);
    if (live.residual !== null) {
      rows.push(["Residual (calc.)", `${live.residual > 0 ? "+" : ""}${fmt(live.residual)} ${unit}${live.z !== null ? ` · ${fmt(live.z)} σ` : ""}`]);
    }
  }
  // Pyro line: the D5 Table 9.2 row (provisional logic) and the branch that fired.
  const d5 = pyro ? PYRO_D5_LIMITS[tag] : undefined;
  if (d5) {
    const lim = sensor.spec?.limit;
    rows.push(["Normal behaviour (D5)", d5.normal]);
    rows.push(["Limit (D5 Table 9.2)", lim ? limitSummary(lim, sensor.unit, live?.model) : `warn ${d5.warning} · alarm ${d5.alarm}`]);
    if (live?.limitNote) rows.push(["Limit now", live.limitNote]);
    rows.push(["Final limit source (D5)", d5.source]);
    if (d5.note) rows.push(["D5 reading", d5.note]);
  }

  return (
    <aside className="ast-card ast-panel" aria-label={`${tag} details`}>
      <div className="ast-panel-head">
        <div>
          <h3 className="ast-panel-tag ast-num">
            {tag}
            {pyro && isHoldChannel(sensor.name, d4) && (
              <span className="pg-sensors-flag" data-tone="idle" title="Channel design pending (D4 Table 3.1); advisory evidence only">
                HOLD · channel design pending
              </span>
            )}
          </h3>
          <div className="ast-panel-name">{sensor.name}</div>
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
        <QualityMark row={sensor} prefix="Data " />
        <span className="ast-caption">
          {sensor.q.basis}
          {sensor.q.method ? ` · ${sensor.q.method}` : ""}
        </span>
        <p className="pg-sensors-validity-note">{sensor.q.note}</p>
      </div>

      {series && (
        <div className="pg-sensors-spark">
          <span className="ast-caption">
            Last {series.length} {live ? "simulated minutes" : "readings"}
          </span>
          <Sparkline values={series} unit={unit} digits={2} tone={sensor.status === "Normal" ? "info" : tone} height={56} ariaLabel={`${tag} recent readings`} />
        </div>
      )}

      {scale && <LimitBar sensor={sensor} scale={scale} />}
      {pyro && (scale || sensor.status !== "Normal") && <span className="ast-caption">{PYRO_DEMO_LIMIT}</span>}

      {calcDef && (
        <div className="pg-sensors-calc">
          <span className="pg-sensors-sub">Calculation</span>
          <span className="pg-sensors-formula ast-num">{calcDef.formula}</span>
          <ul className="pg-sensors-inputs">
            {calcDef.inputs.map((t) => {
              const inp = ctx.rows.find((r) => tagOf(r) === t);
              return (
                <li key={t}>
                  <button type="button" className="pg-sensors-input" onClick={() => ctx.select(t)}>
                    <span className="ast-num">{t}</span>
                  </button>
                  {inp ? (
                    <QualityMark row={inp} />
                  ) : (
                    <span className="ast-muted">{(ctx.defs?.plant === "pyro" && !ctx.defs.signalByTag[t] && pyroOwnerOf(t)) || "not in catalog"}</span>
                  )}
                </li>
              );
            })}
          </ul>
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
          Open in Trends
        </PillButton>
        {!calc && !manual && sensor.cardId && (
          <PillButton variant="secondary" onClick={ctx.goRack}>
            Rack slot
          </PillButton>
        )}
        {shellMap && (
          <PillButton variant="secondary" onClick={() => setActiveSubPage("thermal")}>
            Shell map
          </PillButton>
        )}
        {point && (
          <PillButton variant="secondary" onClick={() => ctx.goDevices(point)}>
            Open in Devices
          </PillButton>
        )}
      </div>
    </aside>
  );
}
