"use client";

/**
 * The 3D plant twin canvas (ported from ULTRON PlantScene3DCanvas.web).
 *
 * Renders the Blender / CAD building GLBs on raised plinths, a quiet ground
 * grid and the electrical / network runs between buildings. Status is carried
 * only by the plinth rim colour; selection by the signal-blue rim. No glow,
 * no decorative light — industrial and sober, per the ULTRON visual rules.
 *
 * Loaded with next/dynamic (ssr: false), so three.js never runs on the server
 * and stays out of the initial bundle.
 */
import { Line, useGLTF, useProgress } from "@react-three/drei";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import React, { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  PLANT_MODELS,
  buildingScale,
  type TwinBuilding,
  type TwinCallout,
  type TwinScene,
} from "./plant-twin-model";
import { TwinHtml } from "./twin-html";
import { TWIN_GL, TwinLighting } from "./twin-lighting";
import { TwinControls, clearTwinPose, loadTwinPose, usePersistTwinPose, useTwinNavigation, type TwinNavMode } from "./twin-nav";
import { TWIN_RESIZE, twinEvents, useTwinDpr } from "./use-ui-zoom";

export type TwinCameraCommand = { kind: "fit" | "zoom-in" | "zoom-out" | "focus"; n: number };

/** Canvas covered by floating UI (HUD panels) on each side, px. */
export interface TwinInset {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const NO_INSET: TwinInset = { top: 0, right: 0, bottom: 0, left: 0 };

export interface TwinColors {
  ground: string;
  grid: string;
  fog: string;
  plinth: string;
  plinthTop: string;
  rimIdle: string;
  select: string;
  good: string;
  warn: string;
  bad: string;
  idle: string;
  electrical: string;
  network: string;
  /** Key-light colour (--twin-sun). */
  sun: string;
  dark: boolean;
}

export interface PlantTwinCanvasProps {
  scene: TwinScene;
  callouts: Record<string, TwinCallout>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  command: TwinCameraCommand;
  colors: TwinColors;
  showLabels: boolean;
  /** Left-drag moves across the yard ("move", default) or orbits ("orbit"). */
  navMode?: TwinNavMode;
  /** Storage key for remembering the camera between visits; omit to not persist. */
  persistKey?: string;
  /** Canvas hidden under floating panels; the camera frames the plant in what is left. */
  inset?: TwinInset;
}

const PLINTH_H = 0.42;
const HOVER_LIFT = 0.14;
const ROUTE_Y = 0.12;
export const FOV = 40;
export const CAMERA_FAR = 900;
/** Clear space kept between two floating labels, and from the canvas edge, px. */
const LABEL_GAP = 6;
const LABEL_EDGE = 8;

/** A floating building label, as the screen-space layout pass sees it. */
export interface LabelSlot {
  anchor: React.RefObject<THREE.Group | null>;
  el: React.RefObject<HTMLDivElement | null>;
  /** 0 = area (carries status, keeps its place), 1 = site infrastructure. */
  rank: number;
  /** Current offset from the anchor, px (damped toward the laid-out target). */
  dx: number;
  dy: number;
}

type Rect = { l: number; t: number; r: number; b: number };
type Dir = "up" | "right" | "left" | "down";

/** A label belongs above its building: sideways costs more, and down (over the model) is the last resort. */
const DIR_COST: Record<Dir, number> = { up: 1, right: 1.5, left: 1.5, down: 3 };

function isMesh(o: THREE.Object3D): o is THREE.Mesh {
  return (o as THREE.Mesh).isMesh === true;
}

/** Footprint of a placed building in its own (yawed) frame, metres. */
function placedBox(b: TwinBuilding): THREE.Box3 {
  const def = PLANT_MODELS[b.model];
  const s = buildingScale(b.model, b.scale);
  const [w, d] = def.footprint;
  return new THREE.Box3(new THREE.Vector3((-w / 2) * s, 0, (-d / 2) * s), new THREE.Vector3((w / 2) * s, def.height * s, (d / 2) * s));
}

/** Plant centre + bounding radius, for camera framing. */
function sceneBounds(buildings: TwinBuilding[]) {
  const box = new THREE.Box3();
  for (const b of buildings) {
    const local = placedBox(b);
    const r = Math.hypot(local.max.x, local.max.z);
    box.expandByPoint(new THREE.Vector3(b.x - r, 0, b.z - r));
    box.expandByPoint(new THREE.Vector3(b.x + r, local.max.y, b.z + r));
  }
  if (box.isEmpty()) box.set(new THREE.Vector3(-10, 0, -10), new THREE.Vector3(10, 5, 10));
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  return { center: new THREE.Vector3(sphere.center.x, 0, sphere.center.z), radius: Math.max(12, sphere.radius) };
}

/** Camera direction: east, slightly south, raised. The yard runs front to back
 *  (power house → areas → gateway), so this side-on view lays it across the
 *  wide map card instead of stacking it into a narrow column. */
const VIEW_DIR = new THREE.Vector3(1.2, 0.7, 0.5).normalize();

/** Plinths plus the floating labels above them, metres. */
const FRAME_PAD = 1;
const LABEL_CLEARANCE = 4;

/** What the camera has to keep in view: every plinth and model (yaw applied) and the label above it. */
function framePoints(buildings: TwinBuilding[]): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  for (const b of buildings) {
    const local = placedBox(b);
    const yaw = (b.rotation * Math.PI) / 180;
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    const top = local.max.y + PLINTH_H;
    for (const x of [local.min.x - FRAME_PAD, local.max.x + FRAME_PAD]) {
      for (const z of [local.min.z - FRAME_PAD, local.max.z + FRAME_PAD]) {
        const px = b.x + x * cos + z * sin;
        const pz = b.z - x * sin + z * cos;
        pts.push(new THREE.Vector3(px, 0, pz), new THREE.Vector3(px, top, pz));
      }
    }
    pts.push(new THREE.Vector3(b.x, top + LABEL_CLEARANCE, b.z));
  }
  return pts;
}

