"use client";

import React, { useContext, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Beam, Block, Column, PartCtx, Pipe, Platform, Stair, TwinPart, lathe, type TwinPaint } from "./twin-part";
import { finishKitGroup, kitBuilder, type KitMats } from "./machine-kit-3d";

/* ==========================================================================
   KLN-01 rotary kiln, built in real metres from D4-OSW-PE-KLN Rev. 02:
   shell Ø4.8 m × 74 m on a 3.5 % slope; riding tyres at 11, 39 and 60 m;
   girth gear at 17 m (pinion 24 / gear 168); burning zone 40–66 m; three
   support stations × 2 rollers × 2 hydrodynamic bearings (A inlet side, B
   outlet side); hydraulic thrust roller with LVDT and HPU at station 2;
   630 kW motor → 3-stage helical gearbox → pinion, with lube skid and
   auxiliary drive; IR shell scanner; lamella inlet / outlet seals with the
   seal cooling fan; kiln inlet chamber under the riser; firing hood with
   multi-channel burner on its carriage and the two-colour pyrometer.

   x runs along the kiln from the inlet (0) to the outlet (74), y is up,
   +z faces the operator. Paints follow the plant twin's models: concrete
   piers, off-white structural steel, brushed shell, blue machinery.

   Every sensor of the D4 schedule (43 + 3 calculated) has a physical anchor
   below, so pads sit on the bearing, housing or probe they read.
   ========================================================================== */

export type KilnRole = "drv" | "sup" | "shl" | "prc";

const L = 74;
const R = 2.4;
const SLOPE = 0.035;
const A = Math.atan(SLOPE);
const AXIS_IN = 8.2;
export const axisY = (x: number) => AXIS_IN - SLOPE * x;

const STATIONS = [11, 39, 60];
const TYRE_R = 2.9;
const ROLLER_R = 0.75;
const ROLLER_D = TYRE_R + ROLLER_R;
const rollerY = (x: number) => axisY(x) - ROLLER_D * Math.cos(Math.PI / 6);
const ROLLER_Z = ROLLER_D * Math.sin(Math.PI / 6);
const BEARING_DX = 1.3;

const GEAR_X = 17;
const GEAR_R = 3.25;
const PINION_R = 0.45;
const PINION_ANGLE = (35 * Math.PI) / 180;
const PINION_Y = axisY(GEAR_X) - (GEAR_R + PINION_R) * Math.cos(PINION_ANGLE);
const PINION_Z = (GEAR_R + PINION_R) * Math.sin(PINION_ANGLE);

const GBX = { min: [19.9, 2.4, PINION_Z - 1.2] as const, max: [22.5, 5.0, PINION_Z + 1.2] as const };
const MOTOR = { x0: 23.6, x1: 26.2, y: 3.4, z: PINION_Z, r: 0.85 };
const LUBE = { min: [24, 0, 5.0] as const, max: [26, 1.2, 6.2] as const };
const HPU = { x: 42.6, z: 4.9 };
const SCANNER = { x: 48, z: -11, top: 9.8 };
const CHAMBER = { x0: -6, x1: -0.6, y0: 2.6, y1: 13, z: 3.6 };
const HOOD = { x0: 74.6, x1: 79, y0: 1.2, y1: 12.5, z: 4.2 };
const FAN = { x: 72.2, y: 1.6, z: 4.1 };

/** Kiln centre along x, so the twin is framed on the machine, not the inlet. */
export const KILN_CENTRE_X = (CHAMBER.x0 + 88) / 2;

/** Physical point of every scheduled signal (kiln frame, before centring). */
export const KILN_ANCHORS: Record<string, [number, number, number]> = (() => {
  const a: Record<string, [number, number, number]> = {};
  const face = ROLLER_Z + 0.5;
  STATIONS.forEach((xs, s) => {
    const y = rollerY(xs) + 0.2;
    const base = s * 4;
    const tag = (n: number) => `TMP-KLN-${String(base + n).padStart(2, "0")}`;
    a[tag(1)] = [xs - BEARING_DX, y, -face]; // left A
    a[tag(2)] = [xs + BEARING_DX, y, -face]; // left B
    a[tag(3)] = [xs - BEARING_DX, y, face]; // right A
    a[tag(4)] = [xs + BEARING_DX, y, face]; // right B
  });
  const sy = rollerY(39);
  a["PRS-KLN-07"] = [HPU.x, 0.8, HPU.z + 0.65];
  a["POS-KLN-01"] = [41.2, sy - 0.05, 0.3];
  a["POS-KLN-02"] = [42.0, sy - 0.05, 0.3];

  const front = MOTOR.z + MOTOR.r + 0.06;
  a["VIB-KLN-01"] = [MOTOR.x0 + 0.25, MOTOR.y + 0.25, front];
  a["TMP-KLN-19"] = [MOTOR.x0 + 0.25, MOTOR.y - 0.3, front];
  a["TMP-KLN-20"] = [MOTOR.x1 - 0.25, MOTOR.y, front];
  a["TMP-KLN-21"] = [(MOTOR.x0 + MOTOR.x1) / 2 + 0.4, MOTOR.y + MOTOR.r + 0.08, MOTOR.z + 0.3];
  a["ELE-KLN-01"] = [24.5, MOTOR.y + MOTOR.r + 0.55, MOTOR.z + 0.3];
  a["SPD-KLN-01"] = [24.5, MOTOR.y + MOTOR.r + 0.55, MOTOR.z - 0.3];
  const gf = GBX.max[2] + 0.06;
  a["VIB-KLN-02"] = [22.25, 3.3, gf];
  a["TMP-KLN-22"] = [22.25, 2.8, gf];
  a["VIB-KLN-03"] = [20.15, 4.55, gf];
  a["TMP-KLN-23"] = [20.15, 4.05, gf];
  a["TMP-KLN-15"] = [20.3, 2.75, gf];
  a["STS-KLN-11"] = [21.2, 3.0, GBX.max[2] + 1.4];
  a["VIB-KLN-04"] = [GEAR_X + 0.75, PINION_Y + 0.35, PINION_Z + 0.45];
  a["STS-KLN-05"] = [GEAR_X, axisY(GEAR_X) + GEAR_R + 0.95, 1.6];
  const lf = LUBE.max[2] + 0.06;
  a["LEV-KLN-01"] = [24.4, 0.85, lf];
  a["PRS-KLN-04"] = [25.0, 0.85, lf];
  a["FLO-KLN-05"] = [25.6, 0.85, lf];

  a["STS-KLN-08"] = [SCANNER.x, SCANNER.top - 0.2, SCANNER.z + 0.5];
  a["CAL-KLN-03"] = [52, axisY(52) + R + 0.06, 0];
  a["STS-KLN-10"] = [FAN.x, FAN.y + 0.2, FAN.z + 0.42];
  a["CAL-KLN-07"] = [L + 0.1, axisY(L) + 1.2, 2.85];
  a["CAL-KLN-06"] = [-0.1, axisY(0) + 1.2, 2.85];

  const cf = CHAMBER.z + 0.06;
  a["GAS-KLN-01"] = [-2.6, 9.4, cf + 0.45];
  a["GAS-KLN-02"] = [-1.9, 9.4, cf + 0.45];
  a["STS-KLN-06"] = [-2.25, 10.05, cf + 0.45];
  a["TMP-KLN-13"] = [-4.2, 8.1, cf];
  a["PRS-KLN-01"] = [-4.9, 6.9, cf];
  a["FLO-KLN-01"] = [-7.3, 16.6, 0.45];
  const hf = HOOD.z + 0.06;
  a["PRS-KLN-03"] = [76.8, 6.6, hf];
  a["TMP-KLN-14"] = [76.8, HOOD.y1 + 0.55, 2.3];
  a["FLO-KLN-02"] = [87.6, 4.7, 1.1];
  return a;
})();

