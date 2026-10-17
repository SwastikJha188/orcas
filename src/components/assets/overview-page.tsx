"use client";

/* ==========================================================================
   Machine › Overview — the machine's front page.
   Header (identity, condition, last update) → 4 key figures → section index →
     Machine          machine-kit schematic with measurement pads (dominant)
                      + sub-assembly list (hover isolates its pads). Pyro line:
                      the group's overview sheet (X-0); picking a component
                      shows its detail sheet(s) from the diagram pack.
     Operating point  D4 process context vs normal band / reference model
     Status by area   one row per sibling page with value, state and link
   D5 Table 9.4 "Overview": machine image with sub-assembly status, kiln and
   machine health, confirmed findings, process context, operating state.
   Every value is live (kiln / pyro engine, simulated) or the stored DB record;
   machine definitions come from `frame.defs`.
   Sections without data for the machine are hidden with their index entry.
   ========================================================================== */

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { AssetMachine } from "./assets-data";
import type { AssetsSubPage } from "./assets-view";
import type { KilnSimulation } from "./kiln-seals-simulation";
import { PillButton, PillNav } from "@/components/ui";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { KpiStrip, PageHeader, Section, SectionIndex, type KpiItem, type SectionIndexItem } from "./analysis/an-ui";
import { MachineSchematic } from "./machine-schematic";
import { BlenderViewport } from "./machine-kit/machine-kit";
import type { DetailedSensorInfo } from "./machine-sensor-mapping-view";
import { twoSided, twoSidedText } from "./sensor-gauge";
import { isRelativeLimit, limitSummary, type LimitRule } from "@/lib/kiln-sim/signals";
import { healthTone, severityTone, type Tone } from "./assets-shell-ui";
import { conditionTone, toCondition, worstCondition } from "@/components/ui/status";
import { focusSensorOn } from "./sensor-focus";
import { sevLimit, tagOf, useOverviewDigest, type OverviewDigest } from "./overview-digest";
import { OV_SECTIONS, OvAreasSection, OvOperatingSection, StateCell, areaRows } from "./overview-sections";
import { LineSheet, LineSheetNote, useSheetBox } from "./pyro/line-sheets/line-sheet";
import { SensorWidgetStage } from "./sensor-widget-stage";
import { DiagramPinLayer, KilnSubAssemblyArt } from "./kiln-component-diagrams";
import { useContentBox } from "./use-content-box";
import { MachineSvg } from "./machine-kit/machine-kit";
import { defsFor } from "@/lib/live-defs";
import { useMachineComponents } from "./sensor-mapping-diagram";
import { LINE_SHEET_ART, LINE_SHEET_BY_ID, LINE_SHEET_FOCUS_KEY, lineSheetTags, lineSheetsForMachine, lineSheetsForTags } from "./pyro/line-sheets";
import "./assets-shell.css";
import "./analysis/analysis-page.css";
import "./overview-page.css";

/** sessionStorage key another page can set to open Overview at a section id. */
export const OVERVIEW_SECTION_KEY = "ultron.overview.section";

