import { query } from "@backend/db";
import { AccessError, requireMachine, requirePlant, type Scope } from "@backend/services/access-service";
import type { EdgeKind } from "@shared/types/edge";

/**
 * Write scope of the edge registry. A gateway belongs to the plant of its site
 * and to the plants of the machines its sources and points are wired to; its
 * sources, cards and points go with it, and a broker belongs to the gateways
 * that use it. An entity that belongs only to plants outside the scope answers
 * as missing, the same as the registry read leaves it out. Formats are shared
 * by every plant; an entity that belongs to no plant yet is open to all.
 */

const missing = (label: string, id: string) => new AccessError(`${label} ${id} not found.`, 404, "NOT_FOUND");

const outside = (scope: Scope, plants: { plant_id: string }[]) =>
  !scope.all && plants.length > 0 && !plants.some((p) => scope.plants.has(p.plant_id));

export async function requireGateway(scope: Scope, gatewayId: string | null | undefined): Promise<void> {
  if (scope.all || !gatewayId) return;
  const plants = await query<{ plant_id: string }>(
    `SELECT h.plant_id FROM edge_gateways g JOIN hierarchy_nodes h ON h.id = g.site_node_id WHERE g.id = $1
     UNION SELECT m.plant_id FROM edge_sources s JOIN machines m ON m.id = s.machine_id WHERE s.gateway_id = $1
     UNION SELECT m.plant_id FROM edge_sources s JOIN v_edge_points p ON p.source_id = s.id JOIN machines m ON m.id = p.machine_id WHERE s.gateway_id = $1`,
    [gatewayId],
  );
  if (outside(scope, plants.rows)) throw missing("Gateway", gatewayId);
}

export async function requireBroker(scope: Scope, brokerId: string | null | undefined): Promise<void> {
  if (scope.all || !brokerId) return;
  const gateways = await query<{ id: string }>("SELECT id FROM edge_gateways WHERE broker_id = $1", [brokerId]);
  if (!gateways.rows.length) return;
  for (const g of gateways.rows) {
    try {
      await requireGateway(scope, g.id);
      return;
    } catch {
      // try the next gateway on this broker
    }
  }
  throw missing("Broker", brokerId);
}

async function requireSource(scope: Scope, sourceId: string | null | undefined): Promise<void> {
  if (scope.all || !sourceId) return;
  const row = (await query<{ gateway_id: string }>("SELECT gateway_id FROM edge_sources WHERE id = $1", [sourceId])).rows[0];
  if (!row) return;
  try {
    await requireGateway(scope, row.gateway_id);
  } catch {
    throw missing("Source", sourceId);
  }
}

/** The stored entity `id` of `kind` must lie in the scope. */
export async function requireEdgeEntity(scope: Scope, kind: EdgeKind, id: string): Promise<void> {
  if (scope.all) return;
  const label = { formats: "Format", brokers: "Broker", gateways: "Gateway", sources: "Source", cards: "Card", points: "Point" }[kind];
  try {
    if (kind === "brokers") await requireBroker(scope, id);
    else if (kind === "gateways") await requireGateway(scope, id);
    else if (kind === "sources") await requireSource(scope, id);
    else if (kind === "cards") {
      const row = (await query<{ source_id: string }>("SELECT source_id FROM edge_cards WHERE id = $1", [id])).rows[0];
      await requireSource(scope, row?.source_id);
    } else if (kind === "points") {
      const row = (await query<{ source_id: string; machine_id: string | null }>("SELECT source_id, machine_id FROM v_edge_points WHERE id = $1", [id])).rows[0];
      await requireSource(scope, row?.source_id);
      requireMachine(scope, row?.machine_id);
    }
  } catch (error) {
    if (error instanceof AccessError) throw missing(label, id);
    throw error;
  }
}

/** What a create or update body links to (gateway, source, machine, site, broker) must lie in the scope. */
export async function requireEdgeFields(scope: Scope, kind: EdgeKind, body: Record<string, unknown>): Promise<void> {
  if (scope.all) return;
  const s = (k: string) => (typeof body[k] === "string" && body[k] ? (body[k] as string).trim() : null);
  if (kind === "gateways") {
    await requireBroker(scope, s("brokerId"));
    await requireSiteNode(scope, s("siteNodeId"));
  } else if (kind === "sources") {
    await requireGateway(scope, s("gatewayId"));
    requireMachine(scope, s("machineId"));
  } else if (kind === "cards") {
    await requireSource(scope, s("sourceId"));
  } else if (kind === "points") {
    await requireSource(scope, s("sourceId"));
    requireMachine(scope, s("machineId"));
  }
}

/** A site node (plant, area, group) of a plant outside the scope answers as missing. */
export async function requireSiteNode(scope: Scope, nodeId: string | null | undefined): Promise<void> {
  if (scope.all || !nodeId) return;
  const row = (await query<{ plant_id: string }>("SELECT plant_id FROM hierarchy_nodes WHERE id = $1", [nodeId])).rows[0];
  if (!row) return;
  try {
    requirePlant(scope, row.plant_id);
  } catch {
    throw missing("Site", nodeId);
  }
}