/* ---------------------------------------------------------------- pieces */

/** Members laid along the kiln axis share its slope. Children: local +x = kiln axis. */
function AlongAxis({ x, children }: { x: number; children: React.ReactNode }) {
  return (
    <group position={[x, axisY(x), 0]} rotation={[0, 0, -A]}>
      {children}
    </group>
  );
}

/** Turned parts are built around +y; this lays them along the local x axis. */
function Turned({ children }: { children: React.ReactNode }) {
  return <group rotation={[0, 0, -Math.PI / 2]}>{children}</group>;
}

/**
 * Instanced boxes around the kiln axis (tyre stops, seal lamellae, gear teeth,
 * spring plates): `count` per ring at radius `r`, one ring per x offset.
 */
function RingOf({
  count,
  r,
  size,
  xs,
  paint,
  system,
  tilt = 0,
}: {
  count: number;
  r: number;
  /** Box [along axis, radial, tangential]. */
  size: [number, number, number];
  xs: number[];
  paint: TwinPaint;
  system: string | null;
  /** Twist about the radial direction, rad (spring plates run tangentially). */
  tilt?: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const ctx = useContext(PartCtx);
  const n = count * xs.length;
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    let i = 0;
    for (const x of xs) {
      for (let k = 0; k < count; k++) {
        const phi = (k / count) * Math.PI * 2;
        o.position.set(x, r * Math.cos(phi), r * Math.sin(phi));
        o.rotation.set(phi, 0, 0);
        o.rotateY(tilt);
        o.updateMatrix();
        m.setMatrixAt(i++, o.matrix);
      }
    }
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
    m.computeBoundingBox();
  }, [count, r, xs, tilt]);
  if (!ctx) return null;
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, n]} material={ctx.materials[paint]} castShadow receiveShadow userData={{ system }}>
      <boxGeometry args={size} />
    </instancedMesh>
  );
}

const TYRE_PROFILE: Array<[number, number]> = [
  [R + 0.02, -0.45],
  [TYRE_R - 0.07, -0.45],
  [TYRE_R, -0.38],
  [TYRE_R, 0.38],
  [TYRE_R - 0.07, 0.45],
  [R + 0.02, 0.45],
  [R + 0.02, -0.45],
];

const ROLLER_PROFILE: Array<[number, number]> = [
  [0.2, -0.62],
  [ROLLER_R - 0.06, -0.58],
  [ROLLER_R, -0.5],
  [ROLLER_R, 0.5],
  [ROLLER_R - 0.06, 0.58],
  [0.2, 0.62],
  [0.2, -0.62],
];

/** Lamella seal: stationary ring with overlapping spring plates on the shell. */
function Seal({ x, sys, dir }: { x: number; sys: string | null; dir: 1 | -1 }) {
  return (
    <AlongAxis x={x}>
      <Turned>
        <TwinPart
          system={sys}
          paint="steelDark"
          geometry={lathe("seal", [
            [R + 0.25, -0.35],
            [R + 0.75, -0.35],
            [R + 0.75, 0.35],
            [R + 0.25, 0.35],
            [R + 0.25, -0.35],
          ])}
        />
      </Turned>
      <RingOf count={56} r={R + 0.12} size={[0.9, 0.04, 0.32]} xs={[dir * 0.75]} paint="steel" system={sys} />
    </AlongAxis>
  );
}

/** Stiffener ribs on a vertical face (housings, riser): thin plates every `step`. */
function Ribs({ x0, x1, y0, y1, z, step, sys }: { x0: number; x1: number; y0: number; y1: number; z: number; step: number; sys: string | null }) {
  const out: React.ReactNode[] = [];
  for (let x = x0 + step / 2; x < x1; x += step) {
    out.push(<Block key={x} min={[x - 0.06, y0, z]} max={[x + 0.06, y1, z + Math.sign(z || 1) * 0.16]} system={sys} paint="steelDark" bevel={0.01} edges={false} />);
  }
  return <>{out}</>;
}