export function OverviewPage({
  machine,
  sensorData,
  onNavigateToDiagnosis,
}: {
  machine: AssetMachine;
  sensorData?: KilnSimulation["sensorData"];
  onNavigateToDiagnosis?: () => void;
}) {
  const { setActiveSubPage } = useIndustrialData();
  const openDiagnosis = onNavigateToDiagnosis ?? (() => setActiveSubPage("diagnosis"));
  const go = (page: AssetsSubPage) => (page === "diagnosis" ? openDiagnosis() : setActiveSubPage(page));

  const d = useOverviewDigest(machine, sensorData);
  const { overall, conditionLabel, isLiveHealth, counts, sensors, findings, outlook, groups, dataQuality, frame, placedTags } = d;

  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [focusGroup, setFocusGroup] = useState<string | null>(null);
  const machineRef = useRef<HTMLDivElement>(null);
  const fit = useFitHeight(machineRef, machine.id);

  const select = (tag: string | null) => {
    setSelectedTag(tag);
    // Picking a point opens its component; clearing the pick keeps the component on screen.
    if (tag) setFocusGroup(d.groupOfTag.get(tag) ?? null);
    if (tag) machineRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  const selectGroupFromTable = (id: string | null) => {
    setFocusGroup(id);
    if (id) machineRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  const hasData = sensors.length > 0 || groups.rows.length > 0 || isLiveHealth;
  const tone = conditionTone(conditionLabel);
  const offNormal = counts.Advisory + counts.Critical;

  // Where to point first: the top finding's placed sensor, else the worst off-normal pad.
  const locateTag = useMemo(() => {
    const fromFinding = findings.active[0]?.tags.find((t) => placedTags.has(t));
    if (fromFinding) return fromFinding;
    const pads = d.dots.filter((x) => x.status !== "Normal" && placedTags.has(x.tag));
    return (pads.find((x) => x.status === "Critical") ?? pads[0])?.tag ?? null;
  }, [findings.active, d.dots, placedTags]);

  const showOperating = d.operating.rows.length > 0;
  const showAreas = areaRows({ machine, d }).length > 0;
  const index: SectionIndexItem[] = [
    { id: OV_SECTIONS.machine, label: "Machine" },
    ...(showOperating ? [{ id: OV_SECTIONS.operating, label: "Operating point" }] : []),
    ...(showAreas ? [{ id: OV_SECTIONS.areas, label: "Status by area" }] : []),
  ];

  /* ------------------------------------------------------ key figures */
  const first = outlook?.first ?? null;
  const top = findings.active[0] ?? null;
  const kpis: KpiItem[] = [
    {
      label: "Health index",
      value: hasData ? String(overall) : "—",
      unit: hasData ? "%" : undefined,
      bar: hasData ? overall : undefined,
      tone: hasData ? healthTone(overall) : "idle",
      foot: isLiveHealth ? "Live" : hasData ? "Stored record" : "No data",
    },
    {
      label: "Confirmed findings",
      value: findings.source === "none" ? "—" : String(findings.active.length),
      tone: findings.active.some((f) => f.severity === "Critical") ? "bad" : findings.active.length ? "warn" : "idle",
      foot: top ? `${top.id} · ${top.name}` : findings.source === "none" ? "No rule engine" : findings.pending ? `${findings.pending} pending` : "None",
    },
    {
      label: "Sensors off-normal",
      value: sensors.length ? String(offNormal) : "—",
      unit: sensors.length ? `/ ${sensors.length}` : undefined,
      tone: counts.Critical ? "bad" : offNormal ? "warn" : "idle",
      foot: sensors.length ? `${counts.Critical} alarm · ${counts.Advisory} warning` : "No sensors mapped",
    },
    first && outlook?.intervene
      ? {
          label: "Intervene within",
          value: outlook.intervene,
          text: true,
          tone: outlook.condition === "Normal" ? "idle" : severityTone(outlook.condition),
          foot: first.name,
        }
      : {
          label: "Inputs valid",
          value: dataQuality.live && dataQuality.total ? String(dataQuality.valid) : "—",
          unit: dataQuality.live && dataQuality.total ? `/ ${dataQuality.total}` : undefined,
          tone: dataQuality.live && dataQuality.valid !== dataQuality.total ? "warn" : "idle",
          foot: dataQuality.live ? "Sensor validation" : "Not reported",
        },
  ];

  // Running state from the machine's own speed signal (none on e.g. a silo or burner: no state shown).
  const speedTag = frame?.defs.speedTag ?? null;
  const speed = speedTag ? frame?.signals[speedTag] : undefined;
  const speedUnit = speedTag ? frame?.defs.signalByTag[speedTag]?.unit ?? "" : "";
  const speedState = speed
    ? (speed.value ?? 0) > 0.5
      ? `${speedUnit === "rpm" ? "Rotating" : "Running"} ${speed.display} ${speedUnit}`.trim()
      : "Stopped"
    : null;

  return (
    <div className="ast-root pg-frame pg-ov" aria-label="Overview">
      {/* 1. MACHINE & COMPONENTS VIEWPORT AT THE TOP (fits in one screen by default, with Full Screen mode) */}
      <section
        id={OV_SECTIONS.machine}
        ref={machineRef}
        className="pg-analysis-section ast-card mx-canvas pg-ov-machine-sec"
        data-fit={fit || undefined}
        aria-label="Machine"
      >
        <div className="pg-ov-hero-head">
          <div className="pg-ov-hero-meta">
            <h2 className="pg-analysis-h2">Machine</h2>
            {hasData && (
              <span className="pg-frame-status" data-tone={tone === "good" ? undefined : tone}>
                <span className="ast-chip-dot" aria-hidden="true" />
                {conditionLabel}
              </span>
            )}
            <dl className="pg-frame-meta">
              {hasData && (
                <div>
                  <dt>Health</dt>
                  <dd className="ast-num">{overall}%</dd>
                </div>
              )}
              {speedState && (
                <div>
                  <dt>State</dt>
                  <dd className="ast-num">{speedState}</dd>
                </div>
              )}
              {machine.criticality && (
                <div>
                  <dt>Criticality</dt>
                  <dd className="ast-num">{machine.criticality.split(" ")[0]}</dd>
                </div>
              )}
              <div>
                <dt>Updated</dt>
                <dd className="ast-num" title={d.tz.label}>{d.updatedAt ?? "—"}</dd>
              </div>
            </dl>
            {placedTags.size > 0 && (
              <span className="pg-ov-counts ast-num">
                <span>{placedTags.size} placed</span>
                <StateCell tone="good" label={`${counts.Normal} normal`} />
                <StateCell tone={counts.Advisory ? "warn" : "idle"} label={`${counts.Advisory} warning`} />
                <StateCell tone={counts.Critical ? "bad" : "idle"} label={`${counts.Critical} alarm`} />
              </span>
            )}
          </div>
          <div className="pg-ov-hero-actions" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {locateTag && (
              <PillButton variant="secondary" onClick={() => select(locateTag)}>
                Locate worst point
              </PillButton>
            )}
            <PillButton variant="secondary" onClick={() => go("sensors")}>
              Sensors
            </PillButton>
            <PillButton variant="secondary" onClick={() => go("diagnosis")}>
              Diagnosis
            </PillButton>
            <PillButton variant="secondary" onClick={() => go("prognosis")}>
              Prognosis
            </PillButton>
            <PillButton variant="secondary" onClick={() => go("analysis")}>
              Analysis
            </PillButton>
          </div>
        </div>

        <div className="pg-ov-machine" data-wide="">
          <MachineDrawing
            machine={machine}
            d={d}
            selectedTag={selectedTag}
            focusGroup={focusGroup}
            component={focusGroup}
            setComponent={setFocusGroup}
            onSelect={select}
            go={go}
            fit={fit}
          />
        </div>
      </section>

      {/* 2. KEY FIGURES & DETAILED SECTIONS BELOW */}
      <KpiStrip page items={kpis} label="Key figures" />

      <SectionIndex items={index} label="Overview sections" pendingKey={OVERVIEW_SECTION_KEY} />

      <div className="pg-frame-body pg-ov-body">
        {groups.rows.length > 0 && (
          <Section id="ov-subassemblies" title={groups.level}>
            <GroupList d={d} cap={conditionLabel} focusGroup={focusGroup} setFocusGroup={selectGroupFromTable} />
          </Section>
        )}
        <OvOperatingSection machine={machine} d={d} go={go} />
        <OvAreasSection machine={machine} d={d} go={go} />
      </div>
    </div>
  );
}

/**
 * The sheet's note under the canvas. On a one-screen layout it takes one line
 * (so the drawing keeps the height), with More / Less when it runs longer.
 */
function SheetNote({ sheetId, onOpenSheet, clamp }: { sheetId: string; onOpenSheet: (id: string) => void; clamp: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [long, setLong] = useState(false);
  useEffect(() => setOpen(false), [sheetId]);
  useLayoutEffect(() => {
    const p = ref.current?.querySelector("p");
    if (!clamp || open || !p) return;
    const check = () => setLong(p.scrollWidth > p.clientWidth + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(p);
    return () => ro.disconnect();
  }, [clamp, open, sheetId]);
  if (!LINE_SHEET_BY_ID[sheetId]?.note) return null;
  return (
    <div ref={ref} className="pg-ov-note" data-clamp={(clamp && !open) || undefined}>
      <LineSheetNote sheetId={sheetId} onOpenSheet={onOpenSheet} />
      {clamp && (long || open) && (
        <button type="button" className="pg-ov-note-more" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? "Less" : "More"}
        </button>
      )}
    </div>
  );
}

/** Nearest scrolling ancestor, or null for the window. */
function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let p = el.parentElement; p; p = p.parentElement) {
    if (/(auto|scroll)/.test(getComputedStyle(p).overflowY)) return p;
  }
  return null;
}

/**
 * Full-screen height for the machine section: the whole visible height of its
 * scroll container (less its top padding and a small margin), the size the
 * drawing had in full screen. The page header sits above it; the rest of the
 * page follows below. Off below 760 px wide (phones stack and scroll).
 */
function useFitHeight(ref: React.RefObject<HTMLElement | null>, key: string): boolean {
  const [fit, setFit] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const scroller = scrollParent(el);
    const mq = window.matchMedia("(min-width: 760px) and (min-height: 480px)");
    const update = () => {
      if (!mq.matches) {
        el.style.removeProperty("--ov-fit-h");
        setFit(false);
        return;
      }
      const viewH = scroller ? scroller.clientHeight : window.innerHeight;
      const padTop = scroller ? parseFloat(getComputedStyle(scroller).paddingTop) || 0 : 0;
      el.style.setProperty("--ov-fit-h", `${Math.max(420, Math.floor(viewH - padTop - 12))}px`);
      setFit(true);
    };
    update();
    const raf = requestAnimationFrame(update);
    const ro = new ResizeObserver(update);
    if (scroller) ro.observe(scroller);
    window.addEventListener("resize", update);
    mq.addEventListener("change", update);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", update);
      mq.removeEventListener("change", update);
    };
  }, [ref, key]);
  return fit;
}

