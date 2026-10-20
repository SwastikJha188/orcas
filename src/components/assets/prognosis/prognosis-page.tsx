"use client";

/**
 * Machine sub-page · Prognosis — "What will happen to this machine?"
 *
 *   Header → four KPIs (next failure, failure chance 7 d / 1 mo / 6 mo,
 *   alarm limits ahead, health in 30 d) → Remaining life per sub-assembly →
 *   Health outlook → Signal forecasts. Every list keeps a fixed order.
 *
 * Diagnosis shows the same failure chance per sensor and links here; why a
 * prediction holds lives on Analysis.
 */

import { useComponentScope, type ComponentScope } from "../component-scope";
import React, { useEffect, useMemo, useState } from "react";
import { PillButton } from "@/components/ui";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { useHealthBands } from "@/lib/reference-data";
import { useKilnSimulationFor, useLiveMachineStatus } from "@/providers/kiln-simulation-context";
import { conditionTone, toCondition } from "@/components/ui/status";
import { useSiteTimeZone } from "@/providers/use-site-time-zone";
import { formatLocalTime } from "@/lib/time";
import { simTimeMs } from "@/lib/kiln-sim/engine";
import type { AssetMachine } from "../assets-data";
import { DIAGNOSIS_SUB_KEY, focusLayer, focusSensorOn, LAYER_FOCUS_EVENT, readLayerFocus, type LayerFocusPayload } from "../sensor-focus";
import { useMachineInsights } from "../use-machine-insights";
import { horizonText, isBaselineRisk, rulRows } from "./prognosis-derive";
import { defsFor } from "@/lib/live-defs";
import { Empty, KpiStrip, PageHeader, PROG_SECTION_KEY, Section, type ProgSectionProps } from "./prog-ui";
import { scrollToSection } from "../analysis/an-ui";
import { downloadReport, progKpis } from "./prog-summary";
import { ProgRul } from "./prog-rul";
import { HealthOutlook } from "./prog-outlook";
import { SignalForecastTable, signalForecastRows } from "./prog-signals";
import "../analysis/analysis-page.css";
import "./prognosis-page.css";

export { PROG_SECTION_KEY };

export interface MachinePrognosisPageProps {
  machine: AssetMachine;
  onNavigateToDiagnosis?: (ruleId?: string | null, component?: string | null, tag?: string | null) => void;
  onNavigateToAnalysis?: (ruleId?: string | null, component?: string | null, tag?: string | null) => void;
  onNavigateToSensors?: () => void;
  onNavigateToTrends?: () => void;
  onNavigateToOverview?: () => void;
  /** Component the page is filtered to (null: the whole machine). */
  component?: ComponentScope | null;
}

