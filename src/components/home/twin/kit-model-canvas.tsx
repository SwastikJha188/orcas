"use client";

/**
 * 3D viewer for a generated machine-kit model (a module exporting
 * `model: KitModel`, registered in ./models): the model built with the kit
 * materials (createKitMats / applyKitPalette, so it follows the theme without
 * a rebuild), standing in the shared twin stage — TwinLighting, the endless
 * Ground grid and fog. Every named part (`part("…")` in build) is its own
 * group: hovering lights its rim and names it, clicking selects it (like
 * TwinPart's PartCtx subsystems); the camera fits the model and focuses the
 * selected part.
 *
 * Loaded with next/dynamic (ssr: false).
 */
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { CAMERA_FAR, FOV, Ground, NO_INSET, fitPoints, fogRange, type TwinCameraCommand, type TwinColors, type TwinInset } from "./plant-twin-canvas";
import { applyKitPalette, createKitMats, readPalette } from "./pyro-plant-model";
import { buildKitModel, type KitModel } from "./models";
import { TwinControls, useTwinNavigation } from "./twin-nav";
import { TwinHtml } from "./twin-html";
import { TWIN_GL, TwinLighting } from "./twin-lighting";
import { TWIN_RESIZE, twinEvents, useTwinDpr } from "./use-ui-zoom";
import "./kit-model.css";

export interface KitModelCanvasProps {
  model: KitModel;
  colors: TwinColors;
  /** Selected part name, or null. */
  selected: string | null;
  onSelect: (part: string | null) => void;
  /** Camera command from the page's nav bar (fit / zoom / focus on the selected part). */
  command?: TwinCameraCommand;
  inset?: TwinInset;
  /** Reports the named parts once built (for a page's part list). */
  onParts?: (parts: string[]) => void;
}

/** Front-left three-quarter view, as the machine twin. */
const VIEW_DIR = new THREE.Vector3(-0.58, 0.34, 1).normalize();
const NO_COMMAND: TwinCameraCommand = { kind: "fit", n: 0 };

function corners(b: THREE.Box3): THREE.Vector3[] {
  const out: THREE.Vector3[] = [];
  for (const x of [b.min.x, b.max.x]) for (const y of [b.min.y, b.max.y]) for (const z of [b.min.z, b.max.z]) out.push(new THREE.Vector3(x, y, z));
  return out;
}

/** Part name of the hit mesh (merged meshes carry it in userData). */
const partOf = (o: THREE.Object3D | null): string | null => (o?.userData.part as string | null | undefined) ?? null;