function Shell({ sys }: { sys: string | null }) {
  return (
    <>
      <AlongAxis x={L / 2}>
        <Turned>
          <TwinPart system={sys} paint="shell">
            <cylinderGeometry args={[R, R, L, 128, 1, true]} />
          </TwinPart>
        </Turned>
      </AlongAxis>
      <Seal x={0} sys={sys} dir={1} />
      <Seal x={L} sys={sys} dir={-1} />

      {/* outlet seal cooling fan: volute, motor, duct to the seal */}
      <Block min={[FAN.x - 0.9, 0, FAN.z - 0.7]} max={[FAN.x + 0.9, 0.5, FAN.z + 0.7]} system={null} paint="concrete" />
      <TwinPart system={sys} paint="paint" position={[FAN.x, FAN.y, FAN.z]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.75, 0.75, 0.6, 40]} />
      </TwinPart>
      <Pipe from={[FAN.x, FAN.y, FAN.z - 0.3]} to={[FAN.x, FAN.y, FAN.z - 1.0]} r={0.32} system={sys} paint="paint" segments={24} />
      <Block min={[FAN.x - 0.5, 0.5, FAN.z - 0.5]} max={[FAN.x + 0.5, FAN.y - 0.7, FAN.z + 0.5]} system={sys} paint="steelDark" />
      <Pipe from={[FAN.x + 0.6, FAN.y + 0.3, FAN.z]} to={[L - 0.6, axisY(L) - 1.6, 3.0]} r={0.26} system={sys} paint="steel" />

      {/* IR shell scanner on its mast, behind the kiln */}
      <Block min={[SCANNER.x - 1.2, 0, SCANNER.z - 1.2]} max={[SCANNER.x + 1.2, 0.35, SCANNER.z + 1.2]} system={null} paint="concrete" />
      <Column x={SCANNER.x} z={SCANNER.z} y0={0.35} y1={SCANNER.top - 0.5} size={0.26} />
      <Block min={[SCANNER.x - 0.55, SCANNER.top - 0.6, SCANNER.z - 0.4]} max={[SCANNER.x + 0.55, SCANNER.top + 0.1, SCANNER.z + 0.5]} system={sys} paint="housing" />
      <Pipe from={[SCANNER.x, SCANNER.top - 0.25, SCANNER.z + 0.5]} to={[SCANNER.x, SCANNER.top - 0.25, SCANNER.z + 0.62]} r={0.16} system={sys} paint="deep" />
    </>
  );
}

function Station({ xs, sys, thrust }: { xs: number; sys: string | null; thrust: boolean }) {
  const ry = rollerY(xs);
  const top = ry - ROLLER_R - 0.35;
  return (
    <>
      {/* riding tyre with stop blocks either side */}
      <AlongAxis x={xs}>
        <Turned>
          <TwinPart system={sys} paint="machined" geometry={lathe("tyre", TYRE_PROFILE, 96)} />
        </Turned>
        <RingOf count={28} r={R + 0.1} size={[0.22, 0.2, 0.3]} xs={[-0.6, 0.6]} paint="steelDark" system={sys} />
      </AlongAxis>

      {/* concrete pier: footing, chamfered pier, grout pad */}
      <Block min={[xs - 2.7, 0, -4.4]} max={[xs + 2.7, 0.7, 4.4]} system={null} paint="concrete" bevel={0.05} />
      <Block min={[xs - 2.15, 0.7, -3.5]} max={[xs + 2.15, top - 0.35, 3.5]} system={null} paint="concrete" bevel={0.08} />
      <Block min={[xs - 2.0, top - 0.35, -3.35]} max={[xs + 2.0, top - 0.3, 3.35]} system={null} paint="steelDark" bevel={0.01} />

      {[-1, 1].map((side) => {
        const z = side * ROLLER_Z;
        return (
          <group key={side}>
            {/* sole plate, bearings A / B with caps, shaft, roller */}
            <Block min={[xs - 1.9, top - 0.3, z - 0.62]} max={[xs + 1.9, top, z + 0.62]} system={sys} paint="steelDark" bevel={0.02} />
            {[-BEARING_DX, BEARING_DX].map((dx) => (
              <group key={dx}>
                <Block min={[xs + dx - 0.36, top, z - 0.5]} max={[xs + dx + 0.36, ry + 0.2, z + 0.5]} system={sys} paint="paint" bevel={0.05} />
                <TwinPart system={sys} paint="paint" position={[xs + dx, ry + 0.2, z]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.42, 0.42, 0.72, 32, 1, false, 0, Math.PI]} />
                </TwinPart>
                <Pipe from={[xs + dx + Math.sign(dx) * 0.36, ry, z]} to={[xs + dx + Math.sign(dx) * 0.5, ry, z]} r={0.26} system={sys} paint="steelDark" segments={24} />
              </group>
            ))}
            <Pipe from={[xs - 1.0, ry, z]} to={[xs + 1.0, ry, z]} r={0.19} system={sys} paint="machined" />
            <group position={[xs, ry, z]}>
              <Turned>
                <TwinPart system={sys} paint="machined" geometry={lathe("roller", ROLLER_PROFILE, 48)} />
              </Turned>
            </group>
          </group>
        );
      })}

      {thrust && (
        <>
          {/* hydraulic thrust roller on the tyre flank, cylinder with LVDT, HPU and hose */}
          <TwinPart system={sys} paint="machined" position={[xs + 0.97, ry + 0.45, 0]}>
            <cylinderGeometry args={[0.55, 0.55, 0.5, 40]} />
          </TwinPart>
          <Block min={[xs + 0.5, top, -0.5]} max={[xs + 3.6, top + 0.3, 0.5]} system={sys} paint="steelDark" bevel={0.02} />
          <Pipe from={[xs + 1.3, ry - 0.05, 0]} to={[xs + 3.0, ry - 0.05, 0]} r={0.2} system={sys} paint="paint" segments={24} />
          <Pipe from={[xs + 1.0, ry - 0.05, 0]} to={[xs + 1.3, ry - 0.05, 0]} r={0.09} system={sys} paint="machined" />
          <Pipe from={[xs + 3.0, ry - 0.05, 0]} to={[xs + 3.4, ry - 0.05, 0]} r={0.26} system={sys} paint="steelDark" segments={24} />
          <Pipe from={[xs + 2.2, ry + 0.18, 0]} to={[xs + 3.4, ry + 0.18, 0]} r={0.04} system={sys} paint="machined" />
          <Block min={[HPU.x - 0.95, 0, HPU.z - 0.7]} max={[HPU.x + 0.95, 0.15, HPU.z + 0.7]} system={sys} paint="steelDark" bevel={0.01} />
          <Block min={[HPU.x - 0.8, 0.15, HPU.z - 0.55]} max={[HPU.x + 0.8, 1.15, HPU.z + 0.55]} system={sys} paint="paint" />
          <Pipe from={[HPU.x - 0.3, 1.15, HPU.z]} to={[HPU.x - 0.3, 1.55, HPU.z]} r={0.22} system={sys} paint="paint" segments={24} />
          <Pipe from={[HPU.x + 0.4, 1.15, HPU.z - 0.2]} to={[xs + 3.2, top + 0.3, 0.4]} r={0.045} system={sys} paint="deep" segments={8} />
        </>
      )}
    </>
  );
}

