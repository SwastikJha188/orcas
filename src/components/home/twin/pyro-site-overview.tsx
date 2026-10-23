"use client";

import * as THREE from "three";
import { homeActive } from "../home-active";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loading, PillButton } from "@/components/ui";
import { twinHint, usePersistedNavMode, type TwinNavMode, type TwinNudgeAction } from "./twin-nav-ui";
import { StatusTag } from "@/components/ui/status-tag";
import { type Condition, type Tone, conditionTone, toCondition, worstCondition } from "@/components/ui/status";
import { IconChevron, IconClose } from "@/components/assets/assets-shell-ui";
import { type SimFrame, formatDuration } from "@shared/lib/kiln-sim/engine";
import { PYRO_MACHINE_BY_ID } from "@shared/lib/pyro-sim/signals";
import { useApi } from "@/lib/api-cache";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { useKilnFleet, useLivePlantStarting, usePrimaryMachineId } from "@/providers/kiln-simulation-context";
import type { MeasurementDto } from "@shared/types/monitoring";
import type { TwinInset } from "./plant-twin-canvas";
import { hasWebGL } from "./plant-twin";
import { createInfiniteGrid } from "./infinite-grid";
import { readUiZoom } from "./use-ui-zoom";
import "./pyro-site-overview.css";
import { INFRA, LINE, applyKitPalette, buildSite, createKitMats, readPalette, type InfraKey, type MachineKey, type NodeKey, type V3 } from "./pyro-plant-model";
import { isConditionRule } from "@shared/lib/plant-defs";
import type { EdgeRegistry, MachineAcquisition } from "@shared/types/edge";

/* ==========================================================================
   Pyro line site overview (Home, pyro plant only). One cement plant, one
   pyroprocessing & clinker line: the six machines (eight D4 units) modelled along the line
   in process order, the gateway house and the power house with their dashed
   data / power runs. Imperative three.js; every value shown is read from the
   live line (`useKilnFleet`), the plant's machines and its measurement
   catalogue (GET /api/measurements?plantId=…).
   ========================================================================== */

const NODES: NodeKey[] = [...LINE, ...INFRA];
/** Process sequence (one chip per machine); the burner fires into the kiln, so it shares the kiln's step. */
const SEQUENCE: MachineKey[][] = [["FSL"], ["PHC"], ["KLN", "BRN"], ["CLR"], ["HMR"]];
/**
 * Site nodes that are part of another node's machine: the kiln feed (KFS) runs
 * with the feed silo as the feed system, the pan conveyor and clinker silo
 * (CSL) with the crusher as the clinker transport. A machine is labelled and
 * selected through its first node; picking either node selects the machine.
 */
const PART_OF: Partial<Record<MachineKey, MachineKey>> = { KFS: "FSL", CSL: "HMR" };
const primaryOf = <K extends NodeKey>(k: K): K => ((PART_OF as Record<string, K>)[k] ?? k);
/** Every node of a machine (FSL → FSL + KFS). */
const nodesOf = (k: NodeKey): NodeKey[] => [k, ...(Object.keys(PART_OF) as MachineKey[]).filter((n) => PART_OF[n] === k)];
/** Drawing kind each site model draws; the plant machine with that `diagramType` is the node's machine. */
const NODE_DIAGRAM: Record<MachineKey, string> = {
  FSL: "feed-system",
  KFS: "feed-system",
  PHC: "preheater",
  KLN: "pyro-kiln",
  BRN: "kiln-burner",
  CLR: "grate-cooler",
  HMR: "clinker-transport",
  CSL: "clinker-transport",
};
/** The machines' own nodes, in line order (one row per machine). */
const MAIN_NODES = LINE.filter((k) => !PART_OF[k]);
const isMachine = (k: NodeKey): k is MachineKey => (LINE as string[]).includes(k);

/** Label anchor of each model (scene units). */
const ANCHORS: Record<NodeKey, V3> = {
  FSL: [-100, 24, 27.2],
  KFS: [-72, 12.6, 10],
  PHC: [-44, 30, 6.6],
  KLN: [-1.5, 15.4, 0],
  BRN: [41, 15.8, -22],
  CLR: [46, 8.2, 2],
  HMR: [68, 6.4, 0],
  CSL: [124, 24, 46.2],
  GW: [-14, 5.8, 72],
  PW: [22, 7.2, 75.4],
};

const INFRA_NAME: Record<InfraKey, string> = { GW: "Data gateway house", PW: "Electrical power house" };

/* ---------------------------------------------------------------- catalog */

/** Counts and tag lists the panels read, built from the plant's measurement catalogue. */
interface SiteCatalog {
  /** Required / optional entries per machine id. */
  specCounts: Record<string, { required: number; optional: number }>;
  onlineSignals: number;
  manualRecords: number;
  /** Online measurements whose limits the plant has approved. */
  approvedOnline: number;
  driveFeeders: number;
  driveMachines: number;
  /** Quantities the MCC / VFD feeders deliver. */
  driveQuantities: string[];
  /** MCC / VFD feeder measurements: tag → owning machine. */
  driveTags: Array<{ tag: string; machineId: string }>;
  onlineByMachine: Record<string, string[]>;
  /** Two lead readings per machine for a quiet panel: its first required online analog entries. */
  keyTags: Record<string, string[]>;
}

function siteCatalog(ms: MeasurementDto[]): SiteCatalog {
  const specCounts: SiteCatalog["specCounts"] = {};
  const onlineByMachine: Record<string, string[]> = {};
  const keyTags: Record<string, string[]> = {};
  const drives = ms.filter((m) => m.sensorType?.startsWith("MCC"));
  for (const m of ms) {
    const c = (specCounts[m.machineId] ??= { required: 0, optional: 0 });
    if (m.priority === "Required") c.required++;
    else if (m.priority === "Optional") c.optional++;
    if (m.origin !== "online") continue;
    (onlineByMachine[m.machineId] ??= []).push(m.tag);
    const keys = (keyTags[m.machineId] ??= []);
    if (m.priority === "Required" && m.valueKind === "analog" && keys.length < 2) keys.push(m.tag);
  }
  const online = ms.filter((m) => m.origin === "online");
  return {
    specCounts,
    onlineSignals: online.length,
    manualRecords: ms.filter((m) => m.origin === "manual").length,
    approvedOnline: online.filter((m) => m.limit?.approval === "approved").length,
    driveFeeders: drives.length,
    driveMachines: new Set(drives.map((m) => m.machineId)).size,
    driveQuantities: [...new Set(drives.map((m) => m.quantity.name))],
    driveTags: drives.map((m) => ({ tag: m.tag, machineId: m.machineId })),
    onlineByMachine,
    keyTags,
  };
}

