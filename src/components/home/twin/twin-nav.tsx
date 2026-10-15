"use client";

/**
 * Shared navigation for the 3D twins (plant and machine): map-style controls,
 * keyboard walking, a leash that keeps the view over the scene, and the
 * Move / Orbit switch with a reset button. One behaviour on every twin.
 *
 *   Move  (default): drag pans across the floor, right-drag orbits.
 *   Orbit:           drag orbits, right-drag pans.
 *   Scroll zooms toward the cursor. WASD / arrows walk, Q / E turn.
 */
import { OrbitControls } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { TwinNavMode } from "./twin-nav-ui";

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

/** OrbitControls set up for the twin: floor-plane panning, zoom to cursor, mode-dependent buttons. */
export function TwinControls({
  navMode,
  minDistance,
  maxDistance,
  maxPolarAngle,
}: {
  navMode: TwinNavMode;
  minDistance: number;
  maxDistance: number;
  maxPolarAngle: number;
}) {
  return (
    <OrbitControls
      makeDefault
      enableDamping
      dampingFactor={0.12}
      maxPolarAngle={maxPolarAngle}
      minDistance={minDistance}
      maxDistance={maxDistance}
      screenSpacePanning={false}
      zoomToCursor
      mouseButtons={
        navMode === "move"
          ? { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }
          : { LEFT: THREE.MOUSE.ROTATE, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.PAN }
      }
      touches={navMode === "move" ? { ONE: THREE.TOUCH.PAN, TWO: THREE.TOUCH.DOLLY_ROTATE } : { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN }}
    />
  );
}

/**
 * Leash and keyboard for the default controls. The target stays within
 * `reach` of `centre` on the floor; keys walk across the floor relative to the
 * view. `onManual` fires when the keyboard takes the camera (cancel any
 * automatic move).
 */
export function useTwinNavigation({ centre, reach, onManual }: { centre: THREE.Vector3; reach: number; onManual: () => void }) {
  const camera = useThree((st) => st.camera);
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

  const held = useRef(new Set<string>());
  useEffect(() => {
    const typing = (el: Element | null) =>
      !!el &&
      (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement || (el as HTMLElement).isContentEditable);
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (!MOVE_KEYS.has(k) || e.metaKey || e.ctrlKey || e.altKey || typing(document.activeElement)) return;
      // Arrow keys on a focused control (menus, tabs) keep their own meaning.
      if (k.startsWith("arrow") && document.activeElement && document.activeElement !== document.body) return;
      e.preventDefault();
      held.current.add(k);
      manual.current();
      invalidate();
    };
    const up = (e: KeyboardEvent) => held.current.delete(e.key.toLowerCase());
    const clear = () => held.current.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
    };
  }, [invalidate]);

  useFrame((_, dt) => {
    const keys = held.current;
    if (!controls || keys.size === 0) return;
    const step = Math.min(dt, 0.05);
    const dist = camera.position.distanceTo(controls.target);
    const fwd = controls.target.clone().sub(camera.position).setY(0).normalize();
    const right = new THREE.Vector3().crossVectors(fwd, THREE.Object3D.DEFAULT_UP).normalize();
    const move = new THREE.Vector3();
    if (keys.has("w") || keys.has("arrowup")) move.add(fwd);
    if (keys.has("s") || keys.has("arrowdown")) move.sub(fwd);
    if (keys.has("d") || keys.has("arrowright")) move.add(right);
    if (keys.has("a") || keys.has("arrowleft")) move.sub(right);
    if (move.lengthSq() > 0) {
      move.normalize().multiplyScalar(dist * 0.6 * step);
      camera.position.add(move);
      controls.target.add(move);
    }
    const turn = (keys.has("e") ? 1 : 0) - (keys.has("q") ? 1 : 0);
    if (turn) {
      const offset = camera.position.clone().sub(controls.target);
      offset.applyAxisAngle(THREE.Object3D.DEFAULT_UP, turn * 1.2 * step);
      camera.position.copy(controls.target).add(offset);
    }
    controls.update();
    invalidate();
  });
}
