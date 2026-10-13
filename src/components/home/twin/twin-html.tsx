"use client";

/**
 * Screen-space HTML anchored to a point in the twin scene (drei `<Html center>`
 * subset). drei unmounts its inner React root synchronously from a layout-effect
 * cleanup, which runs inside R3F's commit and re-enters the app's react-dom root:
 * React warns, then throws `removeChild … not a child of this node` when the
 * plant twin is torn down. This version defers the unmount past the commit.
 */
import { useFrame, useThree } from "@react-three/fiber";
import React, { useLayoutEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import * as THREE from "three";

const v1 = new THREE.Vector3();
const v2 = new THREE.Vector3();

export function TwinHtml({
  children,
  zIndexRange = [16777271, 0],
  style,
}: {
  children: React.ReactNode;
  /** [nearest, farthest] z-index, interpolated by camera distance. */
  zIndexRange?: [number, number];
  style?: React.CSSProperties;
}) {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  const size = useThree((s) => s.size);
  const connected = useThree((s) => s.events.connected) as HTMLElement | undefined;
  const target = connected ?? (gl.domElement.parentNode as HTMLElement | null);
  const host = useRef<{ el: HTMLDivElement; root: Root } | null>(null);
  const group = useRef<THREE.Group>(null);
  const last = useRef({ x: NaN, y: NaN, visible: true });

  const render = () =>
    host.current?.root.render(
      <div style={{ position: "absolute", transform: "translate3d(-50%,-50%,0)", ...style }}>{children}</div>
    );

  useLayoutEffect(() => {
    if (!target) return;
    // Fresh container per mount: the old root unmounts later and must not touch it.
    const el = document.createElement("div");
    el.style.cssText = "position:absolute;top:0;left:0;transform-origin:0 0;";
    const root = createRoot(el);
    host.current = { el, root };
    last.current = { x: NaN, y: NaN, visible: true };
    // On-demand frameloop: place now, the next frame may be a while away.
    scene.updateMatrixWorld();
    place();
    render();
    target.appendChild(el);
    return () => {
      el.remove();
      host.current = null;
      // Never unmount a root while React is committing.
      setTimeout(() => root.unmount(), 0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- place()/render() read the latest props via closure
  }, [target, scene]);

  useLayoutEffect(render);

  function place() {
    const g = group.current;
    const el = host.current?.el;
    if (!g || !el) return;
    camera.updateMatrixWorld();
    g.updateWorldMatrix(true, false);
    const pos = v1.setFromMatrixPosition(g.matrixWorld);
    const camPos = v2.setFromMatrixPosition(camera.matrixWorld);

    const toObj = pos.clone().sub(camPos);
    const visible = toObj.angleTo(camera.getWorldDirection(new THREE.Vector3())) <= Math.PI / 2;
    if (visible !== last.current.visible) {
      el.style.display = visible ? "block" : "none";
      last.current.visible = visible;
    }

    const ndc = pos.clone().project(camera);
    const x = ndc.x * (size.width / 2) + size.width / 2;
    const y = -ndc.y * (size.height / 2) + size.height / 2;
    if (!(Math.abs(x - last.current.x) <= 0.001 && Math.abs(y - last.current.y) <= 0.001)) {
      el.style.transform = `translate3d(${x}px,${y}px,0)`;
      last.current.x = x;
      last.current.y = y;
    }

    if (camera instanceof THREE.PerspectiveCamera) {
      const [near, far] = zIndexRange;
      const a = (far - near) / (camera.far - camera.near);
      el.style.zIndex = `${Math.round(a * pos.distanceTo(camPos) + (far - a * camera.far))}`;
    }
  }

  useFrame(place);

  return <group ref={group} />;
}
