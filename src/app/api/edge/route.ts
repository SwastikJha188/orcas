import { NextResponse, type NextRequest } from "next/server";
import { getEdgeRegistry } from "@/server/services/edge-service";
import type { ApiSuccess } from "@/types/api";
import type { EdgeRegistry } from "@/types/edge";
import { failFrom } from "./_respond";
import { accessFail, requestScope } from "@/app/api/_lib/respond";
import { seesMachine, seesPlant, type Scope } from "@/server/services/access-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The whole edge registry: brokers, gateways, sources, points and the pick lists. */
export async function GET(request: NextRequest) {
  try {
    const scope = await requestScope(request);
    const body: ApiSuccess<EdgeRegistry> = { data: scopeRegistry(scope, await getEdgeRegistry()) };
    return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return accessFail(err) ?? failFrom(err, "EDGE_FETCH_ERROR");
  }
}

/**
 * The registry of the scope's plants: gateways sited in them or wired to their
 * machines, those gateways' sources, cards and points, and the brokers they use.
 */
function scopeRegistry(scope: Scope, reg: EdgeRegistry): EdgeRegistry {
  if (scope.all) return reg;
  const siteById = new Map(reg.sites.map((s) => [s.id, s]));
  const plantOf = (siteId: string | null): string | null => {
    for (let s = siteId ? siteById.get(siteId) : undefined, hops = 0; s && hops < 16; s = s.parentId ? siteById.get(s.parentId) : undefined, hops++) {
      if (s.type === "plant") return s.id;
    }
    return null;
  };
  const wired = new Set<string>();
  const sourceGateway = new Map(reg.sources.map((s) => [s.id, s.gatewayId]));
  for (const s of reg.sources) if (seesMachine(scope, s.machineId)) wired.add(s.gatewayId);
  for (const pt of reg.points) if (seesMachine(scope, pt.machineId)) wired.add(sourceGateway.get(pt.sourceId) ?? "");
  const gateways = reg.gateways.filter((g) => seesPlant(scope, plantOf(g.siteNodeId)) || wired.has(g.id));
  const gatewayIds = new Set(gateways.map((g) => g.id));
  const sources = reg.sources.filter((s) => gatewayIds.has(s.gatewayId));
  const sourceIds = new Set(sources.map((s) => s.id));
  const brokerIds = new Set(gateways.map((g) => g.brokerId));
  return {
    formats: reg.formats,
    brokers: reg.brokers.filter((b) => brokerIds.has(b.id)),
    gateways,
    sources,
    cards: reg.cards.filter((c) => sourceIds.has(c.sourceId)),
    points: reg.points.filter((pt) => sourceIds.has(pt.sourceId) && (!pt.machineId || seesMachine(scope, pt.machineId))),
    sites: reg.sites.filter((s) => seesPlant(scope, plantOf(s.id))),
    machines: reg.machines.filter((m) => seesMachine(scope, m.id)),
  };
}