function Drive({ sys }: { sys: string | null }) {
  const mz = MOTOR.z;
  const fins = Array.from({ length: 11 }, (_, i) => MOTOR.x0 + 0.25 + i * 0.21);
  return (
    <>
      {/* girth gear: rim, teeth (every second of 168), tangential spring plates */}
      <AlongAxis x={GEAR_X}>
        <Turned>
          <TwinPart
            system={sys}
            paint="machined"
            geometry={lathe("gear", [
              [GEAR_R - 0.35, -0.28],
              [GEAR_R, -0.28],
              [GEAR_R, 0.28],
              [GEAR_R - 0.35, 0.28],
              [GEAR_R - 0.35, -0.28],
            ], 128)}
          />
        </Turned>
        <RingOf count={84} r={GEAR_R + 0.08} size={[0.52, 0.17, 0.15]} xs={[0]} paint="machined" system={sys} />
        <RingOf count={16} r={(R + GEAR_R - 0.35) / 2} size={[0.06, GEAR_R - 0.35 - R + 0.1, 0.5]} xs={[0]} paint="steelDark" system={sys} tilt={0.5} />
      </AlongAxis>

      {/* spray lubrication box above the mesh, line from the skid */}
      <Block min={[GEAR_X - 0.6, axisY(GEAR_X) + GEAR_R + 0.45, 1.1]} max={[GEAR_X + 0.6, axisY(GEAR_X) + GEAR_R + 0.85, 2.1]} system={sys} paint="housing" />
      <Pipe from={[GEAR_X + 0.5, axisY(GEAR_X) + GEAR_R + 0.65, 2.0]} to={[GEAR_X + 3.2, 1.2, 5.3]} r={0.04} system={sys} paint="machined" segments={8} />

      {/* pinion on its pedestal, shaft to the gearbox */}
      <Block min={[GEAR_X - 1.3, 0, PINION_Z - 0.95]} max={[GEAR_X + 1.3, PINION_Y - 0.8, PINION_Z + 0.95]} system={null} paint="concrete" bevel={0.06} />
      {[-0.65, 0.65].map((dx) => (
        <Block
          key={dx}
          min={[GEAR_X + dx - 0.26, PINION_Y - 0.8, PINION_Z - 0.42]}
          max={[GEAR_X + dx + 0.26, PINION_Y + 0.3, PINION_Z + 0.42]}
          system={sys}
          paint="paint"
          bevel={0.05}
        />
      ))}
      <group position={[GEAR_X, PINION_Y, PINION_Z]}>
        <Turned>
          <TwinPart
            system={sys}
            paint="machined"
            geometry={lathe("pinion", [
              [0.16, -0.3],
              [PINION_R, -0.3],
              [PINION_R, 0.3],
              [0.16, 0.3],
              [0.16, -0.3],
            ], 48)}
          />
        </Turned>
      </group>
      <Pipe from={[GEAR_X - 0.95, PINION_Y, PINION_Z]} to={[GBX.min[0], PINION_Y, PINION_Z]} r={0.16} system={sys} paint="machined" />

      {/* drive foundation */}
      <Block min={[GBX.min[0] - 0.5, 0, GBX.min[2] - 0.5]} max={[MOTOR.x1 + 1.0, GBX.min[1], GBX.max[2] + 0.5]} system={null} paint="concrete" bevel={0.06} />

      {/* gearbox: lower casing, split flange, upper casing, inspection cover, lugs */}
      <Block min={[GBX.min[0], GBX.min[1], GBX.min[2]]} max={[GBX.max[0], 3.75, GBX.max[2]]} system={sys} paint="paint" bevel={0.08} />
      <Block min={[GBX.min[0] - 0.08, 3.75, GBX.min[2] - 0.08]} max={[GBX.max[0] + 0.08, 3.9, GBX.max[2] + 0.08]} system={sys} paint="paint" bevel={0.02} />
      <Block min={[GBX.min[0] + 0.05, 3.9, GBX.min[2] + 0.05]} max={[GBX.max[0] - 0.05, GBX.max[1], GBX.max[2] - 0.05]} system={sys} paint="paint" bevel={0.12} />
      <Block min={[20.6, GBX.max[1], GBX.min[2] + 0.5]} max={[21.8, GBX.max[1] + 0.12, GBX.max[2] - 0.5]} system={sys} paint="steelDark" bevel={0.02} />
      {[GBX.min[0] + 0.3, GBX.max[0] - 0.3].map((x) => (
        <Block key={x} min={[x - 0.08, GBX.max[1] - 0.05, mz - 0.12]} max={[x + 0.08, GBX.max[1] + 0.3, mz + 0.12]} system={sys} paint="paint" bevel={0.03} edges={false} />
      ))}

      {/* coupling, motor on its feet */}
      <Pipe from={[GBX.max[0], MOTOR.y, mz]} to={[MOTOR.x0, MOTOR.y, mz]} r={0.14} system={sys} paint="machined" />
      <Pipe from={[GBX.max[0] + 0.3, MOTOR.y, mz]} to={[GBX.max[0] + 0.8, MOTOR.y, mz]} r={0.36} system={sys} paint="steelDark" segments={32} />
      <Block min={[MOTOR.x0 + 0.1, GBX.min[1], mz - 0.95]} max={[MOTOR.x1 - 0.1, MOTOR.y - MOTOR.r + 0.2, mz + 0.95]} system={sys} paint="paint" bevel={0.04} />
      <Pipe from={[MOTOR.x0, MOTOR.y, mz]} to={[MOTOR.x1, MOTOR.y, mz]} r={MOTOR.r} system={sys} paint="paint" segments={48} />
      {fins.map((x) => (
        <Pipe key={x} from={[x, MOTOR.y, mz]} to={[x + 0.05, MOTOR.y, mz]} r={MOTOR.r + 0.08} system={sys} paint="paint" segments={48} edges={false} />
      ))}
      <Pipe from={[MOTOR.x0 - 0.12, MOTOR.y, mz]} to={[MOTOR.x0, MOTOR.y, mz]} r={MOTOR.r + 0.06} system={sys} paint="paint" segments={48} />
      <Pipe from={[MOTOR.x1, MOTOR.y, mz]} to={[MOTOR.x1 + 0.6, MOTOR.y, mz]} r={MOTOR.r - 0.04} r2={MOTOR.r - 0.14} system={sys} paint="steelDark" segments={48} />
      <Block min={[24.15, MOTOR.y + MOTOR.r - 0.05, mz - 0.42]} max={[24.85, MOTOR.y + MOTOR.r + 0.5, mz + 0.42]} system={sys} paint="paint" bevel={0.04} />

      {/* auxiliary drive: brake disc and small motor on the gearbox front */}
      <Pipe from={[21.2, 3.0, GBX.max[2]]} to={[21.2, 3.0, GBX.max[2] + 0.12]} r={0.46} system={sys} paint="machined" segments={32} />
      <Pipe from={[21.2, 3.0, GBX.max[2] + 0.12]} to={[21.2, 3.0, GBX.max[2] + 0.4]} r={0.3} system={sys} paint="steelDark" segments={24} />
      <Pipe from={[21.2, 3.0, GBX.max[2] + 0.4]} to={[21.2, 3.0, GBX.max[2] + 1.3]} r={0.32} system={sys} paint="paint" segments={32} />

      {/* lube skid: frame, tank, duty / standby pumps, filter, cooler, line to the gearbox */}
      <Block min={[LUBE.min[0] - 0.2, 0, LUBE.min[2] - 0.2]} max={[LUBE.max[0] + 0.2, 0.15, LUBE.max[2] + 0.2]} system={sys} paint="steelDark" bevel={0.01} />
      <Block min={[LUBE.min[0], 0.15, LUBE.min[2]]} max={[LUBE.max[0], LUBE.max[1], LUBE.max[2]]} system={sys} paint="paint" />
      {[24.4, 25.0].map((x) => (
        <Pipe key={x} from={[x, LUBE.max[1], 5.35]} to={[x, LUBE.max[1] + 0.45, 5.35]} r={0.17} system={sys} paint="paint" segments={24} />
      ))}
      <Pipe from={[25.6, LUBE.max[1], 5.35]} to={[25.6, LUBE.max[1] + 0.6, 5.35]} r={0.12} system={sys} paint="steelDark" segments={20} />
      <Block min={[24.2, LUBE.max[1], 5.75]} max={[25.8, LUBE.max[1] + 0.35, 6.1]} system={sys} paint="steelDark" bevel={0.03} />
      <Pipe from={[24.2, 1.0, LUBE.min[2]]} to={[GBX.max[0] - 0.3, GBX.min[1] + 0.2, GBX.max[2]]} r={0.05} system={sys} paint="machined" segments={8} />
    </>
  );
}

