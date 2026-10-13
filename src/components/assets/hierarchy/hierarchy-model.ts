import type { AssetMachine, HierarchyNode } from "../assets-data";
import { machineTone, type Tone } from "../assets-shell-ui";

/* ==========================================================================
   Plant hierarchy model (ported from ULTRON lib/hierarchy + tree/treeModel).
   Works on any depth: Plant → Area → Machine group → … → Machine.
   ========================================================================== */

export type NodeType = HierarchyNode["type"];

export const TYPE_LABEL: Record<NodeType, string> = {
  plant: "Plant",
  area: "Area",
  group: "Machine group",
  machine: "Machine",
};

/** Live machine condition, keyed by machine id. */
export type MachineLookup = Map<string, { machine: AssetMachine | undefined; status: string; health: number; isLive: boolean }>;

const TONE_RANK: Record<Tone, number> = { good: 0, info: 0, idle: 1, warn: 2, bad: 3 };

export function worstTone(a: Tone, b: Tone): Tone {
  return TONE_RANK[b] > TONE_RANK[a] ? b : a;
}

export function isFolder(node: HierarchyNode): boolean {
  return node.type !== "machine";
}

/** Short plant name: "Demo Cement Plant (KLN-01)" → "Demo Cement Plant". */
export function shortName(name: string): string {
  return name.split("—")[0].split("(")[0].trim() || name;
}

export function machineCondition(node: HierarchyNode, lookup: MachineLookup) {
  const hit = node.machineId ? lookup.get(node.machineId) : undefined;
  return {
    status: hit?.status ?? node.status ?? "Operational",
    health: hit?.health ?? node.health ?? 0,
    machine: hit?.machine,
    isLive: hit?.isLive ?? false,
  };
}

export function nodeTone(node: HierarchyNode, lookup: MachineLookup): Tone {
  return machineTone(machineCondition(node, lookup).status);
}

/** Every machine node below (and including) `node`. */
export function subtreeMachines(node: HierarchyNode): HierarchyNode[] {
  if (node.type === "machine") return [node];
  return (node.children ?? []).flatMap(subtreeMachines);
}

/** Every folder node strictly below `node`. */
export function subtreeFolders(node: HierarchyNode): HierarchyNode[] {
  return (node.children ?? []).filter(isFolder).flatMap((c) => [c, ...subtreeFolders(c)]);
}

/** Worst machine tone in the subtree (healthy when empty). */
export function rollupTone(node: HierarchyNode, lookup: MachineLookup): Tone {
  return subtreeMachines(node).reduce<Tone>((t, m) => worstTone(t, nodeTone(m, lookup)), "good");
}

export interface Distribution {
  critical: number;
  atRisk: number;
  offline: number;
  healthy: number;
}

export function distribution(machines: HierarchyNode[], lookup: MachineLookup): Distribution {
  const d: Distribution = { critical: 0, atRisk: 0, offline: 0, healthy: 0 };
  for (const m of machines) {
    const tone = nodeTone(m, lookup);
    if (tone === "bad") d.critical++;
    else if (tone === "warn") d.atRisk++;
    else if (tone === "idle") d.offline++;
    else d.healthy++;
  }
  return d;
}

export function averageHealth(machines: HierarchyNode[], lookup: MachineLookup): number | null {
  if (machines.length === 0) return null;
  const sum = machines.reduce((n, m) => n + machineCondition(m, lookup).health, 0);
  return Math.round(sum / machines.length);
}

/** Path of nodes from a root to `id` (inclusive), or [] when not found. */
export function findPath(roots: HierarchyNode[], id: string): HierarchyNode[] {
  for (const r of roots) {
    if (r.id === id) return [r];
    const sub = findPath(r.children ?? [], id);
    if (sub.length) return [r, ...sub];
  }
  return [];
}

export function nodeLabel(node: HierarchyNode): string {
  return node.type === "plant" ? shortName(node.name) : node.name;
}

/** Text a filter query matches: name, machine id and machine type. */
export function matchesQuery(node: HierarchyNode, q: string, lookup: MachineLookup): boolean {
  if (!q) return true;
  const m = node.machineId ? lookup.get(node.machineId)?.machine : undefined;
  return [node.name, node.machineId, m?.type, m?.processCell]
    .filter(Boolean)
    .some((s) => s!.toLowerCase().includes(q));
}

/**
 * Filter keeping matches plus their ancestors (ULTRON `filterSources`).
 * Returns the visible ids, or `null` when no filter is active.
 */
export function filterVisible(root: HierarchyNode, q: string, lookup: MachineLookup): Set<string> | null {
  if (!q) return null;
  const keep = new Set<string>();
  const walk = (n: HierarchyNode): boolean => {
    let hit = matchesQuery(n, q, lookup);
    for (const c of n.children ?? []) if (walk(c)) hit = true;
    if (hit) keep.add(n.id);
    return hit;
  };
  walk(root);
  return keep;
}

/** Children in display order: machines first, then sub-folders (ULTRON order). */
export function orderedChildren(node: HierarchyNode): HierarchyNode[] {
  const kids = node.children ?? [];
  return [...kids.filter((k) => k.type === "machine"), ...kids.filter(isFolder)];
}