/** Online entries (no calculated or manual) that are trusted now. */
function onlineValid(f: SimFrame, machineId: string, catalog: SiteCatalog): { valid: number; total: number } {
  const tags = catalog.onlineByMachine[machineId] ?? [];
  let valid = 0;
  for (const tg of tags) {
    const q = f.signals[tg]?.quality;
    if (q && q !== "Invalid" && q !== "Suspect") valid++;
  }
  return { valid, total: tags.length };
}

/* ---------------------------------------------------------------- view */

interface SceneApi {
  invalidate: () => void;
  focus: (key: NodeKey | null) => void;
  reset: () => void;
  setTones: (tones: Partial<Record<MachineKey, Tone>>) => void;
  /** Multiply the camera distance (zoom buttons). */
  zoom: (factor: number) => void;
  /** Direct Move / Orbit / Zoom nudge from toolbar buttons. */
  nudge: (action: TwinNudgeAction) => void;
}

interface Rect {
  l: number;
  t: number;
  w: number;
  h: number;
}

const overlaps = (a: Rect, b: Rect, m = 6) => a.l < b.l + b.w + m && a.l + a.w + m > b.l && a.t < b.t + b.h + m && a.t + a.h + m > b.t;

const NO_INSET: TwinInset = { top: 0, right: 0, bottom: 0, left: 0 };
/** Opening view: close enough to read the plant, centred on the kiln and the preheater; pan to walk the site. */
const HOME_VIEW = { theta: -0.16, phi: 1.0, target: new THREE.Vector3(-8, 12, 4) };
/** Where the orbit target may wander (site footprint plus a margin). */
const SITE_BOUNDS = { x0: -135, x1: 165, z0: -55, z1: 95 };
const PHI_MIN = 0.35;
const PHI_MAX = 1.45;
const R_MIN = 40;
/** Panel width + gap it takes from the free area when open on a wide stage. */
const PANEL_W = 352;
const WIDE_STAGE = 760;
const HINT_KEY = "ultron.pyro.hintSeen";

function useReducedMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduce(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduce;
}

/* ---------------------------------------------------------------- component */

export interface PyroSiteOverviewProps {
  /** Canvas covered by the page's floating panels; overlays and framing stay clear of it. */
  inset?: TwinInset;
  /** No WebGL: hand back to the 2D layout. */
  onUnsupported?: () => void;
}

interface MachineRow {
  key: MachineKey;
  /** The plant machine this node draws; null while the plant's machines load or when it has none. */
  id: string | null;
  code: string;
  name: string;
  shortName: string;
  diagrams: string[];
  condition: Condition;
  tone: Tone;
  score: number | null;
}

