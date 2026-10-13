"use client";

import React, { useState } from "react";
import { SealTimeSeriesPoint, KilnSealsSensorData } from "./kiln-seals-types";

export interface KilnSealsGraphsProps {
  timeSeries: SealTimeSeriesPoint[];
  currentData: KilnSealsSensorData;
}

type GraphTab = "o2" | "temp" | "hood" | "overlap";

export function KilnSealsGraphs({ timeSeries, currentData }: KilnSealsGraphsProps) {
  const [activeTab, setActiveTab] = useState<GraphTab>("o2");

  if (!timeSeries.length) {
    return <div style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Initializing real-time telemetry buffer...</div>;
  }

  // Statistical calculations for active graph
  const points = timeSeries;

  return (
    <div
      style={{
        background: "var(--widget-glass-bg)",
        backdropFilter: "var(--card-glass-filter)",
        WebkitBackdropFilter: "var(--card-glass-filter)",
        borderRadius: "var(--corner-widget, 22px)",
        border: "1px solid var(--widget-border)",
        boxShadow: "var(--widget-shadow)",
        padding: "20px 22px",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      {/* Top Controls: Tabs & Live Pulse */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "10px",
          width: "100%",
          maxWidth: "100%",
          minWidth: 0,
          boxSizing: "border-box",
        }}
      >
        <div style={{ minWidth: 0, flex: "1 1 240px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "var(--status-success)",
                animation: "pulse 1.8s infinite",
                flexShrink: 0,
              }}
            />
            <h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 600, color: "var(--dx-ink)", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
              Live Telemetry & Reference Model Graphs
            </h3>
          </div>
          <p style={{ margin: "3px 0 0 0", fontSize: "0.78rem", color: "var(--text-muted)" }}>
            Real-time sensor feed compared against healthy-kiln cause-and-effect model (D5 Table 9.5)
          </p>
        </div>

        {/* Tab Pills */}
        <div
          style={{
            display: "flex",
            background: "var(--hover-faint)",
            borderRadius: "9999px",
            padding: "3px",
            maxWidth: "100%",
            minWidth: 0,
            overflowX: "auto",
            overflowY: "hidden",
            boxSizing: "border-box",
            scrollbarWidth: "none",
            flexShrink: 1,
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("o2")}
            style={{
              background: activeTab === "o2" ? "var(--pill-active-bg)" : "transparent",
              color: activeTab === "o2" ? "var(--dx-ink)" : "var(--text-muted)",
              border: "none",
              borderRadius: "9999px",
              padding: "5px 12px",
              fontSize: "0.76rem",
              fontWeight: 500,
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            Inlet O₂ vs Model
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("temp")}
            style={{
              background: activeTab === "temp" ? "var(--pill-active-bg)" : "transparent",
              color: activeTab === "temp" ? "var(--dx-ink)" : "var(--text-muted)",
              border: "none",
              borderRadius: "9999px",
              padding: "5px 12px",
              fontSize: "0.76rem",
              fontWeight: 500,
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            Inlet Temp vs Model
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("hood")}
            style={{
              background: activeTab === "hood" ? "var(--pill-active-bg)" : "transparent",
              color: activeTab === "hood" ? "var(--dx-ink)" : "var(--text-muted)",
              border: "none",
              borderRadius: "9999px",
              padding: "5px 12px",
              fontSize: "0.76rem",
              fontWeight: 500,
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            Hood Pressure & Fan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("overlap")}
            style={{
              background: activeTab === "overlap" ? "var(--pill-active-bg)" : "transparent",
              color: activeTab === "overlap" ? "var(--dx-ink)" : "var(--text-muted)",
              border: "none",
              borderRadius: "9999px",
              padding: "5px 12px",
              fontSize: "0.76rem",
              fontWeight: 500,
              cursor: "pointer",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            Overlap Margin & LVDT
          </button>
        </div>
      </div>

      {/* Render Active Chart */}
      {activeTab === "o2" && (
        <ChartO2VsModel
          points={points}
          currentData={currentData}
        />
      )}

      {activeTab === "temp" && (
        <ChartTempVsModel
          points={points}
          currentData={currentData}
        />
      )}

      {activeTab === "hood" && (
        <ChartHoodAndFan
          points={points}
          currentData={currentData}
        />
      )}

      {activeTab === "overlap" && (
        <ChartOverlapAndLvdt
          points={points}
          currentData={currentData}
        />
      )}

      {/* Statistical Baseline Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: "10px",
          borderTop: "1px solid var(--dx-line)",
          paddingTop: "12px",
        }}
      >
        <StatCard
          label="Inlet False Air (CAL-06)"
          value={`+${currentData.falseAirIndex.toFixed(2)} vol%`}
          subtext="Normal: < 0.30 vol%"
          status={currentData.falseAirIndex >= 1.0 ? "Alarm" : currentData.falseAirIndex >= 0.3 ? "Warning" : "Normal"}
        />
        <StatCard
          label="O₂ Residual (Δ to Model)"
          value={`${currentData.gasO2Residual > 0 ? "+" : ""}${currentData.gasO2Residual.toFixed(2)} vol%`}
          subtext={`Model: ${currentData.gasO2Model.toFixed(2)}%`}
          status={Math.abs(currentData.gasO2Residual) > 0.5 ? "Warning" : "Normal"}
        />
        <StatCard
          label="Inlet Temp Quench (ΔT)"
          value={`${currentData.inletGasTempResidual} K`}
          subtext={`Model: ${currentData.inletGasTempModel} °C`}
          status={currentData.inletGasTempResidual < -30 ? "Warning" : "Normal"}
        />
        <StatCard
          label="Hood Pressure (PRS-03)"
          value={`${currentData.hoodPressure > 0 ? "+" : ""}${currentData.hoodPressure.toFixed(2)} mbar`}
          subtext="Alert: > 0.0 mbar"
          status={currentData.hoodPressure > 0.3 ? "Alarm" : currentData.hoodPressure > 0 ? "Warning" : "Normal"}
        />
        <StatCard
          label="Seal Overlap (CAL-07)"
          value={`${currentData.sealOverlapMargin.toFixed(1)} mm`}
          subtext="Warning: < 10 mm"
          status={currentData.sealOverlapMargin < 5 ? "Alarm" : currentData.sealOverlapMargin < 10 ? "Warning" : "Normal"}
        />
        <StatCard
          label="LVDT Thrust Float"
          value={`${currentData.lvdtPosition > 0 ? "+" : ""}${currentData.lvdtPosition.toFixed(1)} mm`}
          subtext="Nominal: ±20 mm"
          status={Math.abs(currentData.lvdtPosition) > 30 ? "Warning" : "Normal"}
        />
      </div>
    </div>
  );
}

// Helper: Catmull-Rom to cubic Bezier curve
function buildCubicPath(pts: Array<{ x: number; y: number }>): string {
  if (pts.length === 0) return "";
  if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

// ----------------------------------------------------------------------------
// CHART 1: INLET O2 VS REFERENCE MODEL
// ----------------------------------------------------------------------------
function ChartO2VsModel({
  points,
  currentData,
}: {
  points: SealTimeSeriesPoint[];
  currentData: KilnSealsSensorData;
}) {
  const chartW = 860;
  const chartH = 180;
  const padL = 45;
  const padR = 25;
  const padT = 20;
  const padB = 30;
  const effW = chartW - padL - padR;
  const effH = chartH - padT - padB;

  const minVal = 0.5;
  const maxVal = 6.0;

  const getY = (val: number) => {
    const clamped = Math.max(minVal, Math.min(maxVal, val));
    return padT + effH - ((clamped - minVal) / (maxVal - minVal)) * effH;
  };

  const getX = (idx: number) => {
    return padL + (idx / Math.max(1, points.length - 1)) * effW;
  };

  const o2Pts = points.map((p, i) => ({ x: getX(i), y: getY(p.gasO2) }));
  const modelPts = points.map((p, i) => ({ x: getX(i), y: getY(p.gasO2Model) }));

  const o2Path = buildCubicPath(o2Pts);
  const modelPath = buildCubicPath(modelPts);
  const lastO2 = o2Pts[o2Pts.length - 1];

  // False Air Area between model and measured
  const areaPath = `${o2Path} L ${getX(points.length - 1)},${getY(minVal)} L ${getX(0)},${getY(minVal)} Z`;
  const isAlert = currentData.falseAirIndex > 0.3;
  const lineColor = isAlert ? "var(--status-danger)" : "var(--status-success)";

  return (
    <div style={{ width: "100%", height: "200px", position: "relative" }}>
      <svg
        viewBox={`0 0 ${chartW} ${chartH}`}
        style={{ width: "100%", height: "100%", overflow: "visible" }}
      >
        <defs>
          <linearGradient id="o2-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.28" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[1.0, 2.0, 3.0, 4.0, 5.0].map((v) => (
          <g key={v}>
            <line x1={padL} y1={getY(v)} x2={chartW - padR} y2={getY(v)} stroke="var(--dx-line)" strokeWidth="1" strokeDasharray="3 3" />
            <text x={padL - 8} y={getY(v) + 3} textAnchor="end" fill="var(--text-muted)" fontSize="9" fontFamily="var(--font-ui)">
              {v.toFixed(1)}%
            </text>
          </g>
        ))}

        {/* Alarm Thresholds */}
        <line x1={padL} y1={getY(5.0)} x2={chartW - padR} y2={getY(5.0)} stroke="var(--status-danger)" strokeOpacity={0.4} strokeWidth="1" strokeDasharray="4 4" />
        <text x={chartW - padR} y={getY(5.0) - 4} textAnchor="end" fill="var(--status-danger)" fontSize="8" fontWeight="600">
          ALARM LIMIT (5.0 vol%)
        </text>

        {/* Area fill */}
        <path d={areaPath} fill="url(#o2-fill)" />

        {/* Expected Model Line (Cyan Dashed) */}
        <path d={modelPath} fill="none" stroke="var(--signal-blue)" strokeWidth="2" strokeDasharray="5 3" />

        {/* Measured O2 Line (Red/Emerald) */}
        <path
          d={o2Path}
          fill="none"
          stroke={lineColor}
          strokeWidth="2.8"
          strokeLinecap="round"
        />

        {/* Glowing Cursor Marker */}
        {lastO2 && (
          <g>
            <circle cx={lastO2.x} cy={lastO2.y} r="8" fill={lineColor} opacity="0.2" />
            <circle cx={lastO2.x} cy={lastO2.y} r="4" fill="var(--dx-ink)" stroke={lineColor} strokeWidth="2" />
          </g>
        )}

        {/* Time labels */}
        {points.map((p, i) => {
          if (i % 12 !== 0 && i !== points.length - 1) return null;
          return (
            <text key={i} x={getX(i)} y={chartH - 8} textAnchor="middle" fill="var(--text-muted)" fontSize="8.5" fontFamily="var(--font-ui)">
              {p.time}
            </text>
          );
        })}

        {/* Legend */}
        <g transform={`translate(${padL + 10}, 15)`}>
          <line x1="0" y1="0" x2="18" y2="0" stroke={lineColor} strokeWidth="2.5" />
          <text x="24" y="3" fill="var(--dx-ink)" fontSize="9" fontWeight="500">
            GAS-KLN-01 Measured ({currentData.gasO2.toFixed(2)} vol%)
          </text>
          <line x1="180" y1="0" x2="198" y2="0" stroke="var(--signal-blue)" strokeWidth="2" strokeDasharray="4 2" />
          <text x="204" y="3" fill="var(--signal-blue)" fontSize="9" fontWeight="500">
            Reference Model ({currentData.gasO2Model.toFixed(2)} vol%)
          </text>
        </g>
      </svg>
    </div>
  );
}

// ----------------------------------------------------------------------------
// CHART 2: INLET GAS TEMPERATURE VS MODEL
// ----------------------------------------------------------------------------
function ChartTempVsModel({
  points,
  currentData,
}: {
  points: SealTimeSeriesPoint[];
  currentData: KilnSealsSensorData;
}) {
  const chartW = 860;
  const chartH = 180;
  const padL = 48;
  const padR = 25;
  const padT = 20;
  const padB = 30;
  const effW = chartW - padL - padR;
  const effH = chartH - padT - padB;

  const minVal = 900;
  const maxVal = 1200;

  const getY = (val: number) => {
    const clamped = Math.max(minVal, Math.min(maxVal, val));
    return padT + effH - ((clamped - minVal) / (maxVal - minVal)) * effH;
  };

  const getX = (idx: number) => {
    return padL + (idx / Math.max(1, points.length - 1)) * effW;
  };

  const tempPts = points.map((p, i) => ({ x: getX(i), y: getY(p.inletGasTemp) }));
  const modelPts = points.map((p, i) => ({ x: getX(i), y: getY(p.inletGasTempModel) }));

  const tempPath = buildCubicPath(tempPts);
  const modelPath = buildCubicPath(modelPts);
  const lastTemp = tempPts[tempPts.length - 1];
  const areaPath = `${tempPath} L ${getX(points.length - 1)},${getY(minVal)} L ${getX(0)},${getY(minVal)} Z`;
  const lineColor = currentData.inletGasTemp < 950 ? "var(--status-warning)" : "var(--status-success)";

  return (
    <div style={{ width: "100%", height: "200px", position: "relative" }}>
      <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: "100%", height: "100%", overflow: "visible" }}>
        <defs>
          <linearGradient id="temp-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {[950, 1000, 1050, 1100, 1150].map((v) => (
          <g key={v}>
            <line x1={padL} y1={getY(v)} x2={chartW - padR} y2={getY(v)} stroke="var(--dx-line)" strokeWidth="1" strokeDasharray="3 3" />
            <text x={padL - 8} y={getY(v) + 3} textAnchor="end" fill="var(--text-muted)" fontSize="9" fontFamily="var(--font-ui)">
              {v}°C
            </text>
          </g>
        ))}

        {/* Warning limit at 950 C */}
        <line x1={padL} y1={getY(950)} x2={chartW - padR} y2={getY(950)} stroke="var(--status-warning)" strokeOpacity={0.4} strokeWidth="1" strokeDasharray="4 4" />
        <text x={chartW - padR} y={getY(950) - 4} textAnchor="end" fill="var(--status-warning)" fontSize="8" fontWeight="600">
          QUENCH WARNING LIMIT (950 °C)
        </text>

        {/* Radiant Area fill */}
        <path d={areaPath} fill="url(#temp-fill)" />

        <path d={modelPath} fill="none" stroke="var(--signal-blue)" strokeWidth="2" strokeDasharray="5 3" />
        <path
          d={tempPath}
          fill="none"
          stroke={lineColor}
          strokeWidth="2.8"
          strokeLinecap="round"
        />

        {/* Glowing Cursor Marker */}
        {lastTemp && (
          <g>
            <circle cx={lastTemp.x} cy={lastTemp.y} r="8" fill={lineColor} opacity="0.2" />
            <circle cx={lastTemp.x} cy={lastTemp.y} r="4" fill="var(--dx-ink)" stroke={lineColor} strokeWidth="2" />
          </g>
        )}

        {points.map((p, i) => {
          if (i % 12 !== 0 && i !== points.length - 1) return null;
          return (
            <text key={i} x={getX(i)} y={chartH - 8} textAnchor="middle" fill="var(--text-muted)" fontSize="8.5" fontFamily="var(--font-ui)">
              {p.time}
            </text>
          );
        })}

        {/* Legend */}
        <g transform={`translate(${padL + 10}, 15)`}>
          <line x1="0" y1="0" x2="18" y2="0" stroke={lineColor} strokeWidth="2.5" />
          <text x="24" y="3" fill="var(--dx-ink)" fontSize="9" fontWeight="500">
            TMP-KLN-13 Measured ({currentData.inletGasTemp} °C)
          </text>
          <line x1="180" y1="0" x2="198" y2="0" stroke="var(--signal-blue)" strokeWidth="2" strokeDasharray="4 2" />
          <text x="204" y="3" fill="var(--signal-blue)" fontSize="9" fontWeight="500">
            Reference Model ({currentData.inletGasTempModel} °C)
          </text>
        </g>
      </svg>
    </div>
  );
}

// ----------------------------------------------------------------------------
// CHART 3: HOOD PRESSURE & OUTLET SEAL FAN
// ----------------------------------------------------------------------------
function ChartHoodAndFan({
  points,
  currentData,
}: {
  points: SealTimeSeriesPoint[];
  currentData: KilnSealsSensorData;
}) {
  const chartW = 860;
  const chartH = 180;
  const padL = 48;
  const padR = 25;
  const padT = 20;
  const padB = 30;
  const effW = chartW - padL - padR;
  const effH = chartH - padT - padB;

  const minVal = -0.6;
  const maxVal = +0.5;

  const getY = (val: number) => {
    const clamped = Math.max(minVal, Math.min(maxVal, val));
    return padT + effH - ((clamped - minVal) / (maxVal - minVal)) * effH;
  };

  const getX = (idx: number) => {
    return padL + (idx / Math.max(1, points.length - 1)) * effW;
  };

  const hoodPts = points.map((p, i) => ({ x: getX(i), y: getY(p.hoodPressure) }));
  const hoodPath = buildCubicPath(hoodPts);
  const lastHood = hoodPts[hoodPts.length - 1];

  const yZero = getY(0.0);
  const lineColor = currentData.hoodPressure > 0 ? "var(--status-danger)" : "var(--signal-blue)";
  const areaPath = `${hoodPath} L ${getX(points.length - 1)},${getY(minVal)} L ${getX(0)},${getY(minVal)} Z`;

  return (
    <div style={{ width: "100%", height: "200px", position: "relative" }}>
      <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: "100%", height: "100%", overflow: "visible" }}>
        <defs>
          <linearGradient id="hood-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {[-0.4, -0.2, 0.0, +0.2, +0.4].map((v) => (
          <g key={v}>
            <line x1={padL} y1={getY(v)} x2={chartW - padR} y2={getY(v)} stroke="var(--dx-line)" strokeWidth="1" strokeDasharray="3 3" />
            <text x={padL - 8} y={getY(v) + 3} textAnchor="end" fill="var(--text-muted)" fontSize="9" fontFamily="var(--font-ui)">
              {v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1)}
            </text>
          </g>
        ))}

        {/* Zero Line - Danger Boundary for Positive Pressure */}
        <line x1={padL} y1={yZero} x2={chartW - padR} y2={yZero} stroke="var(--status-danger)" strokeOpacity={0.6} strokeWidth="1.5" strokeDasharray="4 4" />
        <text x={chartW - padR} y={yZero - 4} textAnchor="end" fill="var(--status-danger)" fontSize="8" fontWeight="600">
          POSITIVE PRESSURE TRIP (&gt; 0.0 mbar)
        </text>

        {/* Radiant Area fill */}
        <path d={areaPath} fill="url(#hood-fill)" />

        {/* Hood Pressure Line */}
        <path
          d={hoodPath}
          fill="none"
          stroke={lineColor}
          strokeWidth="2.8"
          strokeLinecap="round"
        />

        {/* Glowing Cursor Marker */}
        {lastHood && (
          <g>
            <circle cx={lastHood.x} cy={lastHood.y} r="8" fill={lineColor} opacity="0.2" />
            <circle cx={lastHood.x} cy={lastHood.y} r="4" fill="var(--dx-ink)" stroke={lineColor} strokeWidth="2" />
          </g>
        )}

        {points.map((p, i) => {
          if (i % 12 !== 0 && i !== points.length - 1) return null;
          return (
            <text key={i} x={getX(i)} y={chartH - 8} textAnchor="middle" fill="var(--text-muted)" fontSize="8.5" fontFamily="var(--font-ui)">
              {p.time}
            </text>
          );
        })}

        {/* Legend */}
        <g transform={`translate(${padL + 10}, 15)`}>
          <line x1="0" y1="0" x2="18" y2="0" stroke="var(--signal-blue)" strokeWidth="2.5" />
          <text x="24" y="3" fill="var(--dx-ink)" fontSize="9" fontWeight="500">
            PRS-KLN-03 Hood Pressure ({currentData.hoodPressure > 0 ? "+" : ""}{currentData.hoodPressure.toFixed(2)} mbar)
          </text>
          <circle cx="210" cy="0" r="5" fill={currentData.outletFanStatus === "RUNNING" ? "var(--status-success)" : "var(--status-danger)"} />
          <text x="220" y="3" fill={currentData.outletFanStatus === "RUNNING" ? "var(--status-success)" : "var(--status-danger)"} fontSize="9" fontWeight="600">
            STS-KLN-10 Cooling Fan: {currentData.outletFanStatus}
          </text>
        </g>
      </svg>
    </div>
  );
}

