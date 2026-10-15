/**
 * Scopes the edge registry and the live MQTT state to one plant: each plant is
 * a separate workspace, so the Devices pages show only the gateways (and their
 * sources, cards and points), sites and machines of the active plant. A gateway
 * belongs to the plant its site node sits under (`hierarchy_nodes.plant_id`
 * tree); gateways without a site stay visible so a freshly registered one never
 * disappears. Live readings of another plant's registered gateways are dropped,
 * so they never show up as "discovered" here. Brokers and data formats are
 * shared infrastructure and stay unscoped. Pure, no React.
 */
import type { EdgeRegistry } from "@/types/edge";
import type { MqttSnapshot, MqttTrafficEntry } from "@/types/mqtt";

export interface EdgeScope {
  /** Site node ids of the plant (the plant node and everything under it). */
  sites: Set<string>;
  /** Gateway ids of the plant (plus unassigned gateways). */
  gateways: Set<string>;
  /** Gateway codes registered under another plant. */
  foreignCodes: Set<string>;
}

export function edgeScope(registry: EdgeRegistry, plantId: string): EdgeScope {
  const sites = new Set<string>([plantId]);
  // Sites arrive in arbitrary order: grow the subtree until it stops changing.
  for (let grew = true; grew; ) {
    grew = false;
    for (const s of registry.sites) {
      if (!sites.has(s.id) && s.parentId && sites.has(s.parentId)) {
        sites.add(s.id);
        grew = true;
      }
    }
  }
  const gateways = new Set<string>();
  const foreignCodes = new Set<string>();
  for (const g of registry.gateways) {
    if (!g.siteNodeId || sites.has(g.siteNodeId)) gateways.add(g.id);
    else foreignCodes.add(g.code);
  }
  return { sites, gateways, foreignCodes };
}

/**
 * The registry of one plant. `machinePlant` maps machine id → plant id for the
 * machine options; machines it does not know stay listed.
 */
export function scopeRegistry(registry: EdgeRegistry, plantId: string, machinePlant: Map<string, string>, scope = edgeScope(registry, plantId)): EdgeRegistry {
  const sources = registry.sources.filter((s) => scope.gateways.has(s.gatewayId));
  const sourceIds = new Set(sources.map((s) => s.id));
  return {
    ...registry,
    gateways: registry.gateways.filter((g) => scope.gateways.has(g.id)),
    sources,
    cards: registry.cards.filter((c) => sourceIds.has(c.sourceId)),
    points: registry.points.filter((p) => sourceIds.has(p.sourceId)),
    sites: registry.sites.filter((s) => scope.sites.has(s.id)),
    machines: registry.machines.filter((m) => {
      const plant = machinePlant.get(m.id);
      return !plant || plant === plantId;
    }),
  };
}

/** Live MQTT state without another plant's registered gateways. */
export function scopeSnapshot(snapshot: MqttSnapshot, scope: EdgeScope): MqttSnapshot {
  if (scope.foreignCodes.size === 0) return snapshot;
  const mine = (gatewayId: string | null) => !gatewayId || !scope.foreignCodes.has(gatewayId);
  return {
    ...snapshot,
    gateways: snapshot.gateways.filter((g) => mine(g.gatewayId)),
    racks: snapshot.racks.filter((r) => mine(r.gatewayId)),
    measurements: snapshot.measurements.filter((m) => mine(m.gatewayId)),
    alarms: snapshot.alarms.filter((a) => mine(a.gatewayId)),
    quarantine: snapshot.quarantine.filter((q) => mine(q.gatewayId)),
  };
}

/** Raw traffic without messages published by another plant's registered gateways (gateway code is a topic segment). */
export function scopeTraffic(traffic: MqttTrafficEntry[], scope: EdgeScope): MqttTrafficEntry[] {
  if (scope.foreignCodes.size === 0) return traffic;
  return traffic.filter((t) => !t.topic.split("/").some((seg) => scope.foreignCodes.has(seg)));
}
