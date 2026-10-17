"use client";

import type { ThreeEvent } from "@react-three/fiber";
import React, { createContext, useContext, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { grainTexture } from "./twin-textures";

/* ==========================================================================
   One mesh of a machine twin, and the shared building blocks (bevelled
   blocks, pipes, I-beams, platforms with handrails, stairs). A part belongs
   to a subsystem (or to nothing, for structure); hovering it highlights the
   subsystem, clicking selects it. Materials are shared per paint in the ULTRON
   machine-kit (TSE) style: matte graphite bodies, brushed metal only where it
   is metal, muted brass for process material, and a mid-grey rim on every
   hard edge (the drawings' outline).
   ========================================================================== */

export type TwinPaint =
  | "concrete"
  | "steel"
  | "steelDark"
  | "shell"
  | "machined"
  | "paint"
  | "housing"
  | "grating"
  | "material"
  | "heat"
  | "deep";

export interface PartCtxValue {
  materials: Record<TwinPaint, THREE.Material>;
  selectedId: string | null;
  hoverId: string | null;
  selectColor: string;
  hoverColor: string;
  /** Machine-kit rim colour on every hard edge (--mx-edge). */
  edgeColor: string;
  onOver: (id: string) => void;
  onOut: () => void;
  onPick: (id: string) => void;
}

export const PartCtx = createContext<PartCtxValue | null>(null);

/** Colours of every paint (grating is derived from steel). */
export type TwinPaints = Record<Exclude<TwinPaint, "grating">, string>;

/** Shell length and burning zone, for the shell skin texture. */
export interface ShellSkin {
  length: number;
  burning: [number, number];
}

/** The shared machine-kit material per paint. Built once per palette. */
export function useTwinMaterials(paints: TwinPaints, skin: ShellSkin) {
  return useMemo<Record<TwinPaint, THREE.Material>>(() => {
    void skin;
    const brushed = grainTexture(5, [2, 8], 140);
    // Faces sit a hair behind their rim lines so the outline never z-fights.
    const std = (p: THREE.MeshStandardMaterialParameters) =>
      new THREE.MeshStandardMaterial({ polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, ...p });
    return {
      concrete: std({ color: paints.concrete, roughness: 0.85, metalness: 0.05 }),
      steel: std({ color: paints.steel, roughness: 0.62, metalness: 0.28 }),
      steelDark: std({ color: paints.steelDark, roughness: 0.55, metalness: 0.4 }),
      shell: std({ color: paints.shell, roughness: 0.62, metalness: 0.2 }),
      machined: std({ color: paints.machined, roughness: 0.34, metalness: 0.75, roughnessMap: brushed }),
      paint: std({ color: paints.paint, roughness: 0.7, metalness: 0.12 }),
      housing: std({ color: paints.housing, roughness: 0.7, metalness: 0.15 }),
      grating: std({ color: paints.steelDark, roughness: 0.7, metalness: 0.35 }),
      material: std({ color: paints.material, roughness: 0.85, metalness: 0.05 }),
      heat: std({ color: paints.heat, roughness: 0.6, metalness: 0.2 }),
      deep: std({ color: paints.deep, roughness: 0.5, metalness: 0.2 }),
    };
  }, [paints, skin]);
}

/* ---------------------------------------------------------------- geometry cache */

const geoCache = new Map<string, THREE.BufferGeometry>();
function cached(key: string, make: () => THREE.BufferGeometry) {
  let g = geoCache.get(key);
  if (!g) {
    g = make();
    geoCache.set(key, g);
  }
  return g;
}

const r3 = (n: number) => Math.round(n * 1000) / 1000;

export function roundedBox(w: number, h: number, d: number, radius: number) {
  const rad = Math.min(radius, w / 2.01, h / 2.01, d / 2.01);
  return cached(`rb:${r3(w)}:${r3(h)}:${r3(d)}:${r3(rad)}`, () => new RoundedBoxGeometry(w, h, d, 3, rad));
}

/** Turned part around +y from an (r, y) profile; a partial sweep (phiLength < 2π) leaves a cut-away. */
export function lathe(key: string, profile: Array<[number, number]>, segments = 64, phiStart = 0, phiLength = Math.PI * 2) {
  return cached(`la:${key}:${segments}:${r3(phiStart)}:${r3(phiLength)}`, () =>
    new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segments, phiStart, phiLength),
  );
}

/** Wide-flange (HEB-style) section, extruded along +y. */
export function iBeam(length: number, size = 0.3) {
  return cached(`ib:${r3(length)}:${size}`, () => {
    const f = size * 0.09;
    const w = size * 0.06;
    const s = new THREE.Shape();
    const h = size / 2;
    s.moveTo(-h, -h);
    s.lineTo(h, -h);
    s.lineTo(h, -h + f);
    s.lineTo(w / 2, -h + f);
    s.lineTo(w / 2, h - f);
    s.lineTo(h, h - f);
    s.lineTo(h, h);
    s.lineTo(-h, h);
    s.lineTo(-h, h - f);
    s.lineTo(-w / 2, h - f);
    s.lineTo(-w / 2, -h + f);
    s.lineTo(-h, -h + f);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: length, bevelEnabled: false });
    g.rotateX(-Math.PI / 2); // extrude along +y
    return g;
  });
}

