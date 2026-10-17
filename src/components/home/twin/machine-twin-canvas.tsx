"use client";

/**
 * The 3D machine twin canvas: the selected machine standing on its plinth in
 * the same yard as the plant twin (ground, fog, light, floating labels, camera
 * fit, real-world paints like the plant's CAD models).
 *
 * The kiln and the VPC-066 casting cell are built models in real metres
 * (kiln-twin-3d, vpc-twin-3d), with every scheduled signal on its physical
 * anchor. Other machine types are extruded from their schematic
 * primitives (machine-twin-model). Sensor points are not drawn on the twin;
 * pyro sensor coordinates only place the field instruments and size each
 * component's label anchor. Status is carried by the component labels;
 * selection by signal-blue edges.
 *
 * Loaded with next/dynamic (ssr: false).
 */
import { Edges } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { SchematicDot } from "@/components/assets/machine-schematic";
import { SCHEMATIC_H, SCHEMATIC_W } from "@/components/assets/machine-schematic";
import type { AssetMachine } from "@/components/assets/assets-data";
import type { Tone } from "@/components/assets/assets-shell-ui";
import {
  CAMERA_FAR,
  FOV,
  Ground,
  LabelLayout,
  NO_INSET,
  fitPoints,
  fogRange,
  type LabelSlot,
  type TwinCameraCommand,
  type TwinColors,
  type TwinInset,
} from "./plant-twin-canvas";
import { TwinHtml } from "./twin-html";
import { UNIT, buildMachineModel, modelExtent, ownerOf, twinKind, usesForeignSpace, type MachineFinish, type MachinePrim } from "./machine-twin-model";
import { KILN_ANCHORS, KILN_CENTRE_X, KilnModel, kilnOwners } from "./kiln-twin-3d";
import { VPC_ANCHORS, VPC_CENTRE_X, VPC_LABEL_ANCHORS, VpcModel, vpcOwners, type VpcRole } from "./vpc-twin-3d";
import { TwinControls, clearTwinPose, loadTwinPose, usePersistTwinPose, useTwinNavigation, type TwinNavMode } from "./twin-nav";
import { PartCtx, TwinPart, useTwinMaterials, type PartCtxValue, type ShellSkin, type TwinPaint, type TwinPaints } from "./twin-part";
import { TWIN_GL, TwinLighting } from "./twin-lighting";
import { TWIN_RESIZE, twinEvents, useTwinDpr } from "./use-ui-zoom";
import { applyKitPalette, buildPyroMachine, createKitMats, readPalette, type MachineKey } from "./pyro-plant-model";

/** Pyro-line diagram types → their machine(s) in the detailed pyro plant model (the feed system and clinker transport are two site nodes each). */
const PYRO_KEY: Record<string, MachineKey[]> = {
  "feed-system": ["FSL", "KFS"],
  preheater: ["PHC"],
  "pyro-kiln": ["KLN"],
  "kiln-burner": ["BRN"],
  "grate-cooler": ["CLR"],
  "clinker-transport": ["HMR", "CSL"],
};

export type { TwinNavMode };

export interface MachineTwinSystem {
  id: string;
  name: string;
  health: number;
  status: string;
  tone: Tone;
  bbox?: { x: number; y: number; width: number; height: number };
}

