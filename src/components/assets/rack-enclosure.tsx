"use client";

import React from "react";
import type { CabinetModule, MachineRackInfo } from "@shared/lib/rack-data";
import { Bolt, MachineDefs, kitStyle, useKitId } from "./machine-kit/machine-kit";
import {
  EurocardModule,
  STATE_COLOR,
  rackHp,
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
const MOD_Y = TOP + RAIL + 1;
/** Card brackets under the lower rail. */
const BRACKET_H = 24;
const SHELF_H = MOD_Y + PANEL_H + RAIL + 8 + BRACKET_H;
const SHELF_GAP = 14;
/** Single-channel slots per 3U shelf; longer sources continue on expansion shelves. */
const SHELF_SLOTS = 16;

function FixedUnit({
  x,
  y,
  w,
  label,
  state,
  children,
}: {
  x: number;
  y: number;
  w: number;
  label: string;
  state: SlotState;
  children?: React.ReactNode;
}) {
  const cx = x + w / 2;
  return (
    <g aria-hidden="true">
      <rect className="rack-mod-frame is-fixed" x={x + 1} y={y} width={w - 2} height={PANEL_H} rx={4} />
      <rect className="rack-mod-line" x={cx - 11} y={y + 5} width={22} height={7} rx={3.5} />
      <rect className="rack-mod-line" x={cx - 11} y={y + PANEL_H - 12} width={22} height={7} rx={3.5} />
      <circle className="rack-mod-line" cx={cx} cy={y + 20} r={2.2} />
      <circle className="rack-mod-line" cx={cx} cy={y + PANEL_H - 20} r={2.2} />
      <rect x={x + 10} y={y + 28} width={w - 20} height={4} rx={2} style={{ fill: STATE_COLOR[state] }} />
      <text className="rack-mod-type" x={cx} y={y + 58} textAnchor="middle">
        {label}
      </text>
      {children}
    </g>
  );
}

/** Runs of consecutive positions that belong to the same card. */
function cardRuns(positions: number[], byPosition: Map<number, CabinetModule>) {
  const runs: { code: string; label: string; from: number; to: number }[] = [];
  for (const p of positions) {
    const m = byPosition.get(p);
    const last = runs[runs.length - 1];
    if (!m) continue;
    if (last && last.code === m.code && last.to === p - 1) last.to = p;
    else runs.push({ code: m.code, label: m.model ?? m.code, from: p, to: p });
  }
  return runs;
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
  const shelves = Math.ceil(rack.positions / SHELF_SLOTS);
  const perShelf = shelves > 1 ? SHELF_SLOTS : rack.positions;
  const hp = rackHp(perShelf);
  const WELL_W = hp * U;
  const VB_W = WELL_W + EAR * 2;
  const VB_H = shelves * SHELF_H + (shelves - 1) * SHELF_GAP;
  const RAIL_HOLES = Array.from({ length: Math.floor(hp / 2) + 1 }, (_, i) => EAR + i * 2 * U);
  const psuX = EAR;
  const cpuX = EAR + PSU_HP * U;
  const slotX0 = cpuX + CPU_HP * U;
  const slotW = SLOT_HP * U;
  const byPosition = new Map(rack.modules.map((m) => [m.position, m]));
  const kit = useKitId();

  return (
    <svg
      className="rack-chassis-svg"
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      role="group"
      style={kitStyle(kit)}
      aria-label={`${rack.positions} slots, one sensor each, on ${shelves} ${shelves === 1 ? "shelf" : "shelves"}, ${rack.modules.length} wired. Select a slot to see what is in it.`}
    >
      <MachineDefs id={kit} />
      {Array.from({ length: shelves }, (_, s) => {
        const oy = s * (SHELF_H + SHELF_GAP);
        const my = oy + MOD_Y;
        const bodyH = SHELF_H - BRACKET_H;
        const first = s * perShelf + 1;
        const positions = Array.from({ length: Math.min(perShelf, rack.positions - s * perShelf) }, (_, i) => first + i);
        const runs = cardRuns(positions, byPosition);
        return (
          <g key={s}>
            {/* Rack ears with mounting slots */}
            {[2, VB_W - EAR + 2].map((ex) => (
              <g key={ex} aria-hidden="true">
                <rect className="rack-ear" x={ex} y={oy + TOP} width={EAR - 4} height={bodyH - TOP - 6} rx={4} />
                <rect className="rack-ear-hole" x={ex + (EAR - 4) / 2 - 7} y={oy + TOP + 16} width={14} height={8} rx={4} />
                <rect className="rack-ear-hole" x={ex + (EAR - 4) / 2 - 7} y={oy + bodyH - 30} width={14} height={8} rx={4} />
                <Bolt x={ex + (EAR - 4) / 2} y={oy + TOP + 44} r={3} />
                <Bolt x={ex + (EAR - 4) / 2} y={oy + bodyH - 52} r={3} />
              </g>
            ))}

            {/* Sub-rack well and guide rails */}
            <rect className="rack-well" x={EAR} y={oy + TOP} width={WELL_W} height={bodyH - TOP - 6} rx={3} aria-hidden="true" />
            <g aria-hidden="true">
              <line className="rack-rail" x1={EAR} x2={EAR + WELL_W} y1={oy + TOP + RAIL} y2={oy + TOP + RAIL} />
              <line className="rack-rail" x1={EAR} x2={EAR + WELL_W} y1={my + PANEL_H + 1} y2={my + PANEL_H + 1} />
              {RAIL_HOLES.map((hx) => (
                <React.Fragment key={hx}>
                  <circle className="rack-rail-hole" cx={hx} cy={oy + TOP + RAIL / 2} r={1.3} />
                  <circle className="rack-rail-hole" cx={hx} cy={my + PANEL_H + RAIL / 2 + 1} r={1.3} />
                </React.Fragment>
              ))}
            </g>

            {/* Slot numbers */}
            <g aria-hidden="true">
              <text className="rack-slot-num" x={psuX + (PSU_HP * U) / 2} y={oy + 13} textAnchor="middle">
                {s === 0 ? "PSU" : "EXP"}
              </text>
              {s === 0 && (
                <text className="rack-slot-num" x={cpuX + (CPU_HP * U) / 2} y={oy + 13} textAnchor="middle">
                  CPU
                </text>
              )}
              {positions.map((p, i) => (
                <text
                  key={p}
                  className={`rack-slot-num ${selectedPosition === p ? "is-selected" : ""}`}
                  x={slotX0 + i * slotW + slotW / 2}
                  y={oy + 13}
                  textAnchor="middle"
                >
                  {String(p).padStart(2, "0")}
                </text>
              ))}
            </g>

            {s === 0 ? (
              <>
                {/* Power supply — 8 HP */}
                <FixedUnit x={psuX} y={my} w={PSU_HP * U} label="PSU" state={psuState}>
                  {psuVolts.map((v, i) => (
                    <text key={i} className="rack-mod-temp" x={psuX + (PSU_HP * U) / 2} y={my + 92 + i * 18} textAnchor="middle">
                      {v.toFixed(1)} V
                    </text>
                  ))}
                </FixedUnit>
                {/* Controller / PTP slave — 4 HP */}
                <FixedUnit x={cpuX} y={my} w={CPU_HP * U} label="CPU" state={ptpState}>
                  {[0, 1].map((i) => (
                    <rect key={i} className="rack-mod-line" x={cpuX + (CPU_HP * U) / 2 - 8} y={my + 104 + i * 24} width={16} height={13} rx={2} />
                  ))}
                </FixedUnit>
              </>
            ) : (
              /* Expansion interface — takes the PSU + CPU width on further shelves */
              <FixedUnit x={psuX} y={my} w={(PSU_HP + CPU_HP) * U} label="EXP" state={ptpState}>
                <text className="rack-mod-temp" x={psuX + ((PSU_HP + CPU_HP) * U) / 2} y={my + 78} textAnchor="middle">
                  Shelf {s + 1}
                </text>
              </FixedUnit>
            )}

            {/* Single-channel slots — 6 HP each */}
            {positions.map((p, i) => (
              <EurocardModule
                key={p}
                module={byPosition.get(p)}
                position={p}
                x={slotX0 + i * slotW}
                y={my}
                w={slotW}
                h={PANEL_H}
                isSelected={selectedPosition === p}
                selectedChannel={selectedPosition === p ? selectedChannel : null}
                onSelect={onSelectPosition}
              />
            ))}

            {/* Card brackets: which slots share one card */}
            <g aria-hidden="true">
              {runs.map((r) => {
                const x1 = slotX0 + (r.from - first) * slotW + 4;
                const x2 = slotX0 + (r.to - first + 1) * slotW - 4;
                const by = oy + bodyH + 4;
                return (
                  <g key={`${r.code}-${r.from}`}>
                    <path className="rack-card-bracket" d={`M${x1} ${by} v4 H${x2} v-4`} />
                    <text className="rack-card-label" x={(x1 + x2) / 2} y={by + 17} textAnchor="middle">
                      {x2 - x1 > r.label.length * 6.5 ? r.label : x2 - x1 > r.code.length * 6.5 ? r.code : ""}
                    </text>
                  </g>
                );
              })}
            </g>
          </g>
        );
      })}
    </svg>
  );
}