/** Canvas kept clear around the fitted plant, px: headroom for a label that
 *  has to move up, the legend along the bottom. */
const FIT_INSET = { top: 44, right: 24, bottom: 32, left: 24 };

/**
 * Tightest camera along VIEW_DIR that keeps every point inside the canvas
 * minus FIT_INSET (scaled by `margin`), shifted sideways so the points sit
 * centred in what is left. With s a point's depth toward the camera, each
 * point bounds the distance D and lateral offset a per axis:
 * x - a ≤ tanR·(D - s) and a - x ≤ tanL·(D - s).
 */
export function fitPoints(
  points: THREE.Vector3[],
  width: number,
  height: number,
  inset: TwinInset,
  margin = 1,
  dir: THREE.Vector3 = VIEW_DIR,
) {
  const centre = new THREE.Box3().setFromPoints(points).getCenter(new THREE.Vector3());
  const fwd = dir.clone().negate();
  const right = new THREE.Vector3().crossVectors(fwd, THREE.Object3D.DEFAULT_UP).normalize();
  const up = new THREE.Vector3().crossVectors(right, fwd);
  const w = Math.max(1, width);
  const h = Math.max(1, height);
  const tan = Math.tan((FOV * Math.PI) / 360) / margin;
  // Free extent each side of the view centre, as a fraction of the half-extent.
  // A panel covering more than half the canvas makes one side negative (the free
  // area lies wholly on the other side of centre); only the pair's sum must stay
  // positive, so it is widened evenly when the free area gets very small.
  const keep = (a: number, b: number, extent: number): [number, number] => {
    const ka = 1 - (2 * a) / extent;
    const kb = 1 - (2 * b) / extent;
    const short = Math.max(0, 0.3 - (ka + kb)) / 2;
    return [ka + short, kb + short];
  };
  const [kTop, kBottom] = keep(FIT_INSET.top + inset.top, FIT_INSET.bottom + inset.bottom, h);
  const [kRight, kLeft] = keep(FIT_INSET.right + inset.right, FIT_INSET.left + inset.left, w);
  const tTop = tan * kTop;
  const tBottom = tan * kBottom;
  const tRight = tan * (w / h) * kRight;
  const tLeft = tan * (w / h) * kLeft;
  let hiX = -Infinity;
  let loX = Infinity;
  let hiY = -Infinity;
  let loY = Infinity;
  const r = new THREE.Vector3();
  for (const p of points) {
    r.copy(p).sub(centre);
    const s = r.dot(dir);
    const x = r.dot(right);
    const y = r.dot(up);
    hiX = Math.max(hiX, x + tRight * s);
    loX = Math.min(loX, x - tLeft * s);
    hiY = Math.max(hiY, y + tTop * s);
    loY = Math.min(loY, y - tBottom * s);
  }
  const dist = Math.max(8, (hiX - loX) / (tLeft + tRight), (hiY - loY) / (tTop + tBottom));
  const tgt = centre
    .clone()
    .addScaledVector(right, (hiX - tRight * dist + loX + tLeft * dist) / 2)
    .addScaledVector(up, (hiY - tTop * dist + loY + tBottom * dist) / 2);
  return { pos: tgt.clone().addScaledVector(dir, dist), tgt };
}

