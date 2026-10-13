"use client";

/**
 * The shared stage for every 3D twin (plant and machine): background, fog,
 * image-based lighting from three's procedural room (no download), a warm key
 * light with soft shadows and a cool fill. One look for every twin: the floor
 * reads lit near the scene and fades into the fog at the edges.
 */
import { useThree } from "@react-three/fiber";
import React, { useEffect } from "react";
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

function Environment({ intensity }: { intensity: number }) {
  const gl = useThree((st) => st.gl);
  const scene = useThree((st) => st.scene);
  const invalidate = useThree((st) => st.invalidate);
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = env;
    scene.environmentIntensity = intensity;
    invalidate();
    return () => {
      scene.environment = null;
      env.dispose();
      pmrem.dispose();
    };
  }, [gl, scene, intensity, invalidate]);
  return null;
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
      <Environment intensity={colors.dark ? 0.55 : 0.7} />
      <hemisphereLight intensity={colors.dark ? 0.35 : 0.5} groundColor={colors.ground} />
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
      <directionalLight position={[-radius * 0.6, radius * 0.5, -radius * 0.5]} intensity={colors.dark ? 0.45 : 0.6} />
    </>
  );
}