// ----------------------------------------------------------------------------
// CHART 4: SEAL OVERLAP MARGIN & LVDT
// ----------------------------------------------------------------------------
function ChartOverlapAndLvdt({
  points,
  currentData,
}: {
  points: SealTimeSeriesPoint[];
  currentData: KilnSealsSensorData;
}) {
  const chartW = 860;
  const chartH = 180;
  const padL = 48;
  const padR = 25;
  const padT = 20;
  const padB = 30;
  const effW = chartW - padL - padR;
  const effH = chartH - padT - padB;

  const minVal = 0;
  const maxVal = 50;

  const getY = (val: number) => {
    const clamped = Math.max(minVal, Math.min(maxVal, val));
    return padT + effH - ((clamped - minVal) / (maxVal - minVal)) * effH;
  };

  const getX = (idx: number) => {
    return padL + (idx / Math.max(1, points.length - 1)) * effW;
  };

  const overlapPts = points.map((p, i) => ({ x: getX(i), y: getY(p.sealOverlap) }));
  const overlapPath = buildCubicPath(overlapPts);
  const lastOverlap = overlapPts[overlapPts.length - 1];

  const lineColor = currentData.sealOverlapMargin < 5
    ? "var(--status-danger)"
    : currentData.sealOverlapMargin < 10
      ? "var(--status-warning)"
      : "var(--status-success)";
  const areaPath = `${overlapPath} L ${getX(points.length - 1)},${getY(minVal)} L ${getX(0)},${getY(minVal)} Z`;

  return (
    <div style={{ width: "100%", height: "200px", position: "relative" }}>
      <svg viewBox={`0 0 ${chartW} ${chartH}`} style={{ width: "100%", height: "100%", overflow: "visible" }}>
        <defs>
          <linearGradient id="overlap-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={lineColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {[10, 20, 30, 40].map((v) => (
          <g key={v}>
            <line x1={padL} y1={getY(v)} x2={chartW - padR} y2={getY(v)} stroke="var(--dx-line)" strokeWidth="1" strokeDasharray="3 3" />
            <text x={padL - 8} y={getY(v) + 3} textAnchor="end" fill="var(--text-muted)" fontSize="9" fontFamily="var(--font-ui)">
              {v} mm
            </text>
          </g>
        ))}

        {/* Warning threshold: 10 mm */}
        <line x1={padL} y1={getY(10)} x2={chartW - padR} y2={getY(10)} stroke="var(--status-warning)" strokeOpacity={0.5} strokeWidth="1" strokeDasharray="4 4" />
        <text x={chartW - padR} y={getY(10) - 4} textAnchor="end" fill="var(--status-warning)" fontSize="8" fontWeight="600">
          WARNING LIMIT (10 mm)
        </text>

        {/* Alarm threshold: 5 mm */}
        <line x1={padL} y1={getY(5)} x2={chartW - padR} y2={getY(5)} stroke="var(--status-danger)" strokeOpacity={0.5} strokeWidth="1" strokeDasharray="4 4" />
        <text x={chartW - padR} y={getY(5) - 4} textAnchor="end" fill="var(--status-danger)" fontSize="8" fontWeight="600">
          ALARM LIMIT (5 mm · DISENGAGEMENT RISK)
        </text>

        {/* Radiant Area fill */}
        <path d={areaPath} fill="url(#overlap-fill)" />

        {/* Overlap Margin Line */}
        <path
          d={overlapPath}
          fill="none"
          stroke={lineColor}
          strokeWidth="2.8"
          strokeLinecap="round"
        />

        {/* Glowing Cursor Marker */}
        {lastOverlap && (
          <g>
            <circle cx={lastOverlap.x} cy={lastOverlap.y} r="8" fill={lineColor} opacity="0.2" />
            <circle cx={lastOverlap.x} cy={lastOverlap.y} r="4" fill="var(--dx-ink)" stroke={lineColor} strokeWidth="2" />
          </g>
        )}

        {points.map((p, i) => {
          if (i % 12 !== 0 && i !== points.length - 1) return null;
          return (
            <text key={i} x={getX(i)} y={chartH - 8} textAnchor="middle" fill="var(--text-muted)" fontSize="8.5" fontFamily="var(--font-ui)">
              {p.time}
            </text>
          );
        })}

        {/* Legend */}
        <g transform={`translate(${padL + 10}, 15)`}>
          <line x1="0" y1="0" x2="18" y2="0" stroke="var(--status-success)" strokeWidth="2.5" />
          <text x="24" y="3" fill="var(--dx-ink)" fontSize="9" fontWeight="500">
            CAL-KLN-07 Seal Overlap ({currentData.sealOverlapMargin.toFixed(1)} mm)
          </text>
          <text x="210" y="3" fill="var(--signal-blue)" fontSize="9" fontWeight="500">
            POS-KLN-01 LVDT Float: {currentData.lvdtPosition > 0 ? "+" : ""}{currentData.lvdtPosition.toFixed(1)} mm
          </text>
        </g>
      </svg>
    </div>
  );
}