/**
 * On a one-screen layout, shortens the machine section (`--ov-trim`) by the
 * canvas height its content does not use: a plain drawing's height at the
 * canvas width, or the card stage's laid-out height (`stageNeed`; a stage
 * that needs more, lengthens it). Returns the
 * untrimmed stage height, which the card stage plans against, so trimming
 * never feeds back into its layout.
 */
function useCanvasTrim(ref: React.RefObject<HTMLDivElement | null>, enabled: boolean, stageNeed: number | null, key: string): number | null {
  const trimRef = useRef(0);
  const [avail, setAvail] = useState<number | null>(null);
  useLayoutEffect(() => {
    const row = ref.current;
    const section = row?.closest<HTMLElement>(".pg-ov-machine-sec");
    const canvas = row?.querySelector<HTMLElement>(".pg-ov-canvas");
    const set = (px: number) => {
      trimRef.current = px;
      if (px !== 0) section?.style.setProperty("--ov-trim", `${px}px`);
      else section?.style.removeProperty("--ov-trim");
    };
    if (!enabled || !row || !section || !canvas) {
      set(0);
      setAvail(null);
      return;
    }
    const calc = () => {
      const vp = canvas.querySelector<HTMLElement>(".mx-vp");
      if (!vp) return;
      const cs = getComputedStyle(vp);
      const padV = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom) + 2;
      const untrimmed = canvas.clientHeight + trimRef.current;
      const nextAvail = Math.floor(untrimmed - padV);
      setAvail((prev) => (prev != null && Math.abs(prev - nextAvail) <= 2 ? prev : nextAvail));
      let need: number;
      let floor = 0;
      if (stageNeed != null) {
        if (stageNeed <= 0) {
          if (trimRef.current !== 0) set(0);
          return;
        }
        need = stageNeed + padV;
        // Cards that cannot fit (narrow screens stack them under the drawing): the section grows to hold them.
        floor = -Infinity;
      } else {
        const vb = canvas.querySelector<SVGSVGElement>(".mx-vp-stage > svg")?.viewBox.baseVal;
        if (!vb || !vb.width || !vb.height) return;
        const innerW = vp.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        need = (innerW * vb.height) / vb.width + padV;
      }
      // Give back what is unused, less a small margin; take only what is missing.
      const spare = Math.floor(untrimmed - need);
      const next = Math.max(floor, spare > 8 ? spare - 8 : Math.min(0, spare));
      if (Math.abs(next - trimRef.current) > 6) set(next);
    };
    calc();
    const ro = new ResizeObserver(calc);
    ro.observe(row);
    const mo = new MutationObserver(calc);
    mo.observe(canvas, { attributes: true, attributeFilter: ["viewBox"], childList: true, subtree: true });
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, [ref, enabled, stageNeed, key]);
  useEffect(() => () => {
    ref.current?.closest<HTMLElement>(".pg-ov-machine-sec")?.style.removeProperty("--ov-trim");
  }, [ref]);
  return enabled ? avail : null;
}

