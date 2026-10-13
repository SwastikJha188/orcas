"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { PillButton, PillNav } from "@/components/ui";
import { simMinuteMs, simTimeMs, type RuleState } from "@/lib/kiln-sim/engine";
import type { Severity } from "@/lib/kiln-sim/signals";
import {
  SHELL_ALERT,
  SHELL_DA,
  SHELL_DANGER,
  SHELL_DIA,
  SHELL_DZ,
  SHELL_GIRTH,
  SHELL_LEN,
  SHELL_NA,
  SHELL_TYRES,
  SHELL_ZONES,
  buildShellMap,
  shellZoneAt,
  type ShellMap,
  type ShellZoneStats,
} from "@/lib/kiln-sim/shell-map";
import { MX, MachineLabel, MachinePad, MachineSvg, PAINT, Bolt } from "./machine-kit/machine-kit";
import { BandGauge, type Tone } from "./diagnostics-overview-tab";
import { TrendChart, type TrendSample } from "./sensor-trend-graph";
import type { KilnSimulation } from "./kiln-seals-simulation";
import "./diagnosis.css";
import "./diagnosis/overview-tab.css";
import "./thermal-view.css";

/**
 * Thermal tab (kiln only), on the Diagnosis page skeleton: KPI strip → the
 * SHL-KLN-01 shell scanner map to scale (or the longitudinal profile on the
 * same metre axis) → shell-maximum trend and hottest section → zone register
 * → thermal findings. Everything follows the live frame (`frame.shellProfile`,
 * CAL-KLN-03, STS-KLN-08), so the map's hottest cell is the CAL-KLN-03 value.
 */

const TONE: Record<Severity, Exclude<Tone, "neutral">> = { Normal: "good", Advisory: "warn", Critical: "bad" };
const TREND_MIN = 180;

/* Shared metre axis: map, kiln drawing and profile line up column for column. */
const PX0 = 52;
const PWD = 912;
const XT = (z: number) => PX0 + (z / SHELL_LEN) * PWD;
const PX_PER_M = PWD / SHELL_LEN;
const HY0 = 186;
const HH = 288;
const YT = (a: number) => HY0 + (a / 360) * HH;
const SHELL_Y = 92;
const SHELL_H = SHELL_DIA * PX_PER_M;
const GROUND = 160;

/** Thermal scale stops (°C → `--heat-*` token). */
const HEAT_STOPS = [150, 200, 240, 275, 315, 355, 400, 460, 520] as const;
const HEAT_LO = HEAT_STOPS[0];
const HEAT_HI = HEAT_STOPS[HEAT_STOPS.length - 1];

type Rgb = [number, number, number];
type MapView = "map" | "profile";

