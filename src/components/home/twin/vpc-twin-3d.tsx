"use client";

import React, { useContext, useEffect, useMemo } from "react";
import * as THREE from "three";
import { Block, PartCtx, Pipe, TwinPart, lathe, type TwinPaint } from "./twin-part";
import { finishKitGroup, kitBuilder, type KitMats, type KV3 } from "./machine-kit-3d";

/* ==========================================================================
   VPC-066 casting cell (Schultheiss VPC 066), built in real metres after the
   ULTRON process schematic: control cabinet and induction generator on the
   left with the rotary-vane vacuum pump in front of them; the two-chamber
   casting machine in the middle (sealing-rod actuator on the top crosshead,
   upper melting chamber with crucible, induction coil and Type-S
   thermocouple, lower flask chamber with the investment flask on its
   support, direct-vibration base under it, all held by four tie rods on a
   welded base frame); the recirculating chiller and its pump with supply and
   return lines on the right; the inert gas cylinder, regulator and solenoid
   valve line on the far right.

   Built the way the cell is installed: pipe runs with real bends, flanges and
   valves on racks and stanchions; flexible hoses, bellows and water-cooled
   induction leads that sag; an overhead ladder cable tray with drops to every
   unit; TEFC motors with axial ribs and fan cowls; louvred cabinets on plinths
   and castors; stainless chambers with toggle-clamped lids; the operator HMI
   pendant on its swing arm.

   Both chambers are drawn cut away toward the viewer so the crucible, melt,
   coil and flask read inside them.

   x runs along the cell from the cabinet (left) to the gas cylinder (right),
   y is up, +z faces the operator. Every scheduled VPC signal (§7.1, 15
   physical + DT1) has a physical mount below, so its instrument sits on the
   port, line or housing it reads.
   ========================================================================== */

export type VpcRole = "vac" | "ind" | "gas" | "cool" | "stp" | "flk" | "vib";

/* ---------------------------------------------------------------- layout */

const CAB = { x0: -3.1, x1: -2.3, y0: 0.1, y1: 2.0, z0: -0.8, z1: -0.3 };
const GEN = { x0: -2.0, x1: -1.1, y0: 0.5, y1: 1.22, z0: -0.78, z1: -0.16 };
const VAC = {
  skid: { x0: -2.45, x1: -1.05, z0: 0.15, z1: 0.69 },
  z: 0.42,
  motor: { x0: -2.32, x1: -1.8, y: 0.29, r: 0.14 },
  pump: { x0: -1.66, x1: -1.2, r: 0.16 },
  inletX: -1.38,
  lineY: 0.78,
};

/** Casting machine, centred on x = 0. */
const BASE_H = 0.14;
const TIE = { x: 0.44, z: 0.36, r: 0.032, top: 2.1 };
const LOW = { floor: 0.36, y0: 0.4, y1: 0.98, ro: 0.26, ri: 0.242, flange: 1.02 };
const MID = { y0: 1.03, y1: 1.12 };
const UP = { y0: 1.24, y1: 1.8, ro: 0.3, ri: 0.278, lid: 1.86 };
const CROSS = { y0: 2.0, y1: 2.08 };
const ACT = { y0: 2.08, y1: 2.55, r: 0.065 };
const CRU = { y0: 1.32, y1: 1.6, melt: 1.585 };
const COIL = { r: 0.135, y0: 1.34, y1: 1.58, turns: 6 };

const COOL = {
  skid: { x0: 1.35, x1: 2.62, z0: -0.56, z1: 0.2 },
  z: -0.1,
  chiller: { x0: 1.92, x1: 2.56, y0: 0.16, y1: 1.0, z0: -0.5, z1: 0.15 },
  motor: { x0: 1.4, x1: 1.68, r: 0.1 },
  pumpX: 1.8,
  pumpY: 0.33,
  supplyY: 1.5,
  returnY: 1.7,
  returnX: 2.2,
  rackX: [0.92, 1.25],
  rackZ: -0.3,
};
const GAS = { x: 3.15, z: 0.35, r: 0.115, top: 1.42, lineY: 1.0, riseX: 0.75, inlet: [0.2, 0.1] as const, headerY: 1.93 };
const TRAY = { y: 2.36, z: -0.84, w: 0.22, x0: -2.95, x1: 2.4, posts: [-1.55, 0.0, 1.55, 2.4] };

/** Cut-away: the chamber walls open toward the front-three-quarter view. */
const CUT_MID = 0.52;
const CUT = 1.9;
const PHI0 = CUT_MID + CUT / 2;
const PHI_LEN = Math.PI * 2 - CUT;

/** Cell centre along x, so the twin is framed on the whole cell. */
export const VPC_CENTRE_X = (CAB.x0 + GAS.x + GAS.r) / 2;

const radial = (phi: number, r: number, y: number): KV3 => [r * Math.sin(phi), y, r * Math.cos(phi)];
const normal = (phi: number): KV3 => [Math.sin(phi), 0, Math.cos(phi)];
const inCut = (phi: number) => Math.abs(Math.atan2(Math.sin(phi - CUT_MID), Math.cos(phi - CUT_MID))) < CUT / 2;

/* ---------------------------------------------------------------- instruments */

interface Mount {
  /** Point on the surface the instrument mounts to. */
  at: KV3;
  /** Outward surface normal there. */
  n: KV3;
  /** The mount is the instrument itself (thermocouple head, interlock switch, gateway calc): no transmitter. */
  bare?: boolean;
}

const P1_PHI = -0.75;

/** Where each scheduled signal is read (cell frame, before centring). */
const MOUNTS: Record<string, Mount> = {
  // gas / valves
  P1: { at: radial(P1_PHI, UP.ro + 0.06, 1.62), n: normal(P1_PHI) },
  P3: { at: [1.6, GAS.lineY, GAS.z + 0.016], n: [0, 0, 1] },
  // induction heating
  T1: { at: [-0.06, UP.lid + 0.07, 0.06], n: [0, 1, 0], bare: true },
  E1: { at: [GEN.x0 + 0.16, GEN.y1 - 0.12, GEN.z1 + 0.03], n: [0, 0, 1] },
  // vacuum system
  V1: { at: [VAC.motor.x1 - 0.06, VAC.motor.y, VAC.z + VAC.motor.r + 0.014], n: [0, 0, 1] },
  T4: { at: [-1.5, VAC.motor.y, VAC.z + VAC.pump.r], n: [0, 0, 1] },
  P4: { at: [VAC.inletX, 0.7, VAC.z + 0.025], n: [0, 0, 1] },
  E2: { at: [CAB.x0 + 0.6, 1.05, CAB.z1 + 0.03], n: [0, 0, 1] },
  // flask seals / closure
  P2: { at: [-0.42, VAC.lineY, 0.025], n: [0, 0, 1] },
  S2: { at: radial(P1_PHI, LOW.ro + 0.02, 0.9), n: normal(P1_PHI), bare: true },
  // crucible / stopper
  S1: { at: radial(Math.PI / 4, ACT.r, 2.36), n: normal(Math.PI / 4) },
  // optional vibration
  V2: { at: [0, 0.25, 0.06], n: [0, 0, 1] },
  // cooling water
  F1: { at: [1.12, COOL.supplyY, COOL.z + 0.06], n: [0, 0, 1] },
  T2: { at: [0.75, COOL.supplyY, COOL.z + 0.022], n: [0, 0, 1] },
  T3: { at: [0.75, COOL.returnY, COOL.z + 0.022], n: [0, 0, 1] },
  DT1: { at: [0.75, (COOL.supplyY + COOL.returnY) / 2, COOL.z], n: [0, 0, 1], bare: true },
};

/** Physical point of every scheduled signal (cell frame, before centring). */
export const VPC_ANCHORS: Record<string, [number, number, number]> = Object.fromEntries(
  Object.entries(MOUNTS).map(([tag, m]) => [tag, [m.at[0] + m.n[0] * 0.12, m.at[1] + m.n[1] * 0.12, m.at[2] + m.n[2] * 0.12] as [number, number, number]]),
);

/** Where each component's floating label hangs (cell frame, before centring). */
export const VPC_LABEL_ANCHORS: Record<VpcRole, [number, number, number]> = {
  ind: [(GEN.x0 + GEN.x1) / 2, GEN.y1 + 0.12, (GEN.z0 + GEN.z1) / 2],
  vac: [-1.75, 0.9, VAC.z],
  stp: [0, ACT.y1 + 0.12, 0],
  flk: [TIE.x + 0.36, 0.72, 0.3],
  vib: [-0.15, 0.04, 0.62],
  cool: [(COOL.chiller.x0 + COOL.chiller.x1) / 2, COOL.returnY + 0.1, COOL.z],
  gas: [GAS.x, GAS.top + 0.3, GAS.z],
};

/* ---------------------------------------------------------------- geometry */

const geoCache = new Map<string, THREE.BufferGeometry>();
function cachedGeo(key: string, make: () => THREE.BufferGeometry) {
  let g = geoCache.get(key);
  if (!g) {
    g = make();
    geoCache.set(key, g);
  }
  return g;
}
const k3 = (v: THREE.Vector3 | KV3) => (Array.isArray(v) ? v : v.toArray()).map((n) => n.toFixed(3)).join(",");