/* ---------------------------------------------------------------- building */

/** Rim lines per source geometry (clones share geometry, so each is built once). */
const RIMS = new WeakMap<THREE.BufferGeometry, THREE.EdgesGeometry>();
function rimOf(g: THREE.BufferGeometry): THREE.EdgesGeometry {
  let e = RIMS.get(g);
  if (!e) {
    e = new THREE.EdgesGeometry(g, 32);
    RIMS.set(g, e);
  }
  return e;
}

/**
 * One clone per placed building, plus its bounds measured before it is attached
 * (once in the scene graph, world matrices would include the placement). The CAD
 * paints are replaced by the ULTRON machine-kit (TSE) set: graphite body, lighter
 * raised graphite for pale parts, near-black recesses for glazing, and a
 * mid-grey rim on every hard edge.
 */
function useModelInstance(url: string, colors: TwinColors) {
  const { scene } = useGLTF(url);
  return useMemo(() => {
    const root = scene.clone(true);
    root.position.set(0, 0, 0);
    root.updateMatrixWorld(true);
    const kit = (color: string, roughness: number, metalness: number) =>
      new THREE.MeshStandardMaterial({ color, roughness, metalness, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 });
    const body = kit(colors.plinth, 0.72, 0.12);
    const raised = kit(colors.plinthTop, 0.65, 0.18);
    const deep = kit(colors.ground, 0.4, 0.2);
    const rim = new THREE.LineBasicMaterial({ color: colors.rimIdle, transparent: true, opacity: 0.85 });
    const box = new THREE.Box3();
    root.traverse((n) => {
      if (isMesh(n)) {
        const src = (Array.isArray(n.material) ? n.material[0] : n.material) as THREE.MeshStandardMaterial | undefined;
        const c = src?.color;
        const lum = c ? 0.3 * c.r + 0.59 * c.g + 0.11 * c.b : 0.5;
        n.material = src?.transparent || lum < 0.08 ? deep : lum > 0.5 ? raised : body;
        n.add(new THREE.LineSegments(rimOf(n.geometry), rim));
        n.castShadow = true;
        n.receiveShadow = true;
        box.expandByObject(n);
      }
    });
    return { root, box };
  }, [scene, colors.plinth, colors.plinthTop, colors.ground, colors.rimIdle]);
}