function Process({ sys }: { sys: string | null }) {
  const c = CHAMBER;
  const h = HOOD;
  const cols = (x0: number, x1: number, z: number, top: number) =>
    [x0, x1].flatMap((x) => [-z, z].map((zz) => <Column key={`${x}:${zz}`} x={x} z={zz} y1={top} />));
  const PLAT = 7;
  const BURNER_DECK = axisY(L) - 0.85;
  return (
    <>
      {/* ---- kiln inlet: steel frame, chamber, platform and stair, riser, meal chute ---- */}
      {cols(c.x0 - 0.5, c.x1 + 0.3, c.z + 0.5, 14)}
      {[c.y0, PLAT - 0.2, 13.8].map((y) => (
        <group key={y}>
          <Beam from={[c.x0 - 0.5, y, -c.z - 0.5]} to={[c.x1 + 0.3, y, -c.z - 0.5]} />
          <Beam from={[c.x0 - 0.5, y, c.z + 0.5]} to={[c.x1 + 0.3, y, c.z + 0.5]} />
          <Beam from={[c.x0 - 0.5, y, -c.z - 0.5]} to={[c.x0 - 0.5, y, c.z + 0.5]} />
        </group>
      ))}
      {/* back-face bracing */}
      <Pipe from={[c.x0 - 0.5, 0.3, -c.z - 0.5]} to={[c.x1 + 0.3, PLAT - 0.3, -c.z - 0.5]} r={0.06} system={null} paint="steel" segments={6} edges={false} />
      <Pipe from={[c.x1 + 0.3, 0.3, -c.z - 0.5]} to={[c.x0 - 0.5, PLAT - 0.3, -c.z - 0.5]} r={0.06} system={null} paint="steel" segments={6} edges={false} />
      <Block min={[c.x0, c.y0, -c.z]} max={[c.x1, c.y1, c.z]} system={sys} paint="housing" bevel={0.1} />
      <Ribs x0={c.x0} x1={c.x1} y0={c.y0 + 0.2} y1={c.y1 - 0.2} z={c.z} step={0.9} sys={sys} />
      <Platform x0={c.x0 - 0.5} x1={c.x1 + 0.3} z0={c.z + 0.5} z1={c.z + 2.2} y={PLAT} rails={["z1", "x1"]} />
      <Stair x0={-13.4} x1={c.x0 - 0.5} y0={0} y1={PLAT} z={c.z + 1.35} />
      {/* riser duct with stiffener bands */}
      <Block min={[c.x0 + 0.5, c.y1, -2.4]} max={[c.x1 - 0.5, c.y1 + 10, 2.4]} system={sys} paint="housing" bevel={0.08} />
      {Array.from({ length: 6 }, (_, i) => c.y1 + 0.8 + i * 1.6).map((y) => (
        <Block key={y} min={[c.x0 + 0.4, y, -2.5]} max={[c.x1 - 0.4, y + 0.14, 2.5]} system={sys} paint="steelDark" bevel={0.02} edges={false} />
      ))}
      <Pipe from={[-9.4, 19.6, 0]} to={[-4.2, c.y1, 0]} r={0.38} system={sys} paint="steel" segments={24} />
      <Block min={[-7.75, 16.05, -0.4]} max={[-6.85, 16.95, 0.4]} system={sys} paint="paint" bevel={0.04} />
      {/* gas analyser cabinet and probe */}
      <Block min={[-2.95, 9.0, c.z]} max={[-1.55, 10.4, c.z + 0.45]} system={sys} paint="paint" bevel={0.04} />
      <Pipe from={[-2.25, 8.6, c.z + 0.2]} to={[-2.25, 8.6, c.z - 1.6]} r={0.07} system={sys} paint="machined" segments={12} />

      {/* ---- firing hood, clinker chute, pyrometer ---- */}
      {cols(h.x0 - 0.2, h.x1 + 0.2, h.z + 0.3, h.y0 + 0.2)}
      <Block min={[h.x0, h.y0, -h.z]} max={[h.x1, h.y1, h.z]} system={sys} paint="housing" bevel={0.1} />
      <Ribs x0={h.x0} x1={h.x1} y0={h.y0 + 0.2} y1={h.y1 - 0.2} z={h.z} step={0.9} sys={sys} />
      <Block min={[h.x0 + 0.6, 0, -2.2]} max={[h.x1 - 0.6, h.y0, 2.2]} system={sys} paint="steelDark" />
      <Block min={[h.x0 + 0.9, 0.02, -1.8]} max={[h.x1 - 0.9, 0.35, 1.8]} system={sys} paint="material" bevel={0.1} />
      <Block min={[76.4, h.y1, 1.95]} max={[77.2, h.y1 + 0.5, 2.65]} system={sys} paint="paint" bevel={0.04} />

      {/* ---- burner on its carriage deck, stair, coal line with flow meter ---- */}
      {[80, 84, 88].flatMap((x) => [-1.5, 1.5].map((z) => <Column key={`${x}:${z}`} x={x} z={z} y1={BURNER_DECK - 0.2} size={0.24} />))}
      <Platform x0={h.x1} x1={88.4} z0={-1.7} z1={1.7} y={BURNER_DECK} rails={["z0", "z1", "x1"]} />
      <Stair x0={93.2} x1={88.4} y0={0} y1={BURNER_DECK} z={2.6} />
      {/* carriage rails and trolley */}
      {[-0.6, 0.6].map((z) => (
        <Block key={z} min={[h.x1, BURNER_DECK, z - 0.06]} max={[88, BURNER_DECK + 0.12, z + 0.06]} system={null} paint="machined" bevel={0.01} edges={false} />
      ))}
      <Block min={[84.4, BURNER_DECK + 0.12, -0.8]} max={[86.6, axisY(L) - 0.3, 0.8]} system={sys} paint="paint" bevel={0.04} />
      <Pipe from={[h.x0 - 0.4, axisY(L), 0]} to={[87.4, axisY(L), 0]} r={0.3} system={sys} paint="machined" segments={32} />
      {[80.5, 83, 87.4].map((x) => (
        <Pipe key={x} from={[x - 0.06, axisY(L), 0]} to={[x + 0.06, axisY(L), 0]} r={0.42} system={sys} paint="steelDark" segments={32} />
      ))}
      <Pipe from={[87.4, axisY(L), 0]} to={[87.6, 4.7, 0.6]} r={0.18} system={sys} paint="steel" segments={16} />
      <Pipe from={[87.6, 4.7, 0.6]} to={[89.5, 0.3, 2.6]} r={0.18} system={sys} paint="steel" segments={16} />
      <Block min={[87.2, 4.3, 0.2]} max={[88.0, 5.1, 1.05]} system={sys} paint="paint" bevel={0.04} />
    </>
  );
}

