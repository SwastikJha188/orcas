/**
 * Diagram lab, 3D: builds one machine-kit model (a module exporting `model:
 * KitModel`) with the app's kit materials and the twin stage's lighting (room
 * environment, warm key light with soft shadows, cool fill, fog, floor grid),
 * then draws four views into one canvas — front-left and rear-right
 * three-quarter views, a front elevation and a plan — and writes a JSON report
 * for render.mjs.
 */
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { finishKitGroup, kitBuilder } from "@/components/home/twin/machine-kit-3d";
import type { KitModel } from "@/components/home/twin/models/kit-model";
import { applyKitPalette, createKitMats, readPalette } from "@/components/home/twin/pyro-plant-model";
import { createInfiniteGrid } from "@/components/home/twin/infinite-grid";

declare global {
  interface Window {
    __labDone?: boolean;
    __labReport?: unknown;
  }
}

/** What a generated 3D file exports as `model` (shared with the app viewer). */
export type { KitModel };

export function mount3d(mod: Record<string, unknown>) {
  const model = (mod.model ?? Object.values(mod).find((v) => v && typeof v === "object" && "build" in (v as object))) as KitModel | undefined;
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!model || typeof model.build !== "function") {
    window.__labReport = { errors: ["The file must `export const model: KitModel = { id, name, size, build(k, mats, part) { … } }`."] };
    window.__labDone = true;
    return;
  }
  const palette = readPalette();
  const css = getComputedStyle(document.documentElement);
  const canvasColor = css.getPropertyValue("--mx-canvas").trim() || "#0c0d0e";
  const gridColor = css.getPropertyValue("--separator").trim() || "#35343a";

  const mats = createKitMats();
  const edgeMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.85 });
  applyKitPalette(mats, edgeMat, palette);

  // Build: one group per part, merged per material with the kit rim.
  const root = new THREE.Group();
  const k = kitBuilder(mats);
  const parts: THREE.Group[] = [];
  const part = (name: string | null) => {
    const g = new THREE.Group();
    g.name = name ?? "";
    root.add(g);
    parts.push(g);
    k.into(g);
  };
  part(null);
  const perMat = new Map<THREE.Material, number>();
  try {
    model.build(k, mats, part);
  } catch (e) {
    errors.push(`build() threw: ${e instanceof Error ? e.stack ?? e.message : String(e)}`);
  }
  let meshes = 0;
  for (const g of parts) {
    for (const o of g.children) {
      if (o instanceof THREE.Mesh) {
        meshes++;
        perMat.set(o.material as THREE.Material, (perMat.get(o.material as THREE.Material) ?? 0) + 1);
      }
    }
    finishKitGroup(g, edgeMat, [mats.rail, mats.material, mats.bolt, mats.recess]);
  }
  const named = parts.filter((g) => g.name && g.children.length).map((g) => g.name);

  // Measure, then stand the model on the floor, centred.
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const centre = box.getCenter(new THREE.Vector3());
  if (box.isEmpty()) errors.push("Nothing was drawn.");
  if (box.min.y < -0.05) warnings.push(`Parts go ${(-box.min.y).toFixed(2)} m below the floor (y = 0); everything should stand on y ≥ 0.`);
  if (box.min.y > 0.2) warnings.push(`The model floats ${box.min.y.toFixed(2)} m above the floor; the lowest base / foot should sit on y = 0.`);
  const [sx, sy, sz] = model.size ?? [0, 0, 0];
  const ratio = (a: number, b: number) => (b > 0 ? a / b : 1);
  for (const [axis, got, want] of [["length x", size.x, sx], ["height y", size.y, sy], ["depth z", size.z, sz]] as const) {
    const r = ratio(got, want);
    if (want > 0 && (r < 0.7 || r > 1.4)) warnings.push(`Built ${axis} is ${got.toFixed(2)} m but model.size says ${want} m.`);
  }
  if (meshes < 350) warnings.push(`Only ${meshes} parts: too plain. Work through the detail list in SKILL.md step 2 for every item (bolt circles, panels, nozzles, rings, ribs, lugs, handrails, ladders, supports, trays) — current twins use 400–3000.`);
  const share = (m: THREE.Material) => (perMat.get(m) ?? 0) / Math.max(1, meshes);
  if (share(mats.model) > 0.75) warnings.push("Over 75% of parts use mats.model: use steel for structure, machined for shafts/flanges, recess for openings, rail for handrails, concrete for plinths.");
  if (named.length < 2) warnings.push("Fewer than two named parts: call part(\"…\") before each sub-assembly.");

  root.position.set(-centre.x, -box.min.y, -centre.z);
  const radius = Math.max(0.5, size.length() / 2);

  // Stage: the twin look (twin-lighting.tsx) in plain three.js.
  const W = window.innerWidth;
  const H = window.innerHeight;
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setScissorTest(true);
  document.getElementById("root")!.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(canvasColor);
  scene.fog = new THREE.Fog(canvasColor, radius * 4, radius * 9);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = palette.dark ? 0.42 : 0.6;
  scene.add(new THREE.HemisphereLight("#ffffff", canvasColor, palette.dark ? 1.35 : 0.8));
  const sun = new THREE.DirectionalLight(palette.sun, palette.dark ? 2.2 : 2.6);
  sun.position.set(radius * 0.9, radius * 1.8, radius * 1.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(4096, 4096);
  sun.shadow.normalBias = 0.04;
  sun.shadow.bias = -0.0004;
  const sc = sun.shadow.camera;
  sc.left = sc.bottom = -radius * 1.3;
  sc.right = sc.top = radius * 1.3;
  sc.far = radius * 6;
  scene.add(sun);
  const fill = new THREE.DirectionalLight("#ffffff", palette.dark ? 0.8 : 0.6);
  fill.position.set(-radius * 1.2, radius, -radius);
  scene.add(fill);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(radius * 30, radius * 30), new THREE.ShadowMaterial({ opacity: palette.dark ? 0.45 : 0.18 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const cell = radius > 20 ? 2 : radius > 5 ? 1 : 0.25;
  const grid = createInfiniteGrid({ cell, fade: [radius * 2, radius * 5] });
  grid.setColor(gridColor, 1);
  scene.add(grid.mesh);
  scene.add(root);

  // Four views, each framed on the model's bounding box.
  const target = new THREE.Vector3(0, size.y / 2, 0);
  const corners: THREE.Vector3[] = [];
  for (const sx of [-0.5, 0.5]) for (const sy of [0, 1]) for (const sz of [-0.5, 0.5]) corners.push(new THREE.Vector3(sx * size.x, sy * size.y, sz * size.z));
  const persp = (dir: THREE.Vector3, aspect: number) => {
    const cam = new THREE.PerspectiveCamera(30, aspect, radius * 0.02, radius * 40);
    const d = dir.normalize();
    let dist = radius * 3;
    for (let i = 0; i < 8; i++) {
      cam.position.copy(target).addScaledVector(d, dist);
      cam.lookAt(target);
      cam.updateMatrixWorld();
      cam.updateProjectionMatrix();
      let m = 0;
      for (const c of corners) {
        const p = c.clone().project(cam);
        m = Math.max(m, Math.abs(p.x), Math.abs(p.y));
      }
      dist *= 0.35 + 0.65 * (m / 0.86);
    }
    return cam;
  };
  const ortho = (dir: THREE.Vector3, aspect: number, up = new THREE.Vector3(0, 1, 0)) => {
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, radius * 20);
    cam.up.copy(up);
    cam.position.copy(target).addScaledVector(dir.normalize(), radius * 4);
    cam.lookAt(target);
    cam.updateMatrixWorld();
    const inv = cam.matrixWorldInverse;
    let hx = 0;
    let hy = 0;
    for (const c of corners) {
      const p = c.clone().applyMatrix4(inv);
      hx = Math.max(hx, Math.abs(p.x));
      hy = Math.max(hy, Math.abs(p.y));
    }
    const half = Math.max(hy, hx / aspect) * 1.12;
    cam.left = -half * aspect;
    cam.right = half * aspect;
    cam.top = half;
    cam.bottom = -half;
    cam.updateProjectionMatrix();
    return cam;
  };
  const w2 = Math.floor(W / 2);
  const h2 = Math.floor(H / 2);
  const aspect = w2 / h2;
  const views: Array<[string, THREE.Camera, number, number]> = [
    ["Front-left three-quarter", persp(new THREE.Vector3(-0.75, 0.5, 1), aspect), 0, h2],
    ["Rear-right three-quarter", persp(new THREE.Vector3(0.8, 0.55, -1), aspect), w2, h2],
    ["Front elevation (+z)", ortho(new THREE.Vector3(0, 0, 1), aspect), 0, 0],
    ["Plan (from above)", ortho(new THREE.Vector3(0, 1, 0), aspect, new THREE.Vector3(0, 0, -1)), w2, 0],
  ];
  for (const [, cam, x, y] of views) {
    grid.follow(cam);
    renderer.setViewport(x, y, w2, h2);
    renderer.setScissor(x, y, w2, h2);
    renderer.render(scene, cam);
  }
  const labels = document.getElementById("labels")!;
  labels.innerHTML = views
    .map(([name, , x, y]) => `<div style="position:absolute;left:${x + 12}px;top:${H - y - h2 + 10}px">${name}</div>`)
    .join("") + `<div style="position:absolute;left:${w2}px;top:0;width:1px;height:${H}px;background:var(--mx-fine)"></div><div style="position:absolute;left:0;top:${h2}px;width:${W}px;height:1px;background:var(--mx-fine)"></div>`;

  let tris = 0;
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) tris += (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3;
  });
  const matName = new Map<THREE.Material, string>(Object.entries(mats).map(([n, m]) => [m as THREE.Material, n]));
  window.__labReport = {
    id: model.id,
    name: model.name,
    builtSize: [size.x, size.y, size.z].map((n) => Math.round(n * 100) / 100),
    declaredSize: model.size,
    parts: named,
    meshes,
    triangles: Math.round(tris),
    materials: Object.fromEntries([...perMat.entries()].map(([m, n]) => [matName.get(m) ?? "other", n])),
    errors,
    warnings,
  };
  window.__labDone = true;
}