/* ---------------------------------------------------------------- rim */

/**
 * The rim on a part's hard edges: plain 1 px line segments, with the edge geometry
 * cached per source geometry (parts share geometries) and one line material per
 * colour. drei's <Edges> builds a screen-space fat line with its own geometry and
 * material for every part, which made a twin of a few hundred parts stall on load.
 */
const rimGeometries = new WeakMap<THREE.BufferGeometry, THREE.EdgesGeometry>();
const rimMaterials = new Map<string, THREE.LineBasicMaterial>();
const noRaycast = () => undefined;

function rimMaterial(color: string) {
  let m = rimMaterials.get(color);
  if (!m) {
    m = new THREE.LineBasicMaterial({ color });
    rimMaterials.set(color, m);
  }
  return m;
}

function Rim({ color }: { color: string }) {
  const ref = useRef<THREE.LineSegments>(null);
  // The parent mesh gets its geometry (prop or child element) before this runs.
  useLayoutEffect(() => {
    const seg = ref.current;
    const src = (seg?.parent as THREE.Mesh | null)?.geometry;
    if (!seg || !src) return;
    let g = rimGeometries.get(src);
    if (!g) {
      g = new THREE.EdgesGeometry(src, 30);
      rimGeometries.set(src, g);
    }
    if (seg.geometry !== g) seg.geometry = g;
  });
  return <lineSegments ref={ref} material={rimMaterial(color)} raycast={noRaycast} />;
}

/* ---------------------------------------------------------------- part */

export function TwinPart({
  system,
  paint,
  position,
  rotation,
  quaternion,
  geometry,
  children,
  edges = true,
  shadow = true,
}: {
  /** Owning subsystem id, or null for structure. */
  system: string | null;
  paint: TwinPaint;
  position?: [number, number, number] | THREE.Vector3;
  rotation?: [number, number, number];
  quaternion?: THREE.Quaternion;
  geometry?: THREE.BufferGeometry;
  /** Inline geometry, when `geometry` is not given. */
  children?: React.ReactNode;
  edges?: boolean;
  shadow?: boolean;
}) {
  const ctx = useContext(PartCtx);
  if (!ctx) return null;
  const selected = system !== null && system === ctx.selectedId;
  const hovered = system !== null && system === ctx.hoverId && !selected;
  const handlers = system
    ? {
        onPointerOver: (e: ThreeEvent<PointerEvent>) => {
          e.stopPropagation();
          ctx.onOver(system);
        },
        onPointerOut: () => ctx.onOut(),
        onClick: (e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          ctx.onPick(system);
        },
      }
    : {};
  return (
    <mesh
      position={position}
      rotation={rotation}
      quaternion={quaternion}
      geometry={geometry}
      material={ctx.materials[paint]}
      castShadow={shadow}
      receiveShadow
      userData={{ system }}
      {...handlers}
    >
      {children}
      {edges && <Rim color={selected ? ctx.selectColor : hovered ? ctx.hoverColor : ctx.edgeColor} />}
    </mesh>
  );
}

const Y = new THREE.Vector3(0, 1, 0);

/** A round member (pipe, shaft, duct) between two points. */
export function Pipe({
  from,
  to,
  r,
  r2,
  system,
  paint,
  segments = 20,
  edges,
}: {
  from: [number, number, number];
  to: [number, number, number];
  r: number;
  r2?: number;
  system: string | null;
  paint: TwinPaint;
  segments?: number;
  edges?: boolean;
}) {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const dir = b.clone().sub(a);
  const len = dir.length();
  const q = new THREE.Quaternion().setFromUnitVectors(Y, dir.normalize());
  const mid = a.add(b).multiplyScalar(0.5);
  const geometry = cached(`cy:${r3(r2 ?? r)}:${r3(r)}:${r3(len)}:${segments}`, () => new THREE.CylinderGeometry(r2 ?? r, r, len, segments));
  return <TwinPart system={system} paint={paint} position={mid} quaternion={q} geometry={geometry} edges={edges} />;
}

/** A bevelled box from its min corner to its max corner. */
export function Block({
  min,
  max,
  system,
  paint,
  edges,
  bevel = 0.04,
}: {
  min: readonly [number, number, number];
  max: readonly [number, number, number];
  system: string | null;
  paint: TwinPaint;
  edges?: boolean;
  bevel?: number;
}) {
  const w = max[0] - min[0];
  const h = max[1] - min[1];
  const d = max[2] - min[2];
  const c: [number, number, number] = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
  return <TwinPart system={system} paint={paint} position={c} geometry={roundedBox(w, h, d, bevel)} edges={edges} />;
}