export interface MachineTwinCanvasProps {
  diagramType: AssetMachine["diagramType"];
  machineTone: Tone;
  systems: MachineTwinSystem[];
  dots: SchematicDot[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  command: TwinCameraCommand;
  colors: TwinColors;
  paints: TwinPaints;
  inset?: TwinInset;
  /** Left-drag moves across the yard ("move") or orbits the machine ("orbit"). */
  navMode?: TwinNavMode;
  /** Storage key for remembering the camera between visits; omit to not persist. */
  persistKey?: string;
}

type Box2 = { x: number; y: number; width: number; height: number };

const PLINTH_H = 0.42;
/** Front-three-quarter view: the machine's long side faces the viewer. */
const VIEW_DIR = new THREE.Vector3(0.58, 0.34, 1).normalize();
/** Kiln shell skin: 74 m, burning zone 40–66 m (D4 Table 5.3a). */
const KILN_SKIN: ShellSkin = { length: 74, burning: [40, 66] };


/* ---------------------------------------------------------------- generic model */

/** Drawing space → world, centred on the machine's own x extent. */
function useFrameMap(prims: MachinePrim[], ground: number) {
  return useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const p of prims) {
      const [a, b] = p.kind === "box" ? [p.x, p.x + p.w] : p.axis === "x" ? [p.cx - p.len / 2, p.cx + p.len / 2] : [p.cx - p.r, p.cx + p.r];
      lo = Math.min(lo, a);
      hi = Math.max(hi, b);
    }
    const mid = Number.isFinite(lo) ? (lo + hi) / 2 : SCHEMATIC_W / 2;
    return {
      x: (x: number) => (x - mid) * UNIT,
      y: (y: number) => (ground - y) * UNIT + PLINTH_H,
      z: (z: number) => z * UNIT,
    };
  }, [prims, ground]);
}

type FrameMap = ReturnType<typeof useFrameMap>;

/** Mesh transform + geometry for one primitive. */
function primGeometry(p: MachinePrim, m: FrameMap) {
  if (p.kind === "box") {
    return {
      position: [m.x(p.x + p.w / 2), m.y(p.y + p.h / 2), m.z(p.z ?? 0)] as [number, number, number],
      rotation: [0, 0, 0] as [number, number, number],
      geometry: <boxGeometry args={[Math.max(0.02, p.w * UNIT), Math.max(0.02, p.h * UNIT), Math.max(0.02, p.d * UNIT)]} />,
    };
  }
  const r1 = p.r * UNIT;
  const r2 = (p.r2 ?? p.r) * UNIT;
  const position = [m.x(p.cx), m.y(p.cy), m.z(p.z ?? 0)] as [number, number, number];
  // CylinderGeometry runs along +y with radiusTop at +y.
  if (p.axis === "x") {
    // -90° about z sends +y to +x: the top radius is the +x end (r2).
    return {
      position,
      rotation: [0, 0, -Math.PI / 2 - Math.atan(p.slope ?? 0)] as [number, number, number],
      geometry: <cylinderGeometry args={[r2, r1, p.len * UNIT, 40]} />,
    };
  }
  if (p.axis === "y") {
    // Drawing y runs down: r belongs to the upper end.
    return { position, rotation: [0, 0, 0] as [number, number, number], geometry: <cylinderGeometry args={[r1, r2, p.len * UNIT, 40]} /> };
  }
  return {
    position,
    rotation: [Math.PI / 2, 0, 0] as [number, number, number],
    geometry: <cylinderGeometry args={[r1, r2, p.len * UNIT, 40]} />,
  };
}

const PRIM_PAINT: Record<MachineFinish, TwinPaint> = {
  body: "housing",
  raised: "steel",
  metal: "machined",
  material: "material",
  heat: "heat",
  deep: "deep",
};

/** Machines without a built 3D model: the schematic's primitives, extruded. */
function GenericModel({ prims, map, owners }: { prims: MachinePrim[]; map: FrameMap; owners: Array<string | null> }) {
  return (
    <>
      {prims.map((p, i) => {
        const g = primGeometry(p, map);
        return (
          <TwinPart key={i} system={owners[i]} paint={PRIM_PAINT[p.finish]} position={g.position} rotation={g.rotation}>
            {g.geometry}
          </TwinPart>
        );
      })}
    </>
  );
}

/* ---------------------------------------------------------------- sensor points */

interface PlacedPad {
  dot: SchematicDot;
  p: THREE.Vector3;
  /** Where the instrument mounts and the surface normal there (pyro models). */
  mount?: { at: THREE.Vector3; n: THREE.Vector3 };
}

const Y_UP = new THREE.Vector3(0, 1, 0);

