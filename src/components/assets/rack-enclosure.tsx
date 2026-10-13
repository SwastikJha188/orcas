"use client";

import React from "react";
import type { MachineRackInfo } from "./rack-data";
import {
  EurocardModule,
  STATE_COLOR,
  RACK_HP,
  PSU_HP,
  CPU_HP,
  SLOT_HP,
  type SlotState,
} from "./eurocard-module";

export interface RackEnclosureProps {
  rack: MachineRackInfo;
  selectedPosition: number | null;
  selectedChannel?: string | null;
  onSelectPosition: (position: number) => void;
  psuState: SlotState;
  psuVolts: number[];
  ptpState: SlotState;
}

/* Chassis geometry — 1 HP (5.08 mm) = 10 units; 3U panel = 128.5 mm ≈ 253 units. */
const U = 10;
const EAR = 34;
const TOP = 20;
const RAIL = 10;
const PANEL_H = 253;
const WELL_W = RACK_HP * U;
const VB_W = WELL_W + EAR * 2;
const MOD_Y = TOP + RAIL + 1;
const VB_H = MOD_Y + PANEL_H + RAIL + 8;

const RAIL_HOLES = Array.from({ length: RACK_HP / 2 + 1 }, (_, i) => EAR + i * 2 * U);

function FixedUnit({
  x,
  w,
  label,
  state,
  children,
}: {
  x: number;
  w: number;
  label: string;
  state: SlotState;
  children?: React.ReactNode;
}) {
  const cx = x + w / 2;
  return (
    <g aria-hidden="true">
      <rect className="rack-mod-frame is-fixed" x={x + 1} y={MOD_Y} width={w - 2} height={PANEL_H} rx={4} />
      <rect className="rack-mod-line" x={cx - 11} y={MOD_Y + 5} width={22} height={7} rx={3.5} />
      <rect className="rack-mod-line" x={cx - 11} y={MOD_Y + PANEL_H - 12} width={22} height={7} rx={3.5} />
      <circle className="rack-mod-line" cx={cx} cy={MOD_Y + 20} r={2.2} />
      <circle className="rack-mod-line" cx={cx} cy={MOD_Y + PANEL_H - 20} r={2.2} />
      <rect x={x + 10} y={MOD_Y + 28} width={w - 20} height={4} rx={2} style={{ fill: STATE_COLOR[state] }} />
      <text className="rack-mod-type" x={cx} y={MOD_Y + 58} textAnchor="middle">
        {label}
      </text>
      {children}
    </g>
  );
}

export function RackEnclosure({
  rack,
  selectedPosition,
  selectedChannel,
  onSelectPosition,
  psuState,
  psuVolts,
  ptpState,
}: RackEnclosureProps) {
  const psuX = EAR;
  const cpuX = EAR + PSU_HP * U;
  const slotX0 = cpuX + CPU_HP * U;
  const slotW = SLOT_HP * U;
  const positions = Array.from({ length: rack.positions }, (_, i) => i + 1);
  const byPosition = new Map(rack.modules.map((m) => [m.position, m]));

  return (
    <svg
      className="rack-chassis-svg"
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      role="group"
      aria-label={`19 inch 3U sub-rack, ${RACK_HP} HP, ${rack.positions} module positions, ${rack.modules.length} cards. Select a card to inspect it.`}
    >
      {/* Rack ears with mounting slots */}
      {[2, VB_W - EAR + 2].map((ex) => (
        <g key={ex} aria-hidden="true">
          <rect className="rack-ear" x={ex} y={TOP} width={EAR - 4} height={VB_H - TOP - 6} rx={4} />
          <rect className="rack-ear-hole" x={ex + (EAR - 4) / 2 - 7} y={TOP + 16} width={14} height={8} rx={4} />
          <rect className="rack-ear-hole" x={ex + (EAR - 4) / 2 - 7} y={VB_H - 30} width={14} height={8} rx={4} />
        </g>
      ))}

      {/* Sub-rack well and guide rails */}
      <rect className="rack-well" x={EAR} y={TOP} width={WELL_W} height={VB_H - TOP - 6} rx={3} aria-hidden="true" />
      <g aria-hidden="true">
        <line className="rack-rail" x1={EAR} x2={EAR + WELL_W} y1={TOP + RAIL} y2={TOP + RAIL} />
        <line className="rack-rail" x1={EAR} x2={EAR + WELL_W} y1={MOD_Y + PANEL_H + 1} y2={MOD_Y + PANEL_H + 1} />
        {RAIL_HOLES.map((hx) => (
          <React.Fragment key={hx}>
            <circle className="rack-rail-hole" cx={hx} cy={TOP + RAIL / 2} r={1.3} />
            <circle className="rack-rail-hole" cx={hx} cy={MOD_Y + PANEL_H + RAIL / 2 + 1} r={1.3} />
          </React.Fragment>
        ))}
      </g>

      {/* Slot numbers */}
      <g aria-hidden="true">
        <text className="rack-slot-num" x={psuX + (PSU_HP * U) / 2} y={13} textAnchor="middle">
          PSU
        </text>
        <text className="rack-slot-num" x={cpuX + (CPU_HP * U) / 2} y={13} textAnchor="middle">
          CPU
        </text>
        {positions.map((p) => (
          <text
            key={p}
            className={`rack-slot-num ${selectedPosition === p ? "is-selected" : ""}`}
            x={slotX0 + (p - 1) * slotW + slotW / 2}
            y={13}
            textAnchor="middle"
          >
            {String(p).padStart(2, "0")}
          </text>
        ))}
      </g>

      {/* Power supply — 8 HP */}
      <FixedUnit x={psuX} w={PSU_HP * U} label="PSU" state={psuState}>
        {psuVolts.map((v, i) => (
          <text key={i} className="rack-mod-temp" x={psuX + (PSU_HP * U) / 2} y={MOD_Y + 92 + i * 18} textAnchor="middle">
            {v.toFixed(1)} V
          </text>
        ))}
      </FixedUnit>

      {/* Controller / PTP slave — 4 HP */}
      <FixedUnit x={cpuX} w={CPU_HP * U} label="CPU" state={ptpState}>
        {[0, 1].map((i) => (
          <rect
            key={i}
            className="rack-mod-line"
            x={cpuX + (CPU_HP * U) / 2 - 8}
            y={MOD_Y + 104 + i * 24}
            width={16}
            height={13}
            rx={2}
          />
        ))}
      </FixedUnit>

      {/* 12 module positions — 6 HP each; one card per registry card */}
      {positions.map((p) => (
        <EurocardModule
          key={p}
          module={byPosition.get(p)}
          position={p}
          x={slotX0 + (p - 1) * slotW}
          y={MOD_Y}
          w={slotW}
          h={PANEL_H}
          isSelected={selectedPosition === p}
          selectedChannel={selectedPosition === p ? selectedChannel : null}
          onSelect={onSelectPosition}
        />
      ))}
    </svg>
  );
}