/** Helix around +y (induction coil, springs), cached per shape. */
function helix(r: number, y0: number, y1: number, turns: number, tube: number, phi0 = 0) {
  return cachedGeo(`hx:${r}:${y0}:${y1}:${turns}:${tube}:${phi0}`, () => {
    class Helix extends THREE.Curve<THREE.Vector3> {
      constructor() {
        super();
      }
      getPoint(t: number, target = new THREE.Vector3()) {
        const a = phi0 + t * turns * Math.PI * 2;
        return target.set(r * Math.sin(a), y0 + (y1 - y0) * t, r * Math.cos(a));
      }
    }
    return new THREE.TubeGeometry(new Helix(), Math.round(turns * 28), tube, 8, false);
  });
}

/** Pipe bend: a tube along the quadratic curve that rounds the corner `c` between `s` and `e`. */
function bendGeo(s: THREE.Vector3, c: THREE.Vector3, e: THREE.Vector3, r: number) {
  return cachedGeo(`bd:${k3(s)}:${k3(c)}:${k3(e)}:${r}`, () => new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(s, c, e), 10, r, 18, false));
}

/** Flexible hose through its control points (sagging, smooth), cached per shape. */
function hoseGeo(pts: KV3[], r: number) {
  return cachedGeo(`hs:${pts.map(k3).join("|")}:${r}`, () => {
    const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, "centripetal");
    return new THREE.TubeGeometry(curve, Math.max(24, Math.round(curve.getLength() * 60)), r, 10, false);
  });
}

/** Wall ring [ri, ro] × [y0, y1] around the machine axis, cut away toward the viewer. */
function CutWall({ name, ri, ro, y0, y1, sys, paint, cut = true }: { name: string; ri: number; ro: number; y0: number; y1: number; sys: string | null; paint: TwinPaint; cut?: boolean }) {
  const profile: Array<[number, number]> = [
    [ri, y0],
    [ro, y0],
    [ro, y1],
    [ri, y1],
    [ri, y0],
  ];
  const geo = cut ? lathe(`vpc-${name}`, profile, 72, PHI0, PHI_LEN) : lathe(`vpc-${name}`, profile, 72);
  const rm = (ri + ro) / 2;
  return (
    <>
      <TwinPart system={sys} paint={paint} geometry={geo} />
      {cut &&
        [PHI0, PHI0 + PHI_LEN].map((phi) => (
          <TwinPart key={phi} system={sys} paint={paint} position={radial(phi, rm, (y0 + y1) / 2)} rotation={[0, phi, 0]} edges={false}>
            <boxGeometry args={[0.004, y1 - y0, ro - ri]} />
          </TwinPart>
        ))}
    </>
  );
}

/**
 * A rigid pipe run through the given points: straight legs joined by real bends
 * (centre-line radius `bend` × pipe radius), optionally with a flange pair at
 * each end.
 */
function Run({ path, r, sys, paint = "steel", bend = 3, flanged = false }: { path: KV3[]; r: number; sys: string | null; paint?: TwinPaint; bend?: number; flanged?: boolean }) {
  const key = path.map(k3).join("|");
  const { legs, bends } = useMemo(() => {
    const P = path.map((p) => new THREE.Vector3(...p));
    const legs: Array<[KV3, KV3]> = [];
    const bends: THREE.BufferGeometry[] = [];
    let start = P[0];
    for (let i = 1; i < P.length - 1; i++) {
      const din = P[i].clone().sub(P[i - 1]);
      const dout = P[i + 1].clone().sub(P[i]);
      const b = Math.min(r * bend, din.length() / 2, dout.length() / 2);
      const s = P[i].clone().addScaledVector(din.normalize(), -b);
      const e = P[i].clone().addScaledVector(dout.normalize(), b);
      legs.push([start.toArray() as KV3, s.toArray() as KV3]);
      bends.push(bendGeo(s, P[i], e, r));
      start = e;
    }
    legs.push([start.toArray() as KV3, P[P.length - 1].toArray() as KV3]);
    return { legs: legs.filter(([a, b]) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) > 1e-4), bends };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the path's points
  }, [key, r, bend]);
  const ends = flanged ? [[path[0], path[1]], [path[path.length - 1], path[path.length - 2]]] : [];
  return (
    <>
      {legs.map(([a, b], i) => (
        <Pipe key={`l${i}`} from={a} to={b} r={r} system={sys} paint={paint} segments={18} />
      ))}
      {bends.map((g, i) => (
        <TwinPart key={`b${i}`} system={sys} paint={paint} geometry={g} edges={false} />
      ))}
      {ends.map(([p, q], i) => {
        const d = new THREE.Vector3(...q).sub(new THREE.Vector3(...p)).normalize().multiplyScalar(0.022);
        return <Pipe key={`f${i}`} from={p} to={[p[0] + d.x, p[1] + d.y, p[2] + d.z]} r={r * 1.9} system={sys} paint="steelDark" segments={20} />;
      })}
    </>
  );
}

/**
 * A flexible hose (or cable) from `a`, leaving along `da`, to `b`, arriving along
 * `db`, sagging `sag` below the chord, through optional `via` points; ferrules at
 * both ends.
 */
function Hose({ a, da, b, db, r, sys, sag = 0.08, via = [], paint = "steelDark", ferrules = true }: { a: KV3; da: KV3; b: KV3; db: KV3; r: number; sys: string | null; sag?: number; via?: KV3[]; paint?: TwinPaint; ferrules?: boolean }) {
  const lead = Math.max(0.04, r * 4);
  const a1: KV3 = [a[0] + da[0] * lead, a[1] + da[1] * lead, a[2] + da[2] * lead];
  const b1: KV3 = [b[0] - db[0] * lead, b[1] - db[1] * lead, b[2] - db[2] * lead];
  const mid: KV3[] = via.length
    ? via
    : [[(a1[0] + b1[0]) / 2, (a1[1] + b1[1]) / 2 - sag, (a1[2] + b1[2]) / 2]];
  const geo = hoseGeo([a, a1, ...mid, b1, b], r);
  return (
    <>
      <TwinPart system={sys} paint={paint} geometry={geo} edges={false} />
      {ferrules &&
        [
          [a, da],
          [b, db.map((n) => -n) as KV3],
        ].map(([p, d], i) => (
          <Pipe key={i} from={p as KV3} to={[(p as KV3)[0] + (d as KV3)[0] * 0.03, (p as KV3)[1] + (d as KV3)[1] * 0.03, (p as KV3)[2] + (d as KV3)[2] * 0.03]} r={r * 1.35} system={sys} paint="machined" segments={6} />
        ))}
    </>
  );
}

/** Flange disc on a line, axis along x, y or z. */
function Flange({ at, axis, r, t = 0.016, sys }: { at: KV3; axis: "x" | "y" | "z"; r: number; t?: number; sys: string | null }) {
  const rot: [number, number, number] = axis === "x" ? [0, 0, Math.PI / 2] : axis === "z" ? [Math.PI / 2, 0, 0] : [0, 0, 0];
  return (
    <TwinPart system={sys} paint="steelDark" position={at} rotation={rot}>
      <cylinderGeometry args={[r, r, t, 24]} />
    </TwinPart>
  );
}

/** Quarter-turn ball valve on a line along `axis`: body, stem, lever handle. */
function BallValve({ at, axis, r, sys }: { at: KV3; axis: "x" | "y"; r: number; sys: string | null }) {
  const [x, y, z] = at;
  const lever: [KV3, KV3] = axis === "x" ? [[x, y + r * 2.4, z], [x - r * 5, y + r * 2.4, z + 0.01]] : [[x + r * 2.4, y, z], [x + r * 2.4, y, z + r * 5]];
  const stem: [KV3, KV3] = axis === "x" ? [[x, y, z], [x, y + r * 2.4, z]] : [[x, y, z], [x + r * 2.4, y, z]];
  return (
    <>
      <TwinPart system={sys} paint="paint" position={at} edges={false}>
        <sphereGeometry args={[r * 1.7, 18, 14]} />
      </TwinPart>
      <Pipe from={stem[0]} to={stem[1]} r={r * 0.3} system={sys} paint="machined" segments={8} edges={false} />
      <Pipe from={lever[0]} to={lever[1]} r={r * 0.32} system={sys} paint="steelDark" segments={6} />
    </>
  );
}

/* ---------------------------------------------------------------- left: cabinet, generator, vacuum pump */