function Building({
  building,
  callout,
  selected,
  colors,
  showLabel,
  labels,
  onSelect,
}: {
  building: TwinBuilding;
  callout: TwinCallout | undefined;
  selected: boolean;
  colors: TwinColors;
  showLabel: boolean;
  labels: Map<string, LabelSlot>;
  onSelect: (id: string) => void;
}) {
  const def = PLANT_MODELS[building.model];
  const model = useModelInstance(def.url, colors);
  const s = buildingScale(building.model, building.scale);
  const [hovered, setHovered] = useState(false);
  const modelRef = useRef<THREE.Group>(null);
  const lift = useRef(0);
  const invalidate = useThree((st) => st.invalidate);
  const anchorRef = useRef<THREE.Group>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const rank = building.areaId ? 0 : 1;

  useEffect(() => {
    if (!showLabel) return;
    labels.set(building.id, { anchor: anchorRef, el: labelRef, rank, dx: 0, dy: 0 });
    invalidate();
    return () => {
      labels.delete(building.id);
    };
  }, [labels, building.id, rank, showLabel, invalidate]);

  // Footprint measured from the model itself (after its CAD correction).
  const box = useMemo(() => {
    const b = model.box.clone();
    if (b.isEmpty()) return placedBox(building);
    if (def.correction) {
      const m = new THREE.Matrix4().compose(
        new THREE.Vector3(...def.correction.offset),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(...def.correction.rotation)),
        new THREE.Vector3(1, 1, 1),
      );
      b.applyMatrix4(m);
    }
    b.min.multiplyScalar(s);
    b.max.multiplyScalar(s);
    return b;
  }, [model, def.correction, s, building]);

  const size = box.getSize(new THREE.Vector3());
  const centre = box.getCenter(new THREE.Vector3());
  const w = size.x + 1.5;
  const d = size.z + 1.5;

  const tone = callout?.tone ?? "idle";
  const toneColor = tone === "bad" ? colors.bad : tone === "warn" ? colors.warn : tone === "good" ? colors.good : colors.idle;
  const rim = selected ? colors.select : building.areaId ? toneColor : colors.rimIdle;
  const active = hovered || selected;

  useFrame((_, dt) => {
    const goal = active ? 1 : 0;
    const next = THREE.MathUtils.damp(lift.current, goal, 12, dt);
    if (Math.abs(next - lift.current) > 1e-4) {
      lift.current = next;
      if (modelRef.current) modelRef.current.position.y = PLINTH_H + next * HOVER_LIFT;
      invalidate();
    }
  });

  const onOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = "pointer";
    invalidate();
  };
  const onOut = () => {
    setHovered(false);
    document.body.style.cursor = "";
    invalidate();
  };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(building.id);
  };

  const band = 0.075;
  const bandY = PLINTH_H - 0.1;

  return (
    <group position={[building.x, 0, building.z]} rotation={[0, (building.rotation * Math.PI) / 180, 0]}>
      {/* plinth: a real slab on the floor, rim carries status */}
      <mesh position={[centre.x, PLINTH_H / 2, centre.z]} castShadow receiveShadow onPointerOver={onOver} onPointerOut={onOut} onClick={onClick}>
        <boxGeometry args={[w, PLINTH_H, d]} />
        <meshStandardMaterial color={colors.plinth} roughness={0.6} metalness={0.2} />
      </mesh>
      <mesh position={[centre.x, PLINTH_H + 0.004, centre.z]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow raycast={() => undefined}>
        <planeGeometry args={[w - 0.3, d - 0.3]} />
        {/* 4 mm above the slab is below depth precision from afar: offset it so it never z-fights. */}
        <meshStandardMaterial color={colors.plinthTop} roughness={0.5} metalness={0.25} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
      </mesh>
      {[
        [0, (d + 0.03) / 2, w + 0.06, 0.035],
        [0, -(d + 0.03) / 2, w + 0.06, 0.035],
        [(w + 0.03) / 2, 0, 0.035, d + 0.06],
        [-(w + 0.03) / 2, 0, 0.035, d + 0.06],
      ].map(([ox, oz, bw, bd], i) => (
        <mesh key={i} position={[centre.x + ox, bandY, centre.z + oz]} raycast={() => undefined}>
          <boxGeometry args={[bw, band, bd]} />
          <meshBasicMaterial color={rim} toneMapped={false} />
        </mesh>
      ))}

      {/* model */}
      <group ref={modelRef} position={[0, PLINTH_H, 0]}>
        <group scale={s} onPointerOver={onOver} onPointerOut={onOut} onClick={onClick}>
          {def.correction ? (
            <group rotation={def.correction.rotation}>
              <group position={def.correction.offset}>
                <primitive object={model.root} />
              </group>
            </group>
          ) : (
            <primitive object={model.root} />
          )}
        </group>
      </group>

      {showLabel && (
        <group ref={anchorRef} position={[centre.x, box.max.y + PLINTH_H + 1.2, centre.z]}>
          {/* Area labels stack above infrastructure labels, so a moved label's leader runs under the one it cleared. */}
          <TwinHtml zIndexRange={rank === 0 ? [40, 21] : [20, 0]} style={{ pointerEvents: "none" }}>
            <div ref={labelRef} className="ph-twin-label" data-tone={building.areaId ? tone : "idle"} data-active={active || undefined}>
              <span className="ph-twin-label-head">
                <i aria-hidden="true" />
                <span className="ph-twin-label-name">{building.name}</span>
              </span>
              {building.areaId && callout ? (
                <span className="ph-twin-label-meta">
                  {callout.status}
                  {callout.health !== null && <b>{callout.health}/100</b>}
                </span>
              ) : (
                <span className="ph-twin-label-meta">Site infrastructure</span>
              )}
              {active && building.areaId && callout && (
                <span className="ph-twin-label-more">
                  <span>
                    Machines <b>{callout.running}/{callout.machines}</b>
                  </span>
                  <span>
                    Alerts <b>{callout.alerts}</b>
                  </span>
                  <span>
                    Telemetry <b>{callout.telemetry}</b>
                  </span>
                </span>
              )}
            </div>
          </TwinHtml>
        </group>
      )}
    </group>
  );
}

