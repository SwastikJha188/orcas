"use client";

/**
 * Shared navigation for the 3D twins (plant and machine): simultaneous Orbit + Move
 * controls, trackpad 2-finger pan, keyboard walking, a leash that keeps the view
 * over the scene, and direct camera controls with reset.
 *
 *   Left-drag:                             orbits around target.
 *   Right-drag / Middle-drag / Shift+drag / Space+drag: pans across the floor.
 *   Trackpad 2-finger glide:               pans across the floor.
 *   Scroll / Pinch:                        zooms toward the cursor.
 *   WASD / arrows:                         walk across the floor, Q / E turn.
 */
import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { twinExternalHeld, type TwinNavMode, type TwinNudgeAction } from "./twin-nav-ui";
import { homeActive } from "../home-active";

export type { TwinNavMode };

type SavedPose = { pos: [number, number, number]; tgt: [number, number, number] };
const POSE_PREFIX = "ultron.twin.pose.";

/** Camera pose the operator last left this twin in, or null (never moved / reset). */
export function loadTwinPose(key: string | undefined): SavedPose | null {
  if (!key) return null;
  try {
    const raw = JSON.parse(window.localStorage.getItem(POSE_PREFIX + key) ?? "null");
    const ok = (v: unknown) => Array.isArray(v) && v.length === 3 && v.every((n) => typeof n === "number" && Number.isFinite(n));
    return raw && ok(raw.pos) && ok(raw.tgt) ? (raw as SavedPose) : null;
  } catch {
    return null;
  }
}

/** Forget the saved pose so the twin opens at its default framing again. */
export function clearTwinPose(key: string | undefined) {
  if (!key) return;
  try {
    window.localStorage.removeItem(POSE_PREFIX + key);
  } catch {
    /* storage unavailable */
  }
}

/** Save the camera pose after the operator moves it (debounced). Skipped while the view is still the automatic fit. */
export function usePersistTwinPose(key: string | undefined, operated: React.MutableRefObject<boolean>) {
  const camera = useThree((st) => st.camera);
  const controls = useThree((st) => st.controls) as OrbitControlsImpl | null;
  useEffect(() => {
    if (!controls || !key) return;
    let timer: number | undefined;
    const save = () => {
      if (!operated.current) return;
      const pose: SavedPose = { pos: camera.position.toArray() as SavedPose["pos"], tgt: controls.target.toArray() as SavedPose["tgt"] };
      try {
        window.localStorage.setItem(POSE_PREFIX + key, JSON.stringify(pose));
      } catch {
        /* storage unavailable */
      }
    };
    const onChange = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(save, 250);
    };
    controls.addEventListener("change", onChange);
    window.addEventListener("pagehide", save);
    return () => {
      window.clearTimeout(timer);
      controls.removeEventListener("change", onChange);
      window.removeEventListener("pagehide", save);
    };
  }, [controls, camera, key, operated]);
}

const MOVE_KEYS = new Set(["w", "a", "s", "d", "q", "e", "arrowup", "arrowdown", "arrowleft", "arrowright"]);