function ControlCabinet({ sys }: { sys: string | null }) {
  const c = CAB;
  return (
    <>
      {/* plinth, enclosure, roof canopy, roof fan hood, cable gland plate */}
      <Block min={[c.x0 + 0.02, 0, c.z0 + 0.02]} max={[c.x1 - 0.02, c.y0, c.z1 - 0.02]} system={null} paint="steelDark" bevel={0.008} />
      <Block min={[c.x0, c.y0, c.z0]} max={[c.x1, c.y1, c.z1]} system={sys} paint="housing" bevel={0.012} />
      <Block min={[c.x0 - 0.015, c.y1, c.z0 - 0.015]} max={[c.x1 + 0.015, c.y1 + 0.03, c.z1 + 0.025]} system={sys} paint="housing" bevel={0.006} />
      <Block min={[c.x0 + 0.12, c.y1 + 0.03, c.z0 + 0.1]} max={[c.x0 + 0.42, c.y1 + 0.13, c.z1 - 0.1]} system={sys} paint="paint" bevel={0.01} />
      <Block min={[c.x1 - 0.3, c.y1 + 0.03, c.z0 + 0.08]} max={[c.x1 - 0.08, c.y1 + 0.06, c.z1 - 0.12]} system={sys} paint="steelDark" bevel={0.005} />
      {/* door hinges, door handles, E-stop */}
      {[0.35, 1.05, 1.75].flatMap((y) =>
        [c.x0 + 0.012, c.x1 - 0.012].map((x) => (
          <Pipe key={`${x}:${y}`} from={[x, y, c.z1 + 0.01]} to={[x, y + 0.08, c.z1 + 0.01]} r={0.012} system={sys} paint="steelDark" segments={10} edges={false} />
        )),
      )}
      {[(c.x0 + c.x1) / 2 - 0.05, (c.x0 + c.x1) / 2 + 0.05].map((x) => (
        <Block key={x} min={[x - 0.012, 0.92, c.z1 + 0.03]} max={[x + 0.012, 1.12, c.z1 + 0.06]} system={sys} paint="steelDark" bevel={0.006} />
      ))}
      <Pipe from={[c.x0 + 0.62, 1.62, c.z1 + 0.03]} to={[c.x0 + 0.62, 1.62, c.z1 + 0.06]} r={0.03} system={sys} paint="paint" segments={20} />
      <Pipe from={[c.x0 + 0.62, 1.62, c.z1 + 0.06]} to={[c.x0 + 0.62, 1.62, c.z1 + 0.085]} r={0.024} r2={0.02} system={sys} paint="deep" segments={20} />
      {/* field cables up to the overhead tray */}
      {[c.x1 - 0.26, c.x1 - 0.18, c.x1 - 0.11].map((x, i) => (
        <Hose key={x} a={[x, c.y1 + 0.06, c.z0 + 0.14 + i * 0.05]} da={[0, 1, 0]} b={[x, TRAY.y - 0.01, TRAY.z + 0.02 * i]} db={[0, 1, 0]} r={0.011} sys={null} sag={0} paint="deep" ferrules={false} />
      ))}
    </>
  );
}

function Generator({ sys }: { sys: string | null }) {
  const g = GEN;
  const legs: Array<[number, number]> = [
    [g.x0 + 0.03, g.z0 + 0.03],
    [g.x1 - 0.03, g.z0 + 0.03],
    [g.x0 + 0.03, g.z1 - 0.03],
    [g.x1 - 0.03, g.z1 - 0.03],
  ];
  return (
    <>
      {/* welded stand: angle legs on base plates, lower shelf, top frame */}
      {legs.map(([x, z]) => (
        <group key={`${x}:${z}`}>
          <Block min={[x - 0.025, 0.012, z - 0.025]} max={[x + 0.025, g.y0 - 0.04, z + 0.025]} system={null} paint="steelDark" bevel={0.004} />
          <Block min={[x - 0.05, 0, z - 0.05]} max={[x + 0.05, 0.012, z + 0.05]} system={null} paint="steelDark" bevel={0.002} />
        </group>
      ))}
      <Block min={[g.x0, 0.12, g.z0]} max={[g.x1, 0.14, g.z1]} system={null} paint="steelDark" bevel={0.004} />
      <Block min={[g.x0 - 0.01, g.y0 - 0.04, g.z0 - 0.01]} max={[g.x1 + 0.01, g.y0, g.z1 + 0.01]} system={null} paint="steelDark" bevel={0.006} />
      {/* generator housing, lifting eyes, front handles */}
      <Block min={[g.x0, g.y0, g.z0]} max={[g.x1, g.y1, g.z1]} system={sys} paint="paint" bevel={0.018} />
      {[g.x0 + 0.18, g.x1 - 0.18].map((x) => (
        <TwinPart key={x} system={sys} paint="steelDark" position={[x, g.y1 + 0.035, (g.z0 + g.z1) / 2]} rotation={[0, Math.PI / 2, 0]} edges={false}>
          <torusGeometry args={[0.03, 0.009, 8, 16]} />
        </TwinPart>
      ))}
      {[g.y0 + 0.2, g.y1 - 0.2].map((y) => (
        <group key={y}>
          <Pipe from={[g.x0 + 0.04, y - 0.06, g.z1 + 0.045]} to={[g.x0 + 0.04, y + 0.06, g.z1 + 0.045]} r={0.01} system={sys} paint="machined" segments={8} edges={false} />
          {[-0.06, 0.06].map((dy) => (
            <Pipe key={dy} from={[g.x0 + 0.04, y + dy, g.z1]} to={[g.x0 + 0.04, y + dy, g.z1 + 0.045]} r={0.008} system={sys} paint="machined" segments={8} edges={false} />
          ))}
        </group>
      ))}
      {/* output terminal box on the side, water-cooled induction leads to the coil gland */}
      <Block min={[g.x1, 0.82, -0.58]} max={[g.x1 + 0.08, 1.08, -0.34]} system={sys} paint="steelDark" bevel={0.01} />
      {[
        [-0.42, 0.9, COIL.y0 + 0.01],
        [-0.5, 1.0, COIL.y1 - 0.01],
      ].map(([z, y, yc]) => (
        <Hose
          key={z}
          a={[g.x1 + 0.08, y, z]}
          da={[1, 0, 0]}
          b={[-UP.ro - 0.05, yc, -0.02]}
          db={[1, 0, 0]}
          via={[[-0.68, yc - 0.06, -0.24]]}
          r={0.016}
          sys={sys}
        />
      ))}
      <Block min={[-UP.ro - 0.05, COIL.y0 - 0.03, -0.08]} max={[-UP.ro + 0.01, COIL.y1 + 0.03, 0.04]} system={sys} paint="steelDark" bevel={0.01} />
      {/* control cable drop from the tray */}
      <Hose a={[-1.5, TRAY.y - 0.01, TRAY.z + 0.04]} da={[0, -1, 0]} b={[-1.5, g.y1, -0.7]} db={[0, -1, 0]} r={0.011} sys={null} sag={0} via={[[-1.5, 1.7, -0.78]]} paint="deep" />
    </>
  );
}

