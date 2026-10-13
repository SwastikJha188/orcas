"use client";

import { useMemo } from "react";
import type { HierarchyNode } from "@/components/assets/assets-data";
import { useIndustrialData } from "@/providers/industrial-data-context";
import { zoneLabel } from "@/lib/time";

export interface SiteTimeZone {
  /** IANA zone to format with; undefined = the viewer's own zone. */
  timeZone: string | undefined;
  /** The plant the zone came from, when one was found. */
  plant: HierarchyNode | null;
  /** "Africa/Lusaka (GMT+2)", or the viewer's zone with "your time". */
  label: string;
  /** True when the plant has no zone set and the viewer's zone is used instead. */
  fallback: boolean;
}

/** The plant (root) above a node id or a machine id, depth-first. */
export function findPlant(roots: HierarchyNode[], match: (n: HierarchyNode) => boolean): HierarchyNode | null {
  const walk = (n: HierarchyNode): boolean => match(n) || (n.children ?? []).some(walk);
  return roots.find((root) => walk(root)) ?? null;
}

/**
 * The time zone timestamps of a site's equipment are shown in: the plant's
 * zone above `machineId` or `nodeId` (a hierarchy node, e.g. a gateway's site),
 * or the viewer's zone when the plant has none or nothing is given.
 */
export function useSiteTimeZone({ machineId, nodeId }: { machineId?: string | null; nodeId?: string | null } = {}): SiteTimeZone {
  const { hierarchy } = useIndustrialData();
  return useMemo(() => {
    const plant =
      nodeId ? findPlant(hierarchy, (n) => n.id === nodeId) :
      machineId ? findPlant(hierarchy, (n) => n.machineId === machineId) :
      null;
    const timeZone = plant?.timeZone || undefined;
    return {
      timeZone,
      plant,
      label: timeZone ? zoneLabel(timeZone) : `${zoneLabel()} · your time`,
      fallback: !timeZone,
    };
  }, [hierarchy, machineId, nodeId]);
}