/** OrbitControls set up for simultaneous Orbit + Move: Left-drag orbits, Right/Middle/Shift/Space-drag pans across the floor. */
export function TwinControls({
  minDistance,
  maxDistance,
  maxPolarAngle,
}: {
  navMode?: TwinNavMode;
  minDistance: number;
  maxDistance: number;
  maxPolarAngle: number;
}) {
  const [spacePan, setSpacePan] = useState(false);

  useEffect(() => {
    const typing = (el: Element | null) =>
      !!el &&
      (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement || (el as HTMLElement).isContentEditable);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && homeActive.current && !typing(document.activeElement)) {
        setSpacePan(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpacePan(false);
    };
    const onBlur = () => setSpacePan(false);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  return (
    <OrbitControls
      makeDefault
      enableDamping
      dampingFactor={0.12}
      enablePan
      maxPolarAngle={maxPolarAngle}
      minDistance={minDistance}
      maxDistance={maxDistance}
      screenSpacePanning={false}
      zoomToCursor
      mouseButtons={{
        LEFT: spacePan ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE,
        MIDDLE: THREE.MOUSE.PAN,
        RIGHT: THREE.MOUSE.PAN,
      }}
      touches={{ ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
    />
  );
}

/**
 * Leash, keyboard, trackpad 2-finger pan, and on-screen TwinNavBar actions.
 * The target stays within `reach` of `centre` on the floor.
 */
export function useTwinNavigation({ centre, reach, onManual }: { centre: THREE.Vector3; reach: number; onManual: () => void }) {
  const camera = useThree((st) => st.camera);
  const gl = useThree((st) => st.gl);
  const invalidate = useThree((st) => st.invalidate);
  const controls = useThree((st) => st.controls) as OrbitControlsImpl | null;
  const manual = useRef(onManual);
  manual.current = onManual;

  useEffect(() => {
    if (!controls) return;
    const clamp = () => {
      const t = controls.target;
      const dx = THREE.MathUtils.clamp(t.x, centre.x - reach, centre.x + reach) - t.x;
      const dz = THREE.MathUtils.clamp(t.z, centre.z - reach, centre.z + reach) - t.z;
      const dy = Math.max(0, t.y) - t.y;
      if (dx || dy || dz) {
        t.x += dx;
        t.y += dy;
        t.z += dz;
        camera.position.x += dx;
        camera.position.y += dy;
        camera.position.z += dz;
      }
    };
    controls.addEventListener("change", clamp);
    return () => controls.removeEventListener("change", clamp);
  }, [controls, camera, centre, reach]);

  // Trackpad 2-finger horizontal/diagonal glide pans across the floor while pinch/vertical scroll zooms.
  useEffect(() => {
    const dom = gl.domElement;
    if (!dom || !controls) return;
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) return; // Pinch-to-zoom handled by OrbitControls
      const isTrackpadPan = e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY) * 0.35;
      if (!isTrackpadPan) return;
      e.preventDefault();
      e.stopPropagation();
      const dist = camera.position.distanceTo(controls.target);
      const fwd = controls.target.clone().sub(camera.position).setY(0).normalize();
      const right = new THREE.Vector3().crossVectors(fwd, THREE.Object3D.DEFAULT_UP).normalize();
      const scale = Math.max(0.015, dist * 0.0014);
      const dx = e.shiftKey && Math.abs(e.deltaX) < 1 ? e.deltaY : e.deltaX;
      const dy = e.shiftKey && Math.abs(e.deltaX) < 1 ? 0 : e.deltaY;
      const move = new THREE.Vector3().addScaledVector(right, dx * scale).addScaledVector(fwd, -dy * scale);
      camera.position.add(move);
      controls.target.add(move);
      controls.update();
      manual.current();
      invalidate();
    };
    dom.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => dom.removeEventListener("wheel", onWheel, { capture: true });
  }, [gl, controls, camera, invalidate]);

  const held = useRef(new Set<string>());
  useEffect(() => {
    const typing = (el: Element | null) =>
      !!el &&
      (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement || (el as HTMLElement).isContentEditable);
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (!homeActive.current || !MOVE_KEYS.has(k) || e.metaKey || e.ctrlKey || e.altKey || typing(document.activeElement)) return;
      if (k.startsWith("arrow") && document.activeElement && document.activeElement !== document.body) return;
      e.preventDefault();
      held.current.add(k);
      manual.current();
      invalidate();
    };
    const up = (e: KeyboardEvent) => held.current.delete(e.key.toLowerCase());
    const clear = () => {
      held.current.clear();
      twinExternalHeld.clear();
    };
    const onHold = () => {
      manual.current();
      invalidate();
    };
    const onNudge = (ev: Event) => {
      if (!controls) return;
      const action = (ev as CustomEvent<TwinNudgeAction>).detail;
      const dist = camera.position.distanceTo(controls.target);
      const fwd = controls.target.clone().sub(camera.position).setY(0).normalize();
      const right = new THREE.Vector3().crossVectors(fwd, THREE.Object3D.DEFAULT_UP).normalize();
      const step = Math.max(0.8, dist * 0.06);
      if (action === "move-up" || action === "move-down" || action === "move-left" || action === "move-right") {
        const move = new THREE.Vector3();
        if (action === "move-up") move.addScaledVector(fwd, step);
        if (action === "move-down") move.addScaledVector(fwd, -step);
        if (action === "move-right") move.addScaledVector(right, step);
        if (action === "move-left") move.addScaledVector(right, -step);
        camera.position.add(move);
        controls.target.add(move);
      } else if (action === "orbit-left" || action === "orbit-right") {
        const offset = camera.position.clone().sub(controls.target);
        offset.applyAxisAngle(THREE.Object3D.DEFAULT_UP, action === "orbit-right" ? 0.14 : -0.14);
        camera.position.copy(controls.target).add(offset);
      } else if (action === "zoom-in" || action === "zoom-out") {
        const offset = camera.position.clone().sub(controls.target);
        offset.multiplyScalar(action === "zoom-in" ? 0.82 : 1.22);
        camera.position.copy(controls.target).add(offset);
      }
      controls.update();
      manual.current();
      invalidate();
    };

    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    window.addEventListener("ultron:twin-hold", onHold);
    window.addEventListener("ultron:twin-nudge", onNudge);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
      window.removeEventListener("ultron:twin-hold", onHold);
      window.removeEventListener("ultron:twin-nudge", onNudge);
    };
  }, [controls, camera, invalidate]);

  useFrame((_, dt) => {
    const keys = held.current;
    if (!controls || (keys.size === 0 && twinExternalHeld.size === 0)) return;
    const has = (k: string) => keys.has(k) || twinExternalHeld.has(k);
    const step = Math.min(dt, 0.05);
    const dist = camera.position.distanceTo(controls.target);
    const fwd = controls.target.clone().sub(camera.position).setY(0).normalize();
    const right = new THREE.Vector3().crossVectors(fwd, THREE.Object3D.DEFAULT_UP).normalize();
    const move = new THREE.Vector3();
    if (has("w") || has("arrowup")) move.add(fwd);
    if (has("s") || has("arrowdown")) move.sub(fwd);
    if (has("d") || has("arrowright")) move.add(right);
    if (has("a") || has("arrowleft")) move.sub(right);
    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(dist * 0.6 * step);
      camera.position.add(move);
      controls.target.add(move);
    }
    const turn = (has("e") ? 1 : 0) - (has("q") ? 1 : 0);
    if (turn) {
      const offset = camera.position.clone().sub(controls.target);
      offset.applyAxisAngle(THREE.Object3D.DEFAULT_UP, turn * 1.2 * step);
      camera.position.copy(controls.target).add(offset);
    }
    controls.update();
    invalidate();
  });
}
