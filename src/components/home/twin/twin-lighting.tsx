"use client";

/**
 * The shared stage for every 3D twin (plant and machine): background, fog,
 * image-based lighting from three's procedural room (no download), a warm key
 * light with soft shadows and a cool fill. One look for every twin: the floor
 * reads lit near the scene and fades into the fog at the edges.
 */
import { useFrame, useThree } from "@react-three/fiber";
import React, { useEffect, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { TwinColors } from "./plant-twin-canvas";

/** Renderer settings shared by the twin canvases. */
export const TWIN_GL: Partial<THREE.WebGLRendererParameters> & { toneMapping: THREE.ToneMapping; toneMappingExposure: number } = {
  antialias: true,
  alpha: false,
  powerPreference: "high-performance",
  toneMapping: THREE.ACESFilmicToneMapping,
  toneMappingExposure: 1.05,
};

/** A priority subscriber takes over rendering from r3f; this one draws nothing, so no frame is drawn. */
function HoldFrames() {
  useFrame(() => {}, 1);
  return null;
}

/**
 * Baking the room into an environment map takes ~35 ms, so it gets a task of
 * its own after the canvas mounts; no frame is drawn until it is in place.
 */
function Environment({ intensity }: { intensity: number }) {
  const gl = useThree((st) => st.gl);
  const scene = useThree((st) => st.scene);
  const invalidate = useThree((st) => st.invalidate);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let env: THREE.Texture | null = null;
    const pmrem = new THREE.PMREMGenerator(gl);
    const bake = setTimeout(() => {
      env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      scene.environment = env;
      setReady(true);
    }, 0);
    return () => {
      clearTimeout(bake);
      scene.environment = null;
      env?.dispose();
      pmrem.dispose();
      setReady(false);
    };
  }, [gl, scene, invalidate]);
  useEffect(() => {
    scene.environmentIntensity = intensity;
    invalidate();
  }, [scene, intensity, invalidate]);
  // First frame once the hold is gone (its subscriber leaves before this runs).
  useEffect(() => {
    if (ready) invalidate();
  }, [ready, invalidate]);
  return ready ? null : <HoldFrames />;
}

/**
 * Lights scaled to the scene: `radius` is the scene's bounding radius in metres,
 * `fog` the near / far fog distances.
 */
export function TwinLighting({ colors, radius, fog }: { colors: TwinColors; radius: number; fog: [number, number] }) {
  const shadow = Math.max(30, radius * 1.3);
  return (
    <>
      <color attach="background" args={[colors.fog]} />
      <fog attach="fog" args={[colors.fog, ...fog]} />
      <Environment intensity={colors.dark ? 0.42 : 0.6} />
      {/* Strong sky over a dark ground bounce: the machine-kit bodies read top-lit, like the drawings' body gradient. */}
      <hemisphereLight intensity={colors.dark ? 1.35 : 0.8} color="#ffffff" groundColor={colors.ground} />
      <directionalLight
        position={[radius * 0.45, radius * 0.9, radius * 0.75]}
        intensity={colors.dark ? 2.2 : 2.6}
        color={colors.sun}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-normalBias={0.04}
        shadow-camera-left={-shadow}
        shadow-camera-right={shadow}
        shadow-camera-top={shadow}
        shadow-camera-bottom={-shadow}
        shadow-camera-far={radius * 5}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-radius * 0.6, radius * 0.5, -radius * 0.5]} intensity={colors.dark ? 0.8 : 0.6} />
    </>
  );
}