/* ---------------------------------------------------------------- detail layer */

/**
 * Machine-kit (TSE) finishing detail on the built kiln, in the kiln frame, merged per
 * subsystem and material: shell weld seams, tyre chairs, shell-cooling fans, bolted
 * bearing caps, pier handrails and ladders, gearbox inset panels / bearing caps /
 * sight window, motor terminal box, feet and grille, coupling bolts, cable tray with
 * junction boxes, hood and inlet inspection doors, air cannons, burner bands and
 * trolley wheels, and a field transmitter behind every scheduled sensor point.
 */
function buildKilnDetail(mats: KitMats, edgeMat: THREE.LineBasicMaterial, owners: Record<KilnRole, string | null>): THREE.Group {
  const root = new THREE.Group();
  const k = kitBuilder(mats);
  const role = (r: KilnRole | null) => {
    const grp = new THREE.Group();
    grp.userData.role = r;
    root.add(grp);
    k.into(grp);
    return grp;
  };

  /* shell: weld seams, shell-cooling fans */
  role("shl");
  for (let x = 3; x < L - 1; x += 6) {
    if (STATIONS.some((s) => Math.abs(s - x) < 1.4) || Math.abs(GEAR_X - x) < 1) continue;
    k.tube([x - 0.05, axisY(x - 0.05), 0], [x + 0.05, axisY(x + 0.05), 0], R + 0.035, mats.steel, 64);
  }
  for (const fx of [44, 50, 56, 63]) {
    const fy = axisY(fx);
    const fz = -(R + 3.1);
    k.box(1.8, 0.35, 1.4, fx, 0, fz, mats.concrete);
    for (const dx of [-0.65, 0.65]) k.box(0.16, fy - 1.2, 0.16, fx + dx, 0.35, fz, mats.steel);
    k.box(1.6, 0.14, 0.4, fx, fy - 1.3, fz, mats.steel);
    k.disc(1.15, 0.7, fx, fy, fz, "z", mats.model, 32); // fan ring
    k.disc(0.86, 0.04, fx, fy, fz + 0.37, "z", mats.recess, 28); // grille toward the shell
    k.disc(0.3, 1.0, fx, fy, fz - 0.1, "z", mats.machined, 14); // hub motor
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      k.bolt(fx + Math.cos(a) * 1.02, fy + Math.sin(a) * 1.02, fz + 0.37, "z", 0.045);
    }
  }

  /* supports: tyre chairs, bearing cap bolts, pier handrails and ladders, anchor bolts */
  role("sup");
  STATIONS.forEach((xs) => {
    const ay = axisY(xs);
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      const c = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.09, 0.34), mats.machined);
      c.position.set(xs, ay + Math.cos(a) * (R + 0.05), Math.sin(a) * (R + 0.05));
      c.rotation.x = a;
      k.add(c);
    }
    const ry = rollerY(xs);
    const top = ry - ROLLER_R - 0.35;
    for (const side of [-1, 1]) {
      const z = side * ROLLER_Z;
      for (const dx of [-BEARING_DX, BEARING_DX]) {
        for (const bx of [-0.26, 0.26]) for (const bz of [-0.38, 0.38]) k.bolt(xs + dx + bx, ry + 0.64, z + bz, "y", 0.045);
        k.box(0.5, 0.06, 0.9, xs + dx, top + 0.02, z, mats.machined); // sole-plate shim pack
      }
      k.box(3.6, 0.04, 0.12, xs, top - 0.02, z + side * 0.66, mats.steel); // grease line
    }
    for (const bx of [-2.4, 2.4]) for (const bz of [-4.1, 4.1]) k.bolt(xs + bx, 0.72, bz, "y", 0.07);
    k.railRect(xs - 2.15, xs + 2.15, -3.5, 3.5, top - 0.3);
    k.ladder(xs + 1.4, 3.54, 0.7, top - 0.3, 1);
  });

  /* drive: gearbox panels, caps, window, split-flange bolts; motor box, feet, grille; coupling bolts; cable tray */
  role("drv");
  const [gx0, gy0, gz0] = GBX.min;
  const [gx1, gy1, gz1] = GBX.max;
  k.panel("+z", gx0, gx1, gy0, 3.75, gz0, gz1, 0.22);
  k.panel("+z", gx0 + 0.05, gx1 - 0.05, 3.9, gy1, gz0, gz1, 0.2);
  k.panel("-x", gx0, gx1, gy0, 3.75, gz0, gz1, 0.2);
  for (let x = gx0 + 0.15; x < gx1; x += 0.32) k.bolt(x, 3.83, gz1 + 0.1, "z", 0.045);
  for (const [cx, cy] of [[gx0 + 0.55, PINION_Y], [gx1 - 0.55, MOTOR.y]] as Array<[number, number]>) {
    k.disc(0.38, 0.12, cx, cy, gz1 + 0.06, "z", mats.steel, 28); // bearing cap
    k.disc(0.16, 0.18, cx, cy, gz1 + 0.12, "z", mats.machined, 16);
  }
  k.box(0.8, 0.28, 0.04, (gx0 + gx1) / 2, 4.35, gz1 + 0.12, mats.recess); // sight window
  const mz = MOTOR.z;
  for (const fx of [MOTOR.x0 + 0.35, MOTOR.x1 - 0.35]) for (const fz of [mz - 0.8, mz + 0.8]) k.bolt(fx, MOTOR.y - MOTOR.r + 0.24, fz, "y", 0.06);
  k.box(0.46, 0.24, 0.04, 24.5, MOTOR.y + MOTOR.r + 0.12, mz + 0.44, mats.recess); // terminal box window
  k.disc(MOTOR.r - 0.22, 0.04, MOTOR.x1 + 0.62, MOTOR.y, mz, "x", mats.recess, 32); // fan grille
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    k.bolt(gx1 + 0.55, MOTOR.y + Math.cos(a) * 0.28, mz + Math.sin(a) * 0.28, "x", 0.04); // coupling bolts
  }
  // Cable tray from the drive to the thrust HPU, on stands, with junction boxes.
  for (let x = 27; x <= HPU.x - 1; x += 3) {
    k.box(0.1, 0.55, 0.1, x, 0, 6.5, mats.steel);
    k.box(0.1, 0.55, 0.1, x, 0, 7.1, mats.steel);
  }
  k.beam([26.5, 0.6, 6.8], [HPU.x - 0.6, 0.6, 6.8], 0.7, 0.1, mats.machined);
  for (const jx of [27.5, 41]) {
    k.box(0.5, 0.6, 0.25, jx, 0.7, 6.8, mats.model);
    k.panel("+z", jx - 0.25, jx + 0.25, 0.7, 1.3, 6.675, 6.925, 0.08);
  }

  /* process: inlet and hood doors, air cannons, burner bands, trolley wheels */
  role("prc");
  const c = CHAMBER;
  for (const dx of [c.x0 + 1.4, c.x1 - 1.2]) {
    k.box(1.1, 1.3, 0.06, dx, 3.4, c.z + 0.17, mats.steel);
    for (const bx of [-0.45, 0.45]) for (const by of [0.12, 1.18]) k.bolt(dx + bx, 3.4 + by, c.z + 0.21, "z", 0.045);
  }
  const h = HOOD;
  for (const dx of [h.x0 + 1.2, h.x1 - 1.2]) {
    k.box(1.2, 1.4, 0.06, dx, 3.2, h.z + 0.17, mats.steel);
    for (const bx of [-0.5, 0.5]) for (const by of [0.12, 1.28]) k.bolt(dx + bx, 3.2 + by, h.z + 0.21, "z", 0.045);
    k.box(0.5, 0.5, 0.06, dx, 6.2, h.z + 0.17, mats.recess); // sight glass
  }
  for (const dz of [-2.2, 0, 2.2]) {
    k.disc(0.36, 1.1, h.x0 + 1.6, h.y1 + 0.5, dz, "x", mats.steel, 16); // air cannon
    k.tube([h.x0 + 1.05, h.y1 + 0.5, dz], [h.x0 + 0.7, h.y1, dz], 0.06, mats.machined, 8);
  }
  for (let x = 79.5; x < 87.4; x += 0.7) k.disc(0.33, 0.05, x, axisY(L), 0, "x", mats.steel, 24); // burner jacket bands
  const deck = axisY(L) - 0.85;
  for (const wx of [84.7, 86.3]) for (const wz of [-0.6, 0.6]) k.disc(0.16, 0.12, wx, deck + 0.28, wz, "z", mats.machined, 14); // trolley wheels

  /* field transmitters behind every sensor pad (structure, no subsystem) */
  role(null);
  for (const [x, y, z] of Object.values(KILN_ANCHORS)) {
    const n = Math.abs(z) > 1 ? new THREE.Vector3(0, 0, Math.sign(z)) : new THREE.Vector3(0, 1, 0);
    const head = new THREE.Vector3(x, y, z).addScaledVector(n, -0.12);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
    const hb = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 0.24), mats.model);
    hb.position.copy(head);
    hb.quaternion.copy(q);
    k.add(hb);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.3, 10), mats.machined);
    neck.position.copy(head).addScaledVector(n, -0.24);
    neck.quaternion.copy(q);
    k.add(neck);
  }

  for (const grp of root.children as THREE.Group[]) {
    const r = grp.userData.role as KilnRole | null;
    for (const m of finishKitGroup(grp, edgeMat, [mats.rail, mats.material, mats.bolt])) m.userData.system = r ? owners[r] : null;
  }
  return root;
}