/** Vertical wide-flange column from the floor (or `y0`) to `y1`. */
export function Column({ x, z, y0 = 0, y1, size = 0.3 }: { x: number; z: number; y0?: number; y1: number; size?: number }) {
  return <TwinPart system={null} paint="steel" position={[x, y0, z]} geometry={iBeam(y1 - y0, size)} edges={false} />;
}

/** Horizontal wide-flange beam between two points at the same height. */
export function Beam({ from, to, size = 0.26 }: { from: [number, number, number]; to: [number, number, number]; size?: number }) {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const dir = b.clone().sub(a);
  const q = new THREE.Quaternion().setFromUnitVectors(Y, dir.clone().normalize());
  return <TwinPart system={null} paint="steel" position={a} quaternion={q} geometry={iBeam(dir.length(), size)} edges={false} />;
}

/** Handrail along a polyline: posts every ~1.5 m, top and knee rails, toe plate. */
export function Handrail({ path, y }: { path: Array<[number, number]>; y: number }) {
  const parts: React.ReactNode[] = [];
  for (let i = 0; i < path.length - 1; i++) {
    const [x0, z0] = path[i];
    const [x1, z1] = path[i + 1];
    const len = Math.hypot(x1 - x0, z1 - z0);
    const n = Math.max(1, Math.round(len / 1.5));
    for (let k = 0; k <= n; k++) {
      if (k === 0 && i > 0) continue;
      const t = k / n;
      const x = x0 + (x1 - x0) * t;
      const z = z0 + (z1 - z0) * t;
      parts.push(<Pipe key={`p${i}:${k}`} from={[x, y, z]} to={[x, y + 1.1, z]} r={0.024} system={null} paint="steel" segments={8} edges={false} />);
    }
    for (const h of [1.1, 0.55]) {
      parts.push(<Pipe key={`r${i}:${h}`} from={[x0, y + h, z0]} to={[x1, y + h, z1]} r={0.022} system={null} paint="steel" segments={8} edges={false} />);
    }
    parts.push(<Pipe key={`t${i}`} from={[x0, y + 0.06, z0]} to={[x1, y + 0.06, z1]} r={0.05} system={null} paint="steelDark" segments={4} edges={false} />);
  }
  return <>{parts}</>;
}

/** Grating platform on beams, with handrail on the listed edges. */
export function Platform({
  x0,
  x1,
  z0,
  z1,
  y,
  rails = [],
}: {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
  y: number;
  /** Edges that get a handrail: "x0" | "x1" | "z0" | "z1". */
  rails?: Array<"x0" | "x1" | "z0" | "z1">;
}) {
  const edge: Record<"x0" | "x1" | "z0" | "z1", Array<[number, number]>> = {
    x0: [[x0, z0], [x0, z1]],
    x1: [[x1, z0], [x1, z1]],
    z0: [[x0, z0], [x1, z0]],
    z1: [[x0, z1], [x1, z1]],
  };
  return (
    <>
      <Block min={[x0, y - 0.05, z0]} max={[x1, y, z1]} system={null} paint="grating" bevel={0.01} />
      <Beam from={[x0, y - 0.18, z0]} to={[x1, y - 0.18, z0]} size={0.24} />
      <Beam from={[x0, y - 0.18, z1]} to={[x1, y - 0.18, z1]} size={0.24} />
      {rails.map((e) => (
        <Handrail key={e} path={edge[e]} y={y} />
      ))}
    </>
  );
}

/** Straight stair along x from (x0, y0) up to (x1, y1), at depth z, width w. */
export function Stair({ x0, x1, y0, y1, z, w = 0.9 }: { x0: number; x1: number; y0: number; y1: number; z: number; w?: number }) {
  const n = Math.max(2, Math.round((y1 - y0) / 0.2));
  const steps: React.ReactNode[] = [];
  for (let i = 1; i <= n; i++) {
    const t = i / n;
    const x = x0 + (x1 - x0) * t;
    const y = y0 + (y1 - y0) * t;
    const dx = Math.abs(x1 - x0) / n;
    steps.push(<Block key={i} min={[x - dx / 2, y - 0.04, z - w / 2]} max={[x + dx / 2, y, z + w / 2]} system={null} paint="grating" bevel={0.005} />);
  }
  return (
    <>
      {steps}
      {[-1, 1].map((s) => (
        <Pipe key={s} from={[x0, y0, z + (s * w) / 2]} to={[x1, y1, z + (s * w) / 2]} r={0.05} system={null} paint="steel" segments={6} edges={false} />
      ))}
      {[-1, 1].map((s) => (
        <Pipe key={`h${s}`} from={[x0, y0 + 1, z + (s * w) / 2]} to={[x1, y1 + 1, z + (s * w) / 2]} r={0.022} system={null} paint="steel" segments={8} edges={false} />
      ))}
    </>
  );
}