function StatCard({
  label,
  value,
  subtext,
  status,
}: {
  label: string;
  value: string;
  subtext: string;
  status: "Normal" | "Warning" | "Alarm";
}) {
  const isAlarm = status === "Alarm";
  const isWarn = status === "Warning";
  const valColor = isAlarm ? "var(--status-danger)" : isWarn ? "var(--status-warning)" : "var(--dx-ink)";
  const badgeTone = isAlarm ? "var(--status-danger)" : isWarn ? "var(--status-warning)" : "var(--status-success)";
  const badgeBg = `color-mix(in srgb, ${badgeTone} 12%, transparent)`;
  const badgeColor = badgeTone;

  return (
    <div
      style={{
        background: "var(--card-glass-bg)",
        backdropFilter: "var(--card-glass-filter)",
        WebkitBackdropFilter: "var(--card-glass-filter)",
        borderRadius: "var(--corner-card)",
        padding: "14px 16px",
        border: "1px solid var(--card-border)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minHeight: "90px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "6px" }}>
        <span style={{ fontSize: "0.66rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 600, letterSpacing: "0.04em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {label}
        </span>
        <span style={{ fontSize: "0.62rem", color: badgeColor, background: badgeBg, padding: "2px 7px", borderRadius: "var(--corner-pill)", fontWeight: 600, flexShrink: 0 }}>
          {status.toUpperCase()}
        </span>
      </div>
      <div style={{ fontSize: "1.25rem", fontWeight: 700, color: valColor, marginTop: "4px", fontFamily: "var(--font-ui)", lineHeight: 1, letterSpacing: "-0.02em" }}>
        {value}
      </div>
      <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: "4px" }}>{subtext}</div>
    </div>
  );
}