function VacuumPump({ sys, flk }: { sys: string | null; flk: string | null }) {
  const s = VAC.skid;
  const m = VAC.motor;
  const p = VAC.pump;
  const z = VAC.z;
  const y = m.y;
  return (
    <>
      {/* base frame, anti-vibration feet under motor and pump */}
      <Block min={[s.x0, 0, s.z0]} max={[s.x1, 0.06, s.z1]} system={sys} paint="steelDark" bevel={0.006} />
      <Block min={[s.x0 + 0.04, 0.06, s.z0 + 0.04]} max={[s.x1 - 0.04, 0.09, s.z1 - 0.04]} system={sys} paint="steelDark" bevel={0.004} />
      {[m.x0 + 0.1, m.x1 - 0.1, p.x0 + 0.08, p.x1 - 0.08].flatMap((x) =>
        [z - 0.1, z + 0.1].map((zz) => (
          <Pipe key={`${x}:${zz}`} from={[x, 0.09, zz]} to={[x, 0.125, zz]} r={0.022} system={sys} paint="deep" segments={14} />
        )),
      )}
      <Block min={[m.x0 + 0.05, 0.125, z - 0.12]} max={[m.x1 - 0.05, y - m.r + 0.04, z + 0.12]} system={sys} paint="paint" bevel={0.008} />
      {/* TEFC motor: frame, fan cowl, terminal box, shaft-end bell housing */}
      <Pipe from={[m.x0, y, z]} to={[m.x1, y, z]} r={m.r} system={sys} paint="paint" segments={40} />
      <Pipe from={[m.x0 - 0.1, y, z]} to={[m.x0, y, z]} r={m.r + 0.006} r2={m.r + 0.006} system={sys} paint="steelDark" segments={40} />
      <Block min={[-2.12, y + m.r - 0.02, z - 0.07]} max={[-1.96, y + m.r + 0.09, z + 0.07]} system={sys} paint="paint" bevel={0.01} />
      <Pipe from={[-2.04, y + m.r + 0.04, z + 0.07]} to={[-2.04, y + m.r + 0.04, z + 0.1]} r={0.014} system={sys} paint="machined" segments={10} edges={false} />
      <Pipe from={[m.x1, y, z]} to={[p.x0, y, z]} r={0.12} r2={0.1} system={sys} paint="paint" segments={32} />
      {/* rotary-vane stage: housing, end cover, oil sump with sight glass and fill plug */}
      <Pipe from={[p.x0, y, z]} to={[p.x1, y, z]} r={p.r} system={sys} paint="paint" segments={40} />
      <Pipe from={[p.x1, y, z]} to={[p.x1 + 0.03, y, z]} r={p.r - 0.02} system={sys} paint="paint" segments={40} />
      <Block min={[p.x0 + 0.03, 0.125, z - 0.15]} max={[p.x1 - 0.02, y - 0.06, z + 0.15]} system={sys} paint="paint" bevel={0.02} />
      <Pipe from={[-1.25, y + 0.1, z + 0.12]} to={[-1.25, y + 0.17, z + 0.12]} r={0.016} system={sys} paint="steelDark" segments={6} />
      {/* oil-mist exhaust filter on the outlet */}
      <Pipe from={[-1.3, y + 0.1, z - 0.11]} to={[-1.3, y + 0.32, z - 0.11]} r={0.058} system={sys} paint="paint" segments={28} />
      <TwinPart system={sys} paint="paint" position={[-1.3, y + 0.32, z - 0.11]} edges={false}>
        <sphereGeometry args={[0.058, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      </TwinPart>
      <Pipe from={[-1.3, y + 0.2, z - 0.11]} to={[-1.3, y + 0.21, z - 0.11]} r={0.064} system={sys} paint="steelDark" segments={28} />
      {/* inlet: KF flange and clamp, stainless bellows, rigid suction line to the flask chamber */}
      <Pipe from={[VAC.inletX, y + p.r - 0.02, z]} to={[VAC.inletX, 0.5, z]} r={0.03} system={sys} paint="paint" segments={20} />
      <Pipe from={[VAC.inletX, 0.5, z]} to={[VAC.inletX, 0.516, z]} r={0.048} system={sys} paint="machined" segments={24} />
      <TwinPart system={sys} paint="steelDark" position={[VAC.inletX, 0.508, z]} rotation={[Math.PI / 2, 0, 0]} edges={false}>
        <torusGeometry args={[0.05, 0.008, 6, 24]} />
      </TwinPart>
      <Pipe from={[VAC.inletX, 0.516, z]} to={[VAC.inletX, 0.655, z]} r={0.026} system={sys} paint="machined" segments={20} />
      <Run
        path={[
          [VAC.inletX, 0.655, z],
          [VAC.inletX, VAC.lineY, z],
          [-0.62, VAC.lineY, z],
          [-0.62, VAC.lineY, 0],
          [-LOW.ro - 0.005, VAC.lineY, 0],
        ]}
        r={0.025}
        sys={sys}
        paint="machined"
      />
      {/* isolation valve (angle body, handwheel) and a stanchion under the line */}
      <Block min={[-1.08, VAC.lineY - 0.045, z - 0.045]} max={[-0.96, VAC.lineY + 0.045, z + 0.045]} system={sys} paint="paint" bevel={0.012} />
      <Pipe from={[-1.02, VAC.lineY + 0.045, z]} to={[-1.02, VAC.lineY + 0.11, z]} r={0.008} system={sys} paint="machined" segments={8} edges={false} />
      <TwinPart system={sys} paint="steelDark" position={[-1.02, VAC.lineY + 0.11, z]} rotation={[Math.PI / 2, 0, 0]} edges={false}>
        <torusGeometry args={[0.035, 0.006, 6, 20]} />
      </TwinPart>
      <Pipe from={[-0.8, 0.012, z]} to={[-0.8, VAC.lineY - 0.03, z]} r={0.018} system={null} paint="steelDark" segments={10} edges={false} />
      <Block min={[-0.84, 0, z - 0.04]} max={[-0.76, 0.012, z + 0.04]} system={null} paint="steelDark" bevel={0.002} />
      <Flange at={[-LOW.ro - 0.02, VAC.lineY, 0]} axis="x" r={0.045} sys={flk} />
      {/* motor supply cable from the floor trunking */}
      <Hose a={[-2.05, 0.06, -0.2]} da={[0, 1, 0]} b={[-2.04, y + m.r + 0.04, z + 0.1]} db={[0, 0, -1]} r={0.011} sys={null} via={[[-2.05, 0.25, -0.05], [-2.04, y + m.r + 0.06, z + 0.22]]} paint="deep" />
    </>
  );
}

/* ---------------------------------------------------------------- centre: casting machine */

function Frame() {
  const corners: Array<[number, number]> = [
    [-TIE.x, -TIE.z],
    [TIE.x, -TIE.z],
    [-TIE.x, TIE.z],
    [TIE.x, TIE.z],
  ];
  const y0 = 0.04;
  return (
    <>
      {/* welded box-section base frame on levelling feet, spring seat plate */}
      {[-TIE.z, TIE.z].map((z) => (
        <Block key={`z${z}`} min={[-0.56, y0, z - 0.05]} max={[0.56, BASE_H, z + 0.05]} system={null} paint="steelDark" bevel={0.008} />
      ))}
      {[-0.51, 0.51].map((x) => (
        <Block key={`x${x}`} min={[x - 0.05, y0, -TIE.z + 0.05]} max={[x + 0.05, BASE_H, TIE.z - 0.05]} system={null} paint="steelDark" bevel={0.008} />
      ))}
      {[-0.17, 0.17].map((z) => (
        <Block key={`c${z}`} min={[-0.46, y0 + 0.02, z - 0.03]} max={[0.46, BASE_H - 0.02, z + 0.03]} system={null} paint="steelDark" bevel={0.006} />
      ))}
      <Block min={[-0.26, BASE_H - 0.02, -0.26]} max={[0.26, BASE_H, 0.26]} system={null} paint="steelDark" bevel={0.004} />
      {[-0.51, 0.51].flatMap((x) =>
        [-TIE.z, TIE.z].map((z) => (
          <group key={`f${x}:${z}`}>
            <Pipe from={[x, 0, z]} to={[x, 0.014, z]} r={0.05} system={null} paint="steelDark" segments={24} />
            <Pipe from={[x, 0.014, z]} to={[x, y0, z]} r={0.014} system={null} paint="machined" segments={10} edges={false} />
            <Pipe from={[x, 0.024, z]} to={[x, 0.034, z]} r={0.026} system={null} paint="steelDark" segments={6} />
          </group>
        )),
      )}
      {corners.map(([x, z]) => (
        <group key={`${x}:${z}`}>
          <Pipe from={[x, BASE_H, z]} to={[x, TIE.top + 0.03, z]} r={TIE.r} system={null} paint="machined" segments={20} />
          <Pipe from={[x, TIE.top, z]} to={[x, TIE.top + 0.03, z]} r={TIE.r + 0.014} system={null} paint="steelDark" segments={6} />
          <Pipe from={[x, MID.y1, z]} to={[x, MID.y1 + 0.025, z]} r={TIE.r + 0.014} system={null} paint="steelDark" segments={6} />
          <Pipe from={[x, MID.y0 - 0.025, z]} to={[x, MID.y0, z]} r={TIE.r + 0.014} system={null} paint="steelDark" segments={6} />
          <Pipe from={[x, BASE_H, z]} to={[x, BASE_H + 0.03, z]} r={TIE.r + 0.014} system={null} paint="steelDark" segments={6} />
        </group>
      ))}
      {/* mid crosshead between the chambers, top crosshead carrying the actuator */}
      <Block min={[-0.54, MID.y0, -0.42]} max={[0.54, MID.y1, 0.42]} system={null} paint="steel" bevel={0.012} />
      <Block min={[-0.54, CROSS.y0, -0.42]} max={[0.54, CROSS.y1, 0.42]} system={null} paint="steel" bevel={0.012} />

      {/* operator HMI pendant on a swing arm off the front-left tie rod */}
      <Pipe from={[-TIE.x, 1.5, TIE.z]} to={[-TIE.x, 1.54, TIE.z]} r={TIE.r + 0.016} system={null} paint="steelDark" segments={16} />
      <Pipe from={[-TIE.x, 1.52, TIE.z]} to={[-0.72, 1.52, 0.62]} r={0.022} system={null} paint="steel" segments={14} />
      <Pipe from={[-0.72, 1.46, 0.62]} to={[-0.72, 1.54, 0.62]} r={0.03} system={null} paint="steelDark" segments={16} />
      <group position={[-0.72, 1.38, 0.66]} rotation={[-0.12, 0.52, 0]}>
        <Block min={[-0.15, -0.11, -0.03]} max={[0.15, 0.11, 0.03]} system={null} paint="paint" bevel={0.012} />
        <Block min={[-0.12, -0.075, 0.03]} max={[0.12, 0.085, 0.034]} system={null} paint="deep" bevel={0.002} edges={false} />
      </group>
      {/* control cable drop from the tray onto the top crosshead */}
      <Hose a={[-0.3, TRAY.y - 0.01, TRAY.z + 0.05]} da={[0, -1, 0]} b={[-0.3, CROSS.y1, -0.36]} db={[0, -1, 0]} r={0.011} sys={null} via={[[-0.3, 2.2, -0.62]]} paint="deep" />
    </>
  );
}

function FlaskChamber({ sys }: { sys: string | null }) {
  return (
    <>
      {/* floor, cut-away stainless shell, closure flange and seal */}
      <TwinPart system={sys} paint="machined" position={[0, (LOW.floor + LOW.y0) / 2, 0]}>
        <cylinderGeometry args={[LOW.ro + 0.04, LOW.ro + 0.04, LOW.y0 - LOW.floor, 56]} />
      </TwinPart>
      <CutWall name="low-shell" ri={LOW.ri} ro={LOW.ro} y0={LOW.y0} y1={LOW.y1} sys={sys} paint="machined" />
      <CutWall name="low-band" ri={LOW.ro} ro={LOW.ro + 0.014} y0={LOW.y0 + 0.08} y1={LOW.y0 + 0.11} sys={sys} paint="steelDark" />
      <CutWall name="low-flange" ri={LOW.ri} ro={LOW.ro + 0.04} y0={LOW.y1} y1={LOW.flange} sys={sys} paint="machined" />
      <CutWall name="low-seal" ri={LOW.ro - 0.03} ro={LOW.ro + 0.01} y0={LOW.flange} y1={MID.y0} sys={sys} paint="deep" cut={false} />
      {/* swing-bolt closure lugs on the solid side */}
      {[-2.4, -1.4, 2.0, 2.9].map((phi) => {
        const [x, , z] = radial(phi, LOW.ro + 0.07, 0);
        return <Block key={phi} min={[x - 0.03, LOW.y1 - 0.06, z - 0.03]} max={[x + 0.03, MID.y1, z + 0.03]} system={sys} paint="steelDark" bevel={0.008} />;
      })}
      {/* interlock switch on the closure */}
      <TwinPart system={sys} paint="paint" position={MOUNTS.S2.at} rotation={[0, P1_PHI, 0]}>
        <boxGeometry args={[0.05, 0.07, 0.035]} />
      </TwinPart>
      {/* investment flask: steel flask, investment top, sprue cup */}
      <Pipe from={[0, 0.44, 0]} to={[0, 0.74, 0]} r={0.075} system={sys} paint="shell" segments={40} />
      <Pipe from={[0, 0.74, 0]} to={[0, 0.746, 0]} r={0.069} system={sys} paint="concrete" segments={40} edges={false} />
      <Pipe from={[0, 0.72, 0]} to={[0, 0.748, 0]} r={0.012} r2={0.032} system={sys} paint="deep" segments={24} edges={false} />
      {/* neck between the chambers, pouring nozzle into the flask chamber */}
      <Pipe from={[0, MID.y1, 0]} to={[0, UP.y0 - 0.04, 0]} r={0.075} system={sys} paint="machined" segments={32} />
      <Pipe from={[0, 0.9, 0]} to={[0, MID.y0, 0]} r={0.016} r2={0.03} system={sys} paint="deep" segments={20} />
    </>
  );
}

/** Toggle clamp on the lid rim at angle `phi`: base on the shell band, lever over the lid. */
function LidClamp({ phi, sys }: { phi: number; sys: string | null }) {
  const [bx, , bz] = radial(phi, UP.ro + 0.035, 0);
  const [lx, , lz] = radial(phi, UP.ro + 0.005, 0);
  return (
    <group>
      <TwinPart system={sys} paint="steelDark" position={[bx, UP.y1 - 0.03, bz]} rotation={[0, phi, 0]}>
        <boxGeometry args={[0.05, 0.08, 0.03]} />
      </TwinPart>
      <TwinPart system={sys} paint="machined" position={[lx, UP.lid + 0.02, lz]} rotation={[0, phi, 0]}>
        <boxGeometry args={[0.03, 0.025, 0.09]} />
      </TwinPart>
    </group>
  );
}

function MeltingChamber({ sys, ind }: { sys: string | null; ind: string | null }) {
  const hinge = radial(Math.PI, UP.ro + 0.05, UP.lid - 0.01);
  return (
    <>
      {/* chamber floor, cut-away water-jacketed stainless shell, lid with guide bushing */}
      <TwinPart system={sys} paint="machined" position={[0, UP.y0 - 0.02, 0]}>
        <cylinderGeometry args={[UP.ro + 0.03, UP.ro + 0.03, 0.04, 64]} />
      </TwinPart>
      <CutWall name="up-shell" ri={UP.ri} ro={UP.ro} y0={UP.y0} y1={UP.y1} sys={sys} paint="machined" />
      <CutWall name="up-band-lo" ri={UP.ro} ro={UP.ro + 0.018} y0={UP.y0 + 0.06} y1={UP.y0 + 0.09} sys={sys} paint="steelDark" />
      <CutWall name="up-band-hi" ri={UP.ro} ro={UP.ro + 0.018} y0={UP.y1 - 0.09} y1={UP.y1 - 0.06} sys={sys} paint="steelDark" />
      <TwinPart system={sys} paint="machined" position={[0, (UP.y1 + UP.lid) / 2, 0]}>
        <cylinderGeometry args={[UP.ro + 0.03, UP.ro + 0.03, UP.lid - UP.y1, 64]} />
      </TwinPart>
      <Pipe from={[0, UP.lid, 0]} to={[0, UP.lid + 0.06, 0]} r={0.04} system={sys} paint="steelDark" segments={24} />
      {[-2.2, -1.25, 1.75, 2.6].filter((p) => !inCut(p)).map((phi) => (
        <LidClamp key={phi} phi={phi} sys={sys} />
      ))}
      {/* lid hinge: knuckles at the back */}
      {[-0.07, 0.07].map((dx) => (
        <Pipe key={dx} from={[hinge[0] + dx - 0.03, hinge[1], hinge[2]]} to={[hinge[0] + dx + 0.03, hinge[1], hinge[2]]} r={0.022} system={sys} paint="steelDark" segments={14} />
      ))}
      <Pipe from={[hinge[0] - 0.12, hinge[1], hinge[2]]} to={[hinge[0] + 0.12, hinge[1], hinge[2]]} r={0.009} system={sys} paint="machined" segments={8} edges={false} />

      {/* crucible on its ceramic support, molten charge */}
      <Pipe from={[0, UP.y0, 0]} to={[0, CRU.y0, 0]} r={0.07} system={sys} paint="concrete" segments={32} />
      <TwinPart
        system={sys}
        paint="deep"
        geometry={lathe("vpc-crucible", [
          [0, CRU.y0],
          [0.08, CRU.y0],
          [0.095, CRU.y1],
          [0.078, CRU.y1],
          [0.072, CRU.y0 + 0.04],
          [0, CRU.y0 + 0.04],
        ], 48)}
      />
      <TwinPart system={sys} paint="material" position={[0, CRU.melt, 0]} edges={false}>
        <cylinderGeometry args={[0.0775, 0.0765, 0.012, 40]} />
      </TwinPart>

      {/* sealing (stopper) rod through the lid into the charge */}
      <Pipe from={[0, CRU.y0 + 0.06, 0]} to={[0, ACT.y0 + 0.02, 0]} r={0.013} system={sys} paint="machined" segments={16} />
      <Pipe from={[0, CRU.y0 + 0.045, 0]} to={[0, CRU.y0 + 0.08, 0]} r={0.008} r2={0.02} system={sys} paint="concrete" segments={16} edges={false} />

      {/* Type-S thermocouple: ceramic sheath into the charge, terminal head on the lid, compensating cable */}
      <Pipe from={[-0.045, CRU.y0 + 0.1, 0.04]} to={[-0.06, UP.lid + 0.02, 0.06]} r={0.007} system={ind} paint="concrete" segments={10} edges={false} />
      <Block min={[-0.09, UP.lid, 0.03]} max={[-0.03, UP.lid + 0.06, 0.09]} system={ind} paint="paint" bevel={0.01} />
      <Hose a={[-0.09, UP.lid + 0.03, 0.06]} da={[-1, 0, 0]} b={[-0.3, CROSS.y0, -0.2]} db={[0, 1, 0]} r={0.006} sys={ind} sag={0.02} paint="deep" ferrules={false} />

      {/* induction coil around the crucible, leads out through the gland */}
      <TwinPart system={ind} paint="machined" geometry={helix(COIL.r, COIL.y0, COIL.y1, COIL.turns, 0.011, -Math.PI / 2)} edges={false} />
      {[COIL.y0, COIL.y1].map((y) => (
        <Pipe key={y} from={[-COIL.r, y, 0]} to={[-UP.ri, y, -0.02]} r={0.011} system={ind} paint="machined" segments={10} edges={false} />
      ))}
    </>
  );
}

function Actuator({ sys }: { sys: string | null }) {
  const a = ACT;
  return (
    <>
      {/* pneumatic cylinder: end caps, barrel, tie bolts, air fittings and hoses */}
      <Block min={[-0.08, a.y0, -0.08]} max={[0.08, a.y0 + 0.045, 0.08]} system={sys} paint="steelDark" bevel={0.01} />
      <Pipe from={[0, a.y0 + 0.045, 0]} to={[0, a.y1 - 0.045, 0]} r={a.r} system={sys} paint="machined" segments={36} />
      <Block min={[-0.08, a.y1 - 0.045, -0.08]} max={[0.08, a.y1, 0.08]} system={sys} paint="steelDark" bevel={0.01} />
      {[
        [-0.062, -0.062],
        [0.062, -0.062],
        [-0.062, 0.062],
        [0.062, 0.062],
      ].map(([x, z]) => (
        <Pipe key={`${x}:${z}`} from={[x, a.y0 + 0.045, z]} to={[x, a.y1 - 0.045, z]} r={0.006} system={sys} paint="steelDark" segments={8} edges={false} />
      ))}
      {[a.y0 + 0.022, a.y1 - 0.022].map((y) => (
        <Pipe key={y} from={[-0.08, y, 0]} to={[-0.11, y, 0]} r={0.01} system={sys} paint="machined" segments={10} edges={false} />
      ))}
      {/* valve terminal on the crosshead, air lines to both ports */}
      <Block min={[-0.38, CROSS.y1, -0.3]} max={[-0.22, CROSS.y1 + 0.07, -0.18]} system={sys} paint="paint" bevel={0.008} />
      {[a.y0 + 0.022, a.y1 - 0.022].map((y, i) => (
        <Hose key={y} a={[-0.11, y, 0]} da={[-1, 0, 0]} b={[-0.26 - i * 0.06, CROSS.y1 + 0.07, -0.24]} db={[0, -1, 0]} r={0.006} sys={sys} sag={0.02} paint="deep" ferrules={false} />
      ))}
    </>
  );
}

function VibrationBase({ sys }: { sys: string | null }) {
  const springs: Array<[number, number]> = [
    [-0.17, -0.17],
    [0.17, -0.17],
    [-0.17, 0.17],
    [0.17, 0.17],
  ];
  return (
    <>
      {springs.map(([x, z]) => (
        <group key={`${x}:${z}`} position={[x, 0, z]}>
          <TwinPart system={sys} paint="machined" geometry={helix(0.03, BASE_H + 0.012, LOW.floor - 0.012, 5, 0.006)} edges={false} />
          <Pipe from={[0, BASE_H, 0]} to={[0, BASE_H + 0.012, 0]} r={0.04} system={sys} paint="steelDark" segments={16} />
          <Pipe from={[0, LOW.floor - 0.012, 0]} to={[0, LOW.floor, 0]} r={0.04} system={sys} paint="steelDark" segments={16} />
        </group>
      ))}
      {/* direct-vibration motor hung under the chamber floor */}
      <Block min={[-0.05, 0.3, -0.05]} max={[0.05, LOW.floor, 0.05]} system={sys} paint="steelDark" bevel={0.008} />
      <Pipe from={[-0.1, 0.25, 0]} to={[0.1, 0.25, 0]} r={0.055} system={sys} paint="paint" segments={28} />
      <Pipe from={[-0.115, 0.25, 0]} to={[-0.1, 0.25, 0]} r={0.045} system={sys} paint="steelDark" segments={28} />
      <Pipe from={[0.1, 0.25, 0]} to={[0.115, 0.25, 0]} r={0.045} system={sys} paint="steelDark" segments={28} />
      {/* flask support plate inside the chamber */}
      <Pipe from={[0, LOW.y0, 0]} to={[0, 0.44, 0]} r={0.13} system={sys} paint="machined" segments={40} />
    </>
  );
}

/* ---------------------------------------------------------------- right: chiller and pump, gas supply */

function CoolingLoop({ sys }: { sys: string | null }) {
  const c = COOL;
  const ch = c.chiller;
  const z = c.z;
  const m = c.motor;
  const entry = Math.sqrt(UP.ro * UP.ro - z * z) - 0.005;
  return (
    <>
      {/* pump skid */}
      <Block min={[c.skid.x0, 0, c.skid.z0]} max={[ch.x0 - 0.01, 0.06, c.skid.z1]} system={sys} paint="steelDark" bevel={0.006} />
      <Block min={[m.x0 + 0.03, 0.06, z - 0.1]} max={[c.pumpX + 0.05, c.pumpY - m.r + 0.01, z + 0.1]} system={sys} paint="paint" bevel={0.008} />
      {/* recirculating chiller on castors */}
      <Block min={[ch.x0, ch.y0, ch.z0]} max={[ch.x1, ch.y1, ch.z1]} system={sys} paint="paint" bevel={0.02} />
      <Block min={[ch.x0 + 0.02, ch.y0 - 0.03, ch.z0 + 0.02]} max={[ch.x1 - 0.02, ch.y0, ch.z1 - 0.02]} system={sys} paint="steelDark" bevel={0.005} />
      <Pipe from={[2.05, ch.y1, -0.35]} to={[2.05, ch.y1 + 0.04, -0.35]} r={0.035} system={sys} paint="steelDark" segments={20} />
      {/* pump: TEFC motor, coupling, end-suction volute, suction from the chiller */}
      <Pipe from={[m.x0, c.pumpY, z]} to={[m.x1, c.pumpY, z]} r={m.r} system={sys} paint="paint" segments={36} />
      <Pipe from={[m.x0 - 0.07, c.pumpY, z]} to={[m.x0, c.pumpY, z]} r={m.r + 0.005} system={sys} paint="steelDark" segments={36} />
      <Pipe from={[m.x1, c.pumpY, z]} to={[c.pumpX - 0.06, c.pumpY, z]} r={0.06} r2={0.075} system={sys} paint="paint" segments={24} />
      <Pipe from={[c.pumpX - 0.06, c.pumpY, z]} to={[c.pumpX + 0.06, c.pumpY, z]} r={0.125} system={sys} paint="paint" segments={36} />
      <Run path={[[c.pumpX + 0.06, c.pumpY, z], [ch.x0, c.pumpY, z]]} r={0.03} sys={sys} flanged />
      {/* supply: pump discharge → riser → melting chamber jacket */}
      <Run path={[[c.pumpX, c.pumpY + 0.12, z], [c.pumpX, c.supplyY, z], [entry, c.supplyY, z]]} r={0.022} sys={sys} />
      {/* return: chamber jacket → back over to the chiller */}
      <Run path={[[entry, c.returnY, z], [c.returnX, c.returnY, z], [c.returnX, ch.y1, z]]} r={0.022} sys={sys} />
      {[c.supplyY, c.returnY].map((y) => (
        <Flange key={y} at={[entry + 0.03, y, z]} axis="x" r={0.04} sys={sys} />
      ))}
      <BallValve at={[c.pumpX, 1.0, z]} axis="y" r={0.022} sys={sys} />
      <BallValve at={[1.75, c.returnY, z]} axis="x" r={0.022} sys={sys} />
      {/* inline flow meter body on the supply */}
      <Block min={[1.06, c.supplyY - 0.045, z - 0.045]} max={[1.18, c.supplyY + 0.045, z + 0.06]} system={sys} paint="paint" bevel={0.012} />
      {/* pipe rack: two posts behind the lines, cantilever arms and U-bolts */}
      {c.rackX.map((x) => (
        <group key={x}>
          <Block min={[x - 0.06, 0, c.rackZ - 0.06]} max={[x + 0.06, 0.012, c.rackZ + 0.06]} system={null} paint="steelDark" bevel={0.002} />
          <Block min={[x - 0.022, 0.012, c.rackZ - 0.022]} max={[x + 0.022, c.returnY + 0.08, c.rackZ + 0.022]} system={null} paint="steel" bevel={0.004} />
          {[c.supplyY, c.returnY].map((y) => (
            <group key={y}>
              <Block min={[x - 0.018, y - 0.04, c.rackZ]} max={[x + 0.018, y - 0.022, z + 0.03]} system={null} paint="steel" bevel={0.003} />
              <TwinPart system={null} paint="steelDark" position={[x, y, z]} rotation={[0, Math.PI / 2, 0]} edges={false}>
                <torusGeometry args={[0.026, 0.004, 6, 16, Math.PI]} />
              </TwinPart>
            </group>
          ))}
        </group>
      ))}
      {/* power cable drop from the tray */}
      <Hose a={[2.38, TRAY.y - 0.01, TRAY.z + 0.04]} da={[0, -1, 0]} b={[2.4, ch.y1, -0.42]} db={[0, -1, 0]} r={0.011} sys={null} via={[[2.38, 1.6, -0.74]]} paint="deep" />
    </>
  );
}

function GasSupply({ sys }: { sys: string | null }) {
  const g = GAS;
  const [ix, iz] = g.inlet;
  return (
    <>
      {/* cylinder stand: base plate, back post, two chain hoops */}
      <Block min={[g.x - 0.17, 0, g.z - 0.2]} max={[g.x + 0.17, 0.014, g.z + 0.17]} system={null} paint="steelDark" bevel={0.003} />
      <Block min={[g.x - 0.03, 0.014, g.z - g.r - 0.07]} max={[g.x + 0.03, 1.25, g.z - g.r - 0.03]} system={null} paint="steelDark" bevel={0.005} />
      {[0.45, 1.0].map((y) => (
        <group key={y}>
          <TwinPart system={null} paint="steelDark" position={[g.x, y, g.z]} rotation={[Math.PI / 2, 0, 0]} edges={false}>
            <torusGeometry args={[g.r + 0.008, 0.007, 6, 40]} />
          </TwinPart>
          <Block min={[g.x - 0.04, y - 0.02, g.z - g.r - 0.05]} max={[g.x + 0.04, y + 0.02, g.z - g.r + 0.005]} system={null} paint="steelDark" bevel={0.004} />
        </group>
      ))}
      {/* cylinder: body with domed shoulder, neck ring, valve, guard collar, handwheel */}
      <TwinPart
        system={sys}
        paint="paint"
        geometry={lathe("vpc-gas-cyl", [
          [0, 0.014],
          [g.r * 0.9, 0.014],
          [g.r, 0.04],
          [g.r, 1.22],
          [g.r * 0.82, 1.32],
          [g.r * 0.42, 1.37],
          [0.03, 1.38],
          [0, 1.38],
        ], 48)}
        position={[g.x, 0, g.z]}
      />
      <Pipe from={[g.x, 1.36, g.z]} to={[g.x, 1.385, g.z]} r={0.045} system={sys} paint="steelDark" segments={24} />
      <Pipe from={[g.x, 1.38, g.z]} to={[g.x, g.top, g.z]} r={0.022} system={sys} paint="machined" segments={16} />
      <Block min={[g.x - 0.028, g.top, g.z - 0.028]} max={[g.x + 0.028, g.top + 0.07, g.z + 0.028]} system={sys} paint="machined" bevel={0.008} />
      <Pipe from={[g.x, g.top + 0.07, g.z]} to={[g.x, g.top + 0.09, g.z]} r={0.008} system={sys} paint="machined" segments={8} edges={false} />
      <TwinPart system={sys} paint="steelDark" position={[g.x, g.top + 0.095, g.z]} rotation={[Math.PI / 2, 0, 0]} edges={false}>
        <torusGeometry args={[0.032, 0.006, 6, 20]} />
      </TwinPart>
      {/* two-stage regulator with inlet / outlet gauges, pigtail from the valve */}
      <Hose a={[g.x - 0.028, g.top + 0.035, g.z]} da={[-1, 0, 0]} b={[g.x - 0.1, g.top + 0.04, g.z]} db={[-1, 0, 0]} r={0.008} sys={sys} sag={0.03} paint="machined" ferrules={false} />
      <Pipe from={[g.x - 0.15, g.top - 0.01, g.z]} to={[g.x - 0.15, g.top + 0.1, g.z]} r={0.042} system={sys} paint="paint" segments={24} />
      <Pipe from={[g.x - 0.15, g.top + 0.1, g.z]} to={[g.x - 0.15, g.top + 0.13, g.z]} r={0.03} system={sys} paint="steelDark" segments={20} />
      {[g.x - 0.19, g.x - 0.11].map((x) => (
        <group key={x}>
          <Pipe from={[x, g.top + 0.05, g.z]} to={[x, g.top + 0.05, g.z + 0.05]} r={0.008} system={sys} paint="machined" segments={8} edges={false} />
          <Pipe from={[x, g.top + 0.05, g.z + 0.05]} to={[x, g.top + 0.05, g.z + 0.075]} r={0.036} system={sys} paint="steelDark" segments={28} />
        </group>
      ))}
      {/* line to the machine: drop, run past the solenoid valve, riser, header into the lid */}
      <Run
        path={[
          [g.x - 0.19, g.top + 0.04, g.z],
          [2.75, g.top + 0.04, g.z],
          [2.75, g.lineY, g.z],
          [g.riseX, g.lineY, g.z],
          [g.riseX, g.headerY, g.z],
          [ix, g.headerY, iz],
          [ix, UP.lid, iz],
        ]}
        r={0.014}
        sys={sys}
        paint="machined"
        bend={4}
      />
      {/* pipe stanchions with saddles under the line, bracket from the tie rod to the riser */}
      {[2.2, 1.35].map((x) => (
        <group key={x}>
          <Block min={[x - 0.05, 0, g.z - 0.05]} max={[x + 0.05, 0.01, g.z + 0.05]} system={null} paint="steelDark" bevel={0.002} />
          <Pipe from={[x, 0.01, g.z]} to={[x, g.lineY - 0.022, g.z]} r={0.016} system={null} paint="steelDark" segments={10} edges={false} />
          <Block min={[x - 0.02, g.lineY - 0.024, g.z - 0.02]} max={[x + 0.02, g.lineY - 0.012, g.z + 0.02]} system={null} paint="steelDark" bevel={0.002} />
        </group>
      ))}
      <Block min={[TIE.x + TIE.r, 1.6 - 0.012, g.z - 0.012]} max={[g.riseX, 1.6 + 0.012, g.z + 0.012]} system={null} paint="steel" bevel={0.003} />
      <TwinPart system={null} paint="steelDark" position={[g.riseX, 1.6, g.z]} rotation={[Math.PI / 2, 0, 0]} edges={false}>
        <torusGeometry args={[0.02, 0.004, 6, 16]} />
      </TwinPart>
      {/* solenoid valve block with coil and plug connector, cable up to the tray */}
      <Block min={[1.08, g.lineY - 0.04, g.z - 0.035]} max={[1.22, g.lineY + 0.04, g.z + 0.035]} system={sys} paint="steelDark" bevel={0.01} />
      <Pipe from={[1.15, g.lineY + 0.04, g.z]} to={[1.15, g.lineY + 0.12, g.z]} r={0.033} system={sys} paint="paint" segments={24} />
      <Block min={[1.12, g.lineY + 0.12, g.z - 0.02]} max={[1.18, g.lineY + 0.15, g.z + 0.03]} system={sys} paint="deep" bevel={0.005} />
      {/* upper-chamber pressure manifold port (P1) */}
      <Pipe from={radial(P1_PHI, UP.ro, 1.62)} to={radial(P1_PHI, UP.ro + 0.06, 1.62)} r={0.014} system={sys} paint="machined" segments={12} edges={false} />
    </>
  );
}

/** Overhead ladder cable tray on posts, from the cabinet roof across the cell. */
function CableTray() {
  const t = TRAY;
  return (
    <>
      {t.posts.map((x) => (
        <group key={x}>
          <Block min={[x - 0.06, 0, t.z - 0.06]} max={[x + 0.06, 0.012, t.z + 0.06]} system={null} paint="steelDark" bevel={0.002} />
          <Block min={[x - 0.025, 0.012, t.z - 0.025]} max={[x + 0.025, t.y - 0.04, t.z + 0.025]} system={null} paint="steel" bevel={0.004} />
          <Block min={[x - 0.02, t.y - 0.05, t.z - t.w / 2 - 0.02]} max={[x + 0.02, t.y - 0.03, t.z + t.w / 2 + 0.02]} system={null} paint="steel" bevel={0.003} />
        </group>
      ))}
      <Block min={[CAB.x1 - 0.42, CAB.y1 + 0.03, t.z - 0.025]} max={[CAB.x1 - 0.37, t.y - 0.04, t.z + 0.025]} system={null} paint="steel" bevel={0.004} />
    </>
  );
}

/* ---------------------------------------------------------------- detail layer */

/**
 * Machine-kit (TSE) finishing detail, merged per subsystem and material: cabinet doors,
 * HMI, lamps and louvres; generator panels, louvres and display; motor cooling ribs and
 * cowl grilles; bellows convolutions; chiller condenser grilles, fan, panel and castors;
 * lid and flange bolt circles; skid anchor bolts; gauge faces and bezels; the ladder
 * tray's rails, rungs and cable bundle; floor trunking; and a field transmitter behind
 * every scheduled sensor point.
 */
function buildVpcDetail(mats: KitMats, edgeMat: THREE.LineBasicMaterial, owners: Record<VpcRole, string | null>): THREE.Group {
  const root = new THREE.Group();
  const k = kitBuilder(mats);
  const role = (r: VpcRole | null) => {
    const grp = new THREE.Group();
    grp.userData.role = r;
    root.add(grp);
    k.into(grp);
    return grp;
  };
  /** Axial cooling ribs around a motor frame along x. */
  const ribs = (x0: number, x1: number, y: number, z: number, r: number, n = 20) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      if (Math.sin(a) < -0.55) continue; // feet side
      const rib = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0 - 0.04, 0.022, 0.006), mats.model);
      rib.position.set((x0 + x1) / 2, y + Math.sin(a) * (r + 0.009), z + Math.cos(a) * (r + 0.009));
      rib.rotation.x = -a + Math.PI / 2;
      k.add(rib);
    }
  };
  /** Fan cowl grille: recess disc with concentric rings, axis x, facing -x. */
  const cowl = (x: number, y: number, z: number, r: number) => {
    k.disc(r - 0.01, 0.006, x, y, z, "x", mats.recess, 28);
    for (const f of [0.35, 0.6, 0.85]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(r * f, 0.003, 4, 28), mats.steel);
      ring.rotation.y = Math.PI / 2;
      ring.position.set(x - 0.004, y, z);
      k.add(ring);
    }
  };
  /** Horizontal louvre slats on a ±z face. */
  const louvres = (x0: number, x1: number, y0: number, y1: number, z: number, step = 0.03) => {
    for (let y = y0; y < y1; y += step) k.box(x1 - x0, 0.01, 0.018, (x0 + x1) / 2, y, z, mats.recess);
  };
  /** Vertical louvre slats on a +x face. */
  const louvresX = (x: number, y0: number, y1: number, z0: number, z1: number, step = 0.03) => {
    for (let y = y0; y < y1; y += step) k.box(0.018, 0.01, z1 - z0, x, y, (z0 + z1) / 2, mats.recess);
  };

  /* induction: cabinet and generator */
  role("ind");
  const c = CAB;
  const mx = (c.x0 + c.x1) / 2;
  k.panel("+z", c.x0 + 0.015, mx - 0.004, c.y0 + 0.03, c.y1 - 0.03, c.z0, c.z1, 0.035);
  k.panel("+z", mx + 0.004, c.x1 - 0.015, c.y0 + 0.03, c.y1 - 0.03, c.z0, c.z1, 0.035);
  k.box(0.26, 0.2, 0.02, c.x0 + 0.2, 1.38, c.z1 + 0.04, mats.recess); // HMI
  for (let i = 0; i < 3; i++) k.disc(0.014, 0.02, c.x0 + 0.48 + i * 0.07, 1.4, c.z1 + 0.045, "z", mats.machined, 14); // pilot lamps
  for (let i = 0; i < 2; i++) k.disc(0.018, 0.02, c.x0 + 0.52 + i * 0.1, 1.3, c.z1 + 0.045, "z", mats.steel, 14); // selector switches
  louvres(c.x0 + 0.1, c.x0 + 0.32, 0.25, 0.48, c.z1 + 0.035);
  louvres(mx + 0.08, c.x1 - 0.1, 0.25, 0.48, c.z1 + 0.035);
  louvresX(c.x1 + 0.005, 1.4, 1.75, c.z0 + 0.1, c.z1 - 0.1); // side filter-fan louvre
  louvresX(c.x1 + 0.005, 0.3, 0.6, c.z0 + 0.1, c.z1 - 0.1);
  for (let i = 0; i < 3; i++) k.disc(0.018, 0.02, c.x1 - 0.26 + i * 0.075, c.y1 + 0.07, c.z0 + 0.14 + i * 0.05, "y", mats.steel, 12); // cable glands
  const g = GEN;
  k.panel("+z", g.x0, g.x1, g.y0, g.y1, g.z0, g.z1, 0.035);
  k.box(0.22, 0.1, 0.02, g.x1 - 0.2, 1.04, g.z1 + 0.04, mats.recess); // display
  for (let i = 0; i < 3; i++) k.disc(0.012, 0.02, g.x1 - 0.26 + i * 0.06, 0.95, g.z1 + 0.045, "z", mats.machined, 12);
  louvres(g.x0 + 0.12, g.x0 + 0.5, g.y0 + 0.07, 0.85, g.z1 + 0.035, 0.028);
  louvresX(g.x1 + 0.005, g.y0 + 0.08, 0.78, g.z0 + 0.06, g.z1 - 0.06, 0.028);
  // floor trunking: cabinet → generator → machine base
  k.beam([c.x1, 0.04, -0.53], [-0.56, 0.04, -0.53], 0.14, 0.08, mats.steel);
  for (let x = c.x1 + 0.3; x < -0.6; x += 0.6) k.box(0.01, 0.006, 0.14, x, 0.08, -0.53, mats.recess); // cover joints

  /* vacuum pump */
  role("vac");
  const m = VAC.motor;
  ribs(m.x0 + 0.02, m.x1 - 0.02, m.y, VAC.z, m.r);
  cowl(m.x0 - 0.103, m.y, VAC.z, m.r);
  ribs(VAC.pump.x0 + 0.02, VAC.pump.x1 - 0.02, m.y, VAC.z, VAC.pump.r, 14);
  k.disc(0.026, 0.01, -1.42, 0.17, VAC.z + 0.152, "z", mats.recess, 18); // oil sight glass
  k.disc(0.034, 0.006, -1.42, 0.17, VAC.z + 0.149, "z", mats.steel, 18);
  for (let y = 0.525; y < 0.65; y += 0.011) k.disc(0.034, 0.005, VAC.inletX, y, VAC.z, "y", mats.machined, 20); // bellows convolutions
  for (const bx of [VAC.skid.x0 + 0.06, VAC.skid.x1 - 0.06]) for (const bz of [VAC.skid.z0 + 0.06, VAC.skid.z1 - 0.06]) k.bolt(bx, 0.06, bz, "y", 0.016);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    k.bolt(VAC.pump.x1 + 0.031, m.y + Math.sin(a) * 0.11, VAC.z + Math.cos(a) * 0.11, "x", 0.012);
  }
  k.beam([c.x1, 0.03, -0.2], [-2.05, 0.03, -0.2], 0.08, 0.06, mats.steel);

  /* crucible / stopper: lid bolt circle */
  role("stp");
  for (let i = 0; i < 20; i++) {
    const a = (i / 20) * Math.PI * 2;
    k.bolt(Math.sin(a) * (UP.ro + 0.012), UP.lid + 0.005, Math.cos(a) * (UP.ro + 0.012), "y", 0.01);
  }

  /* flask chamber: closure flange bolts on the solid side */
  role("flk");
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    if (inCut(a)) continue;
    k.bolt(Math.sin(a) * (LOW.ro + 0.022), LOW.flange + 0.005, Math.cos(a) * (LOW.ro + 0.022), "y", 0.01);
  }

  /* cooling: chiller grilles, fan, control panel, castors; pump motor ribs */
  role("cool");
  const ch = COOL.chiller;
  louvres(ch.x0 + 0.06, ch.x1 - 0.06, ch.y0 + 0.08, 0.62, ch.z1 + 0.005, 0.024);
  louvresX(ch.x1 + 0.005, ch.y0 + 0.08, ch.y1 - 0.08, ch.z0 + 0.06, ch.z1 - 0.06, 0.024);
  k.box(0.2, 0.12, 0.02, ch.x1 - 0.16, 0.76, ch.z1 + 0.005, mats.model); // control panel
  k.box(0.1, 0.05, 0.01, ch.x1 - 0.18, 0.79, ch.z1 + 0.018, mats.recess); // display
  for (let i = 0; i < 3; i++) k.disc(0.009, 0.015, ch.x1 - 0.1 + i * 0.0, 0.8 - i * 0.03, ch.z1 + 0.02, "z", mats.machined, 10);
  k.box(0.012, 0.22, 0.012, ch.x0 + 0.06, 0.66, ch.z1 + 0.012, mats.recess); // level sight tube
  k.disc(0.14, 0.012, 2.38, ch.y1 + 0.006, -0.25, "y", mats.recess, 32); // condenser fan
  for (const f of [0.4, 0.7, 1.0]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.14 * f, 0.003, 4, 32), mats.steel);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(2.38, ch.y1 + 0.014, -0.25);
    k.add(ring);
  }
  for (const cx of [ch.x0 + 0.07, ch.x1 - 0.07]) {
    for (const cz of [ch.z0 + 0.07, ch.z1 - 0.07]) {
      k.box(0.05, 0.03, 0.05, cx, ch.y0 - 0.06, cz, mats.steel); // castor fork
      k.disc(0.045, 0.03, cx, 0.045, cz, "x", mats.recess, 18); // wheel
    }
  }
  ribs(COOL.motor.x0 + 0.02, COOL.motor.x1 - 0.02, COOL.pumpY, COOL.z, COOL.motor.r, 16);
  cowl(COOL.motor.x0 - 0.073, COOL.pumpY, COOL.z, COOL.motor.r);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    k.bolt(COOL.pumpX + 0.062, COOL.pumpY + Math.sin(a) * 0.1, COOL.z + Math.cos(a) * 0.1, "x", 0.011);
  }
  for (const bx of [COOL.skid.x0 + 0.05, COOL.chiller.x0 - 0.06]) for (const bz of [COOL.skid.z0 + 0.06, COOL.skid.z1 - 0.06]) k.bolt(bx, 0.06, bz, "y", 0.016);

  /* gas: gauge faces and bezels */
  role("gas");
  for (const x of [GAS.x - 0.19, GAS.x - 0.11]) {
    k.disc(0.03, 0.006, x, GAS.top + 0.05, GAS.z + 0.077, "z", mats.recess, 24);
    const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.004, 6, 24), mats.machined);
    bezel.position.set(x, GAS.top + 0.05, GAS.z + 0.076);
    k.add(bezel);
  }

  /* structure: ladder cable tray with a cable bundle, field transmitters behind every sensor point */
  role(null);
  const t = TRAY;
  for (const dz of [-t.w / 2, t.w / 2]) k.beam([t.x0, t.y, t.z + dz], [t.x1, t.y, t.z + dz], 0.012, 0.06, mats.steel);
  for (let x = t.x0 + 0.05; x < t.x1; x += 0.15) k.box(0.025, 0.012, t.w, x, t.y - 0.03, t.z, mats.steel);
  for (let i = 0; i < 4; i++) k.tube([t.x0, t.y - 0.008, t.z - 0.06 + i * 0.035], [t.x1 - 0.05, t.y - 0.008, t.z - 0.06 + i * 0.035], 0.011, mats.recess, 8);
  const Y = new THREE.Vector3(0, 1, 0);
  for (const mt of Object.values(MOUNTS)) {
    if (mt.bare) continue;
    const at = new THREE.Vector3(...mt.at);
    const n = new THREE.Vector3(...mt.n);
    const q = new THREE.Quaternion().setFromUnitVectors(Y, n);
    const part = (geo: THREE.BufferGeometry, mat: THREE.Material, d: number) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(at).addScaledVector(n, d);
      mesh.quaternion.copy(q);
      k.add(mesh);
    };
    part(new THREE.CylinderGeometry(0.014, 0.014, 0.02, 6), mats.machined, 0.01); // hex process fitting
    part(new THREE.CylinderGeometry(0.006, 0.006, 0.02, 8), mats.machined, 0.03); // neck
    part(new THREE.CylinderGeometry(0.024, 0.024, 0.06, 18), mats.model, 0.07); // transmitter body
    part(new THREE.CylinderGeometry(0.02, 0.02, 0.006, 18), mats.recess, 0.103); // display window
    // cable gland off the side of the body
    const side = new THREE.Vector3().crossVectors(n, Math.abs(n.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : Y).normalize();
    const gland = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.02, 8), mats.steel);
    gland.position.copy(at).addScaledVector(n, 0.07).addScaledVector(side, 0.032);
    gland.quaternion.setFromUnitVectors(Y, side);
    k.add(gland);
  }

  for (const grp of root.children as THREE.Group[]) {
    const r = grp.userData.role as VpcRole | null;
    for (const mesh of finishKitGroup(grp, edgeMat, [mats.rail, mats.material, mats.bolt, mats.recess])) mesh.userData.system = r ? owners[r] : null;
  }
  return root;
}

