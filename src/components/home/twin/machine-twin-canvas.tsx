"use client";

/**
 * The 3D machine twin canvas: the selected machine standing on its plinth in
 * the same yard as the plant twin (ground, fog, light, floating labels, camera
 * fit, real-world paints like the plant's CAD models).
 *
 * The kiln is a built model in real metres (kiln-twin-3d), with every D4 signal
 * on its physical anchor. Other machine types are extruded from their schematic
 * primitives (machine-twin-model), and their DB sensor coordinates are dropped
 * onto the nearest surface by a raycast. Status is carried by the pads, the
 * plinth rim and the component labels; selection by signal-blue edges.
 *
 * Loaded with next/dynamic (ssr: false).
 */
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
import { UNIT, buildMachineModel, ownerOf, type MachineFinish, type MachinePrim } from "./machine-twin-model";
import { KILN_ANCHORS, KILN_CENTRE_X, KilnModel, kilnOwners } from "./kiln-twin-3d";
import { TwinControls, useTwinNavigation, type TwinNavMode } from "./twin-nav";
import { PartCtx, TwinPart, useTwinMaterials, type PartCtxValue, type ShellSkin, type TwinPaint, type TwinPaints } from "./twin-part";
import { TWIN_GL, TwinLighting } from "./twin-lighting";

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
}

const PLINTH_H = 0.42;
/** Front-three-quarter view: the machine's long side faces the viewer. */
const VIEW_DIR = new THREE.Vector3(0.58, 0.34, 1).normalize();
/** Kiln shell skin: 74 m, burning zone 40–66 m (D4 Table 5.3a). */
const KILN_SKIN: ShellSkin = { length: 74, burning: [40, 66] };

const toneColor = (t: Tone, c: TwinColors) => (t === "bad" ? c.bad : t === "warn" ? c.warn : t === "good" ? c.good : c.idle);
const padTone = (s: SchematicDot["status"]): Tone => (s === "Critical" ? "bad" : s === "Advisory" ? "warn" : "good");

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

/* ---------------------------------------------------------------- pads */

interface PlacedPad {
  dot: SchematicDot;
  p: THREE.Vector3;
}