/* ---------------------------------------------------------------- labels */

/** Slides `box` in `dir` until it clears every placed rect. */
function clear(box: Rect, placed: Rect[], dir: Dir): Rect {
  const b = { ...box };
  for (let i = 0; i <= placed.length; i++) {
    const hit = placed.find((p) => b.l < p.r + LABEL_GAP && b.r > p.l - LABEL_GAP && b.t < p.b + LABEL_GAP && b.b > p.t - LABEL_GAP);
    if (!hit) break;
    const w = b.r - b.l;
    const h = b.b - b.t;
    if (dir === "up") b.t = hit.t - LABEL_GAP - h;
    else if (dir === "down") b.t = hit.b + LABEL_GAP;
    else if (dir === "right") b.l = hit.r + LABEL_GAP;
    else b.l = hit.l - LABEL_GAP - w;
    b.r = b.l + w;
    b.b = b.t + h;
  }
  return b;
}

/**
 * Keeps floating labels from overlapping. Each frame the anchors are projected
 * to the canvas; area labels, nearest first, keep their place, and a later
 * label that would touch one slides clear of it: up, sideways or down,
 * whichever is the smallest move that stays inside the canvas. The damped
 * offset is written as `--dx`/`--dy`, plus a leader (`--leader-*`) that runs
 * from the label's edge back to its anchor.
 */