export function PyroSiteOverview({ inset = NO_INSET, onUnsupported }: PyroSiteOverviewProps) {
  const fleet = useKilnFleet();
  const { navigateToMachine, allMachines, selectedPlantId } = useIndustrialData();
  const plantMachines = useMemo(
    () => (selectedPlantId ? allMachines.filter((m) => m.plantId === selectedPlantId) : []),
    [allMachines, selectedPlantId],
  );
  const machineIdOf = useCallback(
    (k: MachineKey): string | null => plantMachines.find((m) => m.diagramType === NODE_DIAGRAM[k])?.id ?? null,
    [plantMachines],
  );
  const measurements = useApi<MeasurementDto[]>(selectedPlantId ? `/api/measurements?plantId=${encodeURIComponent(selectedPlantId)}` : null);
  const catalog = useMemo(() => siteCatalog(measurements.data ?? []), [measurements.data]);
  const reduce = useReducedMotion();

  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const leadsRef = useRef<SVGSVGElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);
  const seqRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<Partial<Record<NodeKey, HTMLButtonElement | null>>>({});
  const apiRef = useRef<SceneApi | null>(null);

  const [supported, setSupported] = useState(true);
  const [selected, setSelected] = useState<NodeKey | null>(null);
  const [hovered, setHovered] = useState<NodeKey | null>(null);
  const [autoRotate, setAutoRotate] = useState(false);
  const [navMode, setNavMode] = usePersistedNavMode();
  const [hintSeen, setHintSeen] = useState(true);

  /* Latest values for the imperative scene. */
  const live = useRef({
    inset,
    selected,
    autoRotate: false,
    reduce: false,
    navMode: "move" as TwinNavMode,
    select: (k: NodeKey | null) => setSelected(k && primaryOf(k)),
    hover: (k: NodeKey | null) => setHovered(k),
  });
  live.current.navMode = navMode;
  live.current.inset = inset;
  live.current.selected = selected;
  live.current.autoRotate = autoRotate && !reduce;
  live.current.reduce = reduce;

  /* ---------------- live data ---------------- */
  const rows = useMemo<MachineRow[]>(
    () =>
      MAIN_NODES.map((key) => {
        const id = machineIdOf(key);
        const machine = id ? plantMachines.find((m) => m.id === id) : undefined;
        const cat = id ? PYRO_MACHINE_BY_ID[id] : undefined;
        const f = id ? fleet[id]?.frame : undefined;
        const condition: Condition = f ? toCondition(f.condition) : "No data";
        return {
          key,
          id,
          code: cat?.code ?? id ?? "—",
          name: machine?.name ?? cat?.name ?? key,
          shortName: cat?.shortName ?? machine?.type ?? key,
          diagrams: cat?.diagrams ?? [],
          condition,
          tone: conditionTone(condition),
          score: f ? Math.round(f.overall) : null,
        };
      }),
    [fleet, machineIdOf, plantMachines],
  );
  const rowByKey = useMemo(() => {
    const out = Object.fromEntries(rows.map((r) => [r.key, r])) as Record<MachineKey, MachineRow>;
    for (const [part, main] of Object.entries(PART_OF) as Array<[MachineKey, MachineKey]>) out[part] = out[main];
    return out;
  }, [rows]);

  const line = useMemo(() => {
    const scored = rows.filter((r) => r.score !== null);
    const condition = scored.length ? worstCondition(scored.map((r) => r.condition)) : ("No data" as Condition);
    // One bad machine must show: 0.6 × worst + 0.4 × mean (site-overview formula).
    const score = scored.length
      ? Math.round(0.6 * Math.min(...scored.map((r) => r.score ?? 0)) + (0.4 * scored.reduce((n, r) => n + (r.score ?? 0), 0)) / scored.length)
      : null;
    const counts = { good: 0, warn: 0, bad: 0, idle: 0 } as Record<Tone, number>;
    for (const r of rows) counts[r.tone] = (counts[r.tone] ?? 0) + 1;
    let valid = 0;
    let total = 0;
    for (const r of rows) {
      const f = r.id ? fleet[r.id]?.frame : undefined;
      if (!f || !r.id) continue;
      const c = onlineValid(f, r.id, catalog);
      valid += c.valid;
      total += c.total;
    }
    let feeders: number | null = null;
    for (const { tag: tg, machineId: machine } of catalog.driveTags) {
      const q = fleet[machine]?.frame?.signals[tg]?.quality;
      if (!q) continue;
      feeders = (feeders ?? 0) + (q !== "Invalid" && q !== "Suspect" ? 1 : 0);
    }
    return { condition, tone: conditionTone(condition), score, counts, valid, total, feeders };
  }, [rows, fleet, catalog]);

  const toneKey = rows.map((r) => r.tone).join("|");


  /* ---------------- WebGL check + hint ---------------- */
  useEffect(() => {
    if (!hasWebGL()) {
      setSupported(false);
      onUnsupported?.();
    }
  }, [onUnsupported]);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(HINT_KEY) === "1") return;
    } catch {
      /* storage unavailable */
    }
    setHintSeen(false);
  }, []);
  const dismissHint = useCallback(() => {
    setHintSeen(true);
    try {
      window.localStorage.setItem(HINT_KEY, "1");
    } catch {
      /* storage unavailable */
    }
  }, []);

  /* ---------------- three.js scene ---------------- */
  useEffect(() => {
    const host = stageRef.current;
    const root = rootRef.current;
    if (!supported || !host || !root) return;

    let palette = readPalette();

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // The sun and the site never move: draw the 4096² shadow map once, not on every camera frame.
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    const el = renderer.domElement;
    el.className = "pso-gl";
    el.tabIndex = 0;
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", "3D site overview of the pyroprocessing and clinker line. W A S D or arrow keys walk, Q and E turn, R and F tilt, plus and minus zoom.");
    host.appendChild(el);

    const scene = new THREE.Scene();
    // Soft studio reflections so steel and painted surfaces read as materials, not flat greys.
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    scene.environmentIntensity = 0.26;
    const camera = new THREE.PerspectiveCamera(36, 1, 1, 1400);
    const hemi = new THREE.HemisphereLight(0xffffff, 0x3a3d42, 0.75);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffffff, 0.9);
    sun.position.set(-70, 150, 110);
    sun.target.position.set(10, 0, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    sun.shadow.bias = -0.0003;
    sun.shadow.normalBias = 0.08;
    Object.assign(sun.shadow.camera, { left: -180, right: 180, top: 140, bottom: -140, near: 10, far: 520 });
    scene.add(sun, sun.target);
    const fill = new THREE.DirectionalLight(0xffffff, 0.25);
    fill.position.set(40, 20, -30);
    scene.add(fill);

    const floorMat = new THREE.ShadowMaterial({ opacity: 0.28 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const mats = createKitMats();
    const site = buildSite(scene, mats);

    // 3 m cells, faded out before the camera's far plane so the floor never ends.
    const grid = createInfiniteGrid({ cell: 3, fade: [450, 1300] });
    scene.add(grid.mesh);
    const applyPalette = () => {
      applyKitPalette(mats, site.edgeMat, palette);
      for (const m of site.dataMats) m.color.set(palette.data);
      for (const m of site.powerMats) m.color.set(palette.power);
      // Area rims stay quiet; status lives on the measurement pads (machine-kit rule).
      for (const m of site.infraEdges) m.color.set(palette.fine);
      for (const k of LINE) site.edges[k]?.color.set(palette.fine);
      floorMat.opacity = palette.dark ? 0.38 : 0.2;
      scene.environmentIntensity = palette.dark ? 0.16 : 0.26;
      // Top-lit like the machine kit's vertical body gradient: strong sky, dark ground bounce.
      hemi.intensity = palette.dark ? 1.45 : 0.8;
      sun.intensity = palette.dark ? 1.35 : 0.95;
      sun.color.set(palette.sun);
      grid.setColor(palette.grid, palette.dark ? 0.32 : 0.45);
    };
    applyPalette();

    /* ---------------- camera ---------------- */
    const cam = { theta: HOME_VIEW.theta, phi: HOME_VIEW.phi, r: 220, target: HOME_VIEW.target.clone() };
    const goal = { theta: cam.theta, phi: cam.phi, r: cam.r, target: cam.target.clone() };
    const off = { x: 0, y: 0 };
    let homeR = 220;
    /** Camera pose before a machine was focused, restored when the details close. */
    let beforeFocus: { theta: number; phi: number; r: number; target: THREE.Vector3 } | null = null;
    let rMax = 560;
    let touched = false;
    let size = { w: 1, h: 1 };
    let dirty = true;
    let first = true;

    /** The stage area left visible by the page's panels (and the detail panel when open on a wide stage). */
    const freeArea = (): Rect => {
      const i = live.current.inset;
      const panel = live.current.selected && size.w >= WIDE_STAGE ? PANEL_W : 0;
      const l = i.left;
      const t = i.top;
      const w = Math.max(160, size.w - i.left - i.right - panel);
      const h = Math.max(160, size.h - i.top - i.bottom);
      return { l, t, w, h };
    };

    const fitRadius = () => {
      const fa = freeArea();
      const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const tanH = (tanV * fa.w) / size.h;
      const tanVf = (tanV * fa.h) / size.h;
      return Math.min(620, Math.max(90, 150 / tanH, 84 / tanVf));
    };

    /** Opening distance: about half of what fits the whole site, so the plant reads at factory scale. */
    const homeRadius = () => Math.max(85, fitRadius() * 0.52);
    /** Keep the orbit target over the site. */
    const leash = (t: THREE.Vector3) => {
      t.x = Math.min(SITE_BOUNDS.x1, Math.max(SITE_BOUNDS.x0, t.x));
      t.z = Math.min(SITE_BOUNDS.z1, Math.max(SITE_BOUNDS.z0, t.z));
      t.y = Math.min(70, Math.max(0, t.y));
    };
    /** Walk the target across the floor: `fwd` along the view direction, `side` to the right (world units). */
    const walk = (fwd: number, side: number) => {
      goal.target.x += -Math.sin(goal.theta) * fwd + Math.cos(goal.theta) * side;
      goal.target.z += -Math.cos(goal.theta) * fwd - Math.sin(goal.theta) * side;
      leash(goal.target);
    };

    const place = () => {
      camera.position.set(
        cam.target.x + cam.r * Math.sin(cam.phi) * Math.sin(cam.theta),
        cam.target.y + cam.r * Math.cos(cam.phi),
        cam.target.z + cam.r * Math.sin(cam.phi) * Math.cos(cam.theta),
      );
      camera.lookAt(cam.target);
    };

    const resize = () => {
      // Hidden (Home kept alive behind another tab): keep the last size and pose.
      if (root.clientWidth === 0 || root.clientHeight === 0) return;
      const w = Math.max(1, root.clientWidth);
      const h = Math.max(1, root.clientHeight);
      size = { w, h };
      // Full Retina resolution (see useTwinDpr): an upscaled buffer shimmers in motion.
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2) * readUiZoom());
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.fov = w < 700 ? 46 : 36;
      camera.updateProjectionMatrix();
      homeR = homeRadius();
      rMax = Math.max(560, fitRadius() * 1.3);
      if (!touched && !live.current.selected) goal.r = homeR;
      if (first) {
        cam.r = goal.r;
        first = false;
      }
      dirty = true;
    };

    /* ---------------- labels ---------------- */
    const v = new THREE.Vector3();
    const zoomOf = () => (root.offsetWidth > 0 ? root.getBoundingClientRect().width / root.offsetWidth : 1);
    const relRect = (node: Element | null, rootBox: DOMRect, z: number): Rect | null => {
      if (!node) return null;
      const r = node.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) return null;
      return { l: (r.left - rootBox.left) / z, t: (r.top - rootBox.top) / z, w: r.width / z, h: r.height / z };
    };

    const spotOf = new Map<HTMLElement, number>();
    const layoutLabels = () => {
      const { w, h } = size;
      const i = live.current.inset;
      const rootBox = root.getBoundingClientRect();
      const z = zoomOf();
      const obs = [toolsRef.current, seqRef.current, hintRef.current]
        .map((n) => relRect(n, rootBox, z))
        .filter((r): r is Rect => r !== null);
      const minL = i.left + 6;
      let maxR = w - i.right - 6;
      const minT = i.top + 4;
      let maxB = h - i.bottom - 4;
      // The open detail panel takes its side of the stage: labels (and anchors) behind it are hidden.
      const panel = live.current.selected ? relRect(panelRef.current, rootBox, z) : null;
      if (panel && panel.l > w / 3) maxR = Math.min(maxR, panel.l - 6);
      else if (panel) maxB = Math.min(maxB, panel.t - 4);

      const items: Array<{ el: HTMLButtonElement; x: number; y: number; bw: number; bh: number }> = [];
      for (const key of NODES) {
        const lab = labelRefs.current[key];
        if (!lab) continue;
        v.set(...ANCHORS[key]).project(camera);
        const x = ((v.x + 1) / 2) * w;
        const y = ((1 - v.y) / 2) * h;
        const visible = v.z < 1 && x > minL && x < maxR && y > minT && y < maxB;
        lab.style.visibility = visible ? "" : "hidden";
        if (visible) items.push({ el: lab, x, y, bw: lab.offsetWidth, bh: lab.offsetHeight });
      }
      items.sort((a, b) => b.y - a.y);
      const placed: Rect[] = [];
      let svg = "";
      for (const it of items) {
        // Prefer above the anchor, then above-left / above-right, then below; stack upward only as a last resort.
        const spots: Rect[] = [
          { l: it.x - it.bw / 2, t: it.y - it.bh - 18, w: it.bw, h: it.bh },
          { l: it.x - it.bw + 14, t: it.y - it.bh - 18, w: it.bw, h: it.bh },
          { l: it.x - 14, t: it.y - it.bh - 18, w: it.bw, h: it.bh },
          { l: it.x - it.bw - 18, t: it.y - it.bh / 2, w: it.bw, h: it.bh },
          { l: it.x + 18, t: it.y - it.bh / 2, w: it.bw, h: it.bh },
          { l: it.x - it.bw / 2, t: it.y + 18, w: it.bw, h: it.bh },
        ];
        const fits = (c: Rect) =>
          c.l >= minL && c.l + c.w <= maxR && c.t >= minT && c.t + c.h <= maxB && !placed.some((p) => overlaps(c, p)) && !obs.some((q) => overlaps(c, q));
        // Hysteresis: keep last frame's spot while it still fits, so labels do not hop as the camera moves.
        const prevSpot = spotOf.get(it.el) ?? 0;
        const order = [prevSpot, ...spots.map((_, n) => n).filter((n) => n !== prevSpot)];
        const pick = order.find((n) => fits(spots[n]));
        spotOf.set(it.el, pick ?? 0);
        let r: Rect = spots[pick ?? 0];
        for (let n = 0; n < 16; n++) {
          const hit = placed.find((p) => overlaps(r, p));
          if (hit) {
            r = { ...r, t: hit.t - it.bh - 8 };
            continue;
          }
          const o = obs.find((q) => overlaps(r, q));
          if (!o) break;
          const cands = [
            { l: o.l + o.w + 8, t: r.t },
            { l: r.l, t: o.t + o.h + 8 },
            { l: o.l - r.w - 8, t: r.t },
            { l: r.l, t: o.t - r.h - 8 },
          ]
            .map((c) => ({ ...c, w: r.w, h: r.h }))
            .filter((c) => c.l >= minL && c.l + c.w <= maxR && c.t >= minT && c.t + c.h <= maxB && !obs.some((q) => overlaps(c, q)));
          if (!cands.length) break;
          cands.sort((a, b) => Math.hypot(a.l - r.l, a.t - r.t) - Math.hypot(b.l - r.l, b.t - r.t));
          r = cands[0];
        }
        r.l = Math.max(minL, Math.min(maxR - r.w, r.l));
        r.t = Math.max(minT, Math.min(maxB - r.h, r.t));
        placed.push(r);
        it.el.style.transform = `translate(${Math.round(r.l)}px, ${Math.round(r.t)}px)`;
        // Leader from the label edge nearest the anchor (side placements leave from the side).
        const side = it.y >= r.t && it.y <= r.t + r.h && (it.x < r.l || it.x > r.l + r.w);
        const ax = side ? (it.x < r.l ? r.l : r.l + r.w) : Math.max(r.l + 12, Math.min(r.l + r.w - 12, it.x));
        const ay = side ? r.t + r.h / 2 : it.y > r.t + r.h ? r.t + r.h : it.y < r.t ? r.t : r.t + r.h;
        // Machine-kit measurement pad: hollow ring when healthy, filled with a halo when it needs attention.
        const tone = it.el.dataset.tone ?? "idle";
        const px = it.x.toFixed(1);
        const py = it.y.toFixed(1);
        svg += `<line x1="${ax.toFixed(1)}" y1="${ay.toFixed(1)}" x2="${px}" y2="${py}"/>`;
        svg +=
          tone === "warn" || tone === "bad"
            ? `<circle class="pad-halo" data-tone="${tone}" cx="${px}" cy="${py}" r="9"/><circle class="pad" data-on data-tone="${tone}" cx="${px}" cy="${py}" r="4.6"/>`
            : `<circle class="pad" data-tone="${tone}" cx="${px}" cy="${py}" r="4.6"/>`;
      }
      if (leadsRef.current) leadsRef.current.innerHTML = svg;
    };

    /* ---------------- input ---------------- */
    const ray = new THREE.Raycaster();
    const mp = new THREE.Vector2();
    const pickAt = (e: PointerEvent): NodeKey | null => {
      const r = el.getBoundingClientRect();
      mp.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(mp, camera);
      const hit = ray.intersectObjects(site.pickables, false)[0];
      let o: THREE.Object3D | null = hit?.object ?? null;
      while (o && !o.userData.key) o = o.parent;
      return (o?.userData.key as NodeKey | undefined) ?? null;
    };

    let drag: { x: number; y: number; pan: boolean; moved: boolean; id: number } | null = null;
    let hoverKey: NodeKey | null = null;
    let pinch: number | null = null;
    let spacePan = false;
    const clampPhi = (p: number) => Math.min(PHI_MAX, Math.max(PHI_MIN, p));
    const clampR = (r: number) => Math.min(rMax, Math.max(R_MIN, r));
    const touch = () => {
      touched = true;
      dirty = true;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === "touch" && pinch !== null) return;
      const pan = e.shiftKey || e.ctrlKey || e.metaKey || spacePan || e.button === 1 || e.button === 2;
      drag = { x: e.clientX, y: e.clientY, pan, moved: false, id: e.pointerId };
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* the pointer is already gone (e.g. released over a label) */
      }
      el.style.cursor = "grabbing";
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!drag) {
        if (e.pointerType !== "mouse") return;
        const k = pickAt(e);
        if (k !== hoverKey) {
          hoverKey = k;
          el.style.cursor = k ? "pointer" : "grab";
          live.current.hover(k);
        }
        return;
      }
      if (e.pointerId !== drag.id) return;
      const z = zoomOf();
      const dx = (e.clientX - drag.x) / z;
      const dy = (e.clientY - drag.y) / z;
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
      drag.x = e.clientX;
      drag.y = e.clientY;
      if (!drag.moved) return;
      if (drag.pan) {
        // Map-style: the ground follows the pointer.
        const s = (2 * goal.r * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / Math.max(1, size.h);
        walk(dy * s * 1.4, -dx * s);
      } else {
        goal.theta -= dx * 0.005;
        goal.phi = clampPhi(goal.phi - dy * 0.004);
      }
      touch();
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const clicked = !drag.moved;
      drag = null;
      el.style.cursor = hoverKey ? "pointer" : "grab";
      if (clicked && e.button !== 2) live.current.select(pickAt(e));
    };
    const onPointerCancel = () => {
      drag = null;
    };
    const onLeave = () => {
      if (hoverKey) {
        hoverKey = null;
        live.current.hover(null);
      }
    };
    const onContext = (e: Event) => e.preventDefault();
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!e.ctrlKey && !e.metaKey && (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY) * 0.35)) {
        const s = (2 * goal.r * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) / Math.max(1, size.h);
        const dx = e.shiftKey && Math.abs(e.deltaX) < 1 ? e.deltaY : e.deltaX;
        const dy = e.shiftKey && Math.abs(e.deltaX) < 1 ? 0 : e.deltaY;
        walk(-dy * s * 0.9, dx * s * 0.9);
      } else {
        goal.r = clampR(goal.r * (1 + Math.sign(e.deltaY) * 0.08));
      }
      touch();
    };
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const [a, b] = [e.touches[0], e.touches[1]];
        pinch = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
        drag = null;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || pinch === null) return;
      const [a, b] = [e.touches[0], e.touches[1]];
      const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      if (d > 0) goal.r = clampR((goal.r * pinch) / d);
      pinch = d;
      drag = null;
      touch();
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinch = null;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spacePan = true;
        return;
      }
      const k = e.key;
      const step = Math.max(2, goal.r * 0.06);
      if (k === "w" || k === "W" || k === "ArrowUp") walk(step, 0);
      else if (k === "s" || k === "S" || k === "ArrowDown") walk(-step, 0);
      else if (k === "a" || k === "A" || k === "ArrowLeft") walk(0, -step);
      else if (k === "d" || k === "D" || k === "ArrowRight") walk(0, step);
      else if (k === "q" || k === "Q") goal.theta += 0.08;
      else if (k === "e" || k === "E") goal.theta -= 0.08;
      else if (k === "r" || k === "R") goal.phi = clampPhi(goal.phi - 0.06);
      else if (k === "f" || k === "F") goal.phi = clampPhi(goal.phi + 0.06);
      else if (k === "+" || k === "=") goal.r = clampR(goal.r * 0.9);
      else if (k === "-" || k === "_") goal.r = clampR(goal.r * 1.1);
      else return;
      e.preventDefault();
      touch();
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") spacePan = false;
    };

    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerCancel);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("contextmenu", onContext);
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onKeyUp);

    /* ---------------- theme + size ---------------- */
    const onTheme = () => {
      palette = readPalette();
      applyPalette();
      dirty = true;
    };
    const mo = new MutationObserver(onTheme);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-palette", "class", "style"] });
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", onTheme);
    const ro = new ResizeObserver(resize);
    ro.observe(root);
    resize();
    // A restored GL context starts with an empty shadow map.
    const onRestored = () => {
      renderer.shadowMap.needsUpdate = true;
      dirty = true;
    };
    el.addEventListener("webglcontextrestored", onRestored);

    /* ---------------- api ---------------- */
    const snap = () => {
      cam.theta = goal.theta;
      cam.phi = goal.phi;
      cam.r = goal.r;
      cam.target.copy(goal.target);
    };
    apiRef.current = {
      invalidate: () => {
        dirty = true;
      },
      focus: (key) => {
        if (!key) {
          // Closing the details returns to where the visitor was, not to the opening view.
          if (beforeFocus) {
            goal.theta = beforeFocus.theta;
            goal.phi = beforeFocus.phi;
            goal.r = beforeFocus.r;
            goal.target.copy(beforeFocus.target);
            beforeFocus = null;
          }
        } else {
          if (!beforeFocus) beforeFocus = { theta: goal.theta, phi: goal.phi, r: goal.r, target: goal.target.clone() };
          const b = new THREE.Box3();
          for (const n of nodesOf(key)) b.expandByObject(site.groups[n]);
          const c = b.getCenter(new THREE.Vector3());
          const R = b.getBoundingSphere(new THREE.Sphere()).radius;
          goal.phi = 1.1;
          // Fit the machine's bounding sphere inside the free area (left by the page panels and the open detail panel).
          const fa = freeArea();
          const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
          const fit = Math.min(tanV * (fa.h / size.h), tanV * camera.aspect * (fa.w / size.w));
          goal.r = clampR(Math.max(45, Math.min(240, (R / fit) * 0.8)));
          // The render loop's view offset centres the target in the free area.
          goal.target.copy(c);
          touched = true;
        }
        if (live.current.reduce) snap();
        dirty = true;
      },
      reset: () => {
        beforeFocus = null;
        goal.theta = HOME_VIEW.theta;
        goal.phi = HOME_VIEW.phi;
        goal.target.copy(HOME_VIEW.target);
        homeR = homeRadius();
        goal.r = homeR;
        touched = false;
        if (live.current.reduce) snap();
        dirty = true;
      },
      zoom: (factor) => {
        goal.r = clampR(goal.r * factor);
        touch();
      },
      nudge: (action) => {
        const step = Math.max(4, goal.r * 0.08);
        if (action === "move-up") walk(step, 0);
        else if (action === "move-down") walk(-step, 0);
        else if (action === "move-left") walk(0, -step);
        else if (action === "move-right") walk(0, step);
        else if (action === "orbit-left") goal.theta += 0.14;
        else if (action === "orbit-right") goal.theta -= 0.14;
        else if (action === "zoom-in") goal.r = clampR(goal.r * 0.82);
        else if (action === "zoom-out") goal.r = clampR(goal.r * 1.22);
        touch();
      },
      setTones: () => {
        // Status is drawn on the label pads; just redraw.
        dirty = true;
      },
    };

    /* ---------------- loop (renders only while something changes) ---------------- */
    let raf = 0;
    let lastInset = "";
    const tick = () => {
      raf = requestAnimationFrame(tick);
      // Home stays mounted behind other tabs; draw nothing while it is hidden.
      if (root.clientWidth === 0) return;
      const { inset: i, autoRotate: spin, reduce: still } = live.current;
      const insetKey = `${i.top}|${i.right}|${i.bottom}|${i.left}|${live.current.selected ? 1 : 0}`;
      if (insetKey !== lastInset) {
        lastInset = insetKey;
        homeR = homeRadius();
        if (!touched && !live.current.selected) goal.r = homeR;
        dirty = true;
      }
      if (spin && !drag) goal.theta -= 0.0016;

      const k = still ? 1 : 0.12;
      const fa = freeArea();
      const tx = size.w / 2 - (fa.l + fa.w / 2);
      const ty = size.h / 2 - (fa.t + fa.h / 2);
      const moving =
        Math.abs(goal.theta - cam.theta) > 1e-4 ||
        Math.abs(goal.phi - cam.phi) > 1e-4 ||
        Math.abs(goal.r - cam.r) > 1e-3 ||
        goal.target.distanceToSquared(cam.target) > 1e-6 ||
        Math.abs(tx - off.x) > 0.3 ||
        Math.abs(ty - off.y) > 0.3;
      if (!moving && !dirty && !spin) return;
      dirty = false;

      cam.theta += (goal.theta - cam.theta) * k;
      cam.phi += (goal.phi - cam.phi) * k;
      cam.r += (goal.r - cam.r) * k;
      cam.target.lerp(goal.target, k);
      off.x += (tx - off.x) * k;
      off.y += (ty - off.y) * k;
      if (Math.abs(off.x) > 0.5 || Math.abs(off.y) > 0.5) camera.setViewOffset(size.w, size.h, off.x, off.y, size.w, size.h);
      else camera.clearViewOffset();
      place();
      grid.follow(camera);
      renderer.render(scene, camera);
      layoutLabels();
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      apiRef.current = null;
      ro.disconnect();
      mo.disconnect();
      mq.removeEventListener("change", onTheme);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointercancel", onPointerCancel);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("contextmenu", onContext);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onKeyUp);
      el.removeEventListener("webglcontextrestored", onRestored);
      const disposed = new Set<THREE.Material>();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
        const list = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
        for (const mat of list) {
          if (disposed.has(mat)) continue;
          disposed.add(mat);
          mat.dispose();
        }
      });
      sun.shadow.map?.dispose();
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      el.remove();
    };
  }, [supported]);

  /* Tones drive the plinth rims; any data change re-lays the labels (sizes change). */
  useEffect(() => {
    const byMachine = Object.fromEntries(toneKey.split("|").map((t, i) => [MAIN_NODES[i], t as Tone]));
    const tones = Object.fromEntries(LINE.map((k) => [k, byMachine[primaryOf(k)] as Tone])) as Record<MachineKey, Tone>;
    apiRef.current?.setTones(tones);
  }, [toneKey, supported]);
  useEffect(() => {
    apiRef.current?.invalidate();
  });

  useEffect(() => {
    apiRef.current?.focus(selected);
  }, [selected]);

  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => homeActive.current && e.key === "Escape" && setSelected(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selected]);

  const select = useCallback(
    (key: NodeKey | null) => {
      setSelected(key && primaryOf(key));
      if (!hintSeen) dismissHint();
    },
    [hintSeen, dismissHint],
  );
  live.current.select = select;

  const reset = () => {
    setSelected(null);
    apiRef.current?.reset();
  };

  if (!supported) return null;

  const style = {
    "--twin-top": `${inset.top}px`,
    "--twin-right": `${inset.right}px`,
    "--twin-bottom": `${inset.bottom}px`,
    "--twin-left": `${inset.left}px`,
  } as React.CSSProperties;

  return (
    <div
      ref={rootRef}
      className="ph-twin pso"
      style={style}
      onPointerDownCapture={hintSeen ? undefined : dismissHint}
      onWheelCapture={hintSeen ? undefined : dismissHint}
    >
      <div ref={stageRef} className="pso-stage" />
      <svg ref={leadsRef} className="pso-leads" aria-hidden="true" />

      <div className="pso-labels">
        {NODES.filter((key) => !isMachine(key) || !PART_OF[key]).map((key) => {
          const active = selected === key || (hovered !== null && primaryOf(hovered) === key);
          const dim = selected !== null && selected !== key;
          if (isMachine(key)) {
            const r = rowByKey[key];
            return (
              <button
                key={key}
                ref={(n) => {
                  labelRefs.current[key] = n;
                }}
                type="button"
                className="pso-label"
                data-tone={r.tone}
                data-active={active || undefined}
                data-dim={dim || undefined}
                aria-pressed={selected === key}
                aria-label={`${r.name}, ${r.code}, ${r.condition}${r.score !== null ? `, health ${r.score} of 100` : ""}`}
                onClick={() => select(key)}
              >
                <span className="pso-label-head" title={`${r.name} · ${r.code} · ${r.condition}`}>
                  <i aria-hidden="true" />
                  <span className="pso-label-name">{r.shortName}</span>
                  <b className="pso-label-score">{r.score ?? "—"}</b>
                </span>
              </button>
            );
          }
          return (
            <button
              key={key}
              ref={(n) => {
                labelRefs.current[key] = n;
              }}
              type="button"
              className="pso-label pso-label-infra"
              data-tone="idle"
              data-active={active || undefined}
              data-dim={dim || undefined}
              aria-pressed={selected === key}
              aria-label={`${INFRA_NAME[key]}, support building`}
              onClick={() => select(key)}
            >
              <span className="pso-label-head" title={`${INFRA_NAME[key]} · support building`}>
                <i aria-hidden="true" />
                <span className="pso-label-name">{INFRA_NAME[key]}</span>
              </span>
            </button>
          );
        })}
      </div>


      <div ref={toolsRef} className="pso-tools" role="group" aria-label="Camera">
        <span className="pso-sim">Move</span>
        <button type="button" className="pso-tool pso-tool-icon" onClick={() => apiRef.current?.nudge("move-left")} aria-label="Move left" title="Move left (A key, left arrow, or right-drag)">
          ←
        </button>
        <button type="button" className="pso-tool pso-tool-icon" onClick={() => apiRef.current?.nudge("move-up")} aria-label="Move forward" title="Move forward (W key, up arrow, or right-drag)">
          ↑
        </button>
        <button type="button" className="pso-tool pso-tool-icon" onClick={() => apiRef.current?.nudge("move-down")} aria-label="Move back" title="Move back (S key, down arrow, or right-drag)">
          ↓
        </button>
        <button type="button" className="pso-tool pso-tool-icon" onClick={() => apiRef.current?.nudge("move-right")} aria-label="Move right" title="Move right (D key, right arrow, or right-drag)">
          →
        </button>
        <span className="pso-tool-sep" aria-hidden="true" />
        <span className="pso-sim">Turn</span>
        <button type="button" className="pso-tool pso-tool-icon" onClick={() => apiRef.current?.nudge("orbit-left")} aria-label="Turn left" title="Turn left (Q key or drag)">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
        <button type="button" className="pso-tool pso-tool-icon" onClick={() => apiRef.current?.nudge("orbit-right")} aria-label="Turn right" title="Turn right (E key or drag)">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
            <path d="M21 3v5h-5" />
          </svg>
        </button>
        <button type="button" className="pso-tool pso-tool-icon" onClick={() => apiRef.current?.zoom(0.8)} aria-label="Zoom in" title="Zoom in">
          +
        </button>
        <button type="button" className="pso-tool pso-tool-icon" onClick={() => apiRef.current?.zoom(1.25)} aria-label="Zoom out" title="Zoom out">
          −
        </button>
        <span className="pso-tool-sep" aria-hidden="true" />
        <button
          type="button"
          className="pso-tool"
          aria-pressed={autoRotate && !reduce}
          disabled={reduce}
          title={reduce ? "Auto-rotate is off while reduced motion is on" : "Slowly rotate the site"}
          onClick={() => setAutoRotate((a) => !a)}
        >
          Rotate
        </button>
        <button type="button" className="pso-tool" onClick={reset} title="Back to the opening view">
          Reset
        </button>
      </div>

      {!hintSeen && !selected && (
        <div ref={hintRef} className="pso-hint" aria-hidden="true">
          {twinHint(navMode, "select a machine for details")}
        </div>
      )}

      <div className="pso-seq-wrap">
        <nav ref={seqRef} className="pso-seq" aria-label="Machines in process order">
          {SEQUENCE.map((step, i) => (
            <React.Fragment key={step.join("-")}>
              {i > 0 && (
                <span className="pso-seq-arrow" aria-hidden="true">
                  ›
                </span>
              )}
              {(() => {
                const chips = step.map((key, j) => {
                  const r = rowByKey[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`nav-pill pso-chip${selected === key ? " active" : ""}`}
                      data-tone={r.tone}
                      aria-pressed={selected === key}
                      aria-label={`Step ${i + 1}: ${r.name}, ${r.condition}`}
                      onClick={() => select(selected === key ? null : key)}
                    >
                      <span className="pso-chip-n ast-num" title={j === 0 ? undefined : "Fires into the kiln (same step)"}>
                        {j === 0 ? i + 1 : "↳"}
                      </span>
                      <i aria-hidden="true" />
                      {r.shortName}
                    </button>
                  );
                });
                // A multi-machine step (KLN-01 with BRN-01 firing into it) stacks its chips in one column.
                return step.length > 1 ? <span className="pso-seq-stack">{chips}</span> : chips;
              })()}
            </React.Fragment>
          ))}
        </nav>
      </div>

      {selected && (
        <aside ref={panelRef} className="ph-inspector pso-panel" aria-label="Details" aria-live="polite">
          {isMachine(selected) ? (
            <MachinePanel
              row={rowByKey[selected]}
              catalog={catalog}
              frame={rowByKey[selected].id ? (fleet[rowByKey[selected].id]?.frame ?? null) : null}
              onClose={() => setSelected(null)}
              onOpen={() => {
                const id = rowByKey[selected].id;
                if (id) navigateToMachine(id, "overview");
              }}
            />
          ) : (
            <InfraPanel
              infra={selected}
              catalog={catalog}
              plantId={selectedPlantId}
              machineIds={plantMachines.map((m) => m.id)}
              valid={line.valid}
              total={line.total}
              feeders={line.feeders}
              onClose={() => setSelected(null)}
            />
          )}
        </aside>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- panels */

type Frame = SimFrame;

const SEVERITY_RANK: Record<string, number> = { Critical: 0, Alert: 1, Normal: 2 };

function PanelHead({ title, sub, onClose }: { title: string; sub: string; onClose: () => void }) {
  return (
    <div className="ph-insp-head">
      <div>
        <span className="ph-insp-name">{title}</span>
        <span className="ph-sub ast-num">{sub}</span>
      </div>
      <button type="button" className="ast-icon-btn" onClick={onClose} aria-label="Close details">
        <IconClose />
      </button>
    </div>
  );
}

function MachinePanel({ row, catalog, frame, onClose, onOpen }: { row: MachineRow; catalog: SiteCatalog; frame: Frame | null; onClose: () => void; onOpen: () => void }) {
  const spec = (row.id && catalog.specCounts[row.id]) || { required: 0, optional: 0 };
  const findings = frame
    ? frame.rules
        .filter((r) => r.status === "ACTIVE" && isConditionRule(r))
        .sort((a, b) => (SEVERITY_RANK[a.severity] ?? 3) - (SEVERITY_RANK[b.severity] ?? 3))
    : [];
  const counts = frame && row.id ? onlineValid(frame, row.id, catalog) : null;
  const keyTags = (row.id && catalog.keyTags[row.id]) || [];
  const subs = frame ? frame.defs.subassemblies.map((s) => ({ id: s.id, name: s.name, cell: frame.subs[s.id] })) : [];
  // The live plant still starting: its readings are on their way, not missing.
  const starting = useLivePlantStarting() && !frame;

  return (
    <>
      <PanelHead
        title={row.name}
        sub={`${row.code} · ${row.diagrams.length > 1 ? "Drawings" : "Drawing"} ${row.diagrams.join(", ") || "—"}${row.key === "BRN" ? " · the only burner on the line" : ""}`}
        onClose={onClose}
      />
      <div className="pso-score">
        <span className="pso-score-v ast-num">
          {row.score ?? "—"}
          <span className="ast-unit">/100</span>
        </span>
        <StatusTag tone={row.tone} label={row.condition} />
      </div>

      <section className="pso-sec">
        <h3>Problems</h3>
        {findings.length === 0 ? (
          <>
            {starting ? <Loading label="Loading the checks…" rows={2} /> : <p className="pso-empty">{frame ? "No problems right now" : "No live readings"}</p>}
            {frame && keyTags.length > 0 && (
              <dl className="ph-insp-rows">
                {keyTags.map((tg) => {
                  const sg = frame.signals[tg];
                  const def = frame.defs.signalByTag[tg];
                  return (
                    <div key={tg}>
                      <dt title={tg}>{def?.name ?? tg}</dt>
                      <dd className="ast-num">
                        {sg?.display ?? "—"} <span className="ast-unit">{def?.unit}</span>
                      </dd>
                    </div>
                  );
                })}
              </dl>
            )}
          </>
        ) : (
          <ul className="pso-findings">
            {findings.map((r) => (
              <li key={r.id} data-tone={conditionTone(r.severity)}>
                <div className="pso-find-head">
                  <i aria-hidden="true" />
                  <span className="pso-find-name" title={r.plainTitle ? r.name : undefined}>{r.plainTitle ?? r.name}</span>
                  {r.since !== null && frame && <span className="pso-find-age ast-num">{formatDuration(frame.t - r.since)}</span>}
                </div>
                {r.plainWhat ? (
                  <p className="pso-find-ev" title={r.evidence || undefined}>
                    {r.plainWhat}
                  </p>
                ) : (
                  r.evidence && <p className="pso-find-ev ast-num">{r.evidence}</p>
                )}
                {(r.plainTodo || r.action) && (
                  <p className="pso-find-act" title={r.plainTodo ? r.action : undefined}>
                    <b>To do</b> {r.plainTodo ?? r.action}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="pso-sec">
        <h3>Sensors</h3>
        <dl className="ph-insp-rows">
          <div>
            <dt>Needed</dt>
            <dd className="ast-num">{spec.required}</dd>
          </div>
          <div>
            <dt>Optional</dt>
            <dd className="ast-num">{spec.optional}</dd>
          </div>
          <div>
            <dt>Reading correctly</dt>
            <dd className="ast-num">{counts ? `${counts.valid} of ${counts.total}` : "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="pso-sec">
        <h3>Parts</h3>
        {subs.length === 0 ? (
          starting ? <Loading label="Loading the parts…" rows={3} /> : <p className="pso-empty">No live readings</p>
        ) : (
          <ul className="pso-subs">
            {subs.map((s) => {
              const c = s.cell ? toCondition(s.cell.status) : "No data";
              return (
                <li key={s.id} data-tone={conditionTone(c)} title={c}>
                  <i aria-hidden="true" />
                  <span className="pso-sub-name">{s.name}</span>
                  <span className="pso-sub-h ast-num">{s.cell ? Math.round(s.cell.health) : "—"}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <PillButton onClick={onOpen} trailing={<IconChevron size={10} />}>
        Open machine
      </PillButton>
    </>
  );
}

const LINK_LABEL: Record<MachineAcquisition["gateways"][number]["state"], string> = {
  online: "Online",
  stale: "Not updating",
  offline: "Offline",
  waiting: "Waiting",
  disabled: "Disabled",
};

/** "Online · last seen 12 s ago"; "Not heard from yet" while no MQTT heartbeat has arrived. */
function gatewayStatus(gws: EdgeRegistry["gateways"], link: MachineAcquisition["gateways"][number] | null, serverNow: string | null): string {
  if (!gws.length) return "Not set up";
  if (!gws.every((g) => g.enabled)) return "Disabled";
  if (!link?.lastSeenAt) return "Not heard from yet";
  const now = serverNow ? Date.parse(serverNow) : Date.now();
  const s = Math.max(0, Math.round((now - Date.parse(link.lastSeenAt)) / 1000));
  // Real (wall-clock) seconds: formatDuration counts simulated minutes.
  const ago = s < 60 ? `${s} s` : s < 3600 ? `${Math.floor(s / 60)} min` : `${Math.floor(s / 3600)} h`;
  return `${LINK_LABEL[link.state]} · last seen ${ago} ago`;
}

function InfraPanel({
  infra,
  catalog,
  plantId,
  machineIds,
  valid,
  total,
  feeders,
  onClose,
}: {
  infra: InfraKey;
  catalog: SiteCatalog;
  plantId: string | null;
  machineIds: string[];
  valid: number;
  total: number;
  feeders: number | null;
  onClose: () => void;
}) {
  const primaryId = usePrimaryMachineId();
  const machineKey = machineIds.join("|");
  // Gateway facts from the edge registry (protocols of its sources, mapped points) and the
  // MQTT runtime (link state, last heartbeat), not hard-coded.
  const [gw, setGw] = useState<{ status: string; protocols: string; points: number } | null>(null);
  useEffect(() => {
    if (infra !== "GW" || !primaryId) return;
    let alive = true;
    const json = <T,>(url: string) =>
      fetch(url, { cache: "no-store" })
        .then((r) => r.json())
        .then((body: { data?: T }) => body.data ?? null)
        .catch(() => null);
    Promise.all([json<EdgeRegistry>("/api/edge"), json<MachineAcquisition>(`/api/edge/machines/${encodeURIComponent(primaryId)}`)]).then(([reg, acq]) => {
      if (!alive || !reg) return;
      // The plant's gateways: those serving the plant node or instrumenting one of its machines.
      const mIds = new Set(machineKey ? machineKey.split("|") : []);
      const served = new Set(reg.sources.filter((x) => x.machineId && mIds.has(x.machineId)).map((x) => x.gatewayId));
      const gws = reg.gateways.filter((g) => (plantId !== null && g.siteNodeId === plantId) || served.has(g.id));
      const ids = new Set(gws.map((g) => g.id));
      const srcs = reg.sources.filter((x) => ids.has(x.gatewayId));
      const srcIds = new Set(srcs.map((x) => x.id));
      const link = acq?.gateways.find((g) => ids.has(g.id)) ?? null;
      setGw({
        status: gatewayStatus(gws, link, acq?.serverNow ?? null),
        protocols: [...new Set(srcs.map((x) => x.protocol))].join(", ") || "—",
        points: reg.points.filter((pt) => srcIds.has(pt.sourceId)).length,
      });
    });
    return () => {
      alive = false;
    };
  }, [infra, primaryId, plantId, machineKey]);
  const rows: Array<[string, React.ReactNode]> =
    infra === "GW"
      ? [
          ["Data gateway", gw?.status ?? "—"],
          ["Sensors sending data", catalog.onlineSignals],
          ["Reading correctly now", total ? `${valid} of ${total}` : "—"],
          ["Limits approved by plant", catalog.onlineSignals ? `${catalog.approvedOnline} of ${catalog.onlineSignals}` : "—"],
          ["Connection types (read only)", gw?.protocols ?? "—"],
          ["Readings linked", gw ? gw.points : "—"],
          ["Readings entered by hand", catalog.manualRecords],
        ]
      : [
          ["Motor panel and speed drive signals", catalog.driveFeeders],
          ["Drive signals reading correctly", feeders === null ? "—" : `${feeders} of ${catalog.driveFeeders}`],
          ["Machines powered from here", catalog.driveMachines],
          ["Drive readings sent to this system", catalog.driveQuantities.join(", ") || "—"],
        ];
  return (
    <>
      <PanelHead title={INFRA_NAME[infra]} sub="Support building" onClose={onClose} />
      <dl className="ph-insp-rows">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd className="ast-num">{v}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

export default PyroSiteOverview;