function VpcDetail({ owners }: { owners: Record<VpcRole, string | null> }) {
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
    return buildVpcDetail(mats, edgeMat, owners);
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

/* ---------------------------------------------------------------- model */

const ROLE_MATCH: Array<[VpcRole, RegExp]> = [
  ["vac", /vpc-vacuum|vacuum/i],
  ["ind", /vpc-induction|induction/i],
  ["gas", /vpc-gas|gas/i],
  ["cool", /vpc-cooling|cooling/i],
  ["stp", /vpc-stopper|crucible|stopper/i],
  ["flk", /vpc-flask|flask/i],
  ["vib", /vpc-vibration|vibration/i],
];

/** Subsystem id that owns each VPC role, matched on the DB system ids / names. */
export function vpcOwners(systems: Array<{ id: string; name: string }>): Record<VpcRole, string | null> {
  const out = {} as Record<VpcRole, string | null>;
  for (const [r, re] of ROLE_MATCH) out[r] = systems.find((s) => re.test(`${s.id} ${s.name}`))?.id ?? null;
  return out;
}

export function VpcModel({ owners }: { owners: Record<VpcRole, string | null> }) {
  return (
    <group position={[-VPC_CENTRE_X, 0, 0]}>
      <ControlCabinet sys={owners.ind} />
      <Generator sys={owners.ind} />
      <VacuumPump sys={owners.vac} flk={owners.flk} />
      <Frame />
      <VibrationBase sys={owners.vib} />
      <FlaskChamber sys={owners.flk} />
      <MeltingChamber sys={owners.stp} ind={owners.ind} />
      <Actuator sys={owners.stp} />
      <CoolingLoop sys={owners.cool} />
      <GasSupply sys={owners.gas} />
      <CableTray />
      <VpcDetail owners={owners} />
    </group>
  );
}