export function MachinePrognosisPage({
  machine,
  onNavigateToDiagnosis,
  onNavigateToAnalysis,
  onNavigateToSensors,
  onNavigateToTrends,
  onNavigateToOverview,
  component: componentProp,
}: MachinePrognosisPageProps) {
  // The machine's component filter (shared by its pages) unless the host passes one.
  const parts = useComponentScope(machine);
  const sharedComponent = parts.selected;
  const component = componentProp !== undefined ? componentProp : sharedComponent;
  const insights = useMachineInsights(machine);
  const { setActiveSubPage } = useIndustrialData();
  const frame = useKilnSimulationFor(machine.id)?.frame ?? null;
  const live = frame !== null;
  const tz = useSiteTimeZone({ machineId: machine.id });
  const bands = useHealthBands(machine.healthModelId);
  const liveStatus = useLiveMachineStatus(machine.id, { health: machine.health, status: machine.status });
  const condition = toCondition(liveStatus.status);

  const data = insights.data?.prognosis ?? null;
  const analysis = insights.data?.analysis ?? null;
  const keySensors = useMemo(() => insights.data?.keySensors ?? [], [insights.data]);
  // Component filter (Assets component bar): its remaining-life row(s) and its sensors' forecasts only.
  const compTags = useMemo(() => (component ? new Set(component.tags) : null), [component]);
  const rows = useMemo(() => {
    const all = data ? rulRows(data, analysis) : [];
    return component && compTags ? all.filter((r) => r.id === component.id || r.tags.some((t) => compTags.has(t))) : all;
  }, [data, analysis, component, compTags]);

  const [modeId, setModeId] = useState<string | null>(() => readLayerFocus(false).ruleId);
  const [focusedComponent, setFocusedComponent] = useState<string | null>(() => readLayerFocus(false).component);

  useEffect(() => {
    const init = readLayerFocus(false);
    if (init.ruleId) setModeId(init.ruleId);
    if (init.component) setFocusedComponent(init.component);
    const onFocus = (ev: Event) => {
      const detail = (ev as CustomEvent<LayerFocusPayload>).detail;
      if (detail?.ruleId !== undefined) setModeId(detail.ruleId ?? null);
      if (detail?.component !== undefined) setFocusedComponent(detail.component ?? null);
    };
    window.addEventListener(LAYER_FOCUS_EVENT, onFocus);
    return () => window.removeEventListener(LAYER_FOCUS_EVENT, onFocus);
  }, [machine.id]);

  const mode = useMemo(() => {
    if (!data) return null;
    if (modeId) {
      const byRule = data.risks.find((r) => r.id === modeId);
      if (byRule) return byRule;
    }
    if (focusedComponent) {
      const compLower = focusedComponent.toLowerCase();
      const byComp = data.risks.find(
        (r) => r.component.toLowerCase().includes(compLower) || compLower.includes(r.component.toLowerCase()),
      );
      if (byComp) return byComp;
    }
    return (
      data.risks.filter((r) => !isBaselineRisk(r)).sort((x, y) => (y.probability ?? -1) - (x.probability ?? -1))[0] ??
      data.risks[0] ??
      null
    );
  }, [data, modeId, focusedComponent]);

  const activeRuleId = mode && !isBaselineRisk(mode) ? mode.id : modeId;

  const handleSelectMode = (id: string) => {
    setModeId(id);
    if (!id.startsWith("base-")) {
      focusLayer({ ruleId: id });
    }
  };

  const handleSeeReason = (ruleId?: string | null, component?: string | null, tag?: string | null) => {
    const rId = ruleId ?? activeRuleId;
    focusLayer({ ruleId: rId, component: component ?? mode?.component, tag, section: "an-diagnosis" });
    if (onNavigateToAnalysis) onNavigateToAnalysis(rId, component ?? mode?.component, tag);
    else setActiveSubPage("analysis");
  };

  const handleSeeDiagnosis = (ruleId?: string | null, component?: string | null, tag?: string | null) => {
    // A row link names its own sub-assembly: without a finding there, open its sensors, not the page's focused rule.
    const rId = ruleId ?? (component ? null : activeRuleId);
    focusLayer({ ruleId: rId, component: component ?? mode?.component, tag, section: "dx-diagnosis" });
    // No finding to filter by: open Diagnosis on the sub-assembly's sensors.
    if (!rId && component) {
      try {
        sessionStorage.setItem(DIAGNOSIS_SUB_KEY, component);
      } catch {
        /* storage unavailable */
      }
    }
    if (onNavigateToDiagnosis) onNavigateToDiagnosis(rId, component ?? mode?.component, tag);
    else setActiveSubPage("diagnosis");
  };

  const go = (sub: Parameters<typeof setActiveSubPage>[0]) => {
    if (sub === "diagnosis") {
      handleSeeDiagnosis();
      return;
    }
    if (sub === "analysis") {
      handleSeeReason();
      return;
    }
    if (sub === "sensors" && onNavigateToSensors) {
      onNavigateToSensors();
      return;
    }
    if (sub === "trends" && onNavigateToTrends) {
      onNavigateToTrends();
      return;
    }
    if (sub === "overview" && onNavigateToOverview) {
      onNavigateToOverview();
      return;
    }
    setActiveSubPage(sub);
  };

  const generatedAt = insights.data?.generatedAt ?? null;
  const stamp = frame
    ? formatLocalTime(simTimeMs(frame.t), { seconds: false, zone: true, timeZone: tz.timeZone })
    : generatedAt
      ? Number.isNaN(Date.parse(generatedAt))
        ? generatedAt
        : formatLocalTime(generatedAt, { date: true, seconds: false, zone: true, timeZone: tz.timeZone })
      : null;

  const longest = data?.horizons[data.horizons.length - 1];
  const lastDay = data?.condition.points[data.condition.points.length - 1]?.day;
  const props: ProgSectionProps | null = data
    ? {
        machine,
        data,
        analysis,
        rows,
        keySensors,
        live,
        go,
        frame,
        mode,
        setMode: handleSelectMode,
        focusedComponent,
        onSeeReason: handleSeeReason,
        onSeeDiagnosis: handleSeeDiagnosis,
      }
    : null;

  // Another page asked for a section (Thermal → forecasts, Diagnosis → remaining life): scroll there once it renders.
  const ready = Boolean(data);
  useEffect(() => {
    if (!ready) return;
    let id: string | null = null;
    try {
      id = sessionStorage.getItem(PROG_SECTION_KEY);
      sessionStorage.removeItem(PROG_SECTION_KEY);
    } catch {
      /* storage unavailable */
    }
    if (!id) return;
    const t = window.setTimeout(() => scrollToSection(id as string), 120);
    return () => window.clearTimeout(t);
  }, [ready]);

  const forecastRows = useMemo(() => {
    const all = data ? signalForecastRows(data, defsFor(machine.id)) : [];
    return compTags ? all.filter((r) => compTags.has(r.tag)) : all;
  }, [data, machine.id, compTags]);
  const openTrend = (tag: string) => {
    focusSensorOn("trends", tag);
    go("trends");
  };

  return (
    <div className="ast-root pg-frame pg-prog" aria-label="Prognosis">
      <PageHeader
        title="What happens next"
        status={{ label: condition, tone: conditionTone(condition) }}
        meta={[
          { label: "Data", value: live ? "Live" : data ? "Saved snapshot" : insights.isLoading ? "Loading…" : "No forecast" },
          { label: "Updated", value: stamp ?? "—" },
          longest && { label: "Looks ahead", value: `readings ${horizonText(longest.id)}${lastDay !== undefined ? ` · health ${lastDay} d` : ""}` },
          component && { label: "Part", value: component.name },
        ]}
        actions={
          // Page links and Trends are in the machine bar above; the report is this page's own.
          props && (
            <PillButton variant="secondary" onClick={() => downloadReport(props, stamp)}>
              Download report
            </PillButton>
          )
        }
      />

      {insights.isLoading && !data ? (
        <section className="ast-card" role="status" aria-live="polite">
          <Empty title="Loading the forecast…" />
        </section>
      ) : insights.isError && !data ? (
        <section className="ast-card" role="alert">
          <Empty title="Could not load the forecast. Try again in a moment." />
        </section>
      ) : !props ? (
        <section className="ast-card">
          <Empty title="No forecast is available for this machine." />
        </section>
      ) : (
        <>
          {rows.length > 0 && <KpiStrip
              page
              items={progKpis(props, bands, component && compTags ? { tags: compTags, health: parts.options.find((o) => o.id === component.id)?.health ?? null } : null)}
              label="Forecast summary"
            />}
          {rows.length > 0 && (
            <Section id="prog-life" title="Time left before repair">
              <ProgRul {...props} />
            </Section>
          )}
          {/* The health forecast is the whole machine's: a part's page shows only that part. */}
          {!component && data && data.condition.points.length > 1 && (
            <Section id="prog-outlook" title="Health forecast">
              <HealthOutlook data={data} bands={bands} />
            </Section>
          )}
          {forecastRows.length > 0 && (
            <Section id="prog-forecast" title="Sensor reading forecasts">
              <SignalForecastTable rows={forecastRows} onOpenTrend={openTrend} />
            </Section>
          )}
          {component && rows.length === 0 && forecastRows.length === 0 && (
            <section className="ast-card">
              <Empty title={`No forecast for ${component.name}: no remaining-life estimate and no sensor reading forecast cover this part.`} />
            </section>
          )}
        </>
      )}
    </div>
  );
}

export default MachinePrognosisPage;