export function LabelLayout({ labels }: { labels: Map<string, LabelSlot> }) {
  const camera = useThree((st) => st.camera);
  const size = useThree((st) => st.size);
  const invalidate = useThree((st) => st.invalidate);
  const v = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, dt) => {
    const items: Array<{ slot: LabelSlot; el: HTMLDivElement; x: number; y: number; w: number; h: number; dist: number }> = [];
    for (const slot of labels.values()) {
      const anchor = slot.anchor.current;
      const el = slot.el.current;
      if (!anchor || !el) continue;
      anchor.getWorldPosition(v);
      const dist = v.distanceTo(camera.position);
      v.project(camera);
      if (v.z > 1) continue;
      items.push({
        slot,
        el,
        x: ((v.x + 1) / 2) * size.width,
        y: ((1 - v.y) / 2) * size.height,
        w: el.offsetWidth,
        h: el.offsetHeight,
        dist,
      });
    }
    items.sort((a, b) => a.slot.rank - b.slot.rank || a.dist - b.dist);

    const inside = (b: Rect) =>
      b.l >= LABEL_EDGE && b.t >= LABEL_EDGE && b.r <= size.width - LABEL_EDGE && b.b <= size.height - LABEL_EDGE;
    const placed: Rect[] = [];
    const step = Math.min(dt, 0.1);
    let settling = false;
    for (const it of items) {
      const home: Rect = { l: it.x - it.w / 2, t: it.y - it.h / 2, r: it.x + it.w / 2, b: it.y + it.h / 2 };
      let best = home;
      let bestCost = Infinity;
      for (const dir of ["up", "right", "left", "down"] as const) {
        const c = clear(home, placed, dir);
        // A label already past the edge (camera panned) may stay there; otherwise keep it in view.
        if (inside(home) && !inside(c)) continue;
        const cost = Math.hypot(c.l - home.l, c.t - home.t) * DIR_COST[dir];
        if (cost < bestCost) {
          best = c;
          bestCost = cost;
        }
      }
      placed.push(best);

      const slot = it.slot;
      const tx = best.l - home.l;
      const ty = best.t - home.t;
      const nx = THREE.MathUtils.damp(slot.dx, tx, 14, step);
      const ny = THREE.MathUtils.damp(slot.dy, ty, 14, step);
      slot.dx = Math.abs(nx - tx) < 0.5 ? tx : nx;
      slot.dy = Math.abs(ny - ty) < 0.5 ? ty : ny;
      if (slot.dx !== tx || slot.dy !== ty) settling = true;

      // Leader: from the label centre toward the anchor at (-dx, -dy), starting where it leaves the label.
      const len = Math.hypot(slot.dx, slot.dy);
      const ux = len > 0 ? -slot.dx / len : 0;
      const uy = len > 0 ? -slot.dy / len : 0;
      const exit = Math.min(ux ? it.w / 2 / Math.abs(ux) : Infinity, uy ? it.h / 2 / Math.abs(uy) : Infinity);
      const style = it.el.style;
      style.setProperty("--dx", `${slot.dx.toFixed(1)}px`);
      style.setProperty("--dy", `${slot.dy.toFixed(1)}px`);
      style.setProperty("--leader-angle", `${Math.atan2(uy, ux).toFixed(3)}rad`);
      style.setProperty("--leader-start", `${(Number.isFinite(exit) ? exit : 0).toFixed(1)}px`);
      style.setProperty("--leader-length", `${Math.max(0, len - (Number.isFinite(exit) ? exit : 0)).toFixed(1)}px`);
    }
    if (settling) invalidate();
  });

  return null;
}

/* ---------------------------------------------------------------- runs */

function Connections({ scene, colors }: { scene: TwinScene; colors: TwinColors }) {
  const byId = useMemo(() => new Map(scene.buildings.map((b) => [b.id, b])), [scene.buildings]);
  return (
    <group>
      {scene.connections.map((c) => {
        const a = byId.get(c.from);
        const b = byId.get(c.to);
        if (!a || !b) return null;
        // Orthogonal run across the yard floor: out along Z, across along X.
        const off = c.kind === "network" ? 0.9 : -0.9;
        const pts: [number, number, number][] = [
          [a.x + off, ROUTE_Y, a.z],
          [a.x + off, ROUTE_Y, (a.z + b.z) / 2],
          [b.x + off, ROUTE_Y, (a.z + b.z) / 2],
          [b.x + off, ROUTE_Y, b.z],
        ];
        return (
          <Line
            key={c.id}
            points={pts}
            color={c.kind === "network" ? colors.network : colors.electrical}
            lineWidth={1.4}
            dashed
            dashSize={c.kind === "network" ? 0.6 : 1.2}
            gapSize={0.5}
            transparent
            opacity={0.85}
          />
        );
      })}
    </group>
  );
}

/* ---------------------------------------------------------------- camera */