function Pads({ pads, radius, colors, focusId }: { pads: PlacedPad[]; radius: number; colors: TwinColors; focusId: string | null }) {
  const [hover, setHover] = useState<string | null>(null);
  return (
    <group>
      {pads.map(({ dot, p }) => {
        const tone = padTone(dot.status);
        const c = toneColor(tone, colors);
        const dim = Boolean(focusId && dot.systemId && dot.systemId !== focusId);
        return (
          <group key={dot.tag} position={p}>
            <mesh
              onPointerOver={(e) => {
                e.stopPropagation();
                setHover(dot.tag);
                document.body.style.cursor = "pointer";
              }}
              onPointerOut={() => {
                setHover(null);
                document.body.style.cursor = "";
              }}
            >
              <sphereGeometry args={[radius, 20, 14]} />
              <meshBasicMaterial color={c} toneMapped={false} transparent opacity={dim ? 0.25 : 1} />
            </mesh>
            {tone !== "good" && !dim && (
              <mesh raycast={() => undefined}>
                <sphereGeometry args={[radius * 2.1, 20, 14]} />
                <meshBasicMaterial color={c} transparent opacity={0.22} depthWrite={false} toneMapped={false} />
              </mesh>
            )}
            {hover === dot.tag && (
              <TwinHtml zIndexRange={[60, 50]} style={{ pointerEvents: "none" }}>
                <div className="ph-twin-label mt3-pad-tip" data-tone={tone}>
                  <span className="ph-twin-label-head">
                    <i aria-hidden="true" />
                    <span className="ph-twin-label-name">{dot.tag}</span>
                  </span>
                  <span className="ph-twin-label-meta">
                    {dot.name}
                    <b>
                      {dot.value} {dot.unit}
                    </b>
                  </span>
                </div>
              </TwinHtml>
            )}
          </group>
        );
      })}
    </group>
  );
}

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
}: {
  points: THREE.Vector3[];
  focus: THREE.Vector3[] | null;
  command: TwinCameraCommand;
  inset: TwinInset;
  radius: number;
  /** Middle of the machine on the floor; the camera target is kept within reach of it. */
  centre: THREE.Vector3;
  navMode: TwinNavMode;
}) {
  const { camera, invalidate, size } = useThree();
  const controls = useThree((st) => st.controls) as OrbitControlsImpl | null;
  const goal = useRef<{ pos: THREE.Vector3; tgt: THREE.Vector3 } | null>(null);
  const fitted = useRef(false);
  const operated = useRef(false);
  const lastCommand = useRef(-1);
  const layoutKey = `${size.width}|${size.height}|${inset.top}|${inset.right}|${inset.bottom}|${inset.left}`;
  const lastLayout = useRef("");

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
      const g = fitPoints(points, size.width, size.height, inset, 1, VIEW_DIR);
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
      operated.current = false;
      goal.current = fitPoints(points, size.width, size.height, inset, 1, VIEW_DIR);
    } else if (command.kind === "focus" && focus) {
      operated.current = true;
      goal.current = fitPoints(focus, size.width, size.height, inset, 1.3, VIEW_DIR);
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
    goal.current = fitPoints(points, size.width, size.height, inset, 1, VIEW_DIR);
    invalidate();
  }, [layoutKey, inset, points, size.width, size.height, invalidate]);

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
    <TwinControls navMode={navMode} maxPolarAngle={Math.PI / 2.1} minDistance={2} maxDistance={Math.max(60, radius * 8)} />
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
}: MachineTwinCanvasProps) {
  const isKiln = diagramType === "kiln";
  const generic = useMemo(() => buildMachineModel(diagramType), [diagramType]);
  const map = useFrameMap(generic.prims, generic.ground);
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
  const genericOwn = useMemo(() => generic.prims.map((p) => ownerOf(p, systems)), [generic, systemKey]);

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
    setBounds({ all, bySystem });
    invalidate();
  }, [isKiln, generic, kilnOwn, genericOwn, invalidate]);

  // Sensor pads: kiln tags on their physical anchors; others raycast onto the surface.
  const pads = useMemo<PlacedPad[]>(() => {
    if (isKiln) {
      return dots.flatMap((dot) => {
        const a = KILN_ANCHORS[dot.tag];
        return a ? [{ dot, p: new THREE.Vector3(a[0] - KILN_CENTRE_X, a[1], a[2]) }] : [];
      });
    }
    const root = model.current;
    if (!root || !bounds) return [];
    const ray = new THREE.Raycaster();
    const dir = new THREE.Vector3(0, 0, -1);
    return dots.flatMap((dot) => {
      if (dot.x <= 0 && dot.y <= 0) return [];
      const wx = map.x((dot.x / 100) * SCHEMATIC_W);
      const wy = map.y((dot.y / 100) * SCHEMATIC_H);
      ray.set(new THREE.Vector3(wx, wy, 200), dir);
      const hit = ray.intersectObject(root, true)[0];
      return [{ dot, p: new THREE.Vector3(wx, wy, hit ? hit.point.z + 0.1 : 0) }];
    });
  }, [isKiln, dots, map, bounds]);

  const points = useMemo(() => {
    if (!bounds) return [];
    const b = bounds.all.clone();
    b.max.y += isKiln ? 3 : 1.2; // label headroom
    return corners(b);
  }, [bounds, isKiln]);
  const focus = useMemo(() => {
    const b = selectedId ? bounds?.bySystem.get(selectedId) : undefined;
    return b ? corners(b) : null;
  }, [selectedId, bounds]);

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
      hoverColor: colors.rimIdle,
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
  const pad = isKiln ? 4 : 1.6;
  const slabW = size.x + pad;
  const slabD = size.z + pad;
  const rim = toneColor(machineTone, colors);

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
          <meshStandardMaterial color={colors.plinthTop} roughness={0.5} metalness={0.25} />
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
        <group ref={model} position={[0, isKiln ? PLINTH_H : 0, 0]}>
          {isKiln ? <KilnModel owners={kilnOwn} /> : <GenericModel prims={generic.prims} map={map} owners={genericOwn} />}
        </group>
      </PartCtx.Provider>

      <group position={[0, isKiln ? PLINTH_H : 0, 0]}>
        <Pads pads={pads} radius={isKiln ? 0.24 : 0.17} colors={colors} focusId={selectedId ?? hover} />
      </group>

      {bounds &&
        systems.map((s) => {
          const b = bounds.bySystem.get(s.id);
          if (!b) return null;
          const c = b.getCenter(new THREE.Vector3());
          return (
            <SystemLabel
              key={s.id}
              system={s}
              anchor={new THREE.Vector3(c.x, b.max.y + (isKiln ? 1.4 : 0.5), c.z)}
              active={s.id === selectedId || s.id === hover}
              sensors={sensorsBySystem.get(s.id) ?? 0}
              labels={labels}
            />
          );
        })}
      <LabelLayout labels={labels} />
      <CameraRig points={points} focus={focus} command={command} inset={inset} radius={radius} centre={centre} navMode={navMode} />
    </>
  );
}

export default function MachineTwinCanvas(props: MachineTwinCanvasProps) {
  return (
    <div className="ph-twin-canvas">
      <Canvas
        shadows
        dpr={[1, 1.75]}
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