function hexRgb(hex: string): Rgb {
  const h = hex.trim().replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function readRamp(): { stops: Array<[number, Rgb]>; mask: Rgb } {
  const css = getComputedStyle(document.documentElement);
  return {
    stops: HEAT_STOPS.map((v) => [v, hexRgb(css.getPropertyValue(`--heat-${v}`) || "#000")]),
    mask: hexRgb(css.getPropertyValue("--heat-mask") || "#3a3e44"),
  };
}

function heat(stops: Array<[number, Rgb]>, v: number): Rgb {
  if (v <= stops[0][0]) return stops[0][1];
  for (let i = 1; i < stops.length; i++) {
    if (v <= stops[i][0]) {
      const [a, ca] = stops[i - 1];
      const [b, cb] = stops[i];
      const k = (v - a) / (b - a);
      return [0, 1, 2].map((j) => Math.round(ca[j] + (cb[j] - ca[j]) * k)) as Rgb;
    }
  }
  return stops[stops.length - 1][1];
}

/** Paints the map into a 149 × 72 bitmap (one pixel per cell) and returns it as a data URL. */
function useHeatImage(map: ShellMap, nz: number): string {
  const canvas = useRef<HTMLCanvasElement | null>(null);
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!canvas.current) canvas.current = document.createElement("canvas");
    const cv = canvas.current;
    cv.width = nz;
    cv.height = SHELL_NA;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const { stops, mask } = readRamp();
    const img = ctx.createImageData(nz, SHELL_NA);
    for (let i = 0; i < nz; i++) {
      for (let k = 0; k < SHELL_NA; k++) {
        const j = i * SHELL_NA + k;
        const [r, g, b] = map.mask[j] ? mask : heat(stops, map.temp[j]);
        const o = (k * nz + i) * 4;
        img.data[o] = r;
        img.data[o + 1] = g;
        img.data[o + 2] = b;
        img.data[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    setUrl(cv.toDataURL());
  }, [map, nz]);
  return url;
}

const fmt0 = (v: number) => (Number.isFinite(v) ? v.toFixed(0) : "—");
const signed = (v: number, d = 0) => {
  const r = Math.abs(v).toFixed(d);
  return Number(r) === 0 ? r : `${v > 0 ? "+" : "−"}${r}`;
};
const tempTone = (v: number): Exclude<Tone, "neutral"> => (v >= SHELL_DANGER ? "bad" : v >= SHELL_ALERT ? "warn" : "good");

function StatIcon({ children }: { children: React.ReactNode }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const ICON = {
  temp: (
    <StatIcon>
      <path d="M10 13.5V5a2 2 0 1 1 4 0v8.5a4 4 0 1 1-4 0z" />
      <path d="M12 9v6" />
    </StatIcon>
  ),
  delta: (
    <StatIcon>
      <path d="M3 17h18" strokeDasharray="2 3" />
      <path d="m4 14 5-5 4 3 7-7" />
    </StatIcon>
  ),
  area: (
    <StatIcon>
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <rect x="9" y="9" width="6" height="6" rx="1" strokeDasharray="2 2" />
    </StatIcon>
  ),
  scan: (
    <StatIcon>
      <path d="M4 8V5h3M20 8V5h-3M4 16v3h3M20 16v3h-3" />
      <path d="M7 12h10" />
    </StatIcon>
  ),
  zone: (
    <StatIcon>
      <rect x="3" y="8" width="18" height="8" rx="4" />
      <path d="M9 8v8M15 8v8" />
    </StatIcon>
  ),
  rule: (
    <StatIcon>
      <path d="M12 3 2.5 20h19L12 3z" />
      <path d="M12 10v4M12 17h.01" />
    </StatIcon>
  ),
};

export interface ThermalViewProps {
  simulation: KilnSimulation;
  onNavigateToTrends?: () => void;
  onNavigateToDiagnosis?: () => void;
}

export function ThermalView({ simulation, onNavigateToTrends, onNavigateToDiagnosis }: ThermalViewProps) {
  const { frame } = simulation;
  const shellMax = frame.signals["CAL-KLN-03"];
  const coverage = frame.signals["STS-KLN-08"];
  const [view, setView] = useState<MapView>("map");

  const map = useMemo(
    () => buildShellMap(frame.shellProfile, frame.shellModel, coverage?.value ?? 95.9, frame.t),
    [frame.shellProfile, frame.shellModel, coverage?.value, frame.t],
  );
  const nz = map.colMax.length;
  const heatUrl = useHeatImage(map, nz);
  const status = shellMax?.status ?? "Normal";
  const maxTone = TONE[status];
  const covValue = coverage?.value ?? map.coverage;
  const covTone = TONE[coverage?.status ?? "Normal"];
  const modelAtMax = map.model[map.maxI];
  const aboveModel = map.max - modelAtMax;
  const slope = shellMax?.slopePerHour ?? null;
  const ttl = shellMax?.timeToLimit && shellMax.timeToLimit !== "—" ? shellMax.timeToLimit : null;

  const findings = frame.rules.filter(
    (r) => r.status !== "QUIET" && (r.subs.includes("shell-refractory") || r.tags.some((t) => t === "CAL-KLN-03" || t === "STS-KLN-08")),
  );

  const trend = useMemo<TrendSample[]>(() => {
    const h = frame.history["CAL-KLN-03"] ?? [];
    const mh = frame.modelHistory["CAL-KLN-03"] ?? [];
    const now = simTimeMs(frame.t);
    const step = simMinuteMs();
    const n = Math.min(h.length, TREND_MIN);
    const out: TrendSample[] = [];
    for (let i = h.length - n; i < h.length; i++) out.push({ t: now - (h.length - 1 - i) * step, v: h[i], b: mh[i] });
    return out;
  }, [frame.history, frame.modelHistory, frame.t]);

  const shellMaxScale = Math.max(480, Math.ceil((map.max + 20) / 20) * 20);
  const deltaScale = Math.max(80, Math.ceil((Math.abs(aboveModel) + 10) / 20) * 20);

  return (
    <div className="dx-page">
      <div className="dxo-root">
        {(onNavigateToTrends || onNavigateToDiagnosis) && (
          <div className="dxo-toolbar">
            <div className="dxo-toolbar-group" />
            <div className="dxo-toolbar-group">
              {onNavigateToTrends && (
                <PillButton variant="secondary" onClick={onNavigateToTrends} style={{ padding: "6px 14px", fontSize: "0.8rem" }}>
                  Trends
                </PillButton>
              )}
              {onNavigateToDiagnosis && (
                <PillButton variant="secondary" onClick={onNavigateToDiagnosis} style={{ padding: "6px 14px", fontSize: "0.8rem" }}>
                  Diagnosis
                </PillButton>
              )}
            </div>
          </div>
        )}

        {/* ===================== Tier 1 · KPI strip ===================== */}
        <section className="dxo-kpis thm-kpis" aria-label="Shell thermal indicators">
          <div className="dxo-card dxo-stat">
            <span className="dxo-stat-label">{ICON.temp}Shell maximum</span>
            <div className="dxo-stat-value">
              <strong>{fmt0(map.max)}</strong>
              <span className="dxo-unit">°C</span>
              <span className={`dxo-aside dxo-stat-tag dxo-tone-text-${maxTone}`}>CAL-KLN-03</span>
            </div>
            <BandGauge
              min={150}
              max={shellMaxScale}
              bands={[
                { to: SHELL_ALERT, tone: "good" },
                { to: SHELL_DANGER, tone: "warn" },
                { to: shellMaxScale, tone: "bad" },
              ]}
              value={map.max}
              ticks={[
                { at: 150, label: "150" },
                { at: SHELL_ALERT, label: String(SHELL_ALERT) },
                { at: SHELL_DANGER, label: String(SHELL_DANGER) },
                { at: shellMaxScale, label: "°C" },
              ]}
              ariaLabel={`Shell maximum ${fmt0(map.max)} °C; alert ${SHELL_ALERT}, danger ${SHELL_DANGER} °C`}
            />
            <div className="dxo-stat-foot">
              <span className="dxo-stat-name">
                {map.maxZ.toFixed(1)} m · {map.maxAngle}° · {shellZoneAt(map.maxZ)}
              </span>
              {ttl && <b>limit in {ttl}</b>}
            </div>
          </div>

          <div className="dxo-card dxo-stat">
            <span className="dxo-stat-label">{ICON.delta}Above model at hottest point</span>
            <div className="dxo-stat-value">
              <strong>{signed(aboveModel)}</strong>
              <span className="dxo-unit">K</span>
              <span className={`dxo-aside dxo-tone-text-${slope !== null && slope > 20 ? "bad" : "good"}`}>
                {slope === null ? "—" : `${signed(slope, 1)} K/h`}
              </span>
            </div>
            <BandGauge
              min={0}
              max={deltaScale}
              bands={[
                { to: 20, tone: "good" },
                { to: 40, tone: "warn" },
                { to: deltaScale, tone: "bad" },
              ]}
              value={Math.max(0, aboveModel)}
              ticks={[
                { at: 0, label: "0" },
                { at: 20, label: "20" },
                { at: 40, label: "40" },
                { at: deltaScale, label: "K" },
              ]}
              ariaLabel={`Hottest point ${signed(aboveModel)} K against the model profile`}
            />
            <div className="dxo-stat-foot">
              <span className="dxo-stat-name">Model {fmt0(modelAtMax)} °C at this section</span>
            </div>
          </div>

          <div className="dxo-card dxo-stat">
            <span className="dxo-stat-label">{ICON.area}Area ≥ {SHELL_ALERT} °C</span>
            <div className="dxo-stat-value">
              <strong>{map.hotArea.toFixed(2)}</strong>
              <span className="dxo-unit">m²</span>
              <span className={`dxo-aside dxo-tone-text-${map.hotArea > 0 ? maxTone : "good"}`}>
                {map.hotBox ? `${map.hotBox.z0.toFixed(1)}–${map.hotBox.z1.toFixed(1)} m` : "None"}
              </span>
            </div>
            <BandGauge
              min={0}
              max={Math.max(5, Math.ceil(map.hotArea + 1))}
              bands={[
                { to: 0.5, tone: "good" },
                { to: 2, tone: "warn" },
                { to: Math.max(5, Math.ceil(map.hotArea + 1)), tone: "bad" },
              ]}
              value={map.hotArea}
              ticks={[
                { at: 0, label: "0" },
                { at: 2, label: "2" },
                { at: Math.max(5, Math.ceil(map.hotArea + 1)), label: "m²" },
              ]}
              ariaLabel={`Shell area at or above ${SHELL_ALERT} °C: ${map.hotArea.toFixed(2)} m²`}
            />
            <div className="dxo-stat-foot">
              <span className="dxo-stat-name">Of {(Math.PI * SHELL_DIA * SHELL_LEN).toFixed(0)} m² shell</span>
            </div>
          </div>

          <div className="dxo-card dxo-stat">
            <span className="dxo-stat-label">{ICON.scan}Scanner coverage</span>
            <div className="dxo-stat-value">
              <strong>{covValue.toFixed(1)}</strong>
              <span className="dxo-unit">%</span>
              <span className={`dxo-aside dxo-stat-tag dxo-tone-text-${covTone}`}>STS-KLN-08</span>
            </div>
            <BandGauge
              min={70}
              max={100}
              bands={[
                { to: 80, tone: "bad" },
                { to: 90, tone: "warn" },
                { to: 100, tone: "good" },
              ]}
              value={covValue}
              ticks={[
                { at: 70, label: "70" },
                { at: 80, label: "80" },
                { at: 90, label: "90" },
                { at: 100, label: "100 %" },
              ]}
              ariaLabel={`Scanner coverage ${covValue.toFixed(1)} %; alert below 90, alarm below 80 %`}
            />
            <div className="dxo-stat-foot">
              <span className="dxo-stat-name">{covTone === "good" ? "Tyres only obstruct the view" : "Shell maximum may under-read"}</span>
            </div>
          </div>
        </section>

        {/* ===================== Tier 2 · Primary visual ===================== */}
        <section className="dxo-primary" aria-label="Shell temperature">
          <div className="dxo-card dxo-span-12">
            <div className="dxo-card-head">
              <h3 className="dxo-card-title">
                {view === "map" ? "Shell thermal map" : "Longitudinal profile"}
                <small>
                  SHL-KLN-01 · {SHELL_LEN} m × 360° · {SHELL_DZ} m × {SHELL_DA}°
                </small>
              </h3>
              <PillNav
                items={[
                  { id: "map", label: "Map" },
                  { id: "profile", label: "Profile" },
                ]}
                activeId={view}
                onChange={(id) => setView(id as MapView)}
              />
            </div>
            {view === "map" ? (
              <>
                <ShellMapFigure map={map} heatUrl={heatUrl} status={status} />
                <div className="thm-foot">
                  <HeatScale />
                  <span className="dxt-legend">
                    <span>
                      <i className="dxt-key thm-key-mask" />
                      No view
                    </span>
                  </span>
                </div>
              </>
            ) : (
              <>
                <ProfileChart map={map} />
                <div className="dxt-legend">
                  <span>
                    <i className="dxt-key dxt-key--line" />
                    Section maximum
                  </span>
                  <span>
                    <i className="dxt-key thm-key-mean" />
                    Section mean
                  </span>
                  <span>
                    <i className="dxt-key dxt-key--base" />
                    Model
                  </span>
                  <span>
                    <i className="dxt-key dxt-key--warn" />
                    Alert {SHELL_ALERT} °C
                  </span>
                  <span>
                    <i className="dxt-key dxt-key--bad" />
                    Danger {SHELL_DANGER} °C
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="dxo-card dxo-span-7">
            <div className="dxo-card-head">
              <h3 className="dxo-card-title">
                Shell maximum <small>CAL-KLN-03 · last {TREND_MIN / 60} h</small>
              </h3>
            </div>
            <div className="dxt-legend">
              <span>
                <i className="dxt-key dxt-key--line" />
                Measured
              </span>
              <span>
                <i className="dxt-key dxt-key--base" />
                Model
              </span>
              <span>
                <i className="dxt-key dxt-key--warn" />
                Alert zone
              </span>
              <span>
                <i className="dxt-key dxt-key--bad" />
                Danger zone
              </span>
            </div>
            {trend.length > 1 ? (
              <TrendChart
                samples={trend}
                timeDomain={[trend[0].t, trend[trend.length - 1].t]}
                unit="°C"
                limits={{ warn: SHELL_ALERT, alarm: SHELL_DANGER, mode: "high" }}
                decimals={0}
                height={260}
                ariaLabel={`Shell maximum temperature in °C with alert limit ${SHELL_ALERT} and danger limit ${SHELL_DANGER}`}
              />
            ) : (
              <div className="dxo-empty">Collecting history</div>
            )}
          </div>

          <div className="dxo-card dxo-span-5">
            <div className="dxo-card-head">
              <h3 className="dxo-card-title">
                Hottest section <small>{map.maxZ.toFixed(1)} m · {shellZoneAt(map.maxZ)}</small>
              </h3>
            </div>
            <div className="thm-section">
              <PolarChart map={map} status={status} />
              <dl className="dxo-spec thm-spec">
                <dt>Hottest point</dt>
                <dd>
                  <span className={`dxo-tone-text-${maxTone}`}>{fmt0(map.max)} °C</span> at {map.maxAngle}°
                </dd>
                <dt>Section mean</dt>
                <dd>{map.colMean[map.maxI] == null ? "—" : `${fmt0(map.colMean[map.maxI] as number)} °C`}</dd>
                <dt>Model</dt>
                <dd>{fmt0(modelAtMax)} °C</dd>
                <dt>Rate of rise</dt>
                <dd>{slope === null ? "—" : `${signed(slope, 1)} K/h`}</dd>
                <dt>Time to limit</dt>
                <dd>{ttl ?? "—"}</dd>
              </dl>
            </div>
          </div>
        </section>

        {/* ===================== Tier 3 · Registers ===================== */}
        <section className="dxo-card dxo-table-card" aria-label="Zones">
          <div className="dxo-card-head">
            <h3 className="dxo-card-title">
              Zones <small>mean of section maxima against the model</small>
            </h3>
          </div>
          <ZoneTable zones={map.zones} />
        </section>

        <section className="dxo-card dxo-table-card" aria-label="Thermal findings">
          <div className="dxo-card-head">
            <h3 className="dxo-card-title">
              Thermal findings <small>{findings.length} open</small>
            </h3>
          </div>
          {findings.length === 0 ? (
            <div className="dxo-empty">No thermal findings · shell follows the model profile</div>
          ) : (
            <FindingsTable rules={findings} />
          )}
        </section>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Map figure: kiln elevation, heat map, markers                       */
/* ------------------------------------------------------------------ */

function ShellMapFigure({ map, heatUrl, status }: { map: ShellMap; heatUrl: string; status: Severity }) {
  const wrap = useRef<HTMLDivElement | null>(null);
  const clipId = `thm-clip${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [tip, setTip] = useState<{ x: number; y: number; where: string; value: string; delta: string | null; zone: string } | null>(null);
  const nz = map.colMax.length;

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const wr = wrap.current?.getBoundingClientRect();
    if (!wr) return;
    const z = Math.max(0, Math.min(SHELL_LEN, ((e.clientX - r.left) / r.width) * SHELL_LEN));
    const a = Math.max(0, Math.min(359.9, ((e.clientY - r.top) / r.height) * 360));
    const i = Math.max(0, Math.min(nz - 1, Math.round(z / SHELL_DZ)));
    const k = Math.min(SHELL_NA - 1, Math.floor(a / SHELL_DA));
    const j = i * SHELL_NA + k;
    const hidden = Boolean(map.mask[j]);
    setTip({
      x: Math.min(e.clientX - wr.left + 14, wr.width - 180),
      y: e.clientY - wr.top + 14,
      where: `${(i * SHELL_DZ).toFixed(1)} m · ${k * SHELL_DA}°`,
      value: hidden ? "No view" : `${map.temp[j].toFixed(0)} °C`,
      delta: hidden ? null : `${signed(map.temp[j] - map.model[i])} K vs model`,
      zone: shellZoneAt(z),
    });
  };

  const mx = XT(map.maxZ);
  const my = YT(map.maxAngle + SHELL_DA / 2);
  const flip = mx > PX0 + PWD - 140;

  return (
    <div className="thm-map" ref={wrap}>
      <MachineSvg viewBox="0 0 1000 512" label={`Kiln shell thermal map to scale. Hottest ${map.max.toFixed(0)} °C at ${map.maxZ.toFixed(1)} m, ${map.maxAngle}°`}>
        {/* Zones: quiet boundaries and labels above the drawing */}
        {SHELL_ZONES.map((zn) => (
          <MachineLabel key={zn.name} x={(XT(zn.from) + XT(zn.to)) / 2} y={14} size={zn.to - zn.from < 10 ? 8 : 8.5}>
            {zn.to - zn.from < 10 ? zn.name.toUpperCase() : `${zn.name.toUpperCase()} · ${zn.from}–${zn.to} M`}
          </MachineLabel>
        ))}
        {SHELL_ZONES.slice(1).map((zn) => (
          <line key={zn.name} x1={XT(zn.from)} x2={XT(zn.from)} y1={4} y2={HY0 + HH} className="thm-zone-line" />
        ))}

        <KilnElevation status={status} maxZ={map.maxZ} />

        {/* Tyre and girth-gear references */}
        {SHELL_TYRES.map((t) => (
          <g key={t.label}>
            <line x1={XT(t.z + 0.25)} x2={XT(t.z + 0.25)} y1={GROUND + 4} y2={HY0} className="thm-ref" />
            <MachineLabel x={XT(t.z + 0.25)} y={HY0 - 8}>{`${t.label} · ${t.z} M`}</MachineLabel>
          </g>
        ))}
        <MachineLabel x={XT(SHELL_GIRTH)} y={HY0 - 8}>{`GG · ${SHELL_GIRTH} M`}</MachineLabel>

        {/* Heat map */}
        <defs>
          <clipPath id={clipId}>
            <rect x={PX0} y={HY0} width={PWD} height={HH} rx={6} />
          </clipPath>
        </defs>
        <rect x={PX0} y={HY0} width={PWD} height={HH} rx={6} className="thm-map-bg" />
        {heatUrl && (
          <image
            href={heatUrl}
            x={XT(-SHELL_DZ / 2)}
            y={HY0}
            width={XT(SHELL_LEN + SHELL_DZ / 2) - XT(-SHELL_DZ / 2)}
            height={HH}
            preserveAspectRatio="none"
            clipPath={`url(#${clipId})`}
            style={{ imageRendering: "pixelated" }}
          />
        )}
        {[90, 180, 270].map((a) => (
          <line key={a} x1={PX0} x2={PX0 + PWD} y1={YT(a)} y2={YT(a)} className="thm-map-grid" />
        ))}

        {/* ≥ alert area and the hottest cell */}
        {map.hotBox && (
          <rect
            x={XT(map.hotBox.z0)}
            y={YT(map.hotBox.a0)}
            width={XT(map.hotBox.z1) - XT(map.hotBox.z0)}
            height={YT(map.hotBox.a1) - YT(map.hotBox.a0)}
            className="thm-hotbox"
          />
        )}
        <g className="thm-cross">
          <circle cx={mx} cy={my} r={9} />
          <line x1={mx - 15} x2={mx - 5} y1={my} y2={my} />
          <line x1={mx + 5} x2={mx + 15} y1={my} y2={my} />
          <line x1={mx} x2={mx} y1={my - 15} y2={my - 5} />
          <line x1={mx} x2={mx} y1={my + 5} y2={my + 15} />
        </g>
        <g>
          <rect x={flip ? mx - 104 : mx + 16} y={my - 30} width={88} height={20} rx={10} className="thm-readout-bg" />
          <text x={flip ? mx - 60 : mx + 60} y={my - 16} textAnchor="middle" className="thm-readout">
            MAX {map.max.toFixed(0)} °C
          </text>
        </g>

        {/* Axes */}
        {Array.from({ length: SHELL_LEN / 5 + 1 }, (_, n) => n * 5).map((z) => (
          <g key={z}>
            <line x1={XT(z)} x2={XT(z)} y1={HY0 + HH + 2} y2={HY0 + HH + (z % 10 === 0 ? 8 : 5)} className="thm-axis-line" />
            {z % 10 === 0 && (
              <text x={XT(z)} y={HY0 + HH + 22} textAnchor="middle" className="dxt-tick">
                {z} m
              </text>
            )}
          </g>
        ))}
        <text x={PX0 + PWD} y={HY0 + HH + 22} textAnchor="end" className="dxt-tick">
          burner ›
        </text>
        {[0, 90, 180, 270, 360].map((a) => (
          <text key={a} x={PX0 - 8} y={YT(a) + 4} textAnchor="end" className="dxt-tick">
            {a}°
          </text>
        ))}

        <rect
          x={PX0}
          y={HY0}
          width={PWD}
          height={HH}
          fill="transparent"
          className="thm-hit"
          onPointerMove={onMove}
          onPointerLeave={() => setTip(null)}
        />
      </MachineSvg>
      {tip && (
        <div className="dxt-tip" style={{ left: tip.x, top: tip.y }} role="status">
          <span className="dxt-tip-time">
            {tip.where} · {tip.zone}
          </span>
          <span className="dxt-tip-row">
            <strong>{tip.value}</strong>
            {tip.delta && <span className="dxt-tip-delta">{tip.delta}</span>}
          </span>
        </div>
      )}
    </div>
  );
}

/** Side elevation of the kiln on the map's metre scale (machine-drawing kit). */
function KilnElevation({ status, maxZ }: { status: Severity; maxZ: number }) {
  const top = SHELL_Y - SHELL_H / 2;
  const tyreH = SHELL_H + 14;
  return (
    <g aria-hidden="true">
      <line x1={10} x2={996} y1={GROUND} y2={GROUND} stroke={MX.fine} strokeWidth={MX.w} />

      {/* Feed-end housing */}
      <rect x={XT(0) - 38} y={SHELL_Y - 42} width={42} height={84} rx={6} {...PAINT.body} />
      <rect x={XT(0) - 30} y={SHELL_Y - 28} width={18} height={24} rx={3} {...PAINT.recess} />
      <rect x={XT(0) - 32} y={SHELL_Y + 42} width={30} height={GROUND - SHELL_Y - 42} {...PAINT.body} />

      {/* Shell */}
      <rect x={XT(0)} y={top} width={PWD} height={SHELL_H} rx={3} {...PAINT.cylinder} />
      <line x1={XT(0) + 4} x2={XT(SHELL_LEN) - 4} y1={top + 5} y2={top + 5} {...PAINT.hair} />

      {/* Girth gear and pinion */}
      <rect x={XT(SHELL_GIRTH) - 5} y={top - 12} width={10} height={SHELL_H + 24} rx={2} {...PAINT.body} />
      {Array.from({ length: 9 }, (_, n) => top - 8 + n * ((SHELL_H + 16) / 8)).map((y) => (
        <line key={y} x1={XT(SHELL_GIRTH) - 5} x2={XT(SHELL_GIRTH) + 5} y1={y} y2={y} {...PAINT.hair} />
      ))}
      <circle cx={XT(SHELL_GIRTH)} cy={SHELL_Y + SHELL_H / 2 + 19} r={7} {...PAINT.shaft} />
      <rect x={XT(SHELL_GIRTH) - 15} y={SHELL_Y + SHELL_H / 2 + 26} width={30} height={GROUND - SHELL_Y - SHELL_H / 2 - 26} rx={2} {...PAINT.body} />

      {/* Tyres on support rollers */}
      {SHELL_TYRES.map((t) => {
        const cx = XT(t.z + 0.25);
        const ry = SHELL_Y + tyreH / 2 + 6;
        return (
          <g key={t.label}>
            <rect x={XT(t.z - 0.25)} y={SHELL_Y - tyreH / 2} width={PX_PER_M} height={tyreH} rx={2} {...PAINT.shaft} />
            <circle cx={cx - 11} cy={ry} r={6.5} {...PAINT.shaft} />
            <circle cx={cx + 11} cy={ry} r={6.5} {...PAINT.shaft} />
            <rect x={cx - 25} y={ry + 5} width={50} height={GROUND - ry - 5} rx={3} {...PAINT.body} />
            <Bolt x={cx - 19} y={GROUND - 4} r={1.6} />
            <Bolt x={cx + 19} y={GROUND - 4} r={1.6} />
          </g>
        );
      })}

      {/* Burner hood */}
      <rect x={XT(SHELL_LEN) - 4} y={SHELL_Y - 50} width={34} height={100} rx={6} {...PAINT.body} />
      <rect x={XT(SHELL_LEN) + 4} y={SHELL_Y - 21} width={17} height={42} rx={3} {...PAINT.recess} />
      <rect x={XT(SHELL_LEN) + 6} y={SHELL_Y - 17} width={13} height={34} rx={2} fill={MX.heat} />
      <rect x={XT(SHELL_LEN) + 2} y={SHELL_Y + 50} width={24} height={GROUND - SHELL_Y - 50} {...PAINT.body} />

      {/* CAL-KLN-03 pad at the hottest section */}
      <MachinePad x={XT(maxZ)} y={SHELL_Y} status={status} scale={0.9} />
    </g>
  );
}

/* ------------------------------------------------------------------ */
/* Scale, profile, polar                                               */
/* ------------------------------------------------------------------ */

function HeatScale() {
  const W = 420;
  const X = (v: number) => ((v - HEAT_LO) / (HEAT_HI - HEAT_LO)) * W;
  const gradId = `thm-scale${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  return (
    <svg viewBox={`-6 0 ${W + 34} 30`} className="thm-scale" role="img" aria-label={`Thermal scale ${HEAT_LO} to ${HEAT_HI} °C, alert ${SHELL_ALERT}, danger ${SHELL_DANGER}`}>
      <defs>
        <linearGradient id={gradId}>
          {HEAT_STOPS.map((v) => (
            <stop key={v} offset={`${((v - HEAT_LO) / (HEAT_HI - HEAT_LO)) * 100}%`} style={{ stopColor: `var(--heat-${v})` }} />
          ))}
        </linearGradient>
      </defs>
      <rect x={0} y={5} width={W} height={4} rx={2} fill={`url(#${gradId})`} />
      <rect x={X(SHELL_ALERT) - 1} y={1} width={2} height={12} rx={1} className="thm-scale-limit" data-tone="warn" />
      <rect x={X(SHELL_DANGER) - 1} y={1} width={2} height={12} rx={1} className="thm-scale-limit" data-tone="bad" />
      {[150, 250, 350, 450].map((v) => (
        <text key={v} x={X(v)} y={26} textAnchor="middle" className="dxt-tick">
          {v}
        </text>
      ))}
      <text x={X(SHELL_ALERT)} y={26} textAnchor="middle" className="dxt-tick thm-tick-tone" data-tone="warn">
        {SHELL_ALERT}
      </text>
      <text x={X(SHELL_DANGER)} y={26} textAnchor="middle" className="dxt-tick thm-tick-tone" data-tone="bad">
        {SHELL_DANGER}
      </text>
      <text x={W + 8} y={10} className="dxt-tick">
        °C
      </text>
    </svg>
  );
}

function ProfileChart({ map }: { map: ShellMap }) {
  const h = 300;
  const pt = 10;
  const pb = 30;
  const lo = 150;
  const hi = Math.max(500, Math.ceil((map.max + 20) / 50) * 50);
  const Y = (v: number) => pt + (h - pt - pb) * (1 - (v - lo) / (hi - lo));
  const path = (arr: Array<number | null>) => {
    let d = "";
    let pen = false;
    arr.forEach((v, i) => {
      if (v == null) {
        pen = false;
        return;
      }
      d += `${pen ? "L" : "M"}${XT(i * SHELL_DZ).toFixed(1)},${Y(v).toFixed(1)}`;
      pen = true;
    });
    return d;
  };
  const grid: number[] = [];
  for (let v = lo; v <= hi; v += 50) grid.push(v);
  const bottom = h - pb;

  return (
    <svg viewBox={`0 0 1000 ${h}`} className="thm-svg dxt-svg" role="img" aria-label="Shell temperature along the kiln: section maximum, mean and model">
      <rect x={PX0} y={Y(SHELL_DANGER)} width={PWD} height={Y(SHELL_ALERT) - Y(SHELL_DANGER)} className="thm-band" data-tone="warn" />
      <rect x={PX0} y={pt} width={PWD} height={Y(SHELL_DANGER) - pt} className="thm-band" data-tone="bad" />
      {grid.map((v) => (
        <g key={v}>
          <line x1={PX0} x2={PX0 + PWD} y1={Y(v)} y2={Y(v)} className="dxt-gridline" />
          <text x={PX0 - 8} y={Y(v) + 4} textAnchor="end" className="dxt-tick">
            {v}
          </text>
        </g>
      ))}
      {SHELL_ZONES.slice(1).map((zn) => (
        <line key={zn.name} x1={XT(zn.from)} x2={XT(zn.from)} y1={pt} y2={bottom} className="thm-zone-line" />
      ))}
      {SHELL_ZONES.map((zn) => (
        <text key={zn.name} x={(XT(zn.from) + XT(zn.to)) / 2} y={pt + 14} textAnchor="middle" className="dxt-tick thm-zone-label">
          {zn.name}
        </text>
      ))}
      <line x1={PX0} x2={PX0 + PWD} y1={bottom} y2={bottom} className="dxt-axis" />
      {Array.from({ length: 8 }, (_, n) => n * 10)
        .filter((z) => z <= SHELL_LEN)
        .map((z) => (
          <text key={z} x={XT(z)} y={h - 10} textAnchor="middle" className="dxt-tick">
            {z} m
          </text>
        ))}
      <path d={path(map.model)} className="thm-line-model" />
      <path d={path(map.colMean)} className="thm-line-mean" />
      <path d={path(map.colMax)} className="dxt-line" />
      <circle cx={XT(map.maxZ)} cy={Y(map.max)} r={4} className="dxt-end" />
    </svg>
  );
}

function PolarChart({ map, status }: { map: ShellMap; status: Severity }) {
  const c = 150;
  const R = (v: number) => 18 + Math.max(0, Math.min(1, (v - HEAT_LO) / (HEAT_HI - HEAT_LO))) * 110;
  const pts: string[] = [];
  const model: string[] = [];
  for (let k = 0; k < SHELL_NA; k++) {
    const th = ((k * SHELL_DA + SHELL_DA / 2) / 180) * Math.PI;
    const rm = R(map.model[map.maxI]);
    model.push(`${(c + rm * Math.sin(th)).toFixed(1)},${(c - rm * Math.cos(th)).toFixed(1)}`);
    const j = map.maxI * SHELL_NA + k;
    if (map.mask[j]) continue;
    const r = R(map.temp[j]);
    pts.push(`${(c + r * Math.sin(th)).toFixed(1)},${(c - r * Math.cos(th)).toFixed(1)}`);
  }
  return (
    <svg viewBox="-20 -16 340 332" className="thm-polar" role="img" aria-label={`Temperature around the shell at ${map.maxZ.toFixed(1)} m`} data-tone={TONE[status]}>
      {[200, 300].map((v) => (
        <g key={v}>
          <circle cx={c} cy={c} r={R(v)} className="dxt-gridline thm-ring" />
          <text x={c - R(v) * 0.71 - 3} y={c + R(v) * 0.71 + 12} textAnchor="end" className="dxt-tick">
            {v}
          </text>
        </g>
      ))}
      <circle cx={c} cy={c} r={R(SHELL_ALERT)} className="thm-ring-limit" data-tone="warn" />
      <circle cx={c} cy={c} r={R(SHELL_DANGER)} className="thm-ring-limit" data-tone="bad" />
      <line x1={c} x2={c} y1={c - 132} y2={c + 132} className="dxt-gridline" />
      <line x1={c - 132} x2={c + 132} y1={c} y2={c} className="dxt-gridline" />
      {[0, 90, 180, 270].map((a) => {
        const th = (a / 180) * Math.PI;
        return (
          <text key={a} x={c + 144 * Math.sin(th)} y={c - 144 * Math.cos(th) + 4} textAnchor="middle" className="dxt-tick">
            {a}°
          </text>
        );
      })}
      <polygon points={model.join(" ")} className="thm-polar-model" />
      {pts.length > 2 && <polygon points={pts.join(" ")} className="thm-polar-shape" />}
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Registers                                                           */
/* ------------------------------------------------------------------ */

/** Value against the alert / danger limits on a common 150–520 °C scale. */
function LimitBar({ value }: { value: number }) {
  const W = 120;
  const x = (v: number) => 4 + Math.max(0, Math.min(1, (v - HEAT_LO) / (HEAT_HI - HEAT_LO))) * (W - 8);
  const tone = tempTone(value);
  return (
    <svg className="dxo-limit-bar" viewBox={`0 0 ${W} 14`} role="img" aria-label={`${fmt0(value)} °C; alert ${SHELL_ALERT}, danger ${SHELL_DANGER} °C`}>
      <rect x="4" y="6" width={W - 8} height="2" rx="1" className="thm-bar-track" />
      <rect x={x(SHELL_ALERT) - 1} y="2" width="2" height="10" rx="1" className="thm-scale-limit" data-tone="warn" />
      <rect x={x(SHELL_DANGER) - 1} y="2" width="2" height="10" rx="1" className="thm-scale-limit" data-tone="bad" />
      <circle cx={x(value)} cy="7" r="4" className="thm-bar-dot" data-tone={tone} />
    </svg>
  );
}

function ZoneTable({ zones }: { zones: ShellZoneStats[] }) {
  return (
    <div className="dxo-table-wrap">
      <table className="dxo-table thm-table">
        <thead>
          <tr>
            <th>Zone</th>
            <th className="is-right">Mean</th>
            <th className="is-right">Model</th>
            <th className="is-right">Δ</th>
            <th className="is-right">Max</th>
            <th>Against limits</th>
            <th className="is-right">≥ {SHELL_ALERT} °C</th>
          </tr>
        </thead>
        <tbody>
          {zones.map((z) => {
            const d = z.mean - z.model;
            const tone = tempTone(z.max);
            return (
              <tr key={z.name} className="thm-row">
                <td>
                  <span className="dxo-ident">
                    <span className={`dxo-badge ${tone === "good" ? "" : `is-${tone}`}`}>{ICON.zone}</span>
                    <span>
                      <span className="dxo-primary-text">{z.name}</span>
                      <span className="dxo-secondary-text">
                        {z.from}–{z.to} m
                      </span>
                    </span>
                  </span>
                </td>
                <td className="is-right">
                  <span className="dxo-readout">
                    <strong>{fmt0(z.mean)}</strong>
                    <span>°C</span>
                  </span>
                </td>
                <td className="is-right">
                  <span className="dxo-readout">
                    {fmt0(z.model)}
                    <span>°C</span>
                  </span>
                </td>
                <td className="is-right">
                  <span className={`dxo-readout ${Math.abs(d) > 20 ? "is-warn" : ""}`}>
                    <strong>{Number.isFinite(d) ? signed(d) : "—"}</strong>
                    <span>K</span>
                  </span>
                </td>
                <td className="is-right">
                  <span className={`dxo-readout ${tone === "good" ? "" : `is-${tone}`}`}>
                    <strong>{fmt0(z.max)}</strong>
                    <span>°C</span>
                  </span>
                </td>
                <td>
                  <LimitBar value={z.max} />
                </td>
                <td className="is-right">
                  <span className="dxo-readout">
                    {z.pAbove.toFixed(1)}
                    <span>%</span>
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

function FindingsTable({ rules }: { rules: RuleState[] }) {
  return (
    <div className="dxo-table-wrap">
      <table className="dxo-table thm-table">
        <thead>
          <tr>
            <th>Finding</th>
            <th>State</th>
            <th className="is-right">Confidence</th>
            <th>Evidence</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {rules.map((r) => {
            const active = r.status === "ACTIVE";
            const tone = active ? TONE[r.severity] : "neutral";
            return (
              <tr key={r.id} className="thm-row">
                <td>
                  <span className="dxo-ident">
                    <span className={`dxo-badge ${tone === "warn" || tone === "bad" ? `is-${tone}` : ""}`}>{ICON.rule}</span>
                    <span>
                      <span className="dxo-primary-text">{r.name}</span>
                      <span className="dxo-secondary-text">{r.id}</span>
                    </span>
                  </span>
                </td>
                <td>
                  <span className="ast-chip" data-tone={active ? tone : "idle"}>
                    <span className="ast-chip-dot" />
                    {active ? r.severity : `Pending ${r.persistence}/${r.threshold}`}
                  </span>
                </td>
                <td className="is-right">
                  <span className="dxo-readout">
                    <strong>{r.confidence}</strong>
                    <span>%</span>
                  </span>
                </td>
                <td>
                  <span className="dxo-secondary-text thm-wrap">{r.evidence}</span>
                </td>
                <td>
                  <span className="dxo-secondary-text thm-wrap">{active ? r.action : "—"}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