function CameraRig({
  scene,
  selectedId,
  command,
  inset,
  navMode,
  persistKey,
}: {
  scene: TwinScene;
  selectedId: string | null;
  command: TwinCameraCommand;
  inset: TwinInset;
  navMode: TwinNavMode;
  persistKey?: string;
}) {
  const { camera, invalidate, size } = useThree();
  const controls = useThree((st) => st.controls) as OrbitControlsImpl | null;
  const goal = useRef<{ pos: THREE.Vector3; tgt: THREE.Vector3 } | null>(null);
  const bounds = useMemo(() => sceneBounds(scene.buildings), [scene.buildings]);
  const frame = useMemo(() => framePoints(scene.buildings), [scene.buildings]);
  const lastCommand = useRef(-1);
  const fitted = useRef(false);
  /** Operator has moved the camera since the last fit: layout changes stop re-framing. */
  const operated = useRef(false);
  /** Canvas size and panel inset the camera was last framed for. */
  const layoutKey = `${size.width}|${size.height}|${inset.top}|${inset.right}|${inset.bottom}|${inset.left}`;
  const lastLayout = useRef("");
  usePersistTwinPose(persistKey, operated);

  // Shared twin navigation: leash over the yard, WASD / arrows, Q / E.
  useTwinNavigation({
    centre: bounds.center,
    reach: Math.max(40, bounds.radius * 1.6),
    onManual: () => {
      goal.current = null;
      operated.current = true;
    },
  });

  // Operator grabs the camera → any automatic move is cancelled.
  useEffect(() => {
    if (!controls) return;
    const stop = () => {
      goal.current = null;
      operated.current = true;
    };
    controls.addEventListener("start", stop);
    return () => controls.removeEventListener("start", stop);
  }, [controls]);

  // First frame (and every scene change): fit the plant.
  useEffect(() => {
    fitted.current = false;
    operated.current = false;
  }, [frame]);

  useEffect(() => {
    if (!controls) return;
    if (!fitted.current) {
      const saved = loadTwinPose(persistKey);
      const g = saved ? { pos: new THREE.Vector3(...saved.pos), tgt: new THREE.Vector3(...saved.tgt) } : fitPoints(frame, size.width, size.height, inset);
      operated.current = !!saved;
      camera.position.copy(g.pos);
      controls.target.copy(g.tgt);
      controls.update();
      fitted.current = true;
      lastLayout.current = layoutKey;
      invalidate();
      return;
    }
    if (command.n === lastCommand.current) return;
    lastCommand.current = command.n;
    const offset = camera.position.clone().sub(controls.target);
    if (command.kind === "fit") {
      clearTwinPose(persistKey);
      operated.current = false;
      lastLayout.current = layoutKey;
      goal.current = fitPoints(frame, size.width, size.height, inset);
    } else if (command.kind === "zoom-in" || command.kind === "zoom-out") {
      operated.current = true;
      const k = command.kind === "zoom-in" ? 0.72 : 1.38;
      goal.current = { pos: controls.target.clone().add(offset.multiplyScalar(k)), tgt: controls.target.clone() };
    } else if (command.kind === "focus" && selectedId) {
      const b = scene.buildings.find((x) => x.id === selectedId);
      if (b) {
        operated.current = true;
        goal.current = fitPoints(framePoints([b]), size.width, size.height, inset, 1.8);
      }
    }
    invalidate();
    // inset is read here but must not re-run the command; the effect below re-fits on its change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [command, frame, camera, controls, size.width, size.height, invalidate, scene.buildings, selectedId]);

  // The page settles after the first fit (canvas resized, panels measured or
  // resized over it): re-frame the plant in the new free area, unless the
  // operator has taken the camera since.
  useEffect(() => {
    if (!fitted.current || lastLayout.current === layoutKey) return;
    lastLayout.current = layoutKey;
    if (operated.current) return;
    goal.current = fitPoints(frame, size.width, size.height, inset);
    invalidate();
  }, [layoutKey, inset, frame, size.width, size.height, invalidate]);

  useFrame(() => {
    const g = goal.current;
    if (!g || !controls) return;
    camera.position.lerp(g.pos, 0.1);
    controls.target.lerp(g.tgt, 0.1);
    controls.update();
    if (camera.position.distanceTo(g.pos) < 0.05 && controls.target.distanceTo(g.tgt) < 0.03) goal.current = null;
    invalidate();
  });

  return (
    <TwinControls navMode={navMode} maxPolarAngle={Math.PI / 2.15} minDistance={6} maxDistance={Math.max(140, bounds.radius * 6)} />
  );
}

/* ---------------------------------------------------------------- scene */

/** Fog fully swallows the yard by this distance, so the ground reads as endless. */
export function fogRange(radius: number): [number, number] {
  const far = Math.min(radius * 9, CAMERA_FAR * 0.8);
  return [Math.min(radius * 3, far * 0.4), far];
}

/**
 * Ground and grid reach past the fog's far distance from any camera position,
 * so their edges are never seen: the yard fades into the background instead of
 * ending against it.
 */
export function Ground({ colors, extent }: { colors: TwinColors; extent: number }) {
  const reach = fogRange(extent)[1] + Math.max(140, extent * 6);
  const size = Math.ceil((reach * 2) / 10) * 10;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow raycast={() => undefined}>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial color={colors.ground} roughness={1} metalness={0} />
      </mesh>
      <gridHelper args={[size, size / 2, colors.grid, colors.grid]} position={[0, 0.01, 0]} raycast={() => null} />
    </group>
  );
}

function LoadingOverlay() {
  const { active, progress } = useProgress();
  if (!active) return null;
  return (
    <div className="ph-twin-loading" role="status">
      Loading plant models… {Math.round(progress)} %
    </div>
  );
}

function SceneContents({ scene, callouts, selectedId, onSelect, command, colors, showLabels, inset = NO_INSET, navMode = "move", persistKey }: PlantTwinCanvasProps) {
  const bounds = useMemo(() => sceneBounds(scene.buildings), [scene.buildings]);
  const labels = useMemo(() => new Map<string, LabelSlot>(), []);
  const invalidate = useThree((st) => st.invalidate);
  useEffect(() => invalidate(), [colors, callouts, selectedId, showLabels, invalidate]);

  return (
    <>
      <TwinLighting colors={colors} radius={bounds.radius} fog={fogRange(bounds.radius)} />

      <Ground colors={colors} extent={bounds.radius} />

      {/* Invisible pick plane: clicking the yard clears the selection. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} visible={false} onClick={() => onSelect(null)}>
        <planeGeometry args={[CAMERA_FAR * 2, CAMERA_FAR * 2]} />
        <meshBasicMaterial />
      </mesh>

      <Suspense fallback={null}>
        {scene.buildings.map((b) => (
          <Building
            key={b.id}
            building={b}
            callout={callouts[b.id]}
            selected={selectedId === b.id}
            colors={colors}
            showLabel={showLabels}
            labels={labels}
            onSelect={onSelect}
          />
        ))}
      </Suspense>
      {showLabels && <LabelLayout labels={labels} />}
      <Connections scene={scene} colors={colors} />
      <CameraRig scene={scene} selectedId={selectedId} command={command} inset={inset} navMode={navMode} persistKey={persistKey} />
    </>
  );
}

export default function PlantTwinCanvas(props: PlantTwinCanvasProps) {
  const dpr = useTwinDpr();
  return (
    <div className="ph-twin-canvas">
      <Canvas
        shadows
        dpr={dpr}
        resize={TWIN_RESIZE}
        events={twinEvents}
        frameloop="demand"
        gl={TWIN_GL}
        camera={{ fov: FOV, near: 0.5, far: CAMERA_FAR, position: [40, 40, 60] }}
        onPointerMissed={() => props.onSelect(null)}
      >
        <SceneContents {...props} />
      </Canvas>
      <LoadingOverlay />
    </div>
  );
}

// Warm the cache for the light models; the 6.5 MB preheater loads on demand.
useGLTF.preload(PLANT_MODELS["utility-building"].url);
useGLTF.preload(PLANT_MODELS["power-house"].url);