function CameraRig({ all, focus, command, inset, radius }: { all: THREE.Box3; focus: THREE.Box3 | null; command: TwinCameraCommand; inset: TwinInset; radius: number }) {
  const { camera, invalidate, size } = useThree();
  const controls = useThree((st) => st.controls) as OrbitControlsImpl | null;
  const goal = useRef<{ pos: THREE.Vector3; tgt: THREE.Vector3 } | null>(null);
  const fitted = useRef(false);
  const lastCommand = useRef(command.n);
  const minDist = radius < 8 ? 1.4 : 8;
  const centre = useMemo(() => all.getCenter(new THREE.Vector3()).setY(0), [all]);

  useEffect(() => {
    if (!controls) return;
    const stop = () => {
      goal.current = null;
    };
    controls.addEventListener("start", stop);
    return () => controls.removeEventListener("start", stop);
  }, [controls]);

  // First fit (and again when the model or the canvas size changes before anyone moved the camera).
  useEffect(() => {
    if (!controls) return;
    const g = fitPoints(corners(all), size.width, size.height, inset, 1, VIEW_DIR, minDist);
    if (!fitted.current) {
      camera.position.copy(g.pos);
      controls.target.copy(g.tgt);
      controls.update();
      fitted.current = true;
    } else goal.current = g;
    invalidate();
  }, [all, controls, camera, size.width, size.height, inset, minDist, invalidate]);

  useEffect(() => {
    if (!controls || command.n === lastCommand.current) return;
    lastCommand.current = command.n;
    if (command.kind === "fit") goal.current = fitPoints(corners(all), size.width, size.height, inset, 1, VIEW_DIR, minDist);
    else if (command.kind === "focus" && focus) goal.current = fitPoints(corners(focus), size.width, size.height, inset, 1.3, VIEW_DIR, minDist);
    else if (command.kind === "zoom-in" || command.kind === "zoom-out") {
      const k = command.kind === "zoom-in" ? 0.72 : 1.38;
      const offset = camera.position.clone().sub(controls.target).multiplyScalar(k);
      goal.current = { pos: controls.target.clone().add(offset), tgt: controls.target.clone() };
    }
    invalidate();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs per command only
  }, [command, controls]);

  useTwinNavigation({
    centre,
    reach: radius * 1.4,
    onManual: () => {
      goal.current = null;
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

  return <TwinControls maxPolarAngle={Math.PI / 2.1} minDistance={radius < 8 ? 0.6 : 2} maxDistance={Math.max(60, radius * 8)} />;
}

function Scene({ model, colors, selected, onSelect, command = NO_COMMAND, inset = NO_INSET, onParts }: KitModelCanvasProps) {
  const invalidate = useThree((st) => st.invalidate);
  const [hover, setHover] = useState<string | null>(null);

  // Built once per model; a theme switch only recolours the shared materials.
  const kit = useMemo(() => {
    const mats = createKitMats();
    const edgeMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.85 });
    return { mats, edgeMat, built: buildKitModel(model, mats, edgeMat) };
  }, [model]);
  useEffect(
    () => () => {
      kit.built.dispose();
      for (const m of Object.values(kit.mats)) m.dispose();
      kit.edgeMat.dispose();
    },
    [kit],
  );
  useEffect(() => {
    if (kit.built.error) console.error(`3D model ${model.id}: build() failed — ${kit.built.error}`);
    onParts?.(kit.built.parts);
  }, [kit, model.id, onParts]);

  useEffect(() => {
    applyKitPalette(kit.mats, kit.edgeMat, readPalette());
    for (const [name, rim] of kit.built.rims) {
      const lit = name === selected || name === hover;
      rim.color.set(lit ? colors.select : kit.edgeMat.color);
      rim.opacity = lit ? 1 : kit.edgeMat.opacity;
    }
    invalidate();
  }, [kit, colors, selected, hover, invalidate]);

  // Whole model and each part, in world space (the model stands on y = 0, centred).
  const bounds = useMemo(() => {
    const root = kit.built.root;
    root.updateMatrixWorld(true);
    const all = new THREE.Box3();
    const byPart = new Map<string, THREE.Box3>();
    root.traverse((o) => {
      if (!(o as THREE.Mesh).isMesh) return;
      const b = new THREE.Box3().setFromObject(o);
      all.union(b);
      const p = partOf(o);
      if (p) byPart.set(p, (byPart.get(p) ?? new THREE.Box3()).union(b));
    });
    if (all.isEmpty()) all.set(new THREE.Vector3(-2, 0, -2), new THREE.Vector3(2, 2, 2));
    return { all, byPart };
  }, [kit]);
  const radius = Math.max(2, bounds.all.getSize(new THREE.Vector3()).length() / 2);
  const focus = selected ? (bounds.byPart.get(selected) ?? null) : null;

  const label = hover ?? selected;
  const labelAt = useMemo(() => {
    const b = label ? bounds.byPart.get(label) : undefined;
    return b ? new THREE.Vector3((b.min.x + b.max.x) / 2, b.max.y + radius * 0.04, (b.min.z + b.max.z) / 2) : null;
  }, [label, bounds, radius]);

  useEffect(() => () => void (document.body.style.cursor = ""), []);
  const over = (e: ThreeEvent<PointerEvent>) => {
    const p = partOf(e.object);
    if (!p) return;
    e.stopPropagation();
    setHover(p);
    document.body.style.cursor = "pointer";
  };
  const out = (e: ThreeEvent<PointerEvent>) => {
    const p = partOf(e.object);
    setHover((h) => (h === p ? null : h));
    document.body.style.cursor = "";
  };
  const click = (e: ThreeEvent<MouseEvent>) => {
    const p = partOf(e.object);
    if (!p) return;
    e.stopPropagation();
    onSelect(p === selected ? null : p);
  };

  return (
    <>
      <TwinLighting colors={colors} radius={radius} fog={fogRange(radius)} />
      <Ground colors={colors} extent={radius} />
      <primitive object={kit.built.root} onPointerOver={over} onPointerOut={out} onClick={click} />
      {label && labelAt && (
        <group position={labelAt}>
          <TwinHtml zIndexRange={[40, 21]} style={{ pointerEvents: "none" }}>
            <div className="kmv-label" data-active={label === selected || undefined}>
              {label}
            </div>
          </TwinHtml>
        </group>
      )}
      <CameraRig all={bounds.all} focus={focus} command={command} inset={inset} radius={radius} />
    </>
  );
}

export default function KitModelCanvas(props: KitModelCanvasProps) {
  const dpr = useTwinDpr();
  return (
    <div className="kmv-canvas">
      <Canvas
        shadows
        dpr={dpr}
        resize={TWIN_RESIZE}
        events={twinEvents}
        frameloop="demand"
        gl={TWIN_GL}
        camera={{ fov: FOV, near: 0.05, far: CAMERA_FAR, position: [-12, 8, 18] }}
        onPointerMissed={() => props.onSelect(null)}
      >
        <Scene {...props} />
      </Canvas>
    </div>
  );
}