/** A diagram-pack sheet whose drawing is in: equipment art drawn and every point keyed by its tag. */
function sheetReady(id: string): boolean {
  const art = LINE_SHEET_ART[id];
  return Boolean(art?.ready) && lineSheetTags(id).every((t) => art.pads[t]);
}

/* ================================================================== */
/* Machine: schematic + pad callout                                    */
/* ================================================================== */

function MachineDrawing({
  machine,
  d,
  selectedTag,
  focusGroup,
  component,
  setComponent,
  onSelect,
  go,
  fit,
}: {
  machine: AssetMachine;
  d: OverviewDigest;
  selectedTag: string | null;
  focusGroup: string | null;
  /** Picked component (sub-assembly): a pyro machine shows its detail sheet. */
  component: string | null;
  setComponent: (id: string | null) => void;
  onSelect: (tag: string | null) => void;
  go: (p: AssetsSubPage) => void;
  /** The section has a fixed, one-screen height: the drawing (and its cards) fill the canvas. */
  fit: boolean;
  /** Shown beside a drawing that leaves spare width (a tall machine): the component list. */
}) {
  const { sensors, catalog, pageDots, placedTags } = d;

  // Pyro line: the diagram pack. The overview sheet is the machine drawing; a component opens its detail sheet(s).
  // A sheet counts once its drawing is in (art drawn, pads keyed by tag); until then the machine schematic stays.
  const overviewSheet = useMemo(() => lineSheetsForMachine(machine.id).find((s) => s.kind === "overview" && sheetReady(s.id))?.id ?? null, [machine.id]);
  const compSheets = useMemo(() => lineSheetsForTags(d.groups.rows.find((g) => g.id === component)?.tags ?? []).filter(sheetReady), [d.groups.rows, component]);
  // A sheet opened from a note or another page, remembered with the component it was opened under.
  const [pick, setPick] = useState<{ component: string | null; id: string } | null>(null);
  const sheetGroup = overviewSheet ? LINE_SHEET_BY_ID[overviewSheet]?.group : null;
  const picked = pick && pick.component === component && LINE_SHEET_BY_ID[pick.id]?.group === sheetGroup ? pick.id : null;
  const sheet = overviewSheet ? (picked ?? compSheets[0] ?? overviewSheet) : null;
  const openSheet = (id: string) => {
    if (LINE_SHEET_BY_ID[id]?.group !== sheetGroup) return;
    if (id === overviewSheet) {
      setPick(null);
      setComponent(null);
      return;
    }
    // Prefer the component the sheet belongs to, so the list highlights it.
    const owner = d.groups.rows.find((g) => lineSheetsForTags(g.tags)[0] === id);
    if (owner) {
      setPick(null);
      setComponent(owner.id);
    } else setPick({ component, id });
  };
  // The line overview's sheet index (plant page) opens a machine here on a given sheet.
  useEffect(() => {
    if (!overviewSheet || d.groups.rows.length === 0) return;
    try {
      const wanted = sessionStorage.getItem(LINE_SHEET_FOCUS_KEY);
      if (!wanted || LINE_SHEET_BY_ID[wanted]?.group !== sheetGroup) return;
      sessionStorage.removeItem(LINE_SHEET_FOCUS_KEY);
      const owner = d.groups.rows.find((g) => lineSheetsForTags(g.tags)[0] === wanted);
      if (owner) setComponent(owner.id);
      else if (wanted !== overviewSheet) setPick({ component: null, id: wanted });
    } catch {
      /* storage unavailable */
    }
  }, [overviewSheet, sheetGroup, d.groups.rows, setComponent]);
  // Every sheet of the group, always: the overview, then each part's detail sheet.
  const sheetPills = useMemo(() => (overviewSheet ? lineSheetsForMachine(machine.id).map((s) => s.id).filter(sheetReady) : []), [overviewSheet, machine.id]);
  // Machines without a diagram pack (kiln-seal fleet): a picked component shows its own component drawing.
  const components = useMachineComponents(machine.id, catalog, sensors);
  const part = !overviewSheet && component ? (components.find((c) => c.id === component && c.pins?.length) ?? null) : null;

  // The sheet's own content box: the canvas takes the drawing's proportions, edge to edge at any width.
  const detail = Boolean(sheet && LINE_SHEET_BY_ID[sheet]?.kind === "detail");
  const { box, measure } = useSheetBox(sheet, !detail);
  const art = sheet ? LINE_SHEET_ART[sheet] : null;
  // Components (a detail sheet, or a kiln component drawing): one live card per sensor, joined to its pad.
  const cardTags = useMemo(() => (detail && sheet ? lineSheetTags(sheet) : part ? part.tags : []), [detail, sheet, part]);
  const cardSensors = useMemo(() => {
    const byTag = new Map(sensors.map((s) => [tagOf(s), s]));
    return cardTags.map((t) => byTag.get(t)).filter((s): s is DetailedSensorInfo => Boolean(s));
  }, [cardTags, sensors]);
  const limitOf = (tag: string) => defsFor(machine.id)?.signalByTag[tag]?.limit;
  // Kiln-seal fleet component drawing, framed to its own content too.
  const { box: partBox, measure: partMeasure } = useContentBox(part?.pins ? `kiln:${machine.id}:${part.id}` : null, () =>
    part ? (
      <>
        <KilnSubAssemblyArt machineId={machine.id} subAssemblyId={part.id} />
        {part.pins?.map((p) => <circle key={p.tag} cx={p.x} cy={p.y} r={16} />)}
      </>
    ) : null,
  );
  const toggle = (tag: string | null) => onSelect(tag === null || tag === selectedTag ? null : tag);
  const selected = selectedTag ? sensors.find((s) => tagOf(s) === selectedTag) ?? null : null;
  const selectedCat = selectedTag ? catalog.sensors.find((s) => s.tag === selectedTag) ?? null : null;
  const live = selectedTag ? d.frame?.signals[selectedTag] ?? null : null;

  const drawableParts = useMemo(() => (!overviewSheet ? components.filter((c) => c.pins?.length) : []), [overviewSheet, components]);
  const sheetIdx = sheet ? sheetPills.indexOf(sheet) : -1;
  const stepSheet = (delta: number) => {
    if (sheetPills.length < 2) return;
    const next = (Math.max(0, sheetIdx) + delta + sheetPills.length) % sheetPills.length;
    openSheet(sheetPills[next]);
  };
  const partItems = useMemo(
    () => (drawableParts.length > 0 ? [{ id: "", label: "Overview" }, ...drawableParts.map((c) => ({ id: c.id, label: c.shortName }))] : []),
    [drawableParts],
  );
  const partIdx = partItems.findIndex((it) => it.id === (part?.id ?? ""));

  const boxRef = useRef<HTMLDivElement>(null);
  const plain = !detail && !part?.pins;
  // A width-bound drawing (portrait screens) gives the height it does not use back to the page.
  const [stageNeed, setStageNeed] = useState(0);
  const stageAvail = useCanvasTrim(boxRef, fit, plain ? null : stageNeed, `${sheet ?? ""}:${part?.id ?? ""}`);
  const stepPart = (delta: number) => {
    if (partItems.length < 2) return;
    const next = (Math.max(0, partIdx) + delta + partItems.length) % partItems.length;
    setComponent(partItems[next].id || null);
  };

  // Sheet / sub-assembly tabs ride in the canvas's own top bar, beside the zoom controls.
  const nav =
    sheetPills.length > 1 ? (
      <div className="pg-ov-nav-bar">
        <div className="pg-ov-nav-scroll">
          <PillNav
            items={sheetPills.map((id) => ({ id, label: id === overviewSheet ? "Overview" : `${id} · ${LINE_SHEET_BY_ID[id]?.title.split(":")[0]}` }))}
            activeId={sheet ?? ""}
            onChange={openSheet}
          />
        </div>
        <div className="pg-ov-stepper" role="group" aria-label="Step diagram sheets">
          <span className="pg-ov-stepper-pos ast-num">
            {Math.max(1, sheetIdx + 1)}/{sheetPills.length}
          </span>
          <button type="button" className="pg-ov-step-btn" onClick={() => stepSheet(-1)} aria-label="Previous sheet" title="Previous sheet">
            ‹
          </button>
          <button type="button" className="pg-ov-step-btn" onClick={() => stepSheet(1)} aria-label="Next sheet" title="Next sheet">
            ›
          </button>
        </div>
      </div>
    ) : partItems.length > 1 ? (
      <div className="pg-ov-nav-bar">
        <div className="pg-ov-nav-scroll">
          <PillNav
            items={partItems}
            activeId={part?.id ?? ""}
            onChange={(id) => setComponent(id || null)}
          />
        </div>
        <div className="pg-ov-stepper" role="group" aria-label="Step sub-assembly drawings">
          <span className="pg-ov-stepper-pos ast-num">
            {Math.max(1, partIdx + 1)}/{partItems.length}
          </span>
          <button type="button" className="pg-ov-step-btn" onClick={() => stepPart(-1)} aria-label="Previous sub-assembly drawing" title="Previous sub-assembly">
            ‹
          </button>
          <button type="button" className="pg-ov-step-btn" onClick={() => stepPart(1)} aria-label="Next sub-assembly drawing" title="Next sub-assembly">
            ›
          </button>
        </div>
      </div>
    ) : null;

  return (
    <div className="pg-ov-drawing">
      <div ref={boxRef} className="pg-ov-stagebox">
        <div className="pg-ov-canvas">
          {measure}
          {partMeasure}
          <BlenderViewport
            scopeLabel={`${machine.id} · ${sheet ?? (part ? part.shortName.toUpperCase() : "OVERVIEW")}`}
            hudStart={nav}
          >
            {sheet ? (
              !box || !art ? null : detail ? (
                <SensorWidgetStage
                  key={sheet}
                  fitDrawing
                  fill={fit}
                  fillHeight={stageAvail ?? undefined}
                  onLayout={setStageNeed}
                  compact={false}
                  sensors={cardSensors}
                  aspect={box[2] / box[3]}
                  positionOf={(s) => {
                    const p = art.pads[tagOf(s)];
                    return p ? { u: (p[0] - box[0]) / box[2], v: (p[1] - box[1]) / box[3] } : null;
                  }}
                  pointOf={(s) => tagOf(s)}
                  renderDrawing={(hot) => (
                    <LineSheet sheetId={sheet} machineId={machine.id} frame={d.frame} selectedTag={hot} onSelectTag={onSelect} drawingOnly viewBox={box} chips={false} />
                  )}
                  selectedTag={selectedTag}
                  onToggle={toggle}
                  limitOf={limitOf}
                />
              ) : (
                <LineSheet sheetId={sheet} machineId={machine.id} frame={d.frame} selectedTag={selectedTag} onSelectTag={onSelect} drawingOnly viewBox={box} />
              )
            ) : part?.pins ? (
              !partBox ? null : (
                <SensorWidgetStage
                  key={part.id}
                  fitDrawing
                  fill={fit}
                  fillHeight={stageAvail ?? undefined}
                  onLayout={setStageNeed}
                  compact={false}
                  sensors={cardSensors}
                  aspect={partBox[2] / partBox[3]}
                  positionOf={(s) => {
                    const pin = part.pins?.find((p) => p.tag === tagOf(s));
                    return pin ? { u: (pin.x - partBox[0]) / partBox[2], v: (pin.y - partBox[1]) / partBox[3] } : null;
                  }}
                  pointOf={(s) => part.pins?.find((p) => p.tag === tagOf(s))?.id ?? tagOf(s)}
                  renderDrawing={(hot) => (
                    <MachineSvg viewBox={partBox.map((v) => +v.toFixed(1)).join(" ")} autoFit={false} cadFrame={false} label={`${part.name} drawing with ${part.pins?.length ?? 0} measurement points`} interactive>
                      <KilnSubAssemblyArt machineId={machine.id} subAssemblyId={part.id} />
                      <DiagramPinLayer pins={part.pins ?? []} selectedPinId={hot} onSelectPin={(pin) => toggle(pin.tag)} />
                    </MachineSvg>
                  )}
                  selectedTag={selectedTag}
                  onToggle={toggle}
                  limitOf={limitOf}
                />
              )
            ) : (
              <MachineSchematic
                diagramType={machine.diagramType}
                dots={pageDots}
                selectedTag={selectedTag}
                onSelect={onSelect}
                focusSystemId={focusGroup}
                label={`${machine.name} schematic with ${placedTags.size} measurement points`}
              />
            )}
          </BlenderViewport>
        </div>
      </div>
      {sheet && <SheetNote sheetId={sheet} onOpenSheet={openSheet} clamp={fit} />}

      {selected ? (
        <div className="pg-ov-callout" data-tone={selected.status === "Normal" ? undefined : severityTone(selected.status)}>
          <span className="pg-ov-callout-bar" aria-hidden="true" />
          <div className="pg-ov-callout-main">
            <span className="pg-ov-callout-tag ast-num">{[selected.point, tagOf(selected)].filter(Boolean).join(" · ")}</span>
            <span className="pg-ov-callout-name">{selected.name}</span>
            <span className="pg-ov-callout-meta ast-num">
              {[
                selected.subAssembly || selected.component,
                selectedCat?.instrument,
                limitText(selected, d.frame?.defs.signalByTag[tagOf(selected)]?.limit, d.frame?.defs.plant === "pyro", live?.model),
                live?.model != null ? `ref. ${live.model.toLocaleString("en-US", { maximumFractionDigits: 2 })}` : null,
                live && live.quality !== "Good" ? live.quality : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>
          <span className="pg-ov-callout-value ast-num">
            {selected.value || "—"}
            {selected.unit && selected.unit !== "state" && <span className="ast-unit">{selected.unit}</span>}
          </span>
          <StateCell tone={severityTone(selected.status)} label={sevLimit(selected.status)} />
          <div className="pg-ov-callout-actions">
            <PillButton
              variant="secondary"
              onClick={() => {
                focusSensorOn("trends", tagOf(selected));
                go("trends");
              }}
            >
              Trends
            </PillButton>
            <PillButton
              variant="secondary"
              onClick={() => {
                focusSensorOn("sensors", tagOf(selected));
                go("sensors");
              }}
            >
              Open in Sensors
            </PillButton>
            <PillButton variant="secondary" onClick={() => go("diagnosis")}>
              Diagnosis
            </PillButton>
            <button type="button" className="pg-ov-icon-btn" onClick={() => onSelect(null)} aria-label="Clear selection">
              ×
            </button>
          </div>
        </div>
      ) : (
        !placedTags.size && <p className="pg-ov-hint">{catalog.isLoading ? "Loading measurement points…" : "No measurement points on this drawing."}</p>
      )}
    </div>
  );
}

/* ================================================================== */
/* Machine: sub-assembly list (scrollable + arrow-controllable)        */
/* ================================================================== */

function GroupList({
  d,
  cap,
  focusGroup,
  setFocusGroup,
}: {
  d: OverviewDigest;
  /** Machine condition: no row may out-rank the header. */
  cap: string;
  focusGroup: string | null;
  setFocusGroup: (id: string | null) => void;
}) {
  const { groups, sortedGroups, statusByTag } = d;
  const listRef = useRef<HTMLDivElement>(null);
  const focusable = useMemo(() => sortedGroups.filter((g) => g.tags.length > 0), [sortedGroups]);
  const activeIdx = focusGroup ? focusable.findIndex((g) => g.id === focusGroup) : -1;

  const stepGroup = (delta: number) => {
    if (focusable.length === 0) return;
    let nextId: string | null;
    if (activeIdx === -1) {
      nextId = delta > 0 ? focusable[0].id : focusable[focusable.length - 1].id;
    } else {
      const next = activeIdx + delta;
      if (next < 0 || next >= focusable.length) nextId = null;
      else nextId = focusable[next].id;
    }
    setFocusGroup(nextId);
    if (nextId && listRef.current) {
      const row = listRef.current.querySelector<HTMLElement>(`[data-group-id="${CSS.escape(nextId)}"]`);
      row?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  };

  if (groups.rows.length === 0) return null;
  return (
    <div ref={listRef} className="pg-ov-groups">
      <table className="pg-ov-table pg-ov-groups-table">
        <thead>
          <tr>
            <th scope="col">
              <span className="pg-ov-groups-th">
                <span>{groups.level}</span>
                {focusable.length > 1 && (
                  <span className="pg-ov-stepper" role="group" aria-label={`Step ${groups.level.toLowerCase()}`}>
                    {focusGroup && (
                      <button
                        type="button"
                        className="pg-ov-step-reset"
                        onClick={() => setFocusGroup(null)}
                        title="Show whole machine"
                      >
                        All
                      </button>
                    )}
                    <span className="pg-ov-stepper-pos ast-num">
                      {activeIdx >= 0 ? `${activeIdx + 1}/${focusable.length}` : `${focusable.length}`}
                    </span>
                    <button
                      type="button"
                      className="pg-ov-step-btn"
                      onClick={() => stepGroup(-1)}
                      aria-label={`Previous ${groups.level.toLowerCase()}`}
                      title={`Previous ${groups.level.toLowerCase()}`}
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      className="pg-ov-step-btn"
                      onClick={() => stepGroup(1)}
                      aria-label={`Next ${groups.level.toLowerCase()}`}
                      title={`Next ${groups.level.toLowerCase()}`}
                    >
                      ›
                    </button>
                  </span>
                )}
              </span>
            </th>
            <th scope="col" className="pg-ov-num">Health</th>
          </tr>
        </thead>
        <tbody>
          {sortedGroups.map((g) => {
            const off = g.tags.filter((t) => (statusByTag.get(t) ?? "Normal") !== "Normal").length;
            const status = worstCondition([g.status]) === "Critical" && toCondition(cap) !== "Critical" ? toCondition(cap) : toCondition(g.status);
            const alert = status === "Advisory" || status === "Critical";
            const t: Tone = alert ? conditionTone(status) : "idle";
            const canFocus = g.tags.length > 0;
            const active = focusGroup === g.id;
            return (
              <tr
                key={g.id}
                data-group-id={g.id}
                className="pg-ov-row"
                data-active={active || undefined}
                tabIndex={canFocus ? 0 : undefined}
                aria-pressed={canFocus ? active : undefined}
                onClick={() => canFocus && setFocusGroup(active ? null : g.id)}
                onKeyDown={(e) => {
                  if (canFocus && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    setFocusGroup(active ? null : g.id);
                  }
                }}
              >
                <td>
                  <span className="pg-ov-group-name">
                    <span className="pg-ov-state" data-tone={alert ? t : undefined}>
                      <i aria-hidden="true" />
                    </span>
                    <span className="pg-ov-item-text">
                      <span className="pg-ov-item-name" title={g.name}>
                        {g.name}
                      </span>
                      {(g.parent !== g.name || off > 0) && (
                        <span className="pg-ov-item-meta">
                          {[g.parent !== g.name ? g.parent : null, off ? `${off} off-normal` : null].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </span>
                  </span>
                </td>
                <td className="pg-ov-num">
                  <span className="pg-ov-health ast-num" data-tone={alert ? t : undefined}>
                    <span>
                      {g.health}
                      <span className="ast-unit">%</span>
                    </span>
                    <span className="pg-ov-bar" aria-hidden="true">
                      <i style={{ width: `${Math.max(0, Math.min(100, g.health))}%` }} />
                    </span>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Warning / alarm text of the selected sensor. Band and |x| limits come from
 * the engine definition so both sides show; relative limits (pyro D5 Table 9.2)
 * read as their logic against the live reference ("warn + 10 % / alarm + 20 %
 * over model (now 118 A)"). Pyro-line limits are marked provisional / demo (D4 §7.2).
 */
function limitText(s: DetailedSensorInfo, limit: LimitRule | undefined, pyro: boolean, ref?: number | null): string {
  const u = s.unit && s.unit !== "state" ? ` ${s.unit}` : "";
  const mark = limit?.d5 ? " · provisional (D5)" : " · demo limit";
  if (isRelativeLimit(limit)) return `${limitSummary(limit, s.unit === "state" ? "" : s.unit, ref)}${pyro ? mark : ""}`;
  const band = twoSided(limit);
  const text = band
    ? `warn ${twoSidedText(band.warnLo, band.warnHi)} · alarm ${twoSidedText(band.alarmLo, band.alarmHi)}${u}`
    : !s.warningVal && !s.alarmVal
      ? ""
      : `warn ${s.warningVal} · alarm ${s.alarmVal}${u}`;
  return text && pyro ? `${text}${mark}` : text;
}