/**
 * Field instruments at the sensor points (pyro models): a neck off the surface, a
 * transmitter housing with a dark display face, and a conduit run down to the floor
 * or the surface below — so every pad sits on the instrument it reads.
 */
const Instruments = React.memo(function Instruments({ pads, mats, edge }: { pads: PlacedPad[]; mats: { model: THREE.Material; machined: THREE.Material; recess: THREE.Material; steel: THREE.Material }; edge: string }) {
  return (
    <group>
      {pads.map(({ dot, mount }) => {
        if (!mount) return null;
        const q = new THREE.Quaternion().setFromUnitVectors(Y_UP, mount.n);
        const neck = mount.at.clone().addScaledVector(mount.n, 0.22);
        const head = mount.at.clone().addScaledVector(mount.n, 0.55);
        const foot = new THREE.Vector3(head.x, Math.max(0.5, head.y - 2.2), head.z);
        const cond = foot.clone().sub(head);
        const cq = new THREE.Quaternion().setFromUnitVectors(Y_UP, cond.clone().normalize());
        return (
          <group key={dot.tag}>
            <mesh position={neck} quaternion={q} material={mats.machined}>
              <cylinderGeometry args={[0.07, 0.09, 0.44, 12]} />
            </mesh>
            <mesh position={head} quaternion={q} material={mats.model} castShadow>
              <boxGeometry args={[0.42, 0.36, 0.3]} />
              <Edges threshold={30} color={edge} />
            </mesh>
            <mesh position={head.clone().addScaledVector(mount.n, 0.19)} quaternion={q} material={mats.recess}>
              <cylinderGeometry args={[0.11, 0.11, 0.04, 16]} />
            </mesh>
            <mesh position={head.clone().add(cond.clone().multiplyScalar(0.5))} quaternion={cq} material={mats.steel}>
              <cylinderGeometry args={[0.03, 0.03, cond.length(), 6]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
});

/* ---------------------------------------------------------------- labels */

function SystemLabel({
  system,
  anchor,
  active,
  sensors,
  labels,
}: {
  system: MachineTwinSystem;
  anchor: THREE.Vector3;
  active: boolean;
  sensors: number;
  labels: Map<string, LabelSlot>;
}) {
  const anchorRef = useRef<THREE.Group>(null);
  const el = useRef<HTMLDivElement>(null);
  const invalidate = useThree((st) => st.invalidate);
  useEffect(() => {
    labels.set(system.id, { anchor: anchorRef, el, rank: 0, dx: 0, dy: 0 });
    invalidate();
    return () => {
      labels.delete(system.id);
    };
  }, [labels, system.id, invalidate]);

  return (
    <group ref={anchorRef} position={anchor}>
      <TwinHtml zIndexRange={[40, 21]} style={{ pointerEvents: "none" }}>
        <div ref={el} className="ph-twin-label" data-tone={system.tone} data-active={active || undefined}>
          <span className="ph-twin-label-head">
            <i aria-hidden="true" />
            <span className="ph-twin-label-name">{system.name}</span>
          </span>
          <span className="ph-twin-label-meta">
            {system.status}
            <b>{system.health}%</b>
          </span>
          {active && (
            <span className="ph-twin-label-more">
              <span>
                Sensors <b>{sensors}</b>
              </span>
            </span>
          )}
        </div>
      </TwinHtml>
    </group>
  );
}

/* ---------------------------------------------------------------- camera */

function CameraRig({
  points,
  focus,
  command,
  inset,
  radius,
  centre,
  navMode,
  persistKey,
}: {
  points: THREE.Vector3[];
  focus: THREE.Vector3[] | null;
  command: TwinCameraCommand;
  inset: TwinInset;
  radius: number;
  /** Middle of the machine on the floor; the camera target is kept within reach of it. */
  centre: THREE.Vector3;
  navMode: TwinNavMode;
  persistKey?: string;
}) {
  const { camera, invalidate, size } = useThree();
  const controls = useThree((st) => st.controls) as OrbitControlsImpl | null;
  // Compact machines (the VPC cell) focus a single chamber; the plant's 8 m floor would stop well short.
  const minFit = radius < 8 ? 1.4 : 8;
  const goal = useRef<{ pos: THREE.Vector3; tgt: THREE.Vector3 } | null>(null);
  const fitted = useRef(false);
  const operated = useRef(false);
  const lastCommand = useRef(-1);
  const layoutKey = `${size.width}|${size.height}|${inset.top}|${inset.right}|${inset.bottom}|${inset.left}`;
  const lastLayout = useRef("");
  usePersistTwinPose(persistKey, operated);

  useEffect(() => {
    if (!controls) return;
    const stop = () => {
      goal.current = null;
      operated.current = true;
    };
    controls.addEventListener("start", stop);
    return () => controls.removeEventListener("start", stop);
  }, [controls]);

  useEffect(() => {
    fitted.current = false;
    operated.current = false;
  }, [points]);

  useEffect(() => {
    if (!controls || points.length === 0) return;
    if (!fitted.current) {
      const stored = loadTwinPose(persistKey);
      const pose = stored && { pos: new THREE.Vector3(...stored.pos), tgt: new THREE.Vector3(...stored.tgt) };
      // A pose saved on a different build of this machine (e.g. before its model was rebuilt
      // at another scale) would leave the camera far off the model: drop it and fit instead.
      const saved = pose && pose.tgt.distanceTo(centre) <= radius * 1.5 && pose.pos.distanceTo(pose.tgt) <= radius * 4 ? pose : null;
      if (stored && !saved) clearTwinPose(persistKey);
      const g = saved ?? fitPoints(points, size.width, size.height, inset, 1, VIEW_DIR, minFit);
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
    if (command.kind === "fit") {
      clearTwinPose(persistKey);
      operated.current = false;
      goal.current = fitPoints(points, size.width, size.height, inset, 1, VIEW_DIR, minFit);
    } else if (command.kind === "focus" && focus) {
      operated.current = true;
      goal.current = fitPoints(focus, size.width, size.height, inset, 1.3, VIEW_DIR, minFit);
    } else if (command.kind === "zoom-in" || command.kind === "zoom-out") {
      operated.current = true;
      const k = command.kind === "zoom-in" ? 0.72 : 1.38;
      const offset = camera.position.clone().sub(controls.target).multiplyScalar(k);
      goal.current = { pos: controls.target.clone().add(offset), tgt: controls.target.clone() };
    }
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- inset re-fits below, not here
  }, [command, points, focus, camera, controls, size.width, size.height, invalidate]);

  useEffect(() => {
    if (!fitted.current || lastLayout.current === layoutKey) return;
    lastLayout.current = layoutKey;
    if (operated.current) return;
    goal.current = fitPoints(points, size.width, size.height, inset, 1, VIEW_DIR, minFit);
    invalidate();
  }, [layoutKey, inset, points, size.width, size.height, minFit, invalidate]);

  useTwinNavigation({
    centre,
    reach: radius * 1.4,
    onManual: () => {
      goal.current = null;
      operated.current = true;
    },
  });

  useFrame(() => {
    const g = goal.current;
    if (!g || !controls) return;
    camera.position.lerp(g.pos, 0.1);
    controls.target.lerp(g.tgt, 0.1);
    controls.update();
    if (camera.position.distanceTo(g.pos) < 0.02 && controls.target.distanceTo(g.tgt) < 0.01) goal.current = null;
    invalidate();
  });

  return (
    <TwinControls navMode={navMode} maxPolarAngle={Math.PI / 2.1} minDistance={radius < 8 ? 0.8 : 2} maxDistance={Math.max(60, radius * 8)} />
  );
}

/* ---------------------------------------------------------------- scene */

function corners(b: THREE.Box3): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) out.push(new THREE.Vector3(x, y, z));
  return out;
}

interface Bounds {
  all: THREE.Box3;
  bySystem: Map<string, THREE.Box3>;
  /** Vertices sampled from the model (world space): framing hugs the silhouette, not the bounding box. */
  samples: THREE.Vector3[];
}

function SceneContents({
  diagramType,
  machineTone,
  systems,
  dots,
  selectedId,
  onSelect,
  command,
  colors,
  paints,
  inset = NO_INSET,
  navMode = "move",
  persistKey,
}: MachineTwinCanvasProps) {
  // Pyro-line machines use their detailed model from the pyro plant (same build as the Home site).
  const pyroKey = (diagramType && PYRO_KEY[diagramType]) || null;
  const isKiln = !pyroKey && twinKind(diagramType) === "kiln";
  const isVpc = !pyroKey && twinKind(diagramType) === "vpc-casting";
  const built = isKiln || isVpc;
  const pyro = useMemo(() => {
    if (!pyroKey) return null;
    const mats = createKitMats();
    const built = buildPyroMachine(pyroKey, mats);
    applyKitPalette(mats, built.edgeMat, readPalette());
    built.group.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.userData.system = null;
    });
    return { ...built, mats };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- rebuilt on theme change (paints)
  }, [pyroKey, paints]);
  useEffect(
    () => () => {
      if (!pyro) return;
      pyro.dispose();
      for (const m of Object.values(pyro.mats)) m.dispose();
      pyro.edgeMat.dispose();
    },
    [pyro],
  );
  const generic = useMemo(() => buildMachineModel(diagramType), [diagramType]);
  const map = useFrameMap(generic.prims, generic.ground);
  // Catalog x / y and bboxes in % of the machine's own drawing (pyro line) → spread over this model's extent.
  const toModel = useMemo(() => {
    if (!usesForeignSpace(diagramType)) return { x: (p: number) => (p / 100) * SCHEMATIC_W, y: (p: number) => (p / 100) * SCHEMATIC_H, box: (b: Box2) => b };
    const e = modelExtent(generic);
    const x = (p: number) => e.x0 + (p / 100) * (e.x1 - e.x0);
    const y = (p: number) => e.y0 + (p / 100) * (e.y1 - e.y0);
    return { x, y, box: (b: Box2) => ({ x: x(b.x), y: y(b.y), width: (b.width / 100) * (e.x1 - e.x0), height: (b.height / 100) * (e.y1 - e.y0) }) };
  }, [diagramType, generic]);
  const model = useRef<THREE.Group>(null);
  const labels = useMemo(() => new Map<string, LabelSlot>(), []);
  const [hover, setHover] = useState<string | null>(null);
  const invalidate = useThree((st) => st.invalidate);
  useEffect(() => invalidate(), [colors, paints, systems, dots, selectedId, hover, invalidate]);

  // Ownership only changes when the set of subsystems does, not on every live tick.
  const systemKey = systems.map((s) => `${s.id}:${s.name}:${s.bbox ? Object.values(s.bbox).join(",") : ""}`).join("|");
  // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on systemKey
  const kilnOwn = useMemo(() => kilnOwners(systems), [systemKey]);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on systemKey
  const vpcOwn = useMemo(() => vpcOwners(systems), [systemKey]);
  const vpcRoleOf = useMemo(() => {
    const m = new Map<string, VpcRole>();
    for (const [r, id] of Object.entries(vpcOwn) as Array<[VpcRole, string | null]>) if (id) m.set(id, r);
    return m;
  }, [vpcOwn]);
  const genericOwn = useMemo(
    () => generic.prims.map((p) => ownerOf(p, systems.map((s) => ({ id: s.id, bbox: s.bbox && toModel.box(s.bbox) })))),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on systemKey
    [generic, systemKey, toModel],
  );

  // Measure the built model: whole machine and each subsystem's parts.
  const [bounds, setBounds] = useState<Bounds | null>(null);
  useLayoutEffect(() => {
    const root = model.current;
    if (!root) return;
    root.updateMatrixWorld(true);
    const all = new THREE.Box3();
    const bySystem = new Map<string, THREE.Box3>();
    root.traverse((o) => {
      if (!(o as THREE.Mesh).isMesh || o.userData.system === undefined) return;
      const b = new THREE.Box3().setFromObject(o);
      all.union(b);
      const id = o.userData.system as string | null;
      if (id) bySystem.set(id, (bySystem.get(id) ?? new THREE.Box3()).union(b));
    });
    if (all.isEmpty()) return;
    all.min.y = 0;
    // Sample the model's vertices (about 3000 in all) so the camera fits what is drawn, not empty box corners.
    let total = 0;
    root.traverse((o) => {
      const g = (o as THREE.Mesh).isMesh ? (o as THREE.Mesh).geometry : null;
      if (g && o.userData.system !== undefined) total += g.getAttribute("position")?.count ?? 0;
    });
    const stride = Math.max(1, Math.floor(total / 3000));
    const samples: THREE.Vector3[] = [];
    root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || o.userData.system === undefined) return;
      const pos = m.geometry.getAttribute("position");
      if (!pos) return;
      for (let i = 0; i < pos.count; i += stride) samples.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld));
    });
    setBounds({ all, bySystem, samples });
    invalidate();
  }, [isKiln, isVpc, pyro, generic, kilnOwn, vpcOwn, genericOwn, invalidate]);

  // Sensor pads: kiln tags on their physical anchors; others raycast onto the surface.
  // `dots` is a new array every live tick, but only the sensors' positions matter here:
  // re-raycasting the whole model each second stalled the camera once a second.
  const dotsRef = useRef(dots);
  dotsRef.current = dots;
  const dotPlaces = dots.map((d) => `${d.tag}:${d.x}:${d.y}:${d.systemId ?? ""}`).join("|");
  const pads = useMemo<PlacedPad[]>(() => {
    const dots = dotsRef.current;
    if (isKiln || isVpc) {
      const [anchors, cx] = isKiln ? [KILN_ANCHORS, KILN_CENTRE_X] : [VPC_ANCHORS, VPC_CENTRE_X];
      return dots.flatMap((dot) => {
        const a = anchors[dot.tag];
        return a ? [{ dot, p: new THREE.Vector3(a[0] - cx, a[1] + PLINTH_H, a[2]) }] : [];
      });
    }
    const root = model.current;
    if (!root || !bounds) return [];
    const ray = new THREE.Raycaster();
    const dir = new THREE.Vector3(0, 0, -1);
    const down = new THREE.Vector3(0, -1, 0);
    if (pyro) {
      // Drawing x / y (% of the machine's own sheet) spread over the model's front elevation, dropped onto its surface.
      const b = bounds.all;
      const sz = b.getSize(new THREE.Vector3());
      return dots.flatMap((dot) => {
        if (dot.x <= 0 && dot.y <= 0) return [];
        const wx = b.min.x + (dot.x / 100) * sz.x;
        const wy = Math.max(PLINTH_H + 0.3, b.max.y - (dot.y / 100) * (sz.y - PLINTH_H));
        ray.set(new THREE.Vector3(wx, wy, b.max.z + 50), dir);
        const hit = ray.intersectObject(root, true).find((h) => (h.object as THREE.Mesh).isMesh);
        // Nothing in front at that height: drop onto the machine from above instead of floating in the air.
        let h = hit;
        if (!h) {
          ray.set(new THREE.Vector3(wx, b.max.y + 50, (b.min.z + b.max.z) / 2), down);
          h = ray.intersectObject(root, true).find((x) => (x.object as THREE.Mesh).isMesh && x.point.y > PLINTH_H + 0.2);
        }
        if (!h) {
          // Still nothing: snap to the nearest point of the drawn silhouette (front-most at that spot).
          let best: THREE.Vector3 | null = null;
          let bd = Infinity;
          for (const q of bounds.samples) {
            const d = Math.hypot(q.x - wx, q.y - wy) - q.z * 0.02;
            if (d < bd) {
              bd = d;
              best = q;
            }
          }
          const at = best ? best.clone() : new THREE.Vector3(wx, wy, (b.min.z + b.max.z) / 2);
          return [{ dot, p: at.clone().add(new THREE.Vector3(0, 0, 0.92)), mount: { at, n: new THREE.Vector3(0, 0, 1) } }];
        }
        const n = h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : new THREE.Vector3(0, 0, 1);
        if (n.dot(ray.ray.direction) > 0) n.negate(); // face toward the viewer side the ray came from
        return [{ dot, p: h.point.clone().addScaledVector(n, 0.92), mount: { at: h.point.clone(), n } }];
      });
    }
    return dots.flatMap((dot) => {
      if (dot.x <= 0 && dot.y <= 0) return [];
      const wx = map.x(toModel.x(dot.x));
      const wy = map.y(toModel.y(dot.y));
      ray.set(new THREE.Vector3(wx, wy, 200), dir);
      const hit = ray.intersectObject(root, true)[0];
      return [{ dot, p: new THREE.Vector3(wx, wy, hit ? hit.point.z + 0.1 : 0) }];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on dotPlaces, not on live values
  }, [isKiln, isVpc, pyro, dotPlaces, map, bounds, toModel]);

  // Pyro models are merged per material, so a subsystem's extent comes from its sensor pads.
  const padBounds = useMemo(() => {
    const m = new Map<string, THREE.Box3>();
    if (!pyro) return m;
    for (const { dot, p } of pads) {
      if (!dot.systemId) continue;
      const b = m.get(dot.systemId) ?? new THREE.Box3();
      b.expandByPoint(p);
      m.set(dot.systemId, b);
    }
    for (const b of m.values()) b.expandByScalar(2);
    return m;
  }, [pyro, pads]);
  const systemBox = (id: string) => bounds?.bySystem.get(id) ?? padBounds.get(id);

  const points = useMemo(() => {
    if (!bounds) return [];
    // The model's own silhouette plus a little headroom over its top for the labels.
    const c = bounds.all.getCenter(new THREE.Vector3());
    const head = new THREE.Vector3(c.x, bounds.all.max.y + (isKiln ? 3 : isVpc ? 0.5 : 2), c.z);
    return bounds.samples.length ? [...bounds.samples, head] : corners(bounds.all);
  }, [bounds, isKiln, isVpc]);
  const focus = useMemo(() => {
    const b = selectedId ? systemBox(selectedId) : undefined;
    return b ? corners(b) : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- systemBox reads bounds and padBounds
  }, [selectedId, bounds, padBounds]);

  const sensorsBySystem = useMemo(() => {
    const m = new Map<string, number>();
    for (const d of dots) if (d.systemId) m.set(d.systemId, (m.get(d.systemId) ?? 0) + 1);
    return m;
  }, [dots]);

  const materials = useTwinMaterials(paints, KILN_SKIN);
  const ctx = useMemo<PartCtxValue>(
    () => ({
      materials,
      selectedId,
      hoverId: hover,
      selectColor: colors.select,
      hoverColor: colors.select,
      edgeColor: colors.rimIdle,
      onOver: (id) => {
        setHover(id);
        document.body.style.cursor = "pointer";
      },
      onOut: () => {
        setHover(null);
        document.body.style.cursor = "";
      },
      onPick: (id) => onSelect(id === selectedId ? null : id),
    }),
    [materials, selectedId, hover, colors.select, colors.rimIdle, onSelect],
  );

  const all = useMemo(() => bounds?.all ?? new THREE.Box3(new THREE.Vector3(-5, 0, -3), new THREE.Vector3(5, 4, 3)), [bounds]);
  const size = all.getSize(new THREE.Vector3());
  const centre = useMemo(() => all.getCenter(new THREE.Vector3()).setY(0), [all]);
  const radius = Math.max(4, size.length() / 2);
  const pad = isKiln || pyro ? 4 : isVpc ? 1.2 : 1.6;
  const slabW = size.x + pad;
  const slabD = size.z + pad;
  // Machine-kit rule: the slab rim stays quiet; status lives on the measurement pads and labels.
  void machineTone;
  const rim = colors.rimIdle;
  // The built model only changes with its parts and owners; live ticks must not re-render it
  // (hover and selection still reach its parts through PartCtx).
  const builtModel = useMemo(
    () =>
      pyro ? (
        <primitive object={pyro.group} />
      ) : isKiln ? (
        <KilnModel owners={kilnOwn} />
      ) : isVpc ? (
        <VpcModel owners={vpcOwn} />
      ) : (
        <GenericModel prims={generic.prims} map={map} owners={genericOwn} />
      ),
    [pyro, isKiln, isVpc, kilnOwn, vpcOwn, generic.prims, map, genericOwn],
  );

  return (
    <>
      <TwinLighting colors={colors} radius={radius} fog={fogRange(radius)} />

      <Ground colors={colors} extent={radius} />

      {/* plinth: the machine's slab, rim carries machine status */}
      <group position={[centre.x, 0, centre.z]}>
        <mesh position={[0, PLINTH_H / 2, 0]} receiveShadow onClick={() => onSelect(null)}>
          <boxGeometry args={[slabW, PLINTH_H, slabD]} />
          <meshStandardMaterial color={colors.plinth} roughness={0.6} metalness={0.2} />
        </mesh>
        <mesh position={[0, PLINTH_H + 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow raycast={() => undefined}>
          <planeGeometry args={[slabW - 0.3, slabD - 0.3]} />
          {/* 4 mm above the slab is below depth precision from afar: offset it so it never z-fights. */}
          <meshStandardMaterial color={colors.plinthTop} roughness={0.5} metalness={0.25} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
        </mesh>
        {[
          [0, (slabD + 0.03) / 2, slabW + 0.06, 0.05],
          [0, -(slabD + 0.03) / 2, slabW + 0.06, 0.05],
          [(slabW + 0.03) / 2, 0, 0.05, slabD + 0.06],
          [-(slabW + 0.03) / 2, 0, 0.05, slabD + 0.06],
        ].map(([ox, oz, bw, bd], i) => (
          <mesh key={i} position={[ox, PLINTH_H - 0.1, oz]} raycast={() => undefined}>
            <boxGeometry args={[bw, 0.09, bd]} />
            <meshBasicMaterial color={rim} toneMapped={false} />
          </mesh>
        ))}
      </group>

      <PartCtx.Provider value={ctx}>
        {/* The built model stands on the plinth. */}
        <group ref={model} position={[0, built || pyro ? PLINTH_H : 0, 0]}>
          {builtModel}
        </group>
      </PartCtx.Provider>

      {pyro && <Instruments pads={pads} mats={pyro.mats} edge={colors.rimIdle} />}

      {bounds &&
        systems.map((s) => {
          const b = systemBox(s.id);
          if (!b) return null;
          const c = b.getCenter(new THREE.Vector3());
          // The VPC cell is compact: each component's label hangs at its own built anchor.
          const role = isVpc ? vpcRoleOf.get(s.id) : undefined;
          const la = role && VPC_LABEL_ANCHORS[role];
          return (
            <SystemLabel
              key={s.id}
              system={s}
              anchor={la ? new THREE.Vector3(la[0] - VPC_CENTRE_X, la[1] + PLINTH_H, la[2]) : new THREE.Vector3(c.x, b.max.y + (isKiln ? 1.4 : 0.5), c.z)}
              active={s.id === selectedId || s.id === hover}
              sensors={sensorsBySystem.get(s.id) ?? 0}
              labels={labels}
            />
          );
        })}
      <LabelLayout labels={labels} />
      <CameraRig points={points} focus={focus} command={command} inset={inset} radius={radius} centre={centre} navMode={navMode} persistKey={persistKey} />
    </>
  );
}

export default function MachineTwinCanvas(props: MachineTwinCanvasProps) {
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
        camera={{ fov: FOV, near: 0.2, far: CAMERA_FAR, position: [40, 30, 60] }}
        onPointerMissed={() => props.onSelect(null)}
      >
        <SceneContents {...props} />
      </Canvas>
    </div>
  );
}