function KilnDetail({ owners }: { owners: Record<KilnRole, string | null> }) {
  const ctx = useContext(PartCtx);
  const edgeMat = useMemo(() => new THREE.LineBasicMaterial({ transparent: true, opacity: 0.85 }), []);
  useEffect(() => {
    if (ctx) edgeMat.color.set(ctx.edgeColor);
  }, [ctx, edgeMat]);
  const materials = ctx?.materials;
  const group = useMemo(() => {
    if (!materials) return null;
    const mats: KitMats = {
      model: materials.housing,
      steel: materials.steelDark,
      shell: materials.shell,
      machined: materials.machined,
      recess: materials.deep,
      concrete: materials.concrete,
      rail: materials.steel,
      material: materials.material,
      bolt: materials.deep,
      plate: materials.grating,
    };
    return buildKilnDetail(mats, edgeMat, owners);
  }, [materials, edgeMat, owners]);
  useEffect(
    () => () => {
      group?.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
    },
    [group],
  );
  useEffect(() => () => edgeMat.dispose(), [edgeMat]);
  return group ? <primitive object={group} /> : null;
}

/** Subsystem id that owns each kiln role, matched on the DB system ids / names. */
export function kilnOwners(systems: Array<{ id: string; name: string }>): Record<KilnRole, string | null> {
  const find = (re: RegExp) => systems.find((s) => re.test(`${s.id} ${s.name}`))?.id ?? null;
  return {
    drv: find(/DRV|drive/i),
    sup: find(/SUP|support|thrust/i),
    shl: find(/SHL|shell|seal/i),
    prc: find(/PRC|process/i),
  };
}

export function KilnModel({ owners }: { owners: Record<KilnRole, string | null> }) {
  const stations = useMemo(() => STATIONS, []);
  return (
    <group position={[-KILN_CENTRE_X, 0, 0]}>
      <Shell sys={owners.shl} />
      {stations.map((xs, i) => (
        <Station key={xs} xs={xs} sys={owners.sup} thrust={i === 1} />
      ))}
      <Drive sys={owners.drv} />
      <Process sys={owners.prc} />
      <KilnDetail owners={owners} />
    </group>
  );
}
